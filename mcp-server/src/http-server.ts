#!/usr/bin/env node

/**
 * PropFirms Ticketing MCP Server - HTTP/SSE Transport
 * 
 * This version runs as an HTTP server that can be deployed to Coolify/VPS
 * and accessed remotely by team members.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";

// Load environment variables
dotenv.config();

const TICKETING_BASE_URL = process.env.TICKETING_BASE_URL || "http://localhost:3000";
const TICKETING_API_KEY = process.env.TICKETING_API_KEY || "";
const MCP_SERVER_PORT = parseInt(process.env.MCP_SERVER_PORT || "3042");
const MCP_SERVER_API_KEY = process.env.MCP_SERVER_API_KEY || "";
const DEBUG = process.env.DEBUG === "true";

// Create axios instance
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
    console.log("[DEBUG]", new Date().toISOString(), ...args);
  }
}

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "get_ticket",
    description: "Get complete ticket details including title, description, status, priority, company, creator, assignee, all comments with images, and full history. Use this to understand the full context of a support ticket.",
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
    description: "Get all comments for a specific ticket, including comment text, author, timestamp, and attached images.",
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

// Create MCP server instance
function createMCPServer() {
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
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.data, null, 2),
              },
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
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.data, null, 2),
              },
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

  return server;
}

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
function authenticateRequest(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== MCP_SERVER_API_KEY) {
    debug("Authentication failed:", token ? "Invalid token" : "No token provided");
    return res.status(401).json({ error: "Unauthorized - Invalid API key" });
  }

  next();
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "propfirms-ticketing-mcp",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// MCP SSE endpoint
app.get("/sse", authenticateRequest, async (req, res) => {
  debug("New SSE connection established");

  const server = createMCPServer();
  const transport = new SSEServerTransport("/message", res);

  await server.connect(transport);

  // Handle client disconnect
  req.on("close", () => {
    debug("SSE connection closed");
  });
});

// MCP message endpoint
app.post("/message", authenticateRequest, async (req, res) => {
  debug("Received message:", req.body);
  // This is handled by the SSE transport
  res.status(200).end();
});

// Start server
async function main() {
  console.log("🚀 PropFirms Ticketing MCP Server (HTTP/SSE)");
  console.log("============================================");
  console.log(`Port: ${MCP_SERVER_PORT}`);
  console.log(`Ticketing API: ${TICKETING_BASE_URL}`);
  console.log(`API Key configured: ${TICKETING_API_KEY ? "✅" : "❌"}`);
  console.log(`MCP Server API Key configured: ${MCP_SERVER_API_KEY ? "✅" : "❌"}`);
  console.log(`Debug mode: ${DEBUG ? "ON" : "OFF"}`);
  console.log("============================================");

  if (!MCP_SERVER_API_KEY) {
    console.error("⚠️  WARNING: MCP_SERVER_API_KEY is not set!");
    console.error("   Generate one with: node -e \"console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))\"");
  }

  app.listen(MCP_SERVER_PORT, () => {
    console.log(`✅ Server listening on port ${MCP_SERVER_PORT}`);
    console.log(`📡 SSE endpoint: http://localhost:${MCP_SERVER_PORT}/sse`);
    console.log(`💚 Health check: http://localhost:${MCP_SERVER_PORT}/health`);
    console.log("");
    console.log("Ready to accept connections!");
  });
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
