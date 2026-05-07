# Scheduled Tickets Feature - Deployment Guide

## Prerequisites
- Database access (PostgreSQL)
- Admin access to the application
- Ability to run Prisma migrations

## Deployment Steps

### Step 1: Backup Database (Recommended)
Before applying any migrations, create a database backup:

```bash
# For PostgreSQL
pg_dump -h your-host -U your-user -d your-database > backup_before_scheduled_tickets.sql
```

### Step 2: Review Schema Changes
The migration adds a new nullable column `scheduledDate` to the `tickets` table:

```sql
ALTER TABLE "tickets" ADD COLUMN "scheduledDate" TIMESTAMP(3);
CREATE INDEX "tickets_scheduledDate_idx" ON "tickets"("scheduledDate");
```

**Impact:**
- ✅ Non-breaking change (nullable column)
- ✅ Existing tickets will have `scheduledDate = null`
- ✅ No data loss
- ✅ Backward compatible

### Step 3: Apply Database Migration

#### Option A: Production Deployment
```bash
# Navigate to project directory
cd /path/to/project

# Apply the migration
npx prisma migrate deploy

# Verify migration was applied
npx prisma migrate status
```

#### Option B: Development Environment
```bash
# Apply migration and regenerate client
npx prisma migrate dev

# This will:
# 1. Apply the migration
# 2. Regenerate Prisma Client
# 3. Prompt for migration name (already created)
```

### Step 4: Regenerate Prisma Client
```bash
# Regenerate the Prisma Client with new schema
npx prisma generate
```

### Step 5: Rebuild Application
```bash
# Install dependencies (if needed)
npm install

# Build the application
npm run build
```

### Step 6: Restart Application
```bash
# For PM2
pm2 restart your-app-name

# For Docker
docker-compose restart

# For systemd
sudo systemctl restart your-app-service

# For development
npm run dev
```

### Step 7: Verify Deployment

#### Check Database:
```sql
-- Verify column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'scheduledDate';

-- Verify index was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'tickets' AND indexname = 'tickets_scheduledDate_idx';

-- Check existing tickets (should all have null scheduledDate)
SELECT id, title, "scheduledDate" FROM tickets LIMIT 5;
```

#### Test API Endpoint:
```bash
# Test scheduling a ticket (replace [id] with actual ticket ID)
curl -X PATCH https://your-domain.com/api/admin/tickets/[id]/schedule \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"scheduledDate": "2026-05-08"}'

# Expected response:
# {
#   "message": "Ticket scheduled successfully",
#   "ticket": {
#     "id": "...",
#     "title": "...",
#     "scheduledDate": "2026-05-08T00:00:00.000Z",
#     "updatedAt": "..."
#   }
# }
```

#### Test UI:
1. Log in as an admin
2. Navigate to `/admin/tickets/[any-ticket-id]`
3. Verify "📅 Schedule" button appears
4. Click the button and verify modal opens
5. Schedule the ticket for today
6. Verify button updates to show "📌 Today"
7. Navigate to `/admin/tickets?view=table`
8. Verify "Scheduled For" filters appear
9. Click "📌 Today" filter
10. Verify the scheduled ticket appears

### Step 8: Monitor for Issues

#### Check Application Logs:
```bash
# For PM2
pm2 logs your-app-name

# For Docker
docker-compose logs -f

# Look for any errors related to:
# - Prisma Client
# - Database queries
# - Schedule API endpoint
```

#### Monitor Database Performance:
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname = 'tickets_scheduledDate_idx';

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM tickets
WHERE "scheduledDate" >= CURRENT_DATE
  AND "scheduledDate" < CURRENT_DATE + INTERVAL '1 day';
```

## Rollback Plan

If issues occur, you can rollback the changes:

### Step 1: Restore Database Backup
```bash
# Restore from backup
psql -h your-host -U your-user -d your-database < backup_before_scheduled_tickets.sql
```

### Step 2: Revert Code Changes
```bash
# Revert to previous commit
git revert HEAD

# Or checkout previous version
git checkout previous-commit-hash

# Rebuild
npm run build

# Restart
pm2 restart your-app-name
```

### Step 3: Manual Rollback (Alternative)
If you only want to remove the database changes:

```sql
-- Remove the index
DROP INDEX IF EXISTS "tickets_scheduledDate_idx";

-- Remove the column
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "scheduledDate";
```

Then regenerate Prisma Client with the old schema:
```bash
# Revert schema.prisma to previous version
git checkout HEAD~1 prisma/schema.prisma

# Regenerate client
npx prisma generate

# Rebuild
npm run build
```

## Post-Deployment Tasks

### 1. Update Documentation
- [ ] Update user guide with scheduling instructions
- [ ] Update admin documentation
- [ ] Add scheduling to training materials

### 2. Communicate Changes
- [ ] Notify admin users about new feature
- [ ] Provide quick start guide
- [ ] Schedule training session if needed

### 3. Monitor Usage
- [ ] Track how many tickets are being scheduled
- [ ] Monitor filter usage
- [ ] Gather user feedback

### 4. Performance Monitoring
- [ ] Monitor database query performance
- [ ] Check index usage statistics
- [ ] Monitor API response times

## Troubleshooting

### Issue: "scheduledDate does not exist" Error

**Cause:** Prisma Client not regenerated after schema change

**Solution:**
```bash
npx prisma generate
npm run build
pm2 restart your-app-name
```

### Issue: Migration Fails

**Cause:** Database connection issues or permissions

**Solution:**
```bash
# Check database connection
npx prisma db pull

# Check migration status
npx prisma migrate status

# Try applying migration again
npx prisma migrate deploy
```

### Issue: Schedule Button Not Appearing

**Cause:** Build not updated or cache issue

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Clear browser cache
# Or open in incognito mode
```

### Issue: Filters Not Working

**Cause:** Query parameters not being passed correctly

**Solution:**
1. Check browser console for errors
2. Verify URL parameters are correct
3. Check server logs for API errors
4. Verify Prisma Client is up to date

## Success Criteria

✅ Migration applied successfully
✅ Index created on `scheduledDate`
✅ Prisma Client regenerated
✅ Application builds without errors
✅ Schedule button appears on ticket detail pages
✅ Schedule modal opens and functions correctly
✅ Tickets can be scheduled successfully
✅ Schedule filters work correctly
✅ No errors in application logs
✅ Database queries perform well

## Support

If you encounter issues during deployment:

1. Check the troubleshooting section above
2. Review application logs
3. Check database logs
4. Verify all steps were completed
5. Contact development team if issues persist

## Estimated Deployment Time

- **Small Database (<10k tickets):** 5-10 minutes
- **Medium Database (10k-100k tickets):** 10-20 minutes
- **Large Database (>100k tickets):** 20-30 minutes

**Downtime:** None (migration is non-breaking)

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Status:** ☐ Success ☐ Issues ☐ Rolled Back
**Notes:** _____________________________________________
