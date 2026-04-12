CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('RESIDENT', 'SECURITY', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pass_type AS ENUM ('ONE_TIME_PERSON', 'COURIER', 'VEHICLE', 'PERMANENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pass_status AS ENUM (
    'CREATED',
    'ACTIVE',
    'USED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
    'EXPIRED',
    'SUSPENDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'RESIDENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apartments (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_apartments (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apartment_id INT NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, apartment_id)
);

CREATE TABLE IF NOT EXISTS passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id INT NOT NULL REFERENCES apartments(id),
  created_by INT NOT NULL REFERENCES users(id),
  type pass_type NOT NULL,
  status pass_status NOT NULL DEFAULT 'CREATED',
  visitor_name TEXT,
  vehicle_plate TEXT,
  courier_company TEXT,
  purpose TEXT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passes_status ON passes(status);
CREATE INDEX IF NOT EXISTS idx_passes_apartment ON passes(apartment_id);
CREATE INDEX IF NOT EXISTS idx_passes_valid_until ON passes(valid_until);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  pass_id UUID REFERENCES passes(id),
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_pass ON audit_log(pass_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pass_id UUID REFERENCES passes(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
