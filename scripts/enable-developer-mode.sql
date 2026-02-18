-- Quick SQL Script to Enable Developer Mode
-- Run this directly in your PostgreSQL database

-- Step 1: View all organizations (to find the one you want to modify)
SELECT 
  id, 
  name, 
  owner_email, 
  is_developer, 
  payment_status, 
  plan_name,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- Step 2: Enable developer mode for a specific organization
-- Update one of the WHERE clauses below to match your organization:

-- Option A: By email
-- UPDATE organizations 
-- SET 
--   is_developer = true, 
--   payment_status = 'active',
--   plan_name = 'developer'
-- WHERE owner_email = 'your-email@example.com';

-- Option B: By organization name
-- UPDATE organizations 
-- SET 
--   is_developer = true, 
--   payment_status = 'active',
--   plan_name = 'developer'
-- WHERE name = 'Your Organization Name';

-- Option C: By organization ID
-- UPDATE organizations 
-- SET 
--   is_developer = true, 
--   payment_status = 'active',
--   plan_name = 'developer'
-- WHERE id = 'your-org-uuid-here';

-- Option D: Enable for ALL organizations (use with caution!)
-- UPDATE organizations 
-- SET 
--   is_developer = true, 
--   payment_status = 'active',
--   plan_name = 'developer';

-- Step 3: Verify the changes
SELECT 
  id, 
  name, 
  owner_email, 
  is_developer, 
  payment_status, 
  plan_name
FROM organizations
WHERE is_developer = true;

-- To DISABLE developer mode later:
-- UPDATE organizations 
-- SET 
--   is_developer = false, 
--   payment_status = 'pending',
--   plan_name = 'starter'
-- WHERE owner_email = 'your-email@example.com';
