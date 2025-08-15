import {
  CanActivate, ExecutionContext, ForbiddenException,
  Injectable, SetMetadata, UseGuards, applyDecorators
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { withTenantClient } from "./db";

export const ROLES_KEY = "tenant_roles";
export function RequireTenantRole(...roles: ("ADMIN" | "OWNER")[]) {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(RolesGuard));
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const roles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) || [];
    if (roles.length === 0) return true;

    const req: any = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException("Missing user");

    const ok = await withTenantClient(user.tenantId, user.userId, async (c) => {
      const { rows } = await c.query(
        `select 1
           from memberships m
           join orgs o on o.id = m.org_id
          where m.user_id = $1
            and o.tenant_id = $2
            and m.role = any($3::text[])
          limit 1`,
        [user.userId, user.tenantId, roles]
      );
      return rows.length > 0;
    });

    if (!ok) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
