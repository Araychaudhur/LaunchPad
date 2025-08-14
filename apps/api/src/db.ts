import { Pool, PoolClient } from "pg";

const connectionString = process.env.DATABASE_URL!;
export const pool = new Pool({ connectionString });

export async function withTenantClient<T>(
  tenantId: string,
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Use set_config(..., ..., true) == SET LOCAL
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    if (userId) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    }
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
