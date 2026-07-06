import { Redis } from "@upstash/redis";

export const QUEUE = "video-queue";
export const RETRY_QUEUE = "video-queue:retry";
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 30_000;

const redis = Redis.fromEnv();

export type QueueJob = {
  name: string;
  ext: string;
  attempts?: number;
};

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

export async function popJob(): Promise<string | null> {
  const raw = await (redis as any).rpop(QUEUE);
  return typeof raw === "string" ? raw : null;
}

export async function scheduleRetry(job: QueueJob) {
  await (redis as any).zadd(RETRY_QUEUE, {
    score: Date.now() + RETRY_DELAY_MS,
    member: JSON.stringify(job),
  });
}

function extractDueMembers(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  if (typeof raw[0] === "string") {
    if (raw.length % 2 === 0) {
      const members: string[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        members.push(raw[i]);
      }
      return members;
    }

    return raw as string[];
  }

  if (Array.isArray(raw[0])) {
    return raw
      .map((item) => item[0])
      .filter((item): item is string => typeof item === "string");
  }

  if (typeof raw[0] === "object" && raw[0] !== null && "member" in raw[0]) {
    return raw
      .map((item) => (item as { member?: unknown }).member)
      .filter((item): item is string => typeof item === "string");
  }

  return [];
}

export async function drainDueRetries(limit = 25) {
  const due = await (redis as any).zrange(RETRY_QUEUE, "-inf", Date.now(), {
    byScore: true,
    withScores: true,
    count: limit,
    offset: 0,
  });

  const members = extractDueMembers(due);
  for (const member of members) {
    const removed = await (redis as any).zrem(RETRY_QUEUE, member);
    if (removed) {
      await (redis as any).lpush(QUEUE, member);
    }
  }
}
