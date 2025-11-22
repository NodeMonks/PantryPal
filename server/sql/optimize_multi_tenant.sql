-- =====================================================
-- Multi-Tenant Performance Optimization
-- =====================================================
-- This script creates indexes to optimize multi-tenant queries
-- Run this after the schema migration is complete

-- Drop onboarding_tokens table (functionality moved to separate microservice)
DROP TABLE IF EXISTS onboarding_tokens
CASCADE;

-- =====================================================
-- COMPOSITE INDEXES FOR TENANT FILTERING
-- =====================================================
-- These indexes dramatically improve query performance for org/store filtering

-- Products table - Most queried table
CREATE INDEX
IF NOT EXISTS idx_products_org_store ON products
(org_id, store_id);
CREATE INDEX
IF NOT EXISTS idx_products_org ON products
(org_id);
CREATE INDEX
IF NOT EXISTS idx_products_barcode ON products
(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX
IF NOT EXISTS idx_products_qr_code ON products
(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX
IF NOT EXISTS idx_products_expiry ON products
(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX
IF NOT EXISTS idx_products_low_stock ON products
(org_id, store_id, quantity_in_stock) 
  WHERE quantity_in_stock <= min_stock_level;

-- Customers table
CREATE INDEX
IF NOT EXISTS idx_customers_org_store ON customers
(org_id, store_id);
CREATE INDEX
IF NOT EXISTS idx_customers_org ON customers
(org_id);
CREATE INDEX
IF NOT EXISTS idx_customers_phone ON customers
(phone) WHERE phone IS NOT NULL;
CREATE INDEX
IF NOT EXISTS idx_customers_email ON customers
(email) WHERE email IS NOT NULL;

-- Bills table - Frequently queried for reports
CREATE INDEX
IF NOT EXISTS idx_bills_org_store ON bills
(org_id, store_id);
CREATE INDEX
IF NOT EXISTS idx_bills_org ON bills
(org_id);
CREATE INDEX
IF NOT EXISTS idx_bills_created ON bills
(created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_bills_org_store_created ON bills
(org_id, store_id, created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_bills_customer ON bills
(customer_id) WHERE customer_id IS NOT NULL;

-- Inventory transactions
CREATE INDEX
IF NOT EXISTS idx_inventory_org_store ON inventory_transactions
(org_id, store_id);
CREATE INDEX
IF NOT EXISTS idx_inventory_org ON inventory_transactions
(org_id);
CREATE INDEX
IF NOT EXISTS idx_inventory_product ON inventory_transactions
(product_id);
CREATE INDEX
IF NOT EXISTS idx_inventory_created ON inventory_transactions
(created_at DESC);
CREATE INDEX
IF NOT EXISTS idx_inventory_org_store_product ON inventory_transactions
(org_id, store_id, product_id);

-- =====================================================
-- USER & ROLE INDEXES
-- =====================================================

-- User roles - Critical for tenant context resolution
CREATE INDEX
IF NOT EXISTS idx_user_roles_user ON user_roles
(user_id);
CREATE INDEX
IF NOT EXISTS idx_user_roles_org ON user_roles
(org_id);
CREATE INDEX
IF NOT EXISTS idx_user_roles_user_org ON user_roles
(user_id, org_id);
CREATE INDEX
IF NOT EXISTS idx_user_roles_store ON user_roles
(store_id) WHERE store_id IS NOT NULL;

-- Users table
CREATE INDEX
IF NOT EXISTS idx_users_email ON users
(email);
CREATE INDEX
IF NOT EXISTS idx_users_username ON users
(username);
CREATE INDEX
IF NOT EXISTS idx_users_active ON users
(is_active) WHERE is_active = true;

-- Sessions - For faster authentication
CREATE INDEX
IF NOT EXISTS idx_sessions_user ON sessions
(user_id);
CREATE INDEX
IF NOT EXISTS idx_sessions_org ON sessions
(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX
IF NOT EXISTS idx_sessions_expires ON sessions
(expires_at);

-- =====================================================
-- ORGANIZATION & STORE INDEXES
-- =====================================================

-- Stores
CREATE INDEX
IF NOT EXISTS idx_stores_org ON stores
(org_id);

-- Role permissions (RBAC)
CREATE INDEX
IF NOT EXISTS idx_role_permissions_role ON role_permissions
(role_id);
CREATE INDEX
IF NOT EXISTS idx_role_permissions_permission ON role_permissions
(permission_id);

-- =====================================================
-- AUDIT & INVITE INDEXES
-- =====================================================

-- Audit logs
CREATE INDEX
IF NOT EXISTS idx_audit_logs_user ON audit_logs
(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX
IF NOT EXISTS idx_audit_logs_org ON audit_logs
(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX
IF NOT EXISTS idx_audit_logs_created ON audit_logs
(created_at DESC);

-- User invites
CREATE INDEX
IF NOT EXISTS idx_user_invites_org ON user_invites
(org_id);
CREATE INDEX
IF NOT EXISTS idx_user_invites_email ON user_invites
(email);
CREATE INDEX
IF NOT EXISTS idx_user_invites_expires ON user_invites
(expires_at);

-- =====================================================
-- QUERY PERFORMANCE ANALYSIS
-- =====================================================
-- After creating indexes, analyze tables for query planner

ANALYZE products;
ANALYZE customers;
ANALYZE bills;
ANALYZE bill_items;
ANALYZE inventory_transactions;
ANALYZE user_roles;
ANALYZE users;
ANALYZE sessions;
ANALYZE organizations;
ANALYZE stores;

-- =====================================================
-- VACUUM (Optional - for production maintenance)
-- =====================================================
-- Run periodically to reclaim storage and update statistics
-- VACUUM ANALYZE products;
-- VACUUM ANALYZE customers;
-- VACUUM ANALYZE bills;
-- VACUUM ANALYZE inventory_transactions;
