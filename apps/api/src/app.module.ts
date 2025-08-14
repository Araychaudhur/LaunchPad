import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AuthController } from "./auth.controller";
import { OrgsController } from "./orgs.controller";
import { MeController } from "./me.controller";

@Module({
  imports: [],
  controllers: [HealthController, AuthController, OrgsController, MeController],
  providers: []
})
export class AppModule {}
