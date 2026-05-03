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
import crypto from "crypto";
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
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

// ============================================
// OAuth 2.1 Support
// ============================================

const SERVICE_URL = process.env.SERVICE_URL_MCP_SERVER || "";

interface OAuthClient {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
}

interface AuthCode {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: number;
}

// In-memory stores (reset on server restart — clients just re-auth)
const oauthClients = new Map<string, OAuthClient>();
const authCodes = new Map<string, AuthCode>();
const accessTokens = new Set<string>();

function generateId(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  return hash.toString("base64url") === codeChallenge;
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getBaseUrl(req: Request): string {
  if (SERVICE_URL) return SERVICE_URL.replace(/\/$/, "");
  const proto = req.get("x-forwarded-proto") || req.protocol;
  return `${proto}://${req.get("host")}`;
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

// ============================================
// OAuth 2.1 Endpoints (no auth required)
// ============================================

// Metadata discovery
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

// Dynamic client registration (RFC 7591)
app.post("/register", (req, res) => {
  const { client_name, redirect_uris } = req.body;
  const client_id = generateId(16);
  const client: OAuthClient = {
    client_id,
    client_name: client_name || "MCP Client",
    redirect_uris: redirect_uris || [],
  };
  oauthClients.set(client_id, client);
  debug("Registered OAuth client:", client_id, client_name);
  res.status(201).json({
    client_id,
    client_name: client.client_name,
    redirect_uris: client.redirect_uris,
  });
});

// Authorization page — shows a form asking for the MCP API key
app.get("/authorize", (req, res) => {
  const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html><head>
<title>PropFirms MCP Authorization</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #e5e5e5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 32px; width: 100%; max-width: 400px; }
  h1 { font-size: 1.2em; margin-bottom: 8px; color: #fff; }
  p { font-size: 0.9em; color: #888; margin-bottom: 20px; }
  input[type=password] { width: 100%; padding: 12px; background: #0a0a0a; border: 1px solid #333; border-radius: 8px; color: #fff; font-size: 14px; margin-bottom: 16px; }
  input:focus { outline: none; border-color: #22c55e; }
  button { background: #22c55e; color: #000; border: none; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; border-radius: 8px; }
  button:hover { background: #16a34a; }
  .error { color: #ef4444; font-size: 0.85em; margin-bottom: 12px; }
</style>
</head><body>
<div class="card">
  <h1>PropFirms Ticketing</h1>
  <p>Enter your MCP API key to authorize this client.</p>
  ${req.query.error ? '<p class="error">Invalid API key. Please try again.</p>' : ''}
  <form method="POST" action="/authorize">
    <input type="hidden" name="client_id" value="${escapeHtml(client_id as string)}">
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirect_uri as string)}">
    <input type="hidden" name="code_challenge" value="${escapeHtml(code_challenge as string)}">
    <input type="hidden" name="code_challenge_method" value="${escapeHtml(code_challenge_method as string)}">
    <input type="hidden" name="state" value="${escapeHtml(state as string)}">
    <input type="password" name="api_key" placeholder="mcp_client_..." required autofocus>
    <button type="submit">Authorize</button>
  </form>
</div>
</body></html>`);
});

// Handle authorization form submission
app.post("/authorize", express.urlencoded({ extended: false }), (req, res) => {
  const { client_id, redirect_uri, code_challenge, code_challenge_method, state, api_key } = req.body;

  // Validate API key against the configured MCP_SERVER_API_KEY
  if (api_key !== MCP_SERVER_API_KEY) {
    const params = new URLSearchParams({
      client_id: client_id || "",
      redirect_uri: redirect_uri || "",
      code_challenge: code_challenge || "",
      code_challenge_method: code_challenge_method || "",
      state: state || "",
      error: "invalid_key",
    });
    return res.redirect(`/authorize?${params.toString()}`);
  }

  // Generate authorization code
  const code = generateId(32);
  authCodes.set(code, {
    client_id,
    redirect_uri,
    code_challenge: code_challenge || "",
    code_challenge_method: code_challenge_method || "S256",
    expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  debug("Issued auth code for client:", client_id);

  // Redirect back to client callback
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);
  res.redirect(302, redirectUrl.toString());
});

// Token endpoint — exchange auth code for access token
app.post("/token", express.urlencoded({ extended: false }), (req, res) => {
  const { grant_type, code, code_verifier, client_id } = req.body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }

  const authCode = authCodes.get(code);
  if (!authCode) {
    return res.status(400).json({ error: "invalid_grant", error_description: "Invalid or expired authorization code" });
  }

  if (Date.now() > authCode.expires_at) {
    authCodes.delete(code);
    return res.status(400).json({ error: "invalid_grant", error_description: "Authorization code expired" });
  }

  // Verify PKCE
  if (authCode.code_challenge && code_verifier) {
    if (!verifyPKCE(code_verifier, authCode.code_challenge)) {
      return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    }
  }

  // Consume the auth code (single use)
  authCodes.delete(code);

  // Issue access token
  const access_token = `mcp_at_${generateId(32)}`;
  accessTokens.add(access_token);
  debug("Issued access token for client:", client_id);

  res.json({
    access_token,
    token_type: "bearer",
    expires_in: 86400,
  });
});

// ============================================
// Authentication Middleware
// ============================================

// Extracts token from header or query param
function getApiKey(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authHeader.replace("Bearer ", "");
  }
  // Fallback to query parameter (useful for SSE connections)
  return req.query.key as string | undefined;
}

function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const token = getApiKey(req);

  // Accept: direct API key OR OAuth-issued access token
  if (token && (token === MCP_SERVER_API_KEY || accessTokens.has(token))) {
    return next();
  }

  debug("Authentication failed:", token ? "Invalid token" : "No token provided");
  // 401 triggers OAuth flow in MCP clients
  return res.status(401).json({ error: "Unauthorized" });
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

// Store active transports by session ID for message routing
const transports = new Map<string, SSEServerTransport>();

// MCP SSE endpoint
app.get("/sse", authenticateRequest, async (req, res) => {
  debug("New SSE connection established");

  const server = createMCPServer();
  const transport = new SSEServerTransport("/message", res);

  // Store transport for message routing
  transports.set(transport.sessionId, transport);

  await server.connect(transport);

  // Handle client disconnect
  req.on("close", () => {
    debug("SSE connection closed");
    transports.delete(transport.sessionId);
  });
});

// MCP message endpoint
app.post("/message", authenticateRequest, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  debug("Received message for session:", sessionId);

  const transport = transports.get(sessionId);
  if (!transport) {
    debug("No active transport for session:", sessionId);
    return res.status(400).json({ error: "No active SSE connection for this session" });
  }

  await transport.handlePostMessage(req, res);
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
