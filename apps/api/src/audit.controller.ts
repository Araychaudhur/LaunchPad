import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { RequireTenantRole } from "./rbac";
import { withTenantClient } from "./db";

@Controller("audit-logs")
@UseGuards(JwtGuard)
export class AuditController {
  @Get()
  @RequireTenantRole("ADMIN", "OWNER")
  async list(@Req() req: any, @Query("limit") limitQ?: string) {
    const { tenantId, userId } = req.user!;
    const limit = Math.max(1, Math.min(100, Number(limitQ || 20)));
    return await withTenantClient(tenantId, userId, async (c) => {
      const { rows } = await c.query(
        `select id, action, resource, resource_id, meta, created_at
           from audit_logs
          order by created_at desc
          limit $1`,
        [limit]
      );
      return rows;
    });
  }
}
