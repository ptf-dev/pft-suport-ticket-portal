CREATE TABLE "webhook_relays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "secret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_relays_pkey" PRIMARY KEY ("id")
);
