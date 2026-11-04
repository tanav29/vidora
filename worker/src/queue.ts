import "./config.js";
import { Redis } from "@upstash/redis";

export const QUEUE = "video-queue";
export const RETRY_QUEUE = "video-queue:retry";
export const INFLIGHT = "video-queue:inflight";
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 30_000;
export const LEASE_MS = 60 * 60 * 1000;

const redis = Redis.fromEnv();

type RedisLike = {
  eval: (
    script: string,
    keys: string[],
    args: (string | number)[],
  ) => Promise<unknown>;
  zadd: (key: string, member: Record<string, unknown>) => Promise<unknown>;
  zrem: (key: string, member: string) => Promise<unknown>;
  zrange: (key: string, start: string | number, stop: string | number, options?: unknown) => Promise<unknown>;
  lpush: (key: string, value: string) => Promise<unknown>;
};

const $redis = redis as unknown as RedisLike;

export type QueueJob = {
  name: string;
  ext: string;
  resolutions?: string[];
  attempts?: number;
  runId?: string;
};

const POP_SCRIPT = `
local raw = redis.call('rpop', KEYS[1])
if raw then
  redis.call('zadd', KEYS[2], ARGV[1], raw)
end
return raw
`;

export function parseJob(raw: string | null): QueueJob | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.name === "string" &&
      typeof parsed.ext === "string"
    ) {
      return {
        name: parsed.name,
        ext: parsed.ext,
        resolutions:
          Array.isArray(parsed.resolutions) &&
          parsed.resolutions.every((r: unknown) => typeof r === "string")
            ? parsed.resolutions
            : undefined,
        attempts:
          typeof parsed.attempts === "number" && Number.isFinite(parsed.attempts)
            ? parsed.attempts
            : 0,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Atomically pops a job off the queue and claims it in the inflight set with a
 * lease (score = expiry timestamp). A crashed worker leaves the job in inflight;
 * once the lease expires, `recoverExpiredInflight` re-queues it so nothing is lost.
 */
export async function popJob(): Promise<string | null> {
  const raw = await $redis.eval(POP_SCRIPT, [QUEUE, INFLIGHT], [
    Date.now() + LEASE_MS,
  ]);
  return typeof raw === "string" ? raw : null;
}

/** Releases a job claim (success or terminal failure). */
export async function completeJob(raw: string) {
  await $redis.zrem(INFLIGHT, raw);
}

/** Heartbeat: extends the lease for a job still being processed. */
export async function touchJob(raw: string) {
  await $redis.eval(`
    if redis.call("zscore", KEYS[1], ARGV[1]) then
      return redis.call("zadd", KEYS[1], ARGV[2], ARGV[1])
    end
    return 0
  `, [INFLIGHT], [raw, Date.now() + LEASE_MS]);
}

export async function scheduleRetry(job: QueueJob) {
  await $redis.zadd(RETRY_QUEUE, {
    score: Date.now() + RETRY_DELAY_MS,
    member: JSON.stringify(job),
  });
}

// Move due jobs atomically so a worker crash cannot lose a claimed job.
async function requeueDueMembers(setKey: string, limit: number) {
  return $redis.eval(`
    local jobs = redis.call('zrangebyscore', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[2])
    for _, job in ipairs(jobs) do
      redis.call('zrem', KEYS[1], job)
      redis.call('lpush', KEYS[2], job)
    end
    return #jobs
  `, [setKey, QUEUE], [Date.now(), limit]);
}

/** Re-queues delayed retry jobs whose wait time has elapsed. */
export async function drainDueRetries(limit = 25) {
  await requeueDueMembers(RETRY_QUEUE, limit);
}

/** Re-queues inflight jobs whose lease expired (e.g. crashed workers). */
export async function recoverExpiredInflight(limit = 25) {
  await requeueDueMembers(INFLIGHT, limit);
}