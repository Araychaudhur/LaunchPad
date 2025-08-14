import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export interface AuthUser {
  userId: string;
  tenantId: string;
  email?: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req: any = ctx.switchToHttp().getRequest();
    const hdr: string | undefined = req.headers["authorization"];
    const token = hdr?.startsWith("Bearer ") ? hdr.slice(7) : undefined;
    if (!token) throw new UnauthorizedException("Missing bearer token");
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      req.user = { userId: payload.sub, tenantId: payload.tenantId, email: payload.email } as AuthUser;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
