import { Controller, Headers, Post, Req, Res } from "@nestjs/common";
import Stripe from "stripe";
import type { Response } from "express";
import { withTenantClient } from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-10-16" });

@Controller("webhooks")
export class StripeWebhookController {
  @Post("stripe")
  async handle(@Req() req: any, @Res() res: Response, @Headers("stripe-signature") sig?: string) {
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    let event: Stripe.Event;

    if (!whSecret) {
      event = req.body ? JSON.parse(req.body.toString()) : ({} as any);
    } else {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig!, whSecret);
      } catch (err: any) {
        console.error("[stripe] signature verify failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    try {
      const id = event.id;
      const type = event.type;

      // Derive tenant
      let tenantId: string | null = null;
      let customerId: string | undefined;
      const obj: any = (event as any).data?.object ?? {};
      tenantId = obj?.metadata?.tenantId ?? null;
      customerId = obj?.customer ?? undefined;

      if (!tenantId && customerId) {
        tenantId = await withTenantClient(null as any, null as any, async (c) => {
          const { rows } = await c.query(
            "select tenant_id from billing_customers where stripe_customer_id = $1 limit 1",
            [customerId]
          );
          return rows[0]?.tenant_id as string | undefined;
        }) ?? null;
      }
      if (!tenantId) return res.json({ received: true, skipped: "no-tenant" });

      // Idempotency
      const already = await withTenantClient(tenantId, null as any, async (c) => {
        const seen = await c.query("select 1 from processed_events where event_id=$1", [id]);
        if (seen.rowCount) return true;
        await c.query("insert into processed_events(event_id) values ($1)", [id]);
        return false;
      });
      if (already) return res.json({ received: true, dedup: true });

      const upsertSub = async (s: Stripe.Subscription) => {
        // If Stripe sent a slim object without current_period_end, refresh it
        if (!s.current_period_end) {
          s = await stripe.subscriptions.retrieve(s.id);
        }
        const cancelAtPeriodEnd = !!s.cancel_at_period_end;
        const cancelAt = s.cancel_at ? new Date(s.cancel_at * 1000) : null;
        const canceledAt = s.canceled_at ? new Date(s.canceled_at * 1000) : null;
        const currentPeriodEnd = s.current_period_end ? new Date(s.current_period_end * 1000) : null;

        await withTenantClient(tenantId!, null as any, async (c) => {
          await c.query(
            `insert into subscriptions
               (tenant_id, stripe_subscription_id, status, price_id, product_id,
                current_period_end, cancel_at_period_end, cancel_at, canceled_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             on conflict (stripe_subscription_id)
             do update set status=excluded.status, price_id=excluded.price_id, product_id=excluded.product_id,
                           current_period_end=excluded.current_period_end, cancel_at_period_end=excluded.cancel_at_period_end,
                           cancel_at=excluded.cancel_at, canceled_at=excluded.canceled_at, updated_at=now()`,
            [
              tenantId, s.id, s.status,
              s.items.data[0]?.price?.id ?? null,
              s.items.data[0]?.price?.product ?? null,
              currentPeriodEnd, cancelAtPeriodEnd, cancelAt, canceledAt
            ]
          );

          const activeLike = s.status === "active" || s.status === "trialing" || s.status === "past_due";
          const stillPremium =
            activeLike ||
            (cancelAtPeriodEnd && !!currentPeriodEnd && currentPeriodEnd.getTime() > Date.now());

          await c.query(
            `insert into feature_flags(tenant_id, premium) values ($1,$2)
             on conflict (tenant_id) do update set premium=$2, updated_at=now()`,
            [tenantId, stillPremium]
          );
        });
      };

      switch (type) {
        case "checkout.session.completed": {
          const subId = (obj as Stripe.Checkout.Session).subscription as string | undefined;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            await upsertSub(sub);
          }
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          await upsertSub(obj as Stripe.Subscription);
          break;
        }
        default:
          // ignore others
          break;
      }

      return res.json({ received: true });
    } catch (e: any) {
      console.error("[stripe] handler error:", e);
      return res.status(500).send("handler error");
    }
  }
}
