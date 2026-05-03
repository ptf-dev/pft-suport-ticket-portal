# MCP Server Deployment - Next Steps

## Current Status

✅ **Dockerfile fixed** - Changed from `npm install` to `npm ci` for reproducible builds
✅ **package-lock.json committed** - Ensures consistent dependency versions
✅ **Code pushed to GitHub** - Coolify will auto-deploy on next webhook trigger

## What Just Happened

1. Fixed the Dockerfile to use `npm ci` instead of `npm install`
2. Created comprehensive Claude Code setup guide
3. Pushed changes to trigger Coolify deployment

## Next Steps

### 1. Monitor Coolify Deployment

Go to your Coolify dashboard and watch the deployment:
- URL: Your Coolify instance
- Project: PFT Tickets PORTAL
- Service: MCP server (SERVER 2 PFT)

**Expected outcome:** Build should succeed now with `npm ci`

### 2. Verify Deployment

Once deployed, test the endpoints:

```bash
# Health check
curl https://mcp.propfirmstech.com/health

# SSE endpoint (should return event stream)
curl -H "Authorization: Bearer mcp_client_cb919618295d724e263644b9f05791fe79f00c18706c1604f678626c72c0701a" \
  https://mcp.propfirmstech.com/sse
```

### 3. Connect Claude Code

**For team collaboration (recommended):**

```bash
# Run from your project directory
claude mcp add --transport sse propfirms-ticketing https://mcp.propfirmstech.com/sse \
  --header "Authorization: Bearer mcp_client_cb919618295d724e263644b9f05791fe79f00c18706c1604f678626c72c0701a"

# Commit the .mcp.json file
git add .mcp.json
git commit -m "Add PropFirms ticketing MCP server"
git push
```

**For personal use only:**

```bash
# Run from anywhere
claude mcp add --scope user --transport sse propfirms-ticketing https://mcp.propfirmstech.com/sse \
  --header "Authorization: Bearer mcp_client_cb919618295d724e263644b9f05791fe79f00c18706c1604f678626c72c0701a"
```

### 4. Test the Connection

```bash
# List configured servers
claude mcp list

# Test with a query
claude "List all open tickets"
```

### 5. Update Main Portal (If Needed)

The main portal at `portal.propfirmstech.com` needs the `MCP_API_KEY` environment variable:

1. Go to Coolify → PFT Tickets PORTAL (main app)
2. Add environment variable:
   ```
   MCP_API_KEY=mcp_sk_a50ec7396c71c17086768bac85d70c2e199c3f11f29a6e1b39d9167e1408fea0
   ```
3. Redeploy the main portal

## Environment Variables Summary

### MCP Server (mcp.propfirmstech.com)
```env
TICKETING_BASE_URL=https://portal.propfirmstech.com
TICKETING_API_KEY=mcp_sk_a50ec7396c71c17086768bac85d70c2e199c3f11f29a6e1b39d9167e1408fea0
MCP_SERVER_API_KEY=mcp_client_cb919618295d724e263644b9f05791fe79f00c18706c1604f678626c72c0701a
```

### Main Portal (portal.propfirmstech.com)
```env
MCP_API_KEY=mcp_sk_a50ec7396c71c17086768bac85d70c2e199c3f11f29a6e1b39d9167e1408fea0
```

## Available Tools

Once connected, Claude will have access to:

1. **get_ticket** - Get ticket details
2. **list_tickets** - List/filter tickets
3. **search_tickets** - Search by keyword
4. **get_ticket_comments** - Get comments
5. **add_ticket_comment** - Add comments
6. **update_ticket_status** - Update status
7. **get_companies** - List companies

## Documentation

- **Claude Code Setup:** `mcp-server/CLAUDE_CODE_SETUP.md`
- **Complete Guide:** `MCP_COMPLETE_GUIDE.md`
- **Team Guide:** `mcp-server/TEAM_GUIDE.md`
- **Testing:** `mcp-server/TESTING.md`
- **Coolify Deployment:** `mcp-server/COOLIFY_DEPLOYMENT.md`

## Troubleshooting

If deployment still fails:

1. Check Coolify logs for specific error
2. Verify all environment variables are set
3. Check if package-lock.json is in the repository
4. Try manual Docker build locally:
   ```bash
   cd mcp-server
   docker build -t test-mcp .
   ```

## Security Notes

- API keys provide full access - keep them secure
- For project-scoped configs, ensure repository is private
- Rotate keys if compromised
- Don't commit keys to public repositories

## Team Onboarding

For new team members:

1. Pull the repository
2. If `.mcp.json` exists, Claude Code auto-configures
3. If not, run the `claude mcp add` command
4. Start using: `claude "List all tickets"`

That's it! No local installation needed - just URL + API key.
