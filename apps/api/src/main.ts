import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Start telemetry, but never crash API if it fails
  try {
    const { startTelemetry } = await import("./otel.js");
    await startTelemetry();
  } catch (e: any) {
    console.error("[otel] failed to start; continuing:", e?.message ?? e);
  }

  const app = await NestFactory.create(AppModule, { logger: ["log", "error", "warn"] });
  app.enableShutdownHooks();

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`[api] listening on :${port}`);
}

bootstrap().catch((err) => {
  console.error("[api] fatal error:", err);
  process.exit(1);
});
