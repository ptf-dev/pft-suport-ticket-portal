# MCP Server Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Team Members                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Claude     │  │   Claude     │  │   Claude     │          │
│  │   Desktop    │  │   Desktop    │  │   Desktop    │          │
│  │  (Agent 1)   │  │  (Agent 2)   │  │  (Agent 3)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTPS + API Key  │                  │
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ↓
          ┌──────────────────────────────────────┐
          │      MCP Server (Coolify VPS)        │
          │   mcp.propfirmstech.com:3001         │
          │                                      │
          │  ┌────────────────────────────────┐ │
          │  │   HTTP/SSE Transport Layer     │ │
          │  │   - Authentication             │ │
          │  │   - Request routing            │ │
          │  │   - Error handling             │ │
          │  └────────────┬───────────────────┘ │
          │               │                      │
          │  ┌────────────▼───────────────────┐ │
          │  │   MCP Protocol Handler         │ │
          │  │   - Tool execution             │ │
          │  │   - Response formatting        │ │
          │  └────────────┬───────────────────┘ │
          └───────────────┼──────────────────────┘
                          │
                          │ API Calls
                          │
                          ↓
          ┌──────────────────────────────────────┐
          │   Ticketing Portal (Next.js)         │
          │   portal.propfirmstech.com           │
          │                                      │
          │  ┌────────────────────────────────┐ │
          │  │   MCP API Endpoints            │ │
          │  │   /api/mcp/tickets/*           │ │
          │  │   - Get ticket                 │ │
          │  │   - List tickets               │ │
          │  │   - Search tickets             │ │
          │  │   - Add comments               │ │
          │  │   - Update status              │ │
          │  └────────────┬───────────────────┘ │
          └───────────────┼──────────────────────┘
                          │
                          │ Prisma ORM
                          │
                          ↓
          ┌──────────────────────────────────────┐
          │   PostgreSQL Database                │
          │   - Tickets                          │
          │   - Comments                         │
          │   - Users                            │
          │   - Companies                        │
          └──────────────────────────────────────┘
```

## Data Flow

### 1. User Request Flow

```
User types in Claude:
"Help me with ticket clx1234"
         │
         ↓
Claude extracts intent:
- Tool: get_ticket
- Args: {ticket_id: "clx1234"}
         │
         ↓
Claude sends MCP request:
POST /message
{
  "method": "tools/call",
  "params": {
    "name": "get_ticket",
    "arguments": {"ticket_id": "clx1234"}
  }
}
         │
         ↓
MCP Server authenticates:
- Checks API key
- Validates request
         │
         ↓
MCP Server calls API:
GET /api/mcp/tickets/clx1234
Authorization: Bearer mcp_sk_...
         │
         ↓
API authenticates:
- Checks MCP_API_KEY
- Validates ticket ID
         │
         ↓
API queries database:
- Fetch ticket
- Include comments
- Include images
- Include relations
         │
         ↓
API returns JSON:
{
  "ticket": {
    "id": "clx1234",
    "title": "...",
    "comments": [...],
    ...
  }
}
         │
         ↓
MCP Server formats response:
{
  "content": [{
    "type": "text",
    "text": "JSON string"
  }]
}
         │
         ↓
Claude receives data:
- Parses JSON
- Analyzes content
- Formulates response
         │
         ↓
User sees response:
"I've reviewed ticket #clx1234..."
```

### 2. Write Operation Flow

```
User: "Add comment to ticket clx1234"
         │
         ↓
Claude: add_ticket_comment
{
  "ticket_id": "clx1234",
  "content": "Solution: ..."
}
         │
         ↓
MCP Server → API:
POST /api/mcp/tickets/clx1234/comments
{
  "content": "Solution: ..."
}
         │
         ↓
API:
1. Validates ticket exists
2. Gets/creates MCP bot user
3. Creates comment record
4. Returns success
         │
         ↓
User sees:
"Comment added successfully!"
```

## Authentication Flow

```
┌─────────────┐
│   Client    │
│  (Claude)   │
└──────┬──────┘
       │
       │ 1. Connect with API key
       │    Authorization: Bearer mcp_client_xxx
       ↓
┌─────────────────┐
│   MCP Server    │
│                 │
│ 2. Verify key   │
│    matches      │
│    MCP_SERVER_  │
│    API_KEY      │
└──────┬──────────┘
       │
       │ 3. Make API call with different key
       │    Authorization: Bearer mcp_sk_xxx
       ↓
┌─────────────────┐
│  Ticketing API  │
│                 │
│ 4. Verify key   │
│    matches      │
│    MCP_API_KEY  │
└──────┬──────────┘
       │
       │ 5. Query database
       ↓
┌─────────────────┐
│    Database     │
└─────────────────┘
```

## Component Responsibilities

### Claude Desktop (Client)
- User interface
- Intent recognition
- Tool selection
- Response formatting
- Error handling

### MCP Server
- Client authentication
- Request routing
- Tool execution
- Response formatting
- Error handling
- Logging

### Ticketing API
- MCP authentication
- Data validation
- Database queries
- Business logic
- Response formatting

### Database
- Data storage
- Data integrity
- Query execution
- Transactions

## Security Layers

```
Layer 1: HTTPS
├─ All traffic encrypted
└─ SSL/TLS certificates

Layer 2: API Key (Client → MCP Server)
├─ Bearer token authentication
├─ Key validation
└─ Request rejection if invalid

Layer 3: API Key (MCP Server → API)
├─ Different key for server-to-server
├─ Key validation
└─ Request rejection if invalid

Layer 4: Data Validation
├─ Input sanitization
├─ Type checking
└─ Business rule validation

Layer 5: Database
├─ Parameterized queries
├─ Access control
└─ Audit logging
```

## Scalability

### Horizontal Scaling

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Client  │  │ Client  │  │ Client  │
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
     └────────────┼────────────┘
                  │
            ┌─────▼─────┐
            │   Load    │
            │  Balancer │
            └─────┬─────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
┌────▼────┐  ┌───▼────┐  ┌───▼────┐
│  MCP    │  │  MCP   │  │  MCP   │
│ Server  │  │ Server │  │ Server │
│    1    │  │    2   │  │    3   │
└────┬────┘  └───┬────┘  └───┬────┘
     │           │           │
     └───────────┼───────────┘
                 │
          ┌──────▼──────┐
          │  Ticketing  │
          │     API     │
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │  Database   │
          └─────────────┘
```

### Caching Strategy

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ MCP Server  │
│             │
│ ┌─────────┐ │
│ │  Cache  │ │ ← Cache frequently accessed tickets
│ │  Layer  │ │   TTL: 5 minutes
│ └─────────┘ │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│     API     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Database   │
└─────────────┘
```

## Error Handling

```
Error occurs at any layer
         │
         ↓
Catch and log error
         │
         ↓
Format error response
         │
         ↓
Return to client with:
- Error message
- Error code
- Helpful context
         │
         ↓
Client displays to user
```

## Monitoring Points

```
1. Client Level
   - Connection status
   - Request count
   - Error rate

2. MCP Server Level
   - Active connections
   - Request latency
   - Tool usage stats
   - Error rate
   - Resource usage (CPU, RAM)

3. API Level
   - Request count
   - Response time
   - Error rate
   - Database query time

4. Database Level
   - Query performance
   - Connection pool
   - Slow queries
```

## Deployment Architecture

```
┌─────────────────────────────────────┐
│         Coolify VPS                 │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Docker Container            │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │   Node.js Process       │ │ │
│  │  │   - MCP Server          │ │ │
│  │  │   - Express HTTP        │ │ │
│  │  │   - Port 3001           │ │ │
│  │  └─────────────────────────┘ │ │
│  │                               │ │
│  │  ┌─────────────────────────┐ │ │
│  │  │   Health Check          │ │ │
│  │  │   /health endpoint      │ │ │
│  │  └─────────────────────────┘ │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Nginx Reverse Proxy         │ │
│  │   - SSL termination           │ │
│  │   - Domain routing            │ │
│  │   - Rate limiting             │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Technology Stack

### MCP Server
- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express.js
- **Protocol**: MCP SDK
- **Transport**: HTTP/SSE

### API
- **Framework**: Next.js 14
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL

### Deployment
- **Platform**: Coolify
- **Container**: Docker
- **Proxy**: Nginx
- **SSL**: Let's Encrypt

## Performance Characteristics

### Expected Latency
- Health check: < 50ms
- Get ticket: < 500ms
- List tickets: < 1s
- Search tickets: < 1s
- Add comment: < 500ms
- Update status: < 500ms

### Throughput
- Concurrent connections: 100+
- Requests per second: 50+
- Database queries: 1000+/min

### Resource Usage
- CPU: 0.5 cores (idle), 2 cores (peak)
- RAM: 512MB (idle), 1GB (peak)
- Storage: 1GB
- Network: Minimal

---

For implementation details, see the source code in `src/` directory.
