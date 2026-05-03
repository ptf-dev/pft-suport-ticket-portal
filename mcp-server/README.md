# PropFirms Ticketing MCP Server

This MCP (Model Context Protocol) server allows AI assistants like Claude to interact with the PropFirms ticketing system. It enables LLMs to read tickets, comments, images, and even take actions like adding comments or updating ticket status.

## 🚀 Quick Start

### 1. Installation

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configuration

Create a `.env` file in the `mcp-server` directory:

```bash
cp .env.example .env
```

Edit `.env` and set your values:

```env
TICKETING_BASE_URL=https://portal.propfirmstech.com
TICKETING_API_KEY=your-secure-api-key-here
DEBUG=false
```

### 3. Generate API Key

Add this to your main project's `.env` file:

```env
# MCP API Key - generate a secure random string
MCP_API_KEY=mcp_sk_1234567890abcdefghijklmnopqrstuvwxyz
```

You can generate a secure key with:

```bash
node -e "console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Configure in Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "propfirms-ticketing": {
      "command": "node",
      "args": [
        "/absolute/path/to/your/project/mcp-server/build/index.js"
      ],
      "env": {
        "TICKETING_BASE_URL": "https://portal.propfirmstech.com",
        "TICKETING_API_KEY": "mcp_sk_1234567890abcdefghijklmnopqrstuvwxyz"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/your/project` with the actual path!

### 5. Restart Claude Desktop

After saving the config, completely quit and restart Claude Desktop.

## 📖 Usage Examples

### Example 1: Analyzing a Ticket

```
User: "Can you help me with this ticket? https://portal.propfirmstech.com/admin/tickets/clx1234abcd"

Claude will:
1. Extract the ticket ID from the URL
2. Call get_ticket(ticket_id="clx1234abcd")
3. Read all comments and images
4. Analyze the issue
5. Provide a solution
```

### Example 2: Finding Urgent Tickets

```
User: "Show me all urgent tickets that are unassigned"

Claude will:
1. Call list_tickets(priority="URGENT", assigned_to="unassigned")
2. Display the results
3. Offer to help with any of them
```

### Example 3: Searching for Issues

```
User: "Find all tickets related to TP SL problems"

Claude will:
1. Call search_tickets(query="TP SL")
2. Show matching tickets
3. Offer to analyze specific ones
```

### Example 4: Solving and Updating

```
User: "Can you solve ticket clx1234abcd and mark it as resolved?"

Claude will:
1. Call get_ticket() to understand the issue
2. Analyze and provide solution
3. Call add_ticket_comment() with the solution
4. Call update_ticket_status(status="RESOLVED")
```

## 🛠️ Available Tools

### 1. `get_ticket`
Get complete ticket details including all comments, images, and history.

**Parameters:**
- `ticket_id` (string, required): The ticket ID

**Example:**
```json
{
  "ticket_id": "clx1234abcd"
}
```

### 2. `list_tickets`
List tickets with optional filters.

**Parameters:**
- `status` (string, optional): OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED
- `priority` (string, optional): LOW, MEDIUM, HIGH, URGENT
- `company_id` (string, optional): Filter by company
- `assigned_to` (string, optional): User ID or "unassigned"
- `limit` (number, optional): Max results (default: 20, max: 100)

### 3. `search_tickets`
Search tickets by keyword.

**Parameters:**
- `query` (string, required): Search term
- `limit` (number, optional): Max results (default: 10, max: 50)

### 4. `get_ticket_comments`
Get all comments for a ticket.

**Parameters:**
- `ticket_id` (string, required): The ticket ID

### 5. `add_ticket_comment`
Add a comment to a ticket.

**Parameters:**
- `ticket_id` (string, required): The ticket ID
- `content` (string, required): Comment text

### 6. `update_ticket_status`
Update ticket status.

**Parameters:**
- `ticket_id` (string, required): The ticket ID
- `status` (string, required): New status

### 7. `get_companies`
List all companies.

**Parameters:** None

## 🧪 Testing

### Test with curl

```bash
# Test get ticket
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  https://portal.propfirmstech.com/api/mcp/tickets/clx1234abcd

# Test list tickets
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  "https://portal.propfirmstech.com/api/mcp/tickets?status=OPEN&limit=5"

# Test search
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  "https://portal.propfirmstech.com/api/mcp/tickets/search?q=TP%20SL&limit=5"

# Test add comment
curl -X POST \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"content":"This is a test comment from MCP"}' \
  https://portal.propfirmstech.com/api/mcp/tickets/clx1234abcd/comments

# Test update status
curl -X PATCH \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"status":"RESOLVED"}' \
  https://portal.propfirmstech.com/api/mcp/tickets/clx1234abcd/status
```

### Test in Claude Desktop

After installation, try:

```
"List all the MCP tools you have available"
```

You should see the PropFirms ticketing tools listed.

## 🔒 Security

- The MCP API key should be kept secret
- Only share it with trusted team members
- Rotate the key periodically
- The MCP bot user is created automatically with email `mcp-bot@propfirmstech.com`
- All actions are logged with the MCP bot user

## 📝 Team Instructions

### For Support Agents

When you want AI help with a ticket:

1. Copy the ticket URL from your browser
2. Open Claude Desktop
3. Paste the URL and ask: "Can you help me solve this ticket?"
4. Claude will read all the context and provide solutions
5. You can ask Claude to add comments or update status

### For Developers

When debugging issues:

1. Ask Claude: "Find all tickets related to [feature/bug]"
2. Claude will search and show relevant tickets
3. Ask for analysis: "What's the common pattern in these issues?"
4. Claude can help identify root causes

### Example Prompts

- "Show me all urgent unassigned tickets"
- "What are the most common issues this week?"
- "Help me solve ticket [ID]"
- "Find all tickets from company [name]"
- "Analyze ticket [ID] and suggest a solution"
- "Add a comment to ticket [ID] explaining [solution]"
- "Mark ticket [ID] as resolved"

## 🐛 Troubleshooting

### MCP Server Not Showing in Claude

1. Check the config file path is correct
2. Verify the absolute path to `build/index.js`
3. Make sure you ran `npm run build`
4. Restart Claude Desktop completely
5. Check Claude's logs (Help > Show Logs)

### API Key Errors

1. Verify `MCP_API_KEY` is set in your main project's `.env`
2. Verify the same key is in the MCP server config
3. Restart your Next.js server after adding the key

### Connection Errors

1. Verify `TICKETING_BASE_URL` is correct
2. Make sure your server is running
3. Check firewall/network settings
4. Enable `DEBUG=true` in MCP server config

## 📚 Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)

## 🤝 Support

For issues or questions, contact the development team or create an issue in the project repository.
