-- Make AIConversation.provider and AIConversation.model nullable
-- so conversations can exist before a provider is assigned.
-- SQLite does not support ALTER COLUMN ... DROP NOT NULL, so we
-- recreate the table. This is safe because existing rows already
-- have provider/model values (backward compatible).

BEGIN TRANSACTION;

CREATE TABLE "AIConversation_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'گفتگوی جدید',
  "provider" TEXT,
  "model" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

INSERT INTO "AIConversation_new" ("id", "userId", "title", "provider", "model", "createdAt", "updatedAt")
SELECT "id", "userId", "title", "provider", "model", "createdAt", "updatedAt" FROM "AIConversation";

DROP TABLE "AIConversation";

ALTER TABLE "AIConversation_new" RENAME TO "AIConversation";

CREATE INDEX IF NOT EXISTS "AIConversation_userId_updatedAt_idx" ON "AIConversation"("userId", "updatedAt");

COMMIT;
