/// <reference path="./types/nodemailer.d.ts" />

import {
  Body, Controller, Get, Post, Query, Req,
  BadRequestException, ForbiddenException, UseGuards
} from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { withTenantClient, pool } from "./db";
import { audit } from "./audit.service";
import bcrypt from "bcryptjs";
import crypto from "crypto";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require("nodemailer");

type CreateInviteDto = { email: string; orgId: string; role: "MEMBER" | "ADMIN"; };
type AcceptInviteDto = { token: string; name: string; password: string; };
type TokenDto = { token: string };

const APP_URL = process.env.APP_URL || "http://localhost:8080";
const SMTP_HOST = process.env.SMTP_HOST || "maildev";
const SMTP_PORT = Number(process.env.SMTP_PORT || 1025);
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@launchpad.test";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  logger: true,
  debug: true,
});

@Controller("invites")
export class InvitesController {
  // TENANT-level admin list with computed status
  @Get()
  @UseGuards(JwtGuard)
  async list(@Req() req: any) {
    const { tenantId, userId } = req.user!;

    await withTenantClient(tenantId, userId, async (c) => {
      const mem = await c.query(
        `select 1
           from memberships m
           join orgs o on o.id = m.org_id
          where m.user_id = $1 and m.role in ('ADMIN','OWNER')
          limit 1`,
        [userId]
      );
      if (!mem.rows[0]) throw new ForbiddenException("insufficient role");
    });

    const { rows } = await pool.query(
      `select token, email, role, org_id, invited_by,
              accepted_at, expires_at, revoked_at, created_at,
              case
                when revoked_at is not null then 'revoked'
                when accepted_at is not null then 'accepted'
                when now() > expires_at then 'expired'
                else 'pending'
              end as status
         from invites
        where tenant_id = $1
        order by created_at desc`,
      [tenantId]
    );
    return rows;
  }

