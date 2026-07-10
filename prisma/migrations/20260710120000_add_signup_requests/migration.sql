-- CreateEnum
CREATE TYPE "SignupStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "signup_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firmName" TEXT NOT NULL,
    "note" TEXT,
    "status" "SignupStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "mappedCompanyId" TEXT,
    "createdUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signup_requests_status_createdAt_idx" ON "signup_requests"("status", "createdAt");
