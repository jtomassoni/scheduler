-- AlterTable
-- Convert adminNotes from TEXT to JSONB
-- First, drop the column and recreate it as JSONB
-- Note: This will lose any existing data, but since adminNotes was just added
-- and the schema expects JSON, this is acceptable for development

ALTER TABLE "CompanyRequest" DROP COLUMN "adminNotes";
ALTER TABLE "CompanyRequest" ADD COLUMN "adminNotes" JSONB;

