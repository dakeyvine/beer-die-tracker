-- CreateTable
CREATE TABLE "GameAdjustment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameId" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,

    CONSTRAINT "GameAdjustment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GameAdjustment" ADD CONSTRAINT "GameAdjustment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
