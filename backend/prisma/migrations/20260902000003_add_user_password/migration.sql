-- Add hashedPassword column for credentials-based (email/password) authentication.
-- Nullable so existing OAuth-only accounts and seed data are unaffected.
ALTER TABLE "User" ADD COLUMN "hashedPassword" TEXT;
