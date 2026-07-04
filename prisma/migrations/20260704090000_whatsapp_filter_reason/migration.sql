-- Drop FK so we can store rows for unmapped groups too
ALTER TABLE "whatsapp_messages" DROP CONSTRAINT IF EXISTS "whatsapp_messages_groupJid_fkey";

-- Add debuggability columns
ALTER TABLE "whatsapp_messages" ADD COLUMN "filterReason" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN "wasMentioned" BOOLEAN NOT NULL DEFAULT false;

-- Index for quick "why did message X get dropped" queries
CREATE INDEX "whatsapp_messages_filterReason_idx" ON "whatsapp_messages"("filterReason");
