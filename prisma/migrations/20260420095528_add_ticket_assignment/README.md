# Migration: add_ticket_assignment

## Overview
This migration adds ticket assignment functionality to the support ticket system, enabling admins to assign tickets to specific admin users (agents).

## Changes

### Schema Changes
1. **Added `assignedToId` column** to `tickets` table
   - Type: TEXT (nullable)
   - References: `users.id`
   - Purpose: Stores the ID of the admin user assigned to the ticket

2. **Added `assignedAt` column** to `tickets` table
   - Type: TIMESTAMP(3) (nullable)
   - Purpose: Records when the ticket was assigned

3. **Added index** on `assignedToId`
   - Name: `tickets_assignedToId_idx`
   - Purpose: Improves query performance for filtering/sorting by assignment

4. **Added foreign key constraint**
   - Name: `tickets_assignedToId_fkey`
   - References: `users(id)`
   - On Delete: SET NULL (preserves ticket if user is deleted)
   - On Update: CASCADE (updates reference if user ID changes)

## Requirements Satisfied
- Requirement 1.1: Optional assignedToId field
- Requirement 1.2: Optional assignedAt timestamp field
- Requirement 1.3: Nullable fields (unassigned tickets)
- Requirement 1.4: Assignment timestamp recording
- Requirement 1.5: Referential integrity with User model

## How to Apply

### When Database is Accessible
```bash
# Apply the migration
npx prisma migrate deploy

# Or in development
npx prisma migrate dev
```

### Verification Steps
After applying the migration:

1. **Verify columns exist:**
   ```sql
   \d tickets
   ```
   Should show `assignedToId` and `assignedAt` columns.

2. **Run verification queries:**
   ```bash
   psql $DATABASE_URL -f prisma/migrations/20260420095528_add_ticket_assignment/verify_migration.sql
   ```

3. **Check existing tickets:**
   All existing tickets should have NULL values for both `assignedToId` and `assignedAt`.

## Rollback
If you need to rollback this migration:

```sql
-- Remove foreign key constraint
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_assignedToId_fkey";

-- Remove index
DROP INDEX IF EXISTS "tickets_assignedToId_idx";

-- Remove columns
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "assignedAt";
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "assignedToId";
```

## Notes
- This migration is **safe to run on production** - it only adds nullable columns
- No data migration is required - existing tickets remain unassigned
- The foreign key uses `ON DELETE SET NULL` to preserve tickets if an assigned user is deleted
- The index improves performance for queries filtering or sorting by assignment
