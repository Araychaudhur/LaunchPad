import { PoolClient } from "pg";

export async function audit(
  c: PoolClient,
  tenantId: string,
  userId: string | null,
  action: string,
  resource?: string,
  resourceId?: string,
  meta?: any
) {
  await c.query(
    `insert into audit_logs (tenant_id, user_id, action, resource, resource_id, meta)
     values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [tenantId, userId, action, resource ?? null, resourceId ?? null, meta ? JSON.stringify(meta) : null]
  );
}
