-- Seed core roles and permissions

INSERT INTO permissions (name, description) VALUES
  ('inventory:read', 'View inventory'),
  ('inventory:write', 'Create/update inventory'),
  ('billing:read', 'View bills'),
  ('billing:create', 'Create bills'),
  ('billing:void', 'Void bills'),
  ('users:manage', 'Manage users'),
  ('roles:assign', 'Assign roles')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access'),
  ('store_manager', 'Manage inventory and billing in assigned stores'),
  ('inventory_manager', 'Inventory module only'),
  ('cashier', 'Billing dashboard only')
ON CONFLICT (name) DO NOTHING;

-- Map roles to permissions
-- admin: all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- store_manager: inventory + billing (no void?) include void for managers
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'inventory:read','inventory:write','billing:read','billing:create','billing:void','users:manage','roles:assign'
) WHERE r.name = 'store_manager'
ON CONFLICT DO NOTHING;

-- inventory_manager: inventory only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'inventory:read','inventory:write'
) WHERE r.name = 'inventory_manager'
ON CONFLICT DO NOTHING;

-- cashier: billing read/create only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name IN (
  'billing:read','billing:create'
) WHERE r.name = 'cashier'
ON CONFLICT DO NOTHING;
