-- Scope labels to a project instead of the whole database.
--
-- The 5 existing labels are global with no project to attribute them to, so
-- there is no correct backfill. They are removed along with their task links;
-- every project created from here on seeds its own. Users and tasks are left
-- untouched — only label assignments are lost.

DELETE FROM "_TaskLabels";
DELETE FROM "Label";

-- The old global-uniqueness rule is what made user-created labels impossible.
DROP INDEX "Label_name_key";

ALTER TABLE "Label" ADD COLUMN "projectId" TEXT NOT NULL;

CREATE INDEX "Label_projectId_idx" ON "Label"("projectId");

CREATE UNIQUE INDEX "Label_projectId_name_key" ON "Label"("projectId", "name");

ALTER TABLE "Label" ADD CONSTRAINT "Label_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
