-- Invite tokens (GLOBAL table: no tenant RLS)
-- Reason: accept flow is public (no JWT), so we can't rely on tenant-scoped RLS here.
-- Security relies on hard-to-guess tokens and short expirations.

CREATE TABLE IF NOT EXISTS invites (
  token        TEXT PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('MEMBER','ADMIN')),
  invited_by   UUID REFERENCES users(id),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_tenant ON invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invites_email  ON invites(email);
