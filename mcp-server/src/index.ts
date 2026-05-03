#!/usr/bin/env node

/**
 * PropFirms Ticketing MCP Server
 * 
 * This MCP server allows LLMs to interact with the PropFirms ticketing system.
 * It provides tools to read tickets, comments, images, and status history.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const TICKETING_BASE_URL = process.env.TICKETING_BASE_URL || "http://localhost:3000";
const TICKETING_API_KEY = process.env.TICKETING_API_KEY || "";
const DEBUG = process.env.DEBUG === "true";

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: TICKETING_BASE_URL,
  headers: {
    "Authorization": `Bearer ${TICKETING_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Debug logger
function debug(...args: any[]) {
  if (DEBUG) {
    console.error("[DEBUG]", ...args);
  }
}

interface ImageInfo {
  url: string;
  filename: string;
  context: string;
}

function collectImages(data: any): ImageInfo[] {
  const images: ImageInfo[] = [];
  const ticket = data.ticket || data;

  if (ticket.images) {
    for (const img of ticket.images) {
      images.push({
        url: img.url,
        filename: img.filename,
        context: `Ticket attachment: ${img.filename}`,
      });
    }
  }

  const comments = ticket.comments || data.comments || [];
  for (const comment of comments) {
    if (comment.images && comment.images.length > 0) {
      for (const img of comment.images) {
        const authorName = comment.author?.name || "Unknown";
        images.push({
          url: img.url,
          filename: img.filename,
          context: `Comment image by ${authorName}: ${img.filename}`,
        });
      }
    }
  }

  return images;
}

async function fetchImageContent(images: ImageInfo[]): Promise<any[]> {
  const contentBlocks: any[] = [];

  for (const img of images) {
    try {
      const url = img.url.startsWith("http")
        ? img.url
        : `${TICKETING_BASE_URL}${img.url}`;
      const response = await api.get(url, { responseType: "arraybuffer", timeout: 15000 });
      const contentType = response.headers["content-type"] || "image/png";
      const base64 = Buffer.from(response.data).toString("base64");
      contentBlocks.push({
        type: "text",
        text: `[Image: ${img.context}]`,
      });
      contentBlocks.push({
        type: "image",
        data: base64,
        mimeType: contentType,
      });
    } catch (err: any) {
      debug(`Failed to fetch image ${img.filename}:`, err.message);
      contentBlocks.push({
        type: "text",
        text: `[Image: ${img.context} — could not be loaded, URL: ${img.url}]`,
      });
    }
  }

  return contentBlocks;
}

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "get_ticket",
    description: "Get complete ticket details including title, description, status, priority, company, creator, assignee, all comments (public and internal notes), images, and full history. Use this to understand the full context of a support ticket. Internal notes contain admin-only context useful for resolving the ticket.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "The unique ticket ID (e.g., 'clx1234abcd')",
        },
      },
      required: ["ticket_id"],
    },
  },
  {
    name: "list_tickets",
    description: "List tickets with optional filters. Useful for finding tickets by status, priority, company, or assignment.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"],
          description: "Filter by ticket status",
        },
        priority: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          description: "Filter by priority level",
        },
        company_id: {
          type: "string",
          description: "Filter by company ID",
        },
        assigned_to: {
          type: "string",
          description: "Filter by assigned user ID, or 'unassigned' for unassigned tickets",
        },
        limit: {
          type: "number",
          description: "Maximum number of tickets to return (default: 20, max: 100)",
          default: 20,
        },
      },
    },
  },
  {
    name: "search_tickets",
    description: "Search tickets by keyword in title or description. Returns matching tickets with basic info.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to match against ticket title and description",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10, max: 50)",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_ticket_comments",
    description: "Get all comments for a specific ticket, including public comments and internal notes (admin-only). Each comment includes text, author, timestamp, internal flag, and attached images.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "The ticket ID to get comments for",
        },
      },
      required: ["ticket_id"],
    },
  },
  {
    name: "add_ticket_comment",
    description: "Add a new comment to a ticket. Use this to provide solutions, ask for clarification, or update the ticket with findings.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "The ticket ID to comment on",
        },
        content: {
          type: "string",
          description: "The comment text content",
        },
      },
      required: ["ticket_id", "content"],
    },
  },
  {
    name: "update_ticket_status",
    description: "Update the status of a ticket. Use this when you've resolved an issue or need to change the ticket state.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "The ticket ID to update",
        },
        status: {
          type: "string",
          enum: ["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"],
          description: "The new status for the ticket",
        },
      },
      required: ["ticket_id", "status"],
    },
  },
  {
    name: "get_companies",
    description: "List all companies in the system. Useful for understanding which companies have tickets.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "propfirms-ticketing-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debug("Listing available tools");
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  debug(`Executing tool: ${name}`, args);

  try {
    switch (name) {
      case "get_ticket": {
        const { ticket_id } = args as { ticket_id: string };
        const response = await api.get(`/api/mcp/tickets/${ticket_id}`);
        const images = collectImages(response.data);
        const imageBlocks = await fetchImageContent(images);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
            ...imageBlocks,
          ],
        };
      }

      case "list_tickets": {
        const params = new URLSearchParams();
        if (args?.status) params.append("status", args.status as string);
        if (args?.priority) params.append("priority", args.priority as string);
        if (args?.company_id) params.append("companyId", args.company_id as string);
        if (args?.assigned_to) params.append("assignedTo", args.assigned_to as string);
        params.append("limit", String(args?.limit || 20));

        const response = await api.get(`/api/mcp/tickets?${params.toString()}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "search_tickets": {
        const { query, limit = 10 } = args as { query: string; limit?: number };
        const response = await api.get(`/api/mcp/tickets/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get_ticket_comments": {
        const { ticket_id } = args as { ticket_id: string };
        const response = await api.get(`/api/mcp/tickets/${ticket_id}/comments`);
        const images = collectImages(response.data);
        const imageBlocks = await fetchImageContent(images);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
            ...imageBlocks,
          ],
        };
      }

      case "add_ticket_comment": {
        const { ticket_id, content } = args as { ticket_id: string; content: string };
        const response = await api.post(`/api/mcp/tickets/${ticket_id}/comments`, {
          content,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "update_ticket_status": {
        const { ticket_id, status } = args as { ticket_id: string; status: string };
        const response = await api.patch(`/api/mcp/tickets/${ticket_id}/status`, {
          status,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get_companies": {
        const response = await api.get(`/api/mcp/companies`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    debug("Error executing tool:", error.message);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error.message,
            details: error.response?.data || "No additional details",
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  debug("Starting PropFirms Ticketing MCP Server");
  debug(`Base URL: ${TICKETING_BASE_URL}`);
  debug(`API Key configured: ${TICKETING_API_KEY ? "Yes" : "No"}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  debug("Server started successfully");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
