import client from "prom-client";
import type { Request, Response, NextFunction } from "express";
import type { INestApplication } from "@nestjs/common";

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Request duration in seconds",
  registers: [registry],
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  registers: [registry],
  labelNames: ["method", "route", "status"] as const
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ns = Number(process.hrtime.bigint() - start);
    const s = ns / 1e9;
    // Nest/Express route path if known, else fallback to URL without query
    const route = (req as any).route?.path || req.path || req.url.split("?")[0] || "unknown";
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestDuration.observe(labels as any, s);
    httpRequestsTotal.inc(labels as any);
  });
  next();
}

// Mount /metrics on the main app (served from port 3001)
export function attachMetricsEndpoint(app: INestApplication) {
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get("/metrics", async (_req: Request, res: Response) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  });
}
