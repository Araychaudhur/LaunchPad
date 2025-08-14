import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { withTenantClient } from "./db";

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
}
