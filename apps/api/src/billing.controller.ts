import { Body, Controller, Get, Post, Req, BadRequestException, UseGuards } from "@nestjs/common";
import Stripe from "stripe";
import { JwtGuard } from "./jwt.guard";
import { withTenantClient } from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-10-16" });

@Controller("billing")
@UseGuards(JwtGuard)
export class BillingController {
  @Get("status")
  async status(@Req() req: any) {
    const { tenantId, userId } = req.user!;
    return await withTenantClient(tenantId, userId, async (c) => {
      const sub = await c.query(
        `select stripe_subscription_id, status, current_period_end,
                cancel_at_period_end, cancel_at, canceled_at
           from subscriptions
          order by updated_at desc limit 1`
      );
      const flags = await c.query("select premium from feature_flags");
      return { subscription: sub.rows[0] ?? null, flags: flags.rows[0] ?? { premium: false } };
    });
  }

  @Post("checkout")
  async checkout(@Req() req: any, @Body() _body: any) {
    const { tenantId, userId } = req.user!;
    const priceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.APP_URL;
    if (!priceId || !appUrl) throw new BadRequestException("Stripe env not set");

    const { customerId } = await withTenantClient(tenantId, userId, async (c) => {
      const cur = await c.query("select stripe_customer_id from billing_customers limit 1");
      if (cur.rows[0]) return { customerId: cur.rows[0].stripe_customer_id };
      const customer = await stripe.customers.create({ metadata: { tenantId } });
      await c.query(
        "insert into billing_customers(tenant_id, stripe_customer_id) values ($1,$2) on conflict (tenant_id) do update set stripe_customer_id = excluded.stripe_customer_id",
        [tenantId, customer.id]
      );
      return { customerId: customer.id };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      metadata: { tenantId }
    });

    return { url: session.url };
  }

  @Post("portal")
  async portal(@Req() req: any) {
    const { tenantId, userId } = req.user!;
    const appUrl = process.env.APP_URL || "http://localhost:8080";
    return await withTenantClient(tenantId, userId, async (c) => {
      const r = await c.query("select stripe_customer_id from billing_customers limit 1");
      if (!r.rows[0]) return { error: "Customer not found. Start a checkout first." };
      const session = await stripe.billingPortal.sessions.create({
        customer: r.rows[0].stripe_customer_id,
        return_url: `${appUrl}/billing`,
      });
      return { url: session.url };
    });
  }
}
