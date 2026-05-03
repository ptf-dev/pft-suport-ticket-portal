# 🤖 AI Assistant Integration (MCP)

This project includes a **Model Context Protocol (MCP) server** that enables AI assistants like Claude to interact with your ticketing system.

## What is This?

The MCP server allows your team to:

- 📖 **Read tickets** - AI can access full ticket details, comments, and images
- 🔍 **Search & filter** - Find tickets by status, priority, company, or keywords
- 💬 **Add comments** - AI can post solutions and updates
- ✏️ **Update status** - Change ticket status through AI
- 🎯 **Analyze patterns** - Identify common issues across tickets

## Quick Links

- **[Deployment Summary](./MCP_DEPLOYMENT_SUMMARY.md)** - Overview and architecture
- **[MCP Server Code](./mcp-server/)** - Server implementation
- **[Coolify Deployment Guide](./mcp-server/COOLIFY_DEPLOYMENT.md)** - Deploy to VPS
- **[Team Guide](./mcp-server/TEAM_GUIDE.md)** - How to use the AI assistant
- **[Testing Guide](./mcp-server/TESTING.md)** - Test before deployment

## Two Deployment Options

### Option 1: Remote (Recommended) ⭐

Deploy to Coolify VPS - team members just need a URL and API key.

**Pros:**
- No local installation needed
- Always available
- Easy to update
- Works from anywhere

**See:** [COOLIFY_DEPLOYMENT.md](./mcp-server/COOLIFY_DEPLOYMENT.md)

### Option 2: Local

Each team member runs the MCP server on their machine.

**Pros:**
- No server costs
- Works offline

**Cons:**
- Each person must install
- Harder to maintain

**See:** [README.md](./mcp-server/README.md)

## Quick Start (For Admins)

### 1. Generate API Keys

```bash
# For MCP server to access your API
node -e "console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))"

# For team members to access MCP server
node -e "console.log('mcp_client_' + require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to Your `.env`

```env
# Add this to your main project's .env file
MCP_API_KEY=mcp_sk_your_generated_key_here
```

### 3. Deploy MCP Server

Follow the [Coolify Deployment Guide](./mcp-server/COOLIFY_DEPLOYMENT.md)

### 4. Share with Team

Use the [Team Config Template](./mcp-server/TEAM_CONFIG_TEMPLATE.md)

## Example Usage

Once set up, team members can:

```
User: "Help me with this ticket: 
https://portal.propfirmstech.com/admin/tickets/clx1234"

AI: "I've reviewed ticket #clx1234. The issue is about TP SL rules 
not working. Based on the 3 comments and 2 screenshots, I can see 
the problem is... Here's the solution..."
```

```
User: "Show me all urgent unassigned tickets"

AI: "I found 5 urgent unassigned tickets:
1. Server not visible (clx5678) - Elite Mind Funding
2. TP SL issue (clx9012) - Easy Funding
..."
```

```
User: "Add a comment to ticket clx1234 explaining the solution"

AI: "I've added a detailed comment explaining the solution. 
The comment includes step-by-step instructions for the client."
```

## Architecture

```
Team Member (Claude) 
    ↓ HTTPS + API Key
MCP Server (Coolify VPS)
    ↓ API Calls
Ticketing Portal (Next.js)
    ↓
Database (PostgreSQL)
```

## Security

- 🔒 API key authentication
- 🔒 HTTPS encryption
- 🔒 Audit trail (all AI actions logged)
- 🔒 Rate limiting (configurable)

## Files Structure

```
project-root/
├── mcp-server/                    # MCP server code
│   ├── src/
│   │   ├── index.ts              # Stdio transport (local)
│   │   └── http-server.ts        # HTTP/SSE transport (remote)
│   ├── Dockerfile                # Docker container
│   ├── docker-compose.yml        # Docker Compose config
│   ├── README.md                 # Usage guide
│   ├── TEAM_GUIDE.md            # Team instructions
│   ├── TESTING.md               # Testing procedures
│   ├── COOLIFY_DEPLOYMENT.md    # Deployment guide
│   └── DEPLOYMENT_CHECKLIST.md  # Deployment checklist
│
├── app/api/mcp/                  # MCP API endpoints
│   ├── tickets/[id]/route.ts    # Get ticket
│   ├── tickets/route.ts         # List tickets
│   ├── tickets/search/route.ts  # Search tickets
│   ├── tickets/[id]/comments/   # Comments endpoints
│   ├── tickets/[id]/status/     # Status endpoint
│   └── companies/route.ts       # Companies endpoint
│
├── MCP_DEPLOYMENT_SUMMARY.md    # Complete overview
└── MCP_INTEGRATION.md           # This file
```

## Available MCP Tools

1. **get_ticket** - Get complete ticket details
2. **list_tickets** - List tickets with filters
3. **search_tickets** - Search by keyword
4. **get_ticket_comments** - Get all comments
5. **add_ticket_comment** - Add AI comment
6. **update_ticket_status** - Change status
7. **get_companies** - List companies

## Requirements

### For Deployment
- Coolify VPS (or any Docker host)
- Domain/subdomain for MCP server
- Node.js 20+
- PostgreSQL database (already have)

### For Team Members
- Claude Desktop app
- Internet connection
- API key from admin

## Support

- **Documentation**: See `mcp-server/` directory
- **Issues**: Check `TESTING.md` troubleshooting section
- **Questions**: Contact DevOps team

## Next Steps

1. ✅ Review [MCP_DEPLOYMENT_SUMMARY.md](./MCP_DEPLOYMENT_SUMMARY.md)
2. ✅ Follow [DEPLOYMENT_CHECKLIST.md](./mcp-server/DEPLOYMENT_CHECKLIST.md)
3. ✅ Deploy to Coolify
4. ✅ Test with your Claude Desktop
5. ✅ Roll out to team

## Benefits

- ⚡ **Faster resolution** - AI helps find solutions quickly
- 🔍 **Pattern detection** - Identify recurring issues
- 📚 **Knowledge sharing** - AI learns from past tickets
- ✍️ **Better responses** - AI helps draft professional replies
- 🎯 **Focus on complex issues** - AI handles routine questions

## Future Enhancements

Potential additions:
- Ticket assignment automation
- Bulk operations
- Report generation
- Slack integration
- Email integration
- Predictive analytics

---

**Ready to deploy?** Start with the [Deployment Summary](./MCP_DEPLOYMENT_SUMMARY.md)!
