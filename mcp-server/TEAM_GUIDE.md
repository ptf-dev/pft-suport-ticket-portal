# 🤖 AI Assistant for Support Tickets - Team Guide

## What is This?

We've integrated an AI assistant that can read and help solve support tickets! You can now share any ticket with Claude (or other AI assistants) and it will:

- ✅ Read the full ticket details
- ✅ Read all comments and conversation history
- ✅ View attached images and screenshots
- ✅ Understand the problem context
- ✅ Suggest solutions
- ✅ Add comments with solutions
- ✅ Update ticket status

## 🚀 Quick Start (5 minutes)

### Step 1: Install Claude Desktop

Download from: https://claude.ai/download

### Step 2: Get Your MCP Configuration

Ask your team lead for:
1. The MCP API key
2. The MCP server configuration

### Step 3: Configure Claude

1. Open Claude Desktop
2. Go to Settings (⚙️)
3. Click "Developer" tab
4. Click "Edit Config"
5. Paste the configuration provided by your team lead
6. Save and restart Claude

### Step 4: Test It!

Open Claude and type:
```
"List all the tools you have available"
```

You should see PropFirms ticketing tools listed!

## 💡 How to Use

### Scenario 1: Get Help Solving a Ticket

1. Open a ticket in your browser
2. Copy the URL (e.g., `https://portal.propfirmstech.com/admin/tickets/clx1234`)
3. Open Claude Desktop
4. Paste the URL and say:

```
"Can you help me solve this ticket?"
```

Claude will:
- Read the ticket
- Read all comments
- View images
- Analyze the problem
- Suggest a solution

### Scenario 2: Find Related Tickets

```
"Find all tickets about TP SL issues"
```

Claude will search and show you matching tickets.

### Scenario 3: Check Your Workload

```
"Show me all tickets assigned to me that are still open"
```

(Note: You'll need to provide your user ID)

### Scenario 4: Batch Analysis

```
"Show me all urgent tickets from the last 3 days and summarize the common issues"
```

### Scenario 5: Let AI Add Solution

```
"Add a comment to ticket clx1234 explaining how to fix the TP SL issue"
```

Claude will write and post the comment for you!

### Scenario 6: Update Status

```
"I've solved ticket clx1234, can you mark it as resolved and add a summary comment?"
```

## 📋 Example Prompts

### For Support Agents

```
"Help me understand ticket [ID] - what's the main issue?"

"What solution would you suggest for ticket [ID]?"

"Find similar tickets to [ID] - has this been solved before?"

"Draft a response for the client explaining the solution"

"Add a comment to ticket [ID] with these steps: [your steps]"
```

### For Team Leads

```
"Show me all unassigned urgent tickets"

"What are the most common issues this week?"

"List all tickets from [Company Name]"

"Show me tickets that haven't been updated in 3+ days"

"Which tickets are waiting for client response?"
```

### For Developers

```
"Find all tickets mentioning [feature name]"

"What bugs are being reported about [system]?"

"Show me the conversation history for ticket [ID]"

"Are there any patterns in the recent bug reports?"
```

## 🎯 Best Practices

### DO ✅

- **Be specific**: Include ticket IDs when asking about specific tickets
- **Verify solutions**: Always review AI suggestions before implementing
- **Use for research**: Great for finding patterns and related issues
- **Save time**: Let AI draft responses, then review and edit
- **Learn**: Ask AI to explain technical issues

### DON'T ❌

- **Don't blindly trust**: Always verify AI solutions
- **Don't share sensitive data**: Be careful with client information
- **Don't let AI close tickets**: Review before marking as resolved
- **Don't skip testing**: Test solutions before sending to clients

## 🔐 Security Notes

- The AI assistant uses a secure API key
- All actions are logged as "AI Assistant (MCP)"
- Only team members with Claude Desktop configured can use it
- The AI can only access tickets through our API (same as you)

## 🆘 Troubleshooting

### "I don't see the ticketing tools"

1. Make sure you restarted Claude Desktop after configuration
2. Check that the config file is in the right location
3. Ask your team lead to verify your configuration

### "API key error"

Your API key might be incorrect. Contact your team lead for the correct key.

### "Ticket not found"

Make sure you're using the correct ticket ID format (e.g., `clx1234abcd`)

## 💬 Tips & Tricks

### Tip 1: Extract Ticket ID from URL

You can paste the full URL:
```
"Help with https://portal.propfirmstech.com/admin/tickets/clx1234"
```

Claude will extract the ID automatically!

### Tip 2: Multi-step Workflows

```
"Read ticket clx1234, analyze the issue, suggest a solution, 
and draft a comment explaining it to the client"
```

### Tip 3: Learning Mode

```
"Explain ticket clx1234 to me like I'm new to this system"
```

### Tip 4: Comparison

```
"Compare tickets clx1234 and clx5678 - are they related?"
```

### Tip 5: Batch Operations

```
"Show me all open tickets from Elite Mind Funding and 
summarize what needs to be done"
```

## 📊 Metrics & Tracking

All AI actions are tracked:
- Comments added by AI show "AI Assistant (MCP)" as the author
- Status changes include a note that AI made the change
- You can see AI activity in ticket history

## 🎓 Training Resources

### Video Tutorials
(Coming soon - ask your team lead)

### Practice Tickets
Try these commands with test tickets:
1. "Show me ticket [test-ticket-id]"
2. "What's the issue in this ticket?"
3. "Suggest a solution"

### Office Hours
Weekly AI assistant Q&A sessions - check team calendar

## 🚀 Advanced Usage

### Custom Filters

```
"Show me tickets where:
- Priority is HIGH or URGENT
- Status is OPEN
- Not assigned to anyone
- From the last 7 days"
```

### Trend Analysis

```
"Analyze all tickets from the past month and tell me:
- Most common issues
- Average resolution time
- Which companies have the most tickets"
```

### Automated Reporting

```
"Create a summary of my work today - list all tickets 
I commented on or resolved"
```

## 📞 Need Help?

- **Technical issues**: Contact [Dev Team Lead]
- **Usage questions**: Ask in #support-team Slack
- **Feature requests**: Submit to [Project Manager]
- **Training**: Schedule with [Team Lead]

## 🎉 Success Stories

> "I was stuck on a complex TP SL issue for 2 hours. Asked Claude to analyze the ticket and it found the solution in 2 minutes by comparing it to a similar resolved ticket!" - Support Agent

> "Used AI to batch-analyze 50 tickets and found a pattern that led us to discover a bug in the system." - Team Lead

> "Claude helped me draft professional responses to clients, saving me 30+ minutes per day." - Support Agent

---

**Remember**: The AI is a tool to help you work faster and smarter, not to replace your expertise. Always review and verify AI suggestions before taking action!

**Questions?** Ask in #ai-assistant-help Slack channel
