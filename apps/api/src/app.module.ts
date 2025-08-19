import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AuthController } from "./auth.controller";
import { OrgsController } from "./orgs.controller";
import { MeController } from "./me.controller";
import { AuditController } from "./audit.controller";
import { BillingController } from "./billing.controller";
import { StripeWebhookController } from "./stripe.webhook.controller";
import { RolesGuard } from "./rbac";

@Module({
  controllers: [
    HealthController,
    AuthController,
    OrgsController,
    MeController,
    AuditController,
    BillingController,
    StripeWebhookController
  ],
  providers: [RolesGuard]
})
export class AppModule {}