  // Create invite (tenant-admin)
  @Post()
  @UseGuards(JwtGuard)
  async create(@Req() req: any, @Body() body: CreateInviteDto) {
    const { tenantId, userId } = req.user!;
    const email = String(body?.email || "").toLowerCase().trim();
    const role = String(body?.role || "MEMBER").toUpperCase();
    const orgId = String(body?.orgId || "");
    if (!email || !orgId) throw new BadRequestException("email and orgId are required");
    if (role !== "MEMBER" && role !== "ADMIN") throw new BadRequestException("invalid role");

    await withTenantClient(tenantId, userId, async (c) => {
      const admin = await c.query(
        `select 1 from memberships m join orgs o on o.id=m.org_id
          where m.user_id=$1 and m.role in ('ADMIN','OWNER') limit 1`,
        [userId]
      );
      if (!admin.rows[0]) throw new ForbiddenException("insufficient role");
      const og = await c.query("select 1 from orgs where id = $1 limit 1", [orgId]);
      if (!og.rows[0]) throw new BadRequestException("org not found");
    });

    const token = crypto.randomUUID();
    await pool.query(
      `insert into invites(token, tenant_id, org_id, email, role, invited_by)
       values ($1,$2,$3,$4,$5,$6)`,
      [token, tenantId, orgId, email, role, userId]
    );

    const url = `${APP_URL}/invite/${token}`;
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: email,
        subject: "You’ve been invited to LaunchPad",
        html: `<p>You’ve been invited to join an organization on <b>LaunchPad</b>.</p>
               <p><a href="${url}">Accept invite</a> (expires in 7 days).</p>`
      });
    } catch (e) {
      console.warn("[invite] email send failed:", (e as any)?.message || e);
    }

    await withTenantClient(tenantId, userId, async (c) => {
      await audit(c, tenantId, userId, "invite.create", "invite", token, { email, role, orgId });
    });

    return { token, url };
  }

  // Resend
  @Post("resend")
  @UseGuards(JwtGuard)
  async resend(@Req() req: any, @Body() body: TokenDto) {
    const { tenantId, userId } = req.user!;
    const token = String(body?.token || "");
    if (!token) throw new BadRequestException("token required");

    const { rows } = await pool.query(
      `select token, email, org_id, role, accepted_at, expires_at, revoked_at
         from invites where tenant_id=$1 and token=$2`,
      [tenantId, token]
    );
    const inv = rows[0];
    if (!inv) throw new BadRequestException("invite not found");
    if (inv.revoked_at) throw new BadRequestException("invite revoked");
    if (inv.accepted_at) throw new BadRequestException("invite already accepted");
    if (new Date(inv.expires_at).getTime() < Date.now()) throw new BadRequestException("invite expired");

    const url = `${APP_URL}/invite/${token}`;
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: inv.email,
        subject: "Invitation to LaunchPad (resend)",
        html: `<p>Here’s your invite link: <a href="${url}">${url}</a></p>`
      });
    } catch (e) {
      console.warn("[invite] resend email error:", (e as any)?.message || e);
    }

    await withTenantClient(tenantId, userId, async (c) => {
      await audit(c, tenantId, userId, "invite.resend", "invite", token, { email: inv.email, orgId: inv.org_id });
    });

    return { ok: true, url };
  }

  // Revoke
  @Post("revoke")
  @UseGuards(JwtGuard)
  async revoke(@Req() req: any, @Body() body: TokenDto) {
    const { tenantId, userId } = req.user!;
    const token = String(body?.token || "");
    if (!token) throw new BadRequestException("token required");

    const { rows } = await pool.query(
      `update invites
          set revoked_at = now()
        where tenant_id=$1 and token=$2 and accepted_at is null and revoked_at is null
      returning token, email, org_id`,
      [tenantId, token]
    );
    const r = rows[0];
    if (!r) throw new BadRequestException("invite not found or already finalized");

    await withTenantClient(tenantId, userId, async (c) => {
      await audit(c, tenantId, userId, "invite.revoke", "invite", token, { email: r.email, orgId: r.org_id });
    });

    return { ok: true };
  }

  // Verify + Accept stay the same…
  @Get("verify")
  async verify(@Query("token") token?: string) {
    token = String(token || "");
    if (!token) throw new BadRequestException("token is required");
    const { rows } = await pool.query(
      `select email, expires_at, accepted_at, revoked_at from invites where token = $1`,
      [token]
    );
    const iv = rows[0];
    if (!iv) throw new BadRequestException("invalid token");
    if (iv.revoked_at) throw new BadRequestException("invite revoked");
    if (iv.accepted_at) throw new BadRequestException("invite already accepted");
    if (new Date(iv.expires_at).getTime() < Date.now()) throw new BadRequestException("invite expired");
    return { email: iv.email };
  }

  @Post("accept")
  async accept(@Body() body: AcceptInviteDto) {
    const token = String(body?.token || "");
    const name = String(body?.name || "").trim();
    const password = String(body?.password || "");
    if (!token || !name || !password) throw new BadRequestException("token, name, password are required");

    const { rows } = await pool.query(
      `select token, tenant_id, org_id, email, role, accepted_at, expires_at, revoked_at
         from invites where token = $1`,
      [token]
    );
    const iv = rows[0];
    if (!iv) throw new BadRequestException("invalid token");
    if (iv.revoked_at) throw new BadRequestException("invite revoked");
    if (iv.accepted_at) throw new BadRequestException("invite already accepted");
    if (new Date(iv.expires_at).getTime() < Date.now()) throw new BadRequestException("invite expired");

    const tenantId: string = iv.tenant_id;
    const orgId: string = iv.org_id;
    const email: string = String(iv.email).toLowerCase().trim();
    const role: "MEMBER" | "ADMIN" = iv.role;

    const userId = await withTenantClient(tenantId, null, async (c) => {
      const cur = await c.query("select id from users where email = $1 limit 1", [email]);
      let uid = cur.rows[0]?.id as string | undefined;

      if (!uid) {
        const hash = await bcrypt.hash(password, 10);
        const ins = await c.query(
          `insert into users(tenant_id, email, display_name, password_hash)
           values ($1,$2,$3,$4)
           returning id`,
          [tenantId, email, name, hash]
        );
        uid = ins.rows[0].id as string;
      }

      await c.query(
        `insert into memberships(user_id, org_id, role)
         values ($1,$2,$3)
         on conflict do nothing`,
        [uid, orgId, role]
      );

      await audit(c, tenantId, uid, "invite.accept", "invite", token, { email, orgId, role });
      return uid!;
    });

    await pool.query("update invites set accepted_at = now() where token = $1", [token]);
    return { ok: true, userId, email, tenantId, orgId };
  }
}
