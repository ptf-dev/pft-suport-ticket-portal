# Coolify Deployment Guide - Scheduled Tickets Feature

## 🚀 Quick Deployment Steps

### Step 1: Push Code to Git ✅

```bash
# Stage all changes
git add .

# Commit
git commit -m "feat: Add scheduled ticket handling with date-based filtering"

# Push to your repository
git push origin main
```

### Step 2: Wait for Coolify Auto-Deploy 🔄

Coolify will automatically:
- ✅ Pull the latest code
- ✅ Run `npm install`
- ✅ Run `npm run build` (which includes `prisma generate`)
- ✅ Restart the application

**BUT** - Coolify won't automatically run database migrations!

### Step 3: Run Database Migration 🗄️

You have **3 options**:

---

## Option A: Coolify Terminal (Recommended) ⭐

### Steps:

1. **Open Coolify Dashboard**
   - Go to your Coolify URL
   - Navigate to your application

2. **Open Terminal/Execute Command**
   - Look for "Terminal", "Execute Command", or "Shell" button
   - This opens a terminal inside your running container

3. **Run Migration Commands**
   ```bash
   # Run the migration
   npm run db:migrate:deploy
   
   # Or directly:
   npx prisma migrate deploy
   ```

4. **Verify Migration**
   ```bash
   # Check migration status
   npx prisma migrate status
   
   # Should show: "Database schema is up to date!"
   ```

5. **Restart Application**
   - Click the "Restart" button in Coolify
   - Or the app will automatically pick up changes

### Troubleshooting:
If you get "command not found":
```bash
# Navigate to app directory first
cd /app

# Then run migration
npx prisma migrate deploy
```

---

## Option B: Add to Build Script (Automated) 🤖

### Update package.json:

Change the build script to include migration:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

### ⚠️ Warning:
This will run migrations on **every build**, which is:
- ✅ Good: Fully automated
- ❌ Risk: Migrations run even on failed builds
- ❌ Risk: No manual control over when migrations run

### Recommended Alternative:
Create a separate deployment script:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "deploy": "prisma migrate deploy && npm run build"
  }
}
```

Then configure Coolify to run `npm run deploy` instead of `npm run build`.

---

## Option C: SSH into Server 🖥️

If you have SSH access to the Coolify server:

```bash
# SSH into your server
ssh user@your-coolify-server.com

# Find your container
docker ps | grep propfirmstech

# Execute command in container
docker exec -it <container-id> npx prisma migrate deploy

# Or enter the container
docker exec -it <container-id> /bin/sh
cd /app
npx prisma migrate deploy
exit
```

---

## 🔍 Verification Steps

After running the migration, verify it worked:

### 1. Check Migration Status
```bash
npx prisma migrate status
```

Expected output:
```
Database schema is up to date!

The following migrations are applied:
  20260409193900_init
  20260410141217_add_smtp_settings
  20260417130827_add_comment_images_and_mentions
  20260417132226_add_soft_delete_to_tickets
  20260420095528_add_ticket_assignment
  20260507124905_add_scheduled_date_to_tickets  ← New!
```

### 2. Check Database Directly
If you have database access:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND column_name = 'scheduledDate';

-- Check if index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'tickets' 
  AND indexname = 'tickets_scheduledDate_idx';
```

### 3. Test the Feature
1. Open your app: `https://portal.propfirmstech.com`
2. Log in as admin
3. Open any ticket
4. Look for the "📅 Schedule" button
5. Click it and try scheduling a ticket
6. Go to tickets table and test the filters

---

## 🐛 Troubleshooting

### Issue: "Can't reach database server"

**Cause:** Database connection issue

**Solution:**
```bash
# Check DATABASE_URL environment variable
echo $DATABASE_URL

# Verify database is accessible
npx prisma db pull
```

### Issue: "Migration failed"

**Cause:** Database permissions or existing data issues

**Solution:**
```bash
# Check what's wrong
npx prisma migrate status

# If needed, mark migration as applied (use with caution!)
npx prisma migrate resolve --applied 20260507124905_add_scheduled_date_to_tickets
```

### Issue: "scheduledDate does not exist" error in app

**Cause:** Prisma Client not regenerated after migration

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate

# Restart the application
# (Use Coolify's restart button)
```

### Issue: Terminal not available in Coolify

**Solution:**
1. Check Coolify documentation for your version
2. Use SSH method (Option C)
3. Or temporarily add migration to build script (Option B)

---

## 📋 Complete Deployment Checklist

- [ ] Code pushed to Git
- [ ] Coolify auto-deployed successfully
- [ ] Migration executed (`npx prisma migrate deploy`)
- [ ] Migration status verified
- [ ] Prisma Client regenerated (if needed)
- [ ] Application restarted
- [ ] Schedule button appears on ticket pages
- [ ] Schedule modal opens and works
- [ ] Filters appear in tickets table
- [ ] Can schedule a ticket successfully
- [ ] Filters work correctly
- [ ] No errors in application logs

---

## 🔄 Rollback Plan

If something goes wrong:

### Quick Rollback:
```bash
# In Coolify terminal or SSH
cd /app

# Rollback the migration
npx prisma migrate resolve --rolled-back 20260507124905_add_scheduled_date_to_tickets

# Remove the column manually if needed
npx prisma db execute --stdin <<EOF
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "scheduledDate";
DROP INDEX IF EXISTS "tickets_scheduledDate_idx";
EOF
```

### Full Rollback:
1. Revert the Git commit
2. Push to Git
3. Coolify will auto-deploy the old version
4. Run rollback commands above

---

## 💡 Pro Tips

### Tip 1: Check Logs
Always check Coolify logs after deployment:
- Look for Prisma migration messages
- Check for any errors during build
- Verify app started successfully

### Tip 2: Test in Staging First
If you have a staging environment:
1. Deploy to staging first
2. Run migration there
3. Test thoroughly
4. Then deploy to production

### Tip 3: Backup Database
Before running migrations in production:
```bash
# If you have database access
pg_dump -h your-db-host -U your-user -d your-db > backup_before_scheduled_tickets.sql
```

### Tip 4: Monitor After Deployment
- Check application logs for errors
- Monitor database performance
- Test the feature immediately
- Have rollback plan ready

---

## 📞 Need Help?

If you encounter issues:

1. **Check Coolify Logs**
   - Build logs
   - Application logs
   - Database logs

2. **Check Application Logs**
   - Look for Prisma errors
   - Check for TypeScript errors
   - Verify environment variables

3. **Verify Database Connection**
   ```bash
   npx prisma db pull
   ```

4. **Check Migration Files**
   - Ensure migration file exists in `prisma/migrations/`
   - Verify SQL syntax is correct

---

## ✅ Success Indicators

You'll know it worked when:
- ✅ No errors in Coolify logs
- ✅ Migration shows as "applied" in status
- ✅ Schedule button appears on ticket pages
- ✅ Schedule modal opens without errors
- ✅ Can schedule tickets successfully
- ✅ Filters work in tickets table
- ✅ No console errors in browser
- ✅ No errors in application logs

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Migration Status:** ☐ Success ☐ Failed ☐ Rolled Back
**Notes:** _____________________________________________
