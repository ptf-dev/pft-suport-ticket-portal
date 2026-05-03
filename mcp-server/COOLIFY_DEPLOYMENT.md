# Deploying MCP Server to Coolify

This guide shows you how to deploy the PropFirms Ticketing MCP Server to your Coolify VPS so your team can access it remotely without local installation.

## Benefits of Remote Deployment

✅ **No local setup** - Team members just need a URL and API key
✅ **Centralized** - One server for the whole team
✅ **Always available** - No need to keep local machines running
✅ **Easy updates** - Update once, everyone benefits
✅ **Secure** - API key authentication for all connections

## Prerequisites

1. Coolify instance running
2. Domain or subdomain for MCP server (e.g., `mcp.propfirmstech.com`)
3. Main ticketing portal deployed and accessible
4. API keys generated

## Step 1: Generate API Keys

Generate two API keys:

```bash
# For MCP server to access your ticketing API
node -e "console.log('mcp_sk_' + require('crypto').randomBytes(32).toString('hex'))"

# For team members to access MCP server
node -e "console.log('mcp_client_' + require('crypto').randomBytes(32).toString('hex'))"
```

Save these keys securely!

## Step 2: Add API Key to Main Project

Add to your main ticketing portal's `.env`:

```env
# MCP API Key - allows MCP server to access your API
MCP_API_KEY=mcp_sk_your_first_generated_key
```

Redeploy your main ticketing portal after adding this.

## Step 3: Deploy to Coolify

### Option A: Using Coolify UI

1. **Create New Resource**
   - Go to your Coolify dashboard
   - Click "New Resource"
   - Select "Docker Compose"

2. **Configure Project**
   - Name: `propfirms-mcp-server`
   - Repository: Your git repository URL
   - Branch: `main`
   - Docker Compose Location: `mcp-server/docker-compose.yml`

3. **Set Environment Variables**
   ```env
   TICKETING_BASE_URL=https://portal.propfirmstech.com
   TICKETING_API_KEY=mcp_sk_your_first_generated_key
   MCP_SERVER_API_KEY=mcp_client_your_second_generated_key
   MCP_SERVER_PORT=3001
   DEBUG=false
   ```

4. **Configure Domain**
   - Add domain: `mcp.propfirmstech.com`
   - Enable HTTPS
   - Port: 3001

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

### Option B: Using Dockerfile Directly

1. **Create New Resource**
   - Select "Dockerfile"
   - Repository: Your git repository
   - Dockerfile Location: `mcp-server/Dockerfile`

2. **Set Environment Variables** (same as above)

3. **Configure and Deploy**

## Step 4: Verify Deployment

### Test Health Endpoint

```bash
curl https://mcp.propfirmstech.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "propfirms-ticketing-mcp",
  "version": "1.0.0",
  "timestamp": "2024-..."
}
```

### Test SSE Endpoint

```bash
curl -H "Authorization: Bearer mcp_client_your_key" \
  https://mcp.propfirmstech.com/sse
```

Should establish an SSE connection.

## Step 5: Configure Team Members

### For Claude Desktop Users

Share this configuration with your team:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "propfirms-ticketing": {
      "url": "https://mcp.propfirmstech.com/sse",
      "headers": {
        "Authorization": "Bearer mcp_client_your_second_generated_key"
      }
    }
  }
}
```

### For Other MCP Clients

Provide:
- **URL**: `https://mcp.propfirmstech.com/sse`
- **API Key**: `mcp_client_your_second_generated_key`
- **Transport**: SSE (Server-Sent Events)

## Step 6: Team Instructions

Send this to your team:

---

### 🤖 AI Assistant Setup (2 minutes)

1. **Install Claude Desktop**
   - Download from: https://claude.ai/download

2. **Configure MCP Server**
   - Open Claude Desktop Settings
   - Go to Developer tab
   - Click "Edit Config"
   - Paste this configuration:

