CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('buyer','seller','admin')),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  pass text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  studio text NOT NULL,
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  payout_recipient_code text,
  payout_bank text,
  payout_bank_code text,
  payout_account_name text,
  payout_last4 text
);
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS payout_recipient_code text;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS payout_bank text;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS payout_bank_code text;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS payout_account_name text;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS payout_last4 text;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other projects',
  style text NOT NULL DEFAULT 'Modern',
  price numeric(14,2) NOT NULL CHECK (price >= 1000),
  bedrooms integer NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms integer NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  floors integer NOT NULL DEFAULT 1 CHECK (floors >= 1),
  seller_id uuid NOT NULL REFERENCES users(id),
  img text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'awaiting_fee' CHECK (status IN ('draft','awaiting_fee','payment_pending','in_review','changes_requested','published','rejected','archived')),
  featured boolean NOT NULL DEFAULT false,
  popularity integer NOT NULL DEFAULT 0,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback text,
  fee_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
CREATE INDEX IF NOT EXISTS projects_public_idx ON projects(status, created_at DESC);
CREATE INDEX IF NOT EXISTS projects_seller_idx ON projects(seller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL CHECK (purpose IN ('checkout','upload_fee')),
  project_id uuid REFERENCES projects(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  checkout_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  buyer_id uuid NOT NULL REFERENCES users(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  seller_id uuid NOT NULL REFERENCES users(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  commission numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded','disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_id, project_id)
);
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  payment_id uuid NOT NULL REFERENCES payments(id),
  provider_id text,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','needs-attention','processed','failed')),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_idx ON orders(seller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES users(id),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  transfer_reference text UNIQUE,
  transfer_code text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transfer_reference text UNIQUE;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transfer_code text;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE payouts ADD CONSTRAINT payouts_status_check CHECK (status IN ('pending','processing','completed','failed'));

CREATE TABLE IF NOT EXISTS audit (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  who text NOT NULL,
  what text NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  commission_rate numeric(6,5) NOT NULL DEFAULT 0.15 CHECK (commission_rate >= 0 AND commission_rate < 1),
  processing_rate numeric(6,5) NOT NULL DEFAULT 0.015 CHECK (processing_rate >= 0 AND processing_rate < 1),
  upload_fee numeric(14,2) NOT NULL DEFAULT 10000 CHECK (upload_fee >= 0)
);
INSERT INTO settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS categories (
  name text PRIMARY KEY CHECK (length(name) BETWEEN 2 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO categories (name) VALUES
  ('Residential houses'),('Duplexes & luxury homes'),('Apartments'),('Commercial buildings'),
  ('Office buildings'),('Interior designs'),('Renovation projects'),('Landscape designs'),('Other projects')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS cart_items (
  buyer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1 CHECK (qty BETWEEN 1 AND 99),
  PRIMARY KEY (buyer_id, project_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  buyer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_id, project_id)
);

CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  kind text NOT NULL CHECK (kind IN ('preview','deliverable')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('verify','reset')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
