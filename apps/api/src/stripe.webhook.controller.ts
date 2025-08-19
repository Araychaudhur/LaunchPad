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

    // If no secret is configured, accept raw JSON (dev only)
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
      // Idempotency: skip already processed
      const id = event.id;
      const type = event.type;

      // Derive tenant id either from metadata or customer lookup
      let tenantId: string | null = null;
      let customerId: string | undefined;

      if ("data" in event && event.data && (event.data as any).object) {
        const obj: any = (event.data as any).object;
        tenantId = obj?.metadata?.tenantId ?? null;
        customerId = obj?.customer ?? undefined;
      }

      // If customer provided, map to tenant via billing_customers
      if (!tenantId && customerId) {
        const tenant = await withTenantClient(null as any, null as any, async (c) => {
          // no tenant context → query global by customer id (RLS would block)
          const { rows } = await c.query(
            "select tenant_id from billing_customers where stripe_customer_id = $1 limit 1",
            [customerId]
          );
          return rows[0]?.tenant_id as string | undefined;
        });
        tenantId = tenant ?? null;
      }

      // If still no tenant, we can't safely apply RLS; ack but log
      if (!tenantId) {
        console.warn("[stripe] no tenantId on event", event.id, event.type);
        return res.json({ received: true, skipped: "no-tenant" });
      }

      // Apply in-tenant transaction
      await withTenantClient(tenantId, null as any, async (c) => {
        // processed_events enforces idempotency
        const seen = await c.query("select 1 from processed_events where event_id=$1", [id]);
        if (seen.rowCount) return;

        // Mark as processed first (protect against reentry)
        await c.query("insert into processed_events(event_id) values ($1)", [id]);

        switch (type) {
          case "checkout.session.completed": {
            const s = event.data.object as Stripe.Checkout.Session;
            const subId = (s.subscription as string) || undefined;
            if (subId) {
              const sub = await stripe.subscriptions.retrieve(subId);
              await c.query(
                `insert into subscriptions(tenant_id, stripe_subscription_id, status, price_id, product_id, current_period_end)
                 values ($1,$2,$3,$4,$5,to_timestamp($6))
                 on conflict (stripe_subscription_id)
                 do update set status=excluded.status, price_id=excluded.price_id, product_id=excluded.product_id,
                               current_period_end=excluded.current_period_end, updated_at=now()`,
                [
                  tenantId,
                  sub.id,
                  sub.status,
                  sub.items.data[0]?.price?.id ?? null,
                  sub.items.data[0]?.price?.product ?? null,
                  sub.current_period_end
                ]
              );
              await c.query(
                `insert into feature_flags(tenant_id, premium) values ($1,true)
                 on conflict (tenant_id) do update set premium=true, updated_at=now()`,
                [tenantId]
              );
            }
            break;
          }
          case "customer.subscription.updated":
          case "customer.subscription.created":
          case "customer.subscription.deleted": {
            const s = event.data.object as Stripe.Subscription;
            await c.query(
              `insert into subscriptions(tenant_id, stripe_subscription_id, status, price_id, product_id, current_period_end)
               values ($1,$2,$3,$4,$5,to_timestamp($6))
               on conflict (stripe_subscription_id)
               do update set status=excluded.status, price_id=excluded.price_id, product_id=excluded.product_id,
                             current_period_end=excluded.current_period_end, updated_at=now()`,
              [
                tenantId,
                s.id,
                s.status,
                s.items.data[0]?.price?.id ?? null,
                s.items.data[0]?.price?.product ?? null,
                s.current_period_end
              ]
            );
            const isActive = s.status === "active" || s.status === "trialing" || s.status === "past_due";
            await c.query(
              `insert into feature_flags(tenant_id, premium) values ($1,$2)
               on conflict (tenant_id) do update set premium=$2, updated_at=now()`,
              [tenantId, isActive]
            );
            break;
          }
          default:
            // ignore others
            break;
        }
      });

      return res.json({ received: true });
    } catch (e: any) {
      console.error("[stripe] handler error:", e);
      return res.status(500).send("handler error");
    }
  }
}
