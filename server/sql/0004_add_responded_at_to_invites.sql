-- Add responded_at column to user_invites table for tracking non-responded invites
ALTER TABLE user_invites ADD COLUMN responded_at timestamptz;

-- Create index for faster queries on invite statuses
CREATE INDEX
IF NOT EXISTS idx_user_invites_org_status ON user_invites
(org_id, accepted_at, responded_at);
CREATE INDEX
IF NOT EXISTS idx_user_invites_email_org ON user_invites
(org_id, email);
