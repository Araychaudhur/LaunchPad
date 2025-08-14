-- Core multi-tenant schema + RLS
-- Requires extensions set in 001_init.sql (pgcrypto)

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id  UUID NOT NULL REFERENCES orgs(id)  ON DELETE CASCADE,
  role    TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN','MEMBER')),
  PRIMARY KEY (user_id, org_id)
);

-- RLS: enforce tenant isolation by custom GUCs set per-request (app.tenant_id/app.user_id)
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_users_tenant ON users
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY rls_orgs_tenant ON orgs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY rls_memberships_tenant ON memberships
  USING (
    org_id IN (SELECT id FROM orgs WHERE tenant_id = current_setting('app.tenant_id', true)::uuid)
  );

-- Seed data: tenant, org, admin user (password: admin123!)
WITH t AS (
  INSERT INTO tenants (name) VALUES ('Acme') ON CONFLICT (name) DO NOTHING RETURNING id
), tid AS (
  SELECT id FROM t
  UNION ALL
  SELECT id FROM tenants WHERE name='Acme' AND NOT EXISTS (SELECT 1 FROM t)
), o AS (
  INSERT INTO orgs (tenant_id, name)
  SELECT id, 'Acme HQ' FROM tid
  ON CONFLICT DO NOTHING
  RETURNING id, tenant_id
), u AS (
  INSERT INTO users (tenant_id, email, display_name, password_hash)
  SELECT id, 'admin@acme.test', 'Acme Admin', crypt('admin123!', gen_salt('bf'))
  FROM tid
  ON CONFLICT (email) DO NOTHING
  RETURNING id, tenant_id
)
INSERT INTO memberships (user_id, org_id, role)
SELECT u.id, o.id, 'OWNER'
FROM u, o
ON CONFLICT DO NOTHING;
