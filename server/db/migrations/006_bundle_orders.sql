CREATE TABLE IF NOT EXISTS bundle_orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bundle_id TEXT NOT NULL,
  bundle_name TEXT NOT NULL,
  recipient_mobile TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bundle_orders_user_created_idx
  ON bundle_orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bundle_order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES bundle_orders(id) ON DELETE CASCADE,
  provider_payment_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  fulfillment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'fulfilled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bundle_order_payments_order_created_idx
  ON bundle_order_payments (order_id, created_at DESC);
