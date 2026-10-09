-- AlterTable
ALTER TABLE "Team" ADD COLUMN "slot" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Team_slot_key" ON "Team"("slot");
