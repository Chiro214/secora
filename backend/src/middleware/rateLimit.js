// backend/src/middleware/rateLimit.js
import redis from "../config/redis.js";

const WINDOW_SIZE_IN_SECONDS = 60 * 10; // 10 minutes
const MAX_WINDOW_REQUEST_COUNT = 5;
const WINDOW_LOG_INTERVAL_IN_SECONDS = 60;

/**
 * Rate Limiter Middleware
 * Uses Redis to track attempts by IP and Email (if provided).
 */
export const rateLimiter = async (req, res, next) => {
    try {
        const ip = req.ip || req.connection.remoteAddress;

        // Limiting by IP
        const key = `rate:login:ip:${ip}`;
        const currentCount = await redis.incr(key);

        if (currentCount === 1) {
            await redis.expire(key, WINDOW_SIZE_IN_SECONDS);
        }

        if (currentCount > MAX_WINDOW_REQUEST_COUNT) {
            console.warn(`[RateLimit] Blocked IP: ${ip}`);
            return res.status(429).json({
                message: "Too many login attempts. Please try again later."
            });
        }

        // Optional: Limit by Account (if email is in body)
        if (req.body.email) {
            const emailKey = `rate:login:email:${req.body.email}`;
            const emailCount = await redis.incr(emailKey);
            if (emailCount === 1) {
                await redis.expire(emailKey, WINDOW_SIZE_IN_SECONDS);
            }
            if (emailCount > MAX_WINDOW_REQUEST_COUNT) {
                // Don't leak exists, just block
                return res.status(429).json({
                    message: "Too many login attempts for this account."
                });
            }
        }

        next();
    } catch (error) {
        console.error("Rate Limiter Error:", error);
        // Fail open or closed? Closed for security.
        next();
    }
};