```json
{
  "mcpServers": {
    "propfirms-ticketing": {
      "url": "https://mcp.propfirmstech.com/sse",
      "headers": {
        "Authorization": "Bearer [API_KEY_PROVIDED_BY_ADMIN]"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Test It**
   - Type: "What MCP tools do you have?"
   - You should see PropFirms ticketing tools listed

5. **Start Using**
   - Copy any ticket URL
   - Paste in Claude: "Help me with this ticket: [URL]"
   - Claude will read and analyze it!

---

## Security Considerations

### API Key Management

1. **Generate unique keys per environment**
   - Development: `mcp_dev_...`
   - Production: `mcp_prod_...`

2. **Rotate keys periodically**
   - Every 90 days recommended
   - After team member leaves

3. **Monitor usage**
   - Check Coolify logs for suspicious activity
   - Track which tickets are accessed

### Network Security

1. **Use HTTPS only**
   - Coolify handles SSL automatically
   - Never expose HTTP endpoint

2. **Rate limiting** (optional)
   - Add nginx rate limiting in Coolify
   - Prevent abuse

3. **IP whitelisting** (optional)
   - Restrict to office/VPN IPs
   - Configure in Coolify network settings

## Monitoring

### Check Server Status

```bash
# Health check
curl https://mcp.propfirmstech.com/health

# Check logs in Coolify
# Go to your MCP server resource > Logs
```

### Common Issues

**Issue**: "Connection refused"
- Check if server is running in Coolify
- Verify domain DNS is configured
- Check firewall rules

**Issue**: "Unauthorized"
- Verify API key is correct
- Check environment variables in Coolify
- Ensure main portal has MCP_API_KEY set

**Issue**: "Timeout"
- Check if main ticketing portal is accessible
- Verify TICKETING_BASE_URL is correct
- Check network connectivity between services

## Updating the Server

### Method 1: Git Push (Recommended)

1. Push changes to your repository
2. Coolify will auto-deploy (if enabled)
3. Or manually trigger deployment in Coolify UI

### Method 2: Manual Deployment

1. Go to Coolify dashboard
2. Find MCP server resource
3. Click "Redeploy"

## Scaling

### Horizontal Scaling

If you have many team members:

1. **Increase replicas** in Coolify
2. **Add load balancer** (Coolify handles this)
3. **Monitor resource usage**

### Vertical Scaling

If server is slow:

1. Increase CPU/RAM allocation in Coolify
2. Check logs for bottlenecks
3. Optimize API calls if needed

## Backup & Recovery

### Configuration Backup

Save these securely:
- Environment variables
- API keys
- Domain configuration

### Disaster Recovery

1. Keep API keys in password manager
2. Document deployment steps
3. Have rollback plan ready

## Cost Optimization

### Resource Allocation

Start with:
- **CPU**: 0.5 cores
- **RAM**: 512MB
- **Storage**: 1GB

Adjust based on usage.

### Monitoring Usage

Check Coolify metrics:
- CPU usage
- Memory usage
- Network traffic
- Request count

## Advanced Configuration

### Custom Domain

```
mcp.propfirmstech.com → Your MCP server
```

Configure in Coolify:
1. Add domain
2. Enable SSL
3. Configure DNS (A record or CNAME)

### Multiple Environments

Deploy separate instances:
- `mcp-dev.propfirmstech.com` - Development
- `mcp-staging.propfirmstech.com` - Staging  
- `mcp.propfirmstech.com` - Production

### Logging

Enable detailed logging:
```env
DEBUG=true
```

View logs in Coolify dashboard.

## Support

### Troubleshooting Checklist

- [ ] Server is running in Coolify
- [ ] Health endpoint returns 200
- [ ] Domain DNS is configured
- [ ] SSL certificate is valid
- [ ] Environment variables are set
- [ ] Main portal is accessible
- [ ] API keys are correct
- [ ] Team members have correct config

### Getting Help

1. Check Coolify logs
2. Test endpoints with curl
3. Verify environment variables
4. Contact DevOps team

## Next Steps

After deployment:

1. ✅ Test with your own Claude Desktop
2. ✅ Share configuration with one team member (beta test)
3. ✅ Gather feedback
4. ✅ Roll out to entire team
5. ✅ Monitor usage and performance
6. ✅ Collect success stories
7. ✅ Iterate and improve

## Resources

- [Coolify Documentation](https://coolify.io/docs)
- [MCP Protocol Spec](https://modelcontextprotocol.io)
- [Claude Desktop Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)

---

**Questions?** Contact your DevOps team or create an issue in the project repository.
