import { createServer } from "node:http";
import pino from "pino";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const logger = pino({ name: "vidora-worker", level: process.env.LOG_LEVEL || "info" });
const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: "vidora_worker_" });
export const jobs = new Counter({ name: "vidora_jobs_total", help: "Worker job outcomes", labelNames: ["outcome"] as const, registers: [registry] });
export const jobDuration = new Histogram({ name: "vidora_job_duration_seconds", help: "Worker job duration", labelNames: ["outcome"] as const, buckets: [1, 10, 30, 60, 300, 900, 1800, 3600], registers: [registry] });
export function startMetricsServer() {
  const port = Number(process.env.METRICS_PORT || 9464);
  createServer(async (req, res) => {
    if (req.url !== "/metrics") { res.writeHead(404).end(); return; }
    try { res.writeHead(200, { "Content-Type": registry.contentType }); res.end(await registry.metrics()); }
    catch { res.writeHead(500).end(); }
  }).listen(port, process.env.METRICS_HOST || "127.0.0.1", () => logger.info({ port }, "Metrics server listening"));
}
