-- Migration: Add is_developer flag to organizations
-- This allows developers to bypass all subscription and plan restrictions

ALTER TABLE organizations 
ADD COLUMN
IF NOT EXISTS is_developer boolean DEFAULT false NOT NULL;

-- Optional: Set specific organizations to developer mode by email
-- UPDATE organizations 
-- SET is_developer = true 
-- WHERE owner_email IN ('developer@example.com', 'admin@example.com');
