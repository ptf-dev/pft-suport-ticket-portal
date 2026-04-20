#!/bin/bash

# Script to apply and verify the ticket assignment migration
# Usage: ./scripts/apply-ticket-assignment-migration.sh

set -e

echo "=========================================="
echo "Ticket Assignment Migration Script"
echo "=========================================="
echo ""

# Check if database is accessible
echo "1. Checking database connectivity..."
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✓ Database is accessible"
else
    echo "   ✗ Database is not accessible"
    echo ""
    echo "Please ensure:"
    echo "  - Database server is running"
    echo "  - DATABASE_URL in .env is correct"
    echo "  - Network connectivity is available"
    exit 1
fi

echo ""
echo "2. Applying migration..."
npx prisma migrate deploy

echo ""
echo "3. Verifying migration..."

# Run verification queries
echo "   Checking columns..."
COLUMNS=$(npx prisma db execute --stdin <<< "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
  AND column_name IN ('assignedToId', 'assignedAt');
")

if echo "$COLUMNS" | grep -q "assignedToId"; then
    echo "   ✓ assignedToId column exists"
else
    echo "   ✗ assignedToId column not found"
    exit 1
fi

if echo "$COLUMNS" | grep -q "assignedAt"; then
    echo "   ✓ assignedAt column exists"
else
    echo "   ✗ assignedAt column not found"
    exit 1
fi

echo "   Checking index..."
INDEX=$(npx prisma db execute --stdin <<< "
SELECT indexname
FROM pg_indexes
WHERE tablename = 'tickets'
  AND indexname = 'tickets_assignedToId_idx';
")

if echo "$INDEX" | grep -q "tickets_assignedToId_idx"; then
    echo "   ✓ Index on assignedToId exists"
else
    echo "   ✗ Index not found"
    exit 1
fi

echo "   Checking foreign key constraint..."
FK=$(npx prisma db execute --stdin <<< "
SELECT conname
FROM pg_constraint
WHERE conname = 'tickets_assignedToId_fkey';
")

if echo "$FK" | grep -q "tickets_assignedToId_fkey"; then
    echo "   ✓ Foreign key constraint exists"
else
    echo "   ✗ Foreign key constraint not found"
    exit 1
fi

echo "   Checking existing tickets..."
TICKET_COUNT=$(npx prisma db execute --stdin <<< "
SELECT COUNT(*) as total,
       COUNT(CASE WHEN \"assignedToId\" IS NULL THEN 1 END) as unassigned
FROM tickets;
")

echo "   $TICKET_COUNT"

echo ""
echo "=========================================="
echo "Migration completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify the application can read ticket data"
echo "  2. Test assignment functionality in the UI"
echo "  3. Monitor logs for any issues"
