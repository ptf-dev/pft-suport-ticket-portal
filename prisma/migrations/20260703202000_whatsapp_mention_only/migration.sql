-- Add mentionOnly toggle to WhatsappGroup
ALTER TABLE "whatsapp_groups" ADD COLUMN "mentionOnly" BOOLEAN NOT NULL DEFAULT true;
