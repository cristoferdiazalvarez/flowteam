-- CreateTable
CREATE TABLE "StorageBlob" (
    "key" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageBlob_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "StorageBlob_workspaceId_idx" ON "StorageBlob"("workspaceId");

-- AddForeignKey
ALTER TABLE "StorageBlob" ADD CONSTRAINT "StorageBlob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorageBlob" ADD CONSTRAINT "StorageBlob_size_check"
CHECK ("size" = octet_length("content") AND "size" > 0 AND "size" <= 1048576);
