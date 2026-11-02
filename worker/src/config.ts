import "dotenv/config";

const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "BACKEND_URL",
  "WORKER_SHARED_SECRET",
] as const;

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing worker environment variables: ${missing.join(", ")}`);
}

for (const name of ["BACKEND_URL", "UPSTASH_REDIS_REST_URL"] as const) {
  try {
    const url = new URL(process.env[name]!);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    throw new Error(`${name} must be an HTTP or HTTPS URL`);
  }
}
