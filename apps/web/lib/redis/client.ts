import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    return new Redis({ lazyConnect: true, enableOfflineQueue: false }).on(
      "error",
      () => {}
    );
  }
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });
  client.on("connect", () => {
    console.log(
      JSON.stringify({
        scope: "redis",
        timestamp: new Date().toISOString(),
        event: "connect",
      })
    );
  });
  client.on("error", (err) => {
    console.warn("[redis] error:", err.message);
  });
  return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient();
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export function isRedisAvailable(): boolean {
  return redis.status === "ready";
}
