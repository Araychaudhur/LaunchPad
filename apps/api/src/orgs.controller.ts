import { Body, Controller, Get, Post, BadRequestException, Req, UseGuards } from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { RequireTenantRole } from "./rbac";
import { withTenantClient } from "./db";
import { audit } from "./audit.service";

@Controller("orgs")
@UseGuards(JwtGuard)
export class OrgsController {
  @Get()
  async list(@Req() req: any) {
    const { tenantId, userId } = req.user!;
    return await withTenantClient(tenantId, userId, async (c) => {
      const { rows } = await c.query("SELECT id, name FROM orgs ORDER BY name");
      return rows;
    });
  }

  @Post()
  @RequireTenantRole("ADMIN", "OWNER")
  async create(@Req() req: any, @Body() body: any) {
    const { tenantId, userId } = req.user!;
    const name = String(body?.name || "").trim();
    if (!name) throw new BadRequestException("name is required");

    return await withTenantClient(tenantId, userId, async (c) => {
      const { rows } = await c.query(
        "INSERT INTO orgs (tenant_id, name) VALUES ($1,$2) RETURNING id, name",
        [tenantId, name]
      );
      const org = rows[0];
      await audit(c, tenantId, userId, "org.create", "org", org.id, { name });
      return org;
    });
  }
}
