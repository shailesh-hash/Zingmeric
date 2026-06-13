-- AlterTable
ALTER TABLE "option_chains" ADD COLUMN "delta" DECIMAL(8,6);

-- CreateIndex
CREATE INDEX "option_chains_underlyingInstrumentId_snapshotAt_optionType_d_idx" ON "option_chains"("underlyingInstrumentId", "snapshotAt", "optionType", "delta");
