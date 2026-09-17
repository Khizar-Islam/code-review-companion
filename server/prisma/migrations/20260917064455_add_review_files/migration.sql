-- CreateTable
CREATE TABLE "ReviewFile" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "patch" TEXT,

    CONSTRAINT "ReviewFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReviewFile" ADD CONSTRAINT "ReviewFile_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
