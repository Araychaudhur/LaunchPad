import {
  Body, Controller, Get, Post, Patch, Param, Headers,
  BadRequestException, PreconditionFailedException, Req, UseGuards
} from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { RequireTenantRole } from "./rbac";
import { withTenantClient } from "./db";
import { audit } from "./audit.service";

function parseWeakEtag(etag?: string): number | undefined {
  if (!etag) return undefined;
  const m = etag.match(/W\/"?(\d+)"?/);
  const v = m ? Number(m[1]) : NaN;
  return Number.isFinite(v) ? v : undefined;
}

@Controller("orgs")
@UseGuards(JwtGuard)
export class OrgsController {
  @Get()
  async list(@Req() req: any) {
    const { tenantId, userId } = req.user!;
    return await withTenantClient(tenantId, userId, async (c) => {
      // include version so clients can form If-Match etags
      const { rows } = await c.query("SELECT id, name, version FROM orgs ORDER BY name");
      // conventional weak ETag suggestion (clients may use it as W/"<version>")
      return rows.map((r: any) => ({ ...r, etag: `W/\"${r.version}\"` }));
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
        "INSERT INTO orgs (tenant_id, name) VALUES ($1,$2) RETURNING id, name, version",
        [tenantId, name]
      );
      const org = rows[0];
      await audit(c, tenantId, userId, "org.create", "org", org.id, { name });
      return org;
    });
  }

  @Patch(":id")
  @RequireTenantRole("ADMIN", "OWNER")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Headers("if-match") ifMatch: string | undefined,
    @Body() body: any
  ) {
    const { tenantId, userId } = req.user!;
    const name = String(body?.name || "").trim();
    if (!name) throw new BadRequestException("name is required");

    const expected = parseWeakEtag(ifMatch);
    if (expected === undefined) {
      throw new BadRequestException('Precondition required: send If-Match: W/"<version>"');
    }

    return await withTenantClient(tenantId, userId, async (c) => {
      const { rows } = await c.query(
        `UPDATE orgs
           SET name = $1,
               version = version + 1
         WHERE id = $2
           AND version = $3
         RETURNING id, name, version`,
        [name, id, expected]
      );
      const updated = rows[0];
      if (!updated) throw new PreconditionFailedException("Version mismatch (etag stale)");
      await audit(c, tenantId, userId, "org.update", "org", id, { name, fromVersion: expected, toVersion: updated.version });
      return updated;
    });
  }
}
