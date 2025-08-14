import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "") || "http://otel-collector:4318";

export async function startTelemetry() {
  const prometheus = new PrometheusExporter(
    {
      port: Number(process.env.API_OTEL_PROM_PORT || 9464),
      endpoint: "/metrics"
    },
    () => console.log("[otel] Prometheus exporter running")
  );

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
    metricReader: prometheus,
    instrumentations: [getNodeAutoInstrumentations()]
  });

  await sdk.start();
  process.on("SIGTERM", async () => { await sdk.shutdown(); process.exit(0); });
  process.on("SIGINT", async () => { await sdk.shutdown(); process.exit(0); });
}
