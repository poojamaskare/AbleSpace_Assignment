-- Shared projects: a join code per project, and a membership table.

-- Added nullable so existing rows survive, then backfilled and locked down.
ALTER TABLE "Project" ADD COLUMN "code" TEXT;

-- Random six digits per existing project. At demo scale a collision is
-- vanishingly unlikely; if one happens the unique index below fails loudly
-- rather than silently sharing a code between two boards.
UPDATE "Project"
SET "code" = lpad(floor(random() * 1000000)::int::text, 6, '0')
WHERE "code" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","userId")
);

CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing leads become members of their own projects, otherwise every access
-- check below would lock them out of the boards they already own.
INSERT INTO "ProjectMember" ("projectId", "userId")
SELECT "id", "leadId" FROM "Project" WHERE "leadId" IS NOT NULL;
