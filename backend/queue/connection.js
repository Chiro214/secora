// backend/queue/connection.js
import IORedis from "ioredis";

// Read Redis config from .env
const {
  REDIS_HOST = "127.0.0.1",
  REDIS_PORT = "6379",
  REDIS_PASS = "",
  REDIS_DB = "0",
} = process.env;

// Shared connection object for BullMQ
export const redisConnection = {
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASS || undefined,
  db: Number(REDIS_DB || 0),
};

// Optional helper for manual Redis operations
export function createRedisClient() {
  return new IORedis({
    host: redisConnection.host,
    port: redisConnection.port,
    password: redisConnection.password,
    db: redisConnection.db,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
}
