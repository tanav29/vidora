import { Redis } from "@upstash/redis";

export const QUEUE = "video-queue";

export type QueueJob = {
  name: string;
  ext: string;
  attempts?: number;
};

const redis = Redis.fromEnv();

export async function publishJob(job: QueueJob) {
  await (redis as any).lpush(QUEUE, JSON.stringify(job));
}
