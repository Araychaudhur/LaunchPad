import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { RequireTenantRole } from "./rbac";
import { withTenantClient } from "./db";

@Controller("audit-logs")
@UseGuards(JwtGuard)
export class AuditController {
  @Get()
  @RequireTenantRole("ADMIN", "OWNER")
  async list(
    @Req() req: any,
    @Query("limit") limitQ?: string,
    @Query("before") before?: string
  ) {
    const { tenantId, userId } = req.user!;
    const limit = Math.max(1, Math.min(100, Number(limitQ || 20)));

    return await withTenantClient(tenantId, userId, async (c) => {
      if (before) {
        const { rows } = await c.query(
          `WITH cur AS (SELECT created_at FROM audit_logs WHERE id = $2)
           SELECT id, action, resource, resource_id, meta, created_at
             FROM audit_logs, cur
            WHERE (audit_logs.created_at, audit_logs.id) < (cur.created_at, $2)
            ORDER BY created_at DESC, id DESC
            LIMIT $1`,
          [limit, before]
        );
        const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
        return { items: rows, nextCursor };
      } else {
        const { rows } = await c.query(
          `SELECT id, action, resource, resource_id, meta, created_at
             FROM audit_logs
            ORDER BY created_at DESC, id DESC
            LIMIT $1`,
          [limit]
        );
        const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
        return { items: rows, nextCursor };
      }
    });
  }
}
