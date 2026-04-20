# Ticket Assignment Migration Guide

## Overview
Task 1.2 has created the database migration for the ticket assignment feature. The migration files have been generated and are ready to be applied when the database is accessible.

## Current Status
✅ **Migration files created** in `prisma/migrations/20260420095528_add_ticket_assignment/`
⏳ **Migration not yet applied** - Database is currently not accessible

## What Was Created

### 1. Migration SQL File
**Location:** `prisma/migrations/20260420095528_add_ticket_assignment/migration.sql`

This file contains the SQL commands to:
- Add `assignedToId` column (nullable TEXT)
- Add `assignedAt` column (nullable TIMESTAMP)
- Create index on `assignedToId` for performance
- Add foreign key constraint to `users` table

### 2. Verification Queries
**Location:** `prisma/migrations/20260420095528_add_ticket_assignment/verify_migration.sql`

SQL queries to verify the migration was applied correctly:
- Check columns exist with correct types
- Verify index was created
- Verify foreign key constraint
- Confirm existing tickets have NULL assignment values

### 3. Migration README
**Location:** `prisma/migrations/20260420095528_add_ticket_assignment/README.md`

Comprehensive documentation including:
- Schema changes
- Requirements satisfied
- How to apply
- Verification steps
- Rollback instructions

### 4. Automated Script
**Location:** `scripts/apply-ticket-assignment-migration.sh`

Bash script that:
- Checks database connectivity
- Applies the migration
- Runs verification checks
- Reports success/failure

## How to Apply the Migration

### Option 1: Using the Automated Script (Recommended)
```bash
./scripts/apply-ticket-assignment-migration.sh
```

This script will:
1. Check if the database is accessible
2. Apply the migration using `prisma migrate deploy`
3. Verify all changes were applied correctly
4. Report the status of existing tickets

### Option 2: Manual Application
```bash
# Apply the migration
npx prisma migrate deploy

# Verify it worked
psql $DATABASE_URL -f prisma/migrations/20260420095528_add_ticket_assignment/verify_migration.sql
```

### Option 3: Development Environment
```bash
# In development, this will apply and update Prisma Client
npx prisma migrate dev
```

## When to Apply

### Production Environment
The migration should be applied when:
1. The database server is accessible
2. You have a maintenance window (though this is a non-breaking change)
3. You're ready to deploy the assignment feature code

### Development/Staging
Apply immediately to test the feature before production deployment.

## Verification Checklist

After applying the migration, verify:

- [ ] Migration applied without errors
- [ ] `assignedToId` column exists in `tickets` table
- [ ] `assignedAt` column exists in `tickets` table
- [ ] Index `tickets_assignedToId_idx` exists
- [ ] Foreign key constraint `tickets_assignedToId_fkey` exists
- [ ] All existing tickets have NULL values for assignment fields
- [ ] Application can query tickets without errors
- [ ] Prisma Client is regenerated (`npx prisma generate`)

## Safety Notes

✅ **Safe for Production:**
- Only adds nullable columns (no data changes required)
- No breaking changes to existing functionality
- Existing tickets remain unassigned (NULL values)
- Foreign key uses `ON DELETE SET NULL` (preserves tickets if user deleted)

⚠️ **Important:**
- Regenerate Prisma Client after applying: `npx prisma generate`
- Restart the application to use the updated schema
- Test assignment functionality before announcing to users

## Rollback

If you need to rollback (unlikely), run:

```sql
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_assignedToId_fkey";
DROP INDEX IF EXISTS "tickets_assignedToId_idx";
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "assignedAt";
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "assignedToId";
```

Or use Prisma:
```bash
npx prisma migrate resolve --rolled-back 20260420095528_add_ticket_assignment
```

## Next Steps

After successfully applying the migration:

1. ✅ **Task 1.2 Complete** - Migration applied and verified
2. ➡️ **Task 2.1** - Create assignment API route
3. ➡️ **Task 2.2** - Implement assignment validation logic
4. Continue with remaining tasks in the implementation plan

## Troubleshooting

### Database Not Accessible
**Error:** `Can't reach database server`

**Solution:**
- Check DATABASE_URL in .env file
- Verify database server is running
- Check network connectivity
- Ensure firewall allows connection

### Migration Already Applied
**Error:** `Migration has already been applied`

**Solution:**
- This is fine! The migration is already in the database
- Verify with: `npx prisma migrate status`
- Continue to next task

### Foreign Key Violation
**Error:** `Foreign key constraint fails`

**Solution:**
- This shouldn't happen with nullable columns
- Check if any data was manually inserted
- Verify users table exists and has correct structure

## Contact

If you encounter issues:
1. Check the migration README in the migration folder
2. Review Prisma migration documentation
3. Check application logs for errors
4. Verify database schema matches Prisma schema
