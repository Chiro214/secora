// backend/src/config/redis.js
import Redis from 'ioredis';

let redis = null;
let isConnected = false;
let hasLoggedWarning = false; // Only log warning once

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Try to connect to Redis, but make it optional for development
try {
    redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        retryStrategy: () => null, // Disable retries to stop loop
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 3000
    });

    redis.on('error', (err) => {
        if (!hasLoggedWarning) {
            hasLoggedWarning = true;
            console.warn('⚠️ Redis not available - running in development mode without queue');
        }
    });

    redis.on('connect', () => {
        isConnected = true;
        console.log('✅ Redis connected');
    });

    // Try to connect once
    redis.connect().catch(() => {
        if (!hasLoggedWarning) {
            hasLoggedWarning = true;
            console.warn('⚠️ Redis connection failed - queue features disabled');
        }
        isConnected = false;
    });
} catch (err) {
    console.warn('⚠️ Redis initialization failed - running without Redis');
}

export const isRedisConnected = () => isConnected;
export default redis;
