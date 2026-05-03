# Team Member Configuration Template

Share this with your team members after deploying the MCP server.

---

## 🤖 PropFirms AI Assistant - Quick Setup

### What You'll Get

- ✅ AI that can read and analyze support tickets
- ✅ Instant access to ticket history and comments
- ✅ AI-powered solutions and suggestions
- ✅ Ability to search and filter tickets
- ✅ Automated comment posting and status updates

### Setup Time: 2 minutes

---

## Step 1: Install Claude Desktop

Download and install Claude Desktop:
- **Download**: https://claude.ai/download
- **Platforms**: macOS, Windows, Linux

---

## Step 2: Configure MCP Server

### For macOS:

1. Open Terminal
2. Run this command:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```
(Or use any text editor)

3. Paste this configuration:
```json
{
  "mcpServers": {
    "propfirms-ticketing": {
      "url": "https://mcp.propfirmstech.com/sse",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

4. Replace `YOUR_API_KEY_HERE` with the API key provided by your admin
5. Save the file

### For Windows:

1. Press `Win + R`
2. Type: `%APPDATA%\Claude\claude_desktop_config.json`
3. Open with Notepad
4. Paste the same configuration as above
5. Replace `YOUR_API_KEY_HERE` with your API key
6. Save the file

---

## Step 3: Restart Claude Desktop

Completely quit and restart Claude Desktop for changes to take effect.

---

## Step 4: Verify It Works

1. Open Claude Desktop
2. Type: **"What MCP tools do you have available?"**
3. You should see tools like:
   - `get_ticket`
   - `list_tickets`
   - `search_tickets`
   - `add_ticket_comment`
   - `update_ticket_status`

If you see these, you're all set! 🎉

---

## How to Use

### Example 1: Get Help with a Ticket

```
Copy ticket URL from browser, then in Claude:

"Can you help me with this ticket?
https://portal.propfirmstech.com/admin/tickets/clx1234"
```

Claude will:
- Read the full ticket
- Review all comments
- View attached images
- Analyze the issue
- Suggest solutions

### Example 2: Find Tickets

```
"Show me all urgent unassigned tickets"
```

### Example 3: Search for Issues

```
"Find all tickets about TP SL problems"
```

### Example 4: Add Solution

```
"Add a comment to ticket clx1234 explaining how to fix the issue"
```

### Example 5: Update Status

```
"Mark ticket clx1234 as resolved"
```

---

## Tips & Tricks

### 💡 Tip 1: Be Specific
```
❌ "Help with ticket"
✅ "Help with ticket clx1234 - analyze the issue and suggest a solution"
```

### 💡 Tip 2: Multi-Step Requests
```
"Read ticket clx1234, find similar resolved tickets, 
and suggest a solution based on what worked before"
```

### 💡 Tip 3: Batch Analysis
```
"Show me all open tickets from Elite Mind Funding 
and summarize the common issues"
```

### 💡 Tip 4: Draft Responses
```
"Draft a professional response to the client 
explaining the solution for ticket clx1234"
```

### 💡 Tip 5: Learning Mode
```
"Explain the issue in ticket clx1234 in simple terms"
```

---

## Common Questions

### Q: Is my data secure?
**A:** Yes! The MCP server uses encrypted HTTPS connections and requires API key authentication. All actions are logged.

### Q: Can AI make changes without my approval?
**A:** AI can suggest changes, but you should always review before confirming. You're in control.

### Q: What if I get an error?
**A:** Check that:
1. Your API key is correct
2. Claude Desktop is restarted
3. You have internet connection
4. Contact your admin if issues persist

### Q: Can I use this with other AI tools?
**A:** Currently optimized for Claude Desktop, but any MCP-compatible client can use it.

### Q: Will this replace my job?
**A:** No! It's a tool to help you work faster and smarter. You're still the expert.

---

## Troubleshooting

### Issue: "I don't see the ticketing tools"

**Solution:**
1. Verify config file location is correct
2. Check API key is pasted correctly (no extra spaces)
3. Restart Claude Desktop completely
4. Try: "List all available MCP servers"

### Issue: "Unauthorized" error

**Solution:**
1. Verify API key with your admin
2. Check for typos in config file
3. Ensure no extra quotes or spaces

### Issue: "Connection failed"

**Solution:**
1. Check your internet connection
2. Verify MCP server URL is correct
3. Contact admin to check if server is running

---

## Best Practices

### ✅ DO:
- Review AI suggestions before implementing
- Use for research and finding patterns
- Let AI draft responses, then edit
- Ask AI to explain complex issues
- Share successful prompts with team

### ❌ DON'T:
- Blindly trust AI solutions without testing
- Share your API key with others
- Let AI close tickets without review
- Skip verifying solutions before sending to clients

---

## Getting Help

- **Technical Issues**: Contact [DevOps Team]
- **Usage Questions**: Ask in #ai-assistant Slack channel
- **Training**: Schedule with [Team Lead]
- **Feedback**: Share in team meetings

---

## Your Configuration

**MCP Server URL:** `https://mcp.propfirmstech.com/sse`

**Your API Key:** `[TO BE PROVIDED BY ADMIN]`

**Support Contact:** [ADMIN_EMAIL]

**Last Updated:** [DATE]

---

## Quick Reference Card

Print this and keep at your desk:

```
┌─────────────────────────────────────────┐
│   PropFirms AI Assistant Quick Ref      │
├─────────────────────────────────────────┤
│                                         │
│  Get Help:                              │
│  "Help with ticket [URL]"               │
│                                         │
│  Find Tickets:                          │
│  "Show urgent unassigned tickets"       │
│                                         │
│  Search:                                │
│  "Find tickets about [topic]"           │
│                                         │
│  Add Comment:                           │
│  "Add comment to [ID]: [text]"          │
│                                         │
│  Update Status:                         │
│  "Mark [ID] as resolved"                │
│                                         │
│  Support: [ADMIN_EMAIL]                 │
│                                         │
└─────────────────────────────────────────┘
```

---

**Welcome to the future of support! 🚀**

Questions? Ask your team lead or check the full documentation.
