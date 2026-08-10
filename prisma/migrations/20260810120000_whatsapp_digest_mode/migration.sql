-- Per-group choice between posting every event and posting one periodic summary.
-- Existing groups default to INSTANT, so current behaviour is unchanged.
CREATE TYPE "WhatsappNotifyMode" AS ENUM ('INSTANT', 'DIGEST');

ALTER TABLE "whatsapp_groups"
  ADD COLUMN "notifyMode" "WhatsappNotifyMode" NOT NULL DEFAULT 'INSTANT',
  ADD COLUMN "lastDigestAt" TIMESTAMP(3);
