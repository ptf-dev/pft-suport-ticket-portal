# Claude Code Setup Guide

This guide shows how to connect Claude Code (CLI) to the PropFirms Ticketing MCP server deployed at `https://mcp.propfirmstech.com`.

## Prerequisites

- Claude Code CLI installed
- MCP server deployed and running at `https://mcp.propfirmstech.com/sse`
- API key: `mcp_client_abcd1234`

## Installation Methods

### Option 1: Project-Scoped (Recommended for Teams)

Project-scoped servers are stored in `.mcp.json` at your project root and can be committed to version control for team collaboration.

```bash
# Run from your project directory
claude mcp add --transport sse propfirms-ticketing https://mcp.propfirmstech.com/sse \
  --header "Authorization: Bearer mcp_client_abcd1234"
```

This creates/updates `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "propfirms-ticketing": {
      "type": "sse",
      "url": "https://mcp.propfirmstech.com/sse",
      "headers": {
        "Authorization": "Bearer mcp_client_abcd1234"
      }
    }
  }
}
```

**Commit this file** to share the configuration with your team:
```bash
git add .mcp.json
git commit -m "Add PropFirms ticketing MCP server configuration"
git push
```

### Option 2: User-Scoped (Personal Only)

User-scoped servers are stored in `~/.claude.json` and apply to all your projects but aren't shared with the team.

```bash
# Run from anywhere
claude mcp add --scope user --transport sse propfirms-ticketing https://mcp.propfirmstech.com/sse \
  --header "Authorization: Bearer mcp_client_abcd1234"
```

This updates `~/.claude.json`:

```json
{
  "mcpServers": {
    "propfirms-ticketing": {
      "type": "sse",
      "url": "https://mcp.propfirmstech.com/sse",
      "headers": {
        "Authorization": "Bearer mcp_client_abcd1234"
      }
    }
  }
}
```

## Verification

After adding the server, verify it's working:

```bash
# List configured MCP servers
claude mcp list

# Test the connection (Claude will have access to these tools)
claude "List all open tickets"
```

## Available Tools

Once connected, Claude Code will have access to these tools:

1. **get_ticket** - Get detailed information about a specific ticket
2. **list_tickets** - List tickets with filtering options
3. **search_tickets** - Search tickets by keyword
4. **get_ticket_comments** - Get all comments for a ticket
5. **add_ticket_comment** - Add a new comment to a ticket
6. **update_ticket_status** - Update ticket status
7. **get_companies** - List all companies

## Example Usage

Once configured, you can ask Claude Code:

```bash
# Get ticket information
claude "Show me ticket #123"

# List tickets
claude "List all high priority tickets assigned to John"

# Search tickets
claude "Search for tickets about login issues"

# Add comments
claude "Add a comment to ticket #123 saying 'Working on this now'"

# Update status
claude "Mark ticket #123 as in progress"
```

## Troubleshooting

### Connection Issues

If Claude Code can't connect:

1. **Check server status:**
   ```bash
   curl https://mcp.propfirmstech.com/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test SSE endpoint:**
   ```bash
   curl -H "Authorization: Bearer mcp_client_abcd1234" \
     https://mcp.propfirmstech.com/sse
   ```

3. **Verify API key** - Make sure you're using the correct key

### Remove Server

If you need to remove the server:

```bash
# Remove from project
claude mcp remove propfirms-ticketing

# Remove from user config
claude mcp remove --scope user propfirms-ticketing
```

## Security Notes

- The API key provides full access to the ticketing system
- Keep the API key secure and don't commit it to public repositories
- For project-scoped configs, ensure your repository is private
- Rotate the API key if it's compromised

## Team Collaboration

For teams using project-scoped configuration:

1. **First team member** runs the `claude mcp add` command
2. **Commit** the `.mcp.json` file to version control
3. **Other team members** pull the changes
4. Claude Code automatically picks up the configuration

No additional setup needed for team members!

## Support

If you encounter issues:
- Check deployment logs in Coolify
- Verify environment variables are set correctly
- Contact the DevOps team for API key rotation
