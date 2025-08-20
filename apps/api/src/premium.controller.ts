import { Controller, Get, ForbiddenException, Req, UseGuards } from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { withTenantClient } from "./db";

@Controller("premium")
@UseGuards(JwtGuard)
export class PremiumController {
  @Get("report")
  async report(@Req() req: any) {
    const { tenantId, userId } = req.user!;
    return withTenantClient(tenantId, userId, async (c) => {
      const { rows } = await c.query("select premium from feature_flags");
      const isPremium = !!rows[0]?.premium;
      if (!isPremium) throw new ForbiddenException("Premium required");
      // demo payload
      return { report: "Top secret analytics", generatedAt: new Date().toISOString() };
    });
  }
}
