# Deployment Fixes Summary

## Issues Fixed

### 1. Main Portal Build Errors
**Problem**: TypeScript compilation errors in MCP API routes due to incorrect Prisma schema field names.

**Files Fixed**:
- `app/api/mcp/tickets/[id]/comments/route.ts`
- `app/api/mcp/tickets/[id]/route.ts`

**Changes Made**:
- Changed `user` → `author` (TicketComment relation)
- Changed `content` → `message` (TicketComment field)
- Changed `userId` → `authorId` (TicketComment field)
- Removed `createdAt` from CommentImage select (field doesn't exist, use `uploadedAt` if needed)
- Added `password` field when creating MCP bot user

### 2. MCP Server Build Errors
**Problem**: `npm ci` failing because the `prepare` script runs `npm run build` before source files are copied.

**File Fixed**:
- `mcp-server/Dockerfile`

**Changes Made**:
- Changed `RUN npm ci` → `RUN npm ci --ignore-scripts`
- This skips the `prepare` script during dependency installation
- The build happens explicitly later after source files are copied

## Commits Pushed

1. `5740b70` - fix: correct schema field names in MCP comments API (message/author instead of content/user)
2. `d865feb` - fix: skip prepare script during npm ci in Docker (source not copied yet)
3. `fca092c` - fix: correct schema field names in MCP ticket route (author/message, remove createdAt from images)

## Expected Results

### Main Portal (`portal.propfirmstech.com`)
✅ Should build successfully now
✅ All TypeScript errors resolved
✅ MCP API endpoints will work correctly

### MCP Server (`mcp.propfirmstech.com`)
✅ Should build successfully now
✅ Dependencies install without errors
✅ Server will be accessible at `/health` and `/sse` endpoints

## Next Steps

1. **Monitor Coolify Deployments**
   - Check both deployments succeed
   - Main portal should show "Running"
   - MCP server should show "Running"

2. **Test Main Portal**
   ```bash
   curl https://portal.propfirmstech.com/api/health
   ```

3. **Test MCP Server**
   ```bash
   # Health check
   curl https://mcp.propfirmstech.com/health
   
   # Should return: {"status":"ok","timestamp":"..."}
   ```

4. **Connect Claude Code**
   ```bash
   # Project-scoped (recommended)
   claude mcp add --transport sse propfirms-ticketing https://mcp.propfirmstech.com/sse \
     --header "Authorization: Bearer mcp_client_cb919618295d724e263644b9f05791fe79f00c18706c1604f678626c72c0701a"
   
   # Verify
   claude mcp list
   
   # Test
   claude "List all open tickets"
   ```

5. **Add MCP_API_KEY to Main Portal** (if not already set)
   - Go to Coolify → Main Portal → Environment Variables
   - Add: `MCP_API_KEY=mcp_sk_a50ec7396c71c17086768bac85d70c2e199c3f11f29a6e1b39d9167e1408fea0`
   - Redeploy if needed

## Schema Reference

For future reference, here are the correct field names:

### TicketComment Model
```prisma
model TicketComment {
  id             String   @id @default(cuid())
  ticketId       String
  authorId       String   // NOT userId
  message        String   // NOT content
  internal       Boolean
  mentionedUsers String[]
  createdAt      DateTime
  
  ticket Ticket
  author User            // NOT user
  images CommentImage[]
}
```

### CommentImage Model
```prisma
model CommentImage {
  id         String   @id @default(cuid())
  commentId  String
  filename   String
  url        String
  size       Int
  mimeType   String
  uploadedAt DateTime  // NOT createdAt
  
  comment TicketComment
}
```

## Troubleshooting

If deployments still fail:

1. **Check Coolify logs** for specific errors
2. **Verify environment variables** are set correctly
3. **Check git commit** - make sure latest commit is being deployed
4. **Try manual redeploy** in Coolify dashboard

## Documentation

- **Claude Code Setup**: `mcp-server/CLAUDE_CODE_SETUP.md`
- **Complete MCP Guide**: `MCP_COMPLETE_GUIDE.md`
- **Team Guide**: `mcp-server/TEAM_GUIDE.md`
- **Testing Guide**: `mcp-server/TESTING.md`
- **Coolify Deployment**: `mcp-server/COOLIFY_DEPLOYMENT.md`
