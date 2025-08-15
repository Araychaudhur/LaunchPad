import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AuthController } from "./auth.controller";
import { OrgsController } from "./orgs.controller";
import { MeController } from "./me.controller";
import { AuditController } from "./audit.controller";
import { RolesGuard } from "./rbac";

@Module({
  imports: [],
  controllers: [HealthController, AuthController, OrgsController, MeController, AuditController],
  providers: [RolesGuard]
})
export class AppModule {}
