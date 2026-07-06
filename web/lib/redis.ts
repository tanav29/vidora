import { Redis } from "@upstash/redis";

function createRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis is not configured");
  }

  return new Redis({ url, token });
}

export const redis = {
  get(key: string) {
    return createRedis().get(key);
  },
  set(key: string, value: unknown, options?: Parameters<Redis["set"]>[2]) {
    return createRedis().set(key, value, options);
  },
  del(key: string) {
    return createRedis().del(key);
  },
};
