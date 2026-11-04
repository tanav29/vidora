import pino from "pino";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

function createObservability() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: "vidora_web_" });
  return {
    registry,
    logger: pino({ name: "vidora-web", level: process.env.LOG_LEVEL || "info" }),
    requests: new Counter({ name: "vidora_http_requests_total", help: "API requests", labelNames: ["method", "route", "status"] as const, registers: [registry] }),
    duration: new Histogram({ name: "vidora_http_request_duration_seconds", help: "API request duration", labelNames: ["method", "route"] as const, registers: [registry] }),
  };
}
const globalObservability = globalThis as typeof globalThis & { vidoraObservability?: ReturnType<typeof createObservability> };
export const observability = globalObservability.vidoraObservability ??= createObservability();
