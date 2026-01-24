-- Add POS Terminal support and advanced features
-- Migration: 0004_add_pos_features

-- POS Terminals table
CREATE TABLE IF NOT EXISTS pos_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  terminal_number TEXT NOT NULL,
  terminal_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pos_terminals_store ON pos_terminals(store_id);
CREATE INDEX idx_pos_terminals_org ON pos_terminals(org_id);

-- POS Shifts table
CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id UUID NOT NULL REFERENCES pos_terminals(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cashier_id INTEGER REFERENCES users(id),
  shift_start TIMESTAMP NOT NULL DEFAULT NOW(),
  shift_end TIMESTAMP,
  opening_cash DECIMAL(10, 2) DEFAULT 0,
  closing_cash DECIMAL(10, 2),
  expected_cash DECIMAL(10, 2),
  cash_variance DECIMAL(10, 2),
  total_sales DECIMAL(10, 2) DEFAULT 0,
  total_bills INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pos_shifts_terminal ON pos_shifts(terminal_id);
CREATE INDEX idx_pos_shifts_cashier ON pos_shifts(cashier_id);
CREATE INDEX idx_pos_shifts_org ON pos_shifts(org_id);

-- Held Bills table
CREATE TABLE IF NOT EXISTS held_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  terminal_id UUID REFERENCES pos_terminals(id),
  cashier_id INTEGER REFERENCES users(id),
  hold_name TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  items TEXT NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_held_bills_org ON held_bills(org_id);
CREATE INDEX idx_held_bills_terminal ON held_bills(terminal_id);
CREATE INDEX idx_held_bills_cashier ON held_bills(cashier_id);

-- Split Payments table
CREATE TABLE IF NOT EXISTS split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_split_payments_bill ON split_payments(bill_id);
CREATE INDEX idx_split_payments_org ON split_payments(org_id);

-- Offline Queue table
CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  local_id TEXT NOT NULL,
  bill_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMP
);

CREATE INDEX idx_offline_queue_org ON offline_queue(org_id);
CREATE INDEX idx_offline_queue_status ON offline_queue(status);
CREATE INDEX idx_offline_queue_local_id ON offline_queue(local_id);

-- Add payment_status column to bills if not exists
ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Comments for documentation
COMMENT ON TABLE pos_terminals IS 'Physical POS terminals in stores for multi-terminal support';
COMMENT ON TABLE pos_shifts IS 'Cashier shift tracking with cash reconciliation';
COMMENT ON TABLE held_bills IS 'Temporarily held bills for save-for-later functionality';
COMMENT ON TABLE split_payments IS 'Multiple payment methods for a single bill';
COMMENT ON TABLE offline_queue IS 'Queue for bills created while offline, to be synced later';
