import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

@Controller("auth")
export class AuthController {
  @Post("login")
  async login(@Body() body: any) {
    const email = String(body?.email || "").toLowerCase().trim();
    const password = String(body?.password || "");
    if (!email || !password) throw new UnauthorizedException("Email and password required");

    const { rows } = await pool.query(
      "SELECT id, tenant_id, password_hash FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    const u = rows[0];
    if (!u) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const token = jwt.sign(
      { sub: u.id, tenantId: u.tenant_id, email },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1d" }
    );

    return { token };
  }
}
