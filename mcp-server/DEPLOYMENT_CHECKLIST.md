# 📋 MCP Server Deployment Checklist

Use this checklist to ensure smooth deployment to Coolify.

## Pre-Deployment

### 1. Generate API Keys

- [ ] Generate MCP API key for server-to-server auth
  ```bash
  node -e "console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))"
  ```
  Result: `_______________________________________`

- [ ] Generate MCP Server API key for client auth
  ```bash
  node -e "console.log('mcp_client_' + require('crypto').randomBytes(32).toString('hex'))"
  ```
  Result: `_______________________________________`

- [ ] Store keys securely (password manager)

### 2. Update Main Project

- [ ] Add `MCP_API_KEY` to main project's `.env`
- [ ] Commit and push changes
- [ ] Redeploy main ticketing portal
- [ ] Verify portal is accessible

### 3. Test API Endpoints Locally

- [ ] Start your local Next.js server
- [ ] Test get ticket endpoint:
  ```bash
  curl -H "Authorization: Bearer YOUR_MCP_API_KEY" \
    http://localhost:3000/api/mcp/tickets/TICKET_ID
  ```
- [ ] Test list tickets endpoint
- [ ] Test search endpoint
- [ ] All endpoints return valid JSON

## Deployment to Coolify

### 4. Prepare MCP Server

- [ ] Review `mcp-server/Dockerfile`
- [ ] Review `mcp-server/docker-compose.yml`
- [ ] Commit all MCP server files
- [ ] Push to repository

### 5. Create Coolify Resource

- [ ] Log into Coolify dashboard
- [ ] Click "New Resource"
- [ ] Select "Docker Compose" or "Dockerfile"
- [ ] Configure:
  - Name: `propfirms-mcp-server`
  - Repository: Your git URL
  - Branch: `main`
  - Path: `mcp-server/`

### 6. Configure Environment Variables

Add these in Coolify:

- [ ] `TICKETING_BASE_URL=https://portal.propfirmstech.com`
- [ ] `TICKETING_API_KEY=mcp_sk_...` (from step 1)
- [ ] `MCP_SERVER_API_KEY=mcp_client_...` (from step 1)
- [ ] `MCP_SERVER_PORT=3001`
- [ ] `DEBUG=false`

### 7. Configure Domain

- [ ] Add domain: `mcp.propfirmstech.com`
- [ ] Enable HTTPS/SSL
- [ ] Set port: `3001`
- [ ] Save configuration

### 8. Deploy

- [ ] Click "Deploy" button
- [ ] Wait for build to complete
- [ ] Check logs for errors
- [ ] Verify "Server listening on port 3001" message

## Post-Deployment Testing

### 9. Test Health Endpoint

- [ ] Test health check:
  ```bash
  curl https://mcp.propfirmstech.com/health
  ```
- [ ] Response shows `"status": "healthy"`

### 10. Test SSE Endpoint

- [ ] Test SSE connection:
  ```bash
  curl -H "Authorization: Bearer YOUR_MCP_SERVER_API_KEY" \
    https://mcp.propfirmstech.com/sse
  ```
- [ ] Connection established (doesn't immediately close)

### 11. Test with Claude Desktop (Your Account)

- [ ] Install Claude Desktop (if not already)
- [ ] Edit config file:
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- [ ] Add configuration:
  ```json
  {
    "mcpServers": {
      "propfirms-ticketing": {
        "url": "https://mcp.propfirmstech.com/sse",
        "headers": {
          "Authorization": "Bearer YOUR_MCP_SERVER_API_KEY"
        }
      }
    }
  }
  ```
- [ ] Restart Claude Desktop
- [ ] Ask: "What MCP tools do you have?"
- [ ] Verify PropFirms ticketing tools are listed

### 12. Test Functionality

- [ ] Test get ticket: "Get ticket [TICKET_ID]"
- [ ] Test list tickets: "Show me all open tickets"
- [ ] Test search: "Search for tickets about 'test'"
- [ ] Test add comment: "Add a test comment to ticket [ID]"
- [ ] Verify comment appears in portal
- [ ] Test update status: "Update ticket [ID] to IN_PROGRESS"
- [ ] Verify status changed in portal

## Team Rollout

### 13. Beta Testing

- [ ] Select 1-2 team members for beta test
- [ ] Share configuration (use `TEAM_CONFIG_TEMPLATE.md`)
- [ ] Provide API key
- [ ] Help them set up Claude Desktop
- [ ] Gather feedback
- [ ] Fix any issues

### 14. Documentation

- [ ] Customize `TEAM_CONFIG_TEMPLATE.md` with your details
- [ ] Add your MCP server URL
- [ ] Add support contact info
- [ ] Add any team-specific instructions

### 15. Team Training

- [ ] Schedule team meeting/demo
- [ ] Show live examples
- [ ] Share documentation
- [ ] Answer questions
- [ ] Provide support channel (Slack, etc.)

### 16. Full Rollout

- [ ] Share config with all team members
- [ ] Provide individual API keys (or shared key)
- [ ] Monitor usage
- [ ] Collect feedback
- [ ] Address issues quickly

## Monitoring & Maintenance

### 17. Set Up Monitoring

- [ ] Check Coolify logs regularly
- [ ] Monitor resource usage (CPU, RAM)
- [ ] Track request counts
- [ ] Set up alerts for downtime

### 18. Security

- [ ] Verify HTTPS is working
- [ ] Test with invalid API key (should fail)
- [ ] Review access logs
- [ ] Plan key rotation schedule (every 90 days)

### 19. Performance

- [ ] Test response times
- [ ] Check for slow queries
- [ ] Optimize if needed
- [ ] Scale resources if necessary

### 20. Documentation

- [ ] Keep deployment docs updated
- [ ] Document any issues and solutions
- [ ] Update team guide based on feedback
- [ ] Create FAQ if needed

## Success Criteria

All of these should be ✅:

- [ ] Health endpoint returns 200
- [ ] SSE endpoint accepts connections
- [ ] Claude Desktop shows MCP tools
- [ ] Can fetch ticket details
- [ ] Can list and search tickets
- [ ] Can add comments (visible in portal)
- [ ] Can update ticket status (reflected in portal)
- [ ] No errors in Coolify logs
- [ ] Team members can connect
- [ ] Response times < 1 second
- [ ] HTTPS certificate valid
- [ ] Documentation is complete

## Rollback Plan

If something goes wrong:

- [ ] Keep old API keys active during transition
- [ ] Have backup of configuration
- [ ] Know how to revert deployment in Coolify
- [ ] Have team contact list ready
- [ ] Document what went wrong

## Notes

Use this space for deployment-specific notes:

```
Deployment Date: _______________
Deployed By: _______________
MCP Server URL: _______________
Issues Encountered: _______________
_______________
_______________
Resolution: _______________
_______________
_______________
```

## Post-Deployment

After successful deployment:

- [ ] Celebrate! 🎉
- [ ] Monitor for first 24 hours
- [ ] Gather initial feedback
- [ ] Plan improvements
- [ ] Share success stories

---

**Deployment Complete!** ✅

Your team now has AI-powered support ticket assistance!
