# Testing the MCP Server

## Prerequisites

1. MCP server is built (`npm run build`)
2. API key is generated and configured
3. Main Next.js server is running
4. `.env` file is configured

## Step 1: Test API Endpoints Directly

### Generate API Key

```bash
node -e "console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated key and add it to:
- Your main project's `.env` as `MCP_API_KEY=...`
- Your `mcp-server/.env` as `TICKETING_API_KEY=...`

### Test Get Ticket

```bash
# Replace with your actual ticket ID and API key
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  http://localhost:3000/api/mcp/tickets/YOUR_TICKET_ID
```

Expected response:
```json
{
  "ticket": {
    "id": "...",
    "title": "...",
    "description": "...",
    "status": "OPEN",
    "priority": "HIGH",
    "company": {...},
    "createdBy": {...},
    "comments": [...],
    "images": [...]
  }
}
```

### Test List Tickets

```bash
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  "http://localhost:3000/api/mcp/tickets?status=OPEN&limit=5"
```

### Test Search

```bash
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  "http://localhost:3000/api/mcp/tickets/search?q=test&limit=5"
```

### Test Add Comment

```bash
curl -X POST \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test comment from MCP"}' \
  http://localhost:3000/api/mcp/tickets/YOUR_TICKET_ID/comments
```

### Test Update Status

```bash
curl -X PATCH \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}' \
  http://localhost:3000/api/mcp/tickets/YOUR_TICKET_ID/status
```

### Test Get Companies

```bash
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  http://localhost:3000/api/mcp/companies
```

## Step 2: Test MCP Server Locally

### Run in Debug Mode

```bash
cd mcp-server
DEBUG=true node build/index.js
```

This will start the MCP server in stdio mode. You can test it by sending JSON-RPC messages.

## Step 3: Test in Claude Desktop

### 1. Configure Claude

Edit your Claude config file:

**macOS**: 
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows**:
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

Add:
```json
{
  "mcpServers": {
    "propfirms-ticketing": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/build/index.js"],
      "env": {
        "TICKETING_BASE_URL": "http://localhost:3000",
        "TICKETING_API_KEY": "mcp_sk_your_key_here",
        "DEBUG": "true"
      }
    }
  }
}
```

### 2. Restart Claude Desktop

Completely quit and restart Claude Desktop.

### 3. Verify Tools Are Available

In Claude, type:
```
"What MCP tools do you have available?"
```

You should see:
- get_ticket
- list_tickets
- search_tickets
- get_ticket_comments
- add_ticket_comment
- update_ticket_status
- get_companies

### 4. Test Basic Functionality

```
"Use the get_companies tool to show me all companies"
```

Expected: Claude will call the tool and show you the list of companies.

### 5. Test Ticket Retrieval

```
"Get ticket [YOUR_TICKET_ID] and tell me what it's about"
```

Expected: Claude will fetch the ticket and summarize it.

### 6. Test Search

```
"Search for tickets containing the word 'test'"
```

Expected: Claude will search and show results.

### 7. Test Adding Comment

```
"Add a comment to ticket [YOUR_TICKET_ID] saying 'This is a test comment from AI'"
```

Expected: Claude will add the comment and confirm.

### 8. Test Status Update

```
"Update ticket [YOUR_TICKET_ID] status to IN_PROGRESS"
```

Expected: Claude will update the status and confirm.

## Step 4: Test Real-World Scenarios

### Scenario 1: Ticket Analysis

```
"I need help with this ticket: http://localhost:3000/admin/tickets/[TICKET_ID]"
```

Expected: Claude should:
1. Extract the ticket ID
2. Fetch the ticket
3. Read all comments
4. Analyze the issue
5. Provide insights

### Scenario 2: Finding Tickets

```
"Show me all urgent tickets that are unassigned"
```

Expected: Claude should:
1. Call list_tickets with appropriate filters
2. Display the results
3. Offer to help with any

### Scenario 3: Batch Analysis

```
"Find all tickets about 'TP SL' and tell me if there's a common pattern"
```

Expected: Claude should:
1. Search for tickets
2. Analyze them
3. Identify patterns

## Troubleshooting

### Issue: "Unauthorized" Error

**Solution**: 
- Check that `MCP_API_KEY` is set in your main project's `.env`
- Verify the key matches in both places
- Restart your Next.js server

### Issue: Tools Not Showing in Claude

**Solution**:
- Verify the config file path is correct
- Check the absolute path to `build/index.js`
- Make sure you ran `npm run build`
- Completely quit and restart Claude Desktop
- Check Claude's logs (Help > Show Logs)

### Issue: "Ticket not found"

**Solution**:
- Verify the ticket ID is correct
- Check that the ticket exists in your database
- Make sure you're not using a deleted ticket

### Issue: Connection Refused

**Solution**:
- Make sure your Next.js server is running
- Verify `TICKETING_BASE_URL` is correct
- Check if you need to use `http://localhost:3000` vs `https://...`

### Issue: MCP Bot User Not Created

**Solution**:
The MCP bot user is created automatically on first comment. If you see errors:
- Check database permissions
- Verify Prisma schema is up to date
- Run `npx prisma generate` and `npx prisma db push`

## Viewing Logs

### Claude Desktop Logs

**macOS**:
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Windows**:
```
%LOCALAPPDATA%\Claude\logs\
```

### MCP Server Debug Output

Set `DEBUG=true` in your MCP server config to see detailed logs.

### Next.js Server Logs

Check your terminal where Next.js is running for API errors.

## Success Criteria

✅ All curl tests return valid JSON responses
✅ Claude Desktop shows PropFirms ticketing tools
✅ Can fetch ticket details through Claude
✅ Can search tickets through Claude
✅ Can add comments through Claude
✅ Can update ticket status through Claude
✅ MCP bot user appears in ticket comments
✅ No errors in Claude logs
✅ No errors in Next.js logs

## Performance Testing

### Test Response Times

```bash
time curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  http://localhost:3000/api/mcp/tickets/YOUR_TICKET_ID
```

Expected: < 500ms for most requests

### Test with Large Tickets

Test with tickets that have:
- 50+ comments
- Multiple images
- Long descriptions

Verify all data is returned correctly.

## Security Testing

### Test Invalid API Key

```bash
curl -X GET \
  -H "Authorization: Bearer invalid_key" \
  http://localhost:3000/api/mcp/tickets/YOUR_TICKET_ID
```

Expected: 401 Unauthorized

### Test Missing API Key

```bash
curl -X GET \
  http://localhost:3000/api/mcp/tickets/YOUR_TICKET_ID
```

Expected: 401 Unauthorized

### Test Invalid Ticket ID

```bash
curl -X GET \
  -H "Authorization: Bearer mcp_sk_your_key_here" \
  http://localhost:3000/api/mcp/tickets/invalid_id
```

Expected: 404 Not Found

## Next Steps

Once all tests pass:

1. Deploy to production
2. Update `TICKETING_BASE_URL` to production URL
3. Generate a new production API key
4. Share configuration with team
5. Provide training to team members
6. Monitor usage and gather feedback

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review logs for error messages
3. Verify all configuration is correct
4. Test API endpoints directly with curl
5. Contact the development team
