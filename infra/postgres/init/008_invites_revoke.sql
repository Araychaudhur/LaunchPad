-- Adds revoke support & helpful indexes
alter table if exists invites
  add column if not exists revoked_at timestamptz;

create index if not exists idx_invites_tenant_created
  on invites(tenant_id, created_at desc);

create index if not exists idx_invites_tenant_token
  on invites(tenant_id, token);
