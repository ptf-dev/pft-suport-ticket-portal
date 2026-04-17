-- Add soft delete columns to tickets table
ALTER TABLE "tickets" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tickets" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN "deletedBy" TEXT;
