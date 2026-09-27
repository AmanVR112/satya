-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "verificationRequestId" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "needsVerification" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Claim_verificationRequestId_idx" ON "Claim"("verificationRequestId");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
