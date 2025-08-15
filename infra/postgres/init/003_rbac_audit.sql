-- RBAC & Audit Logs (M2)

-- Audit table
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: tenant isolation
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_audit_tenant ON audit_logs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Seed a non-admin user to demo RBAC denies
WITH tid AS (
  SELECT id FROM tenants WHERE name='Acme' LIMIT 1
), o AS (
  SELECT id, tenant_id FROM orgs WHERE name='Acme HQ' AND tenant_id IN (SELECT id FROM tid) LIMIT 1
), u AS (
  INSERT INTO users (tenant_id, email, display_name, password_hash)
  SELECT (SELECT id FROM tid), 'member@acme.test', 'Acme Member', crypt('member123!', gen_salt('bf'))
  ON CONFLICT (email) DO NOTHING
  RETURNING id, tenant_id
)
INSERT INTO memberships (user_id, org_id, role)
SELECT (SELECT id FROM u), (SELECT id FROM o), 'MEMBER'
ON CONFLICT DO NOTHING;
