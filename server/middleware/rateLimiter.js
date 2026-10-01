import { TooManyRequestsError } from "../errors/import.error.js";

// Stores request timestamps per "ip:operationName" key.
// In-memory only, so counts reset on restart and are not shared between processes.
const requestCounts = new Map();

/**
 * Creates a simple in-memory rate limiter using a sliding time window.
 * @param {object} options
 * @param {number} options.windowMs Length of the time window in milliseconds.
 * @param {number} options.max      Maximum requests allowed per window.
 * @param {string} options.message  Error message sent when the limit is exceeded.
 * @returns {(ip: string, operationName: string) => void} Records a request; throws TooManyRequestsError over the limit.
 */
export const createRateLimiter = ({ windowMs, max, message }) => {
  return (ip, operationName) => {
    // Each IP gets a separate limit for each GraphQL operation.
    const key = `${ip}:${operationName}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // First request from this key: start an empty history.
    if (!requestCounts.has(key)) {
      requestCounts.set(key, []);
    }

    // Drop timestamps that fall outside the current window.
    const requests = requestCounts
      .get(key)
      .filter((time) => time > windowStart);
    // Record the current request, then save the trimmed list back.
    requests.push(now);
    requestCounts.set(key, requests);

    // Too many requests in the current window: reject this one.
    if (requests.length > max) {
      throw new TooManyRequestsError(message);
    }
  };
};

/**
 * General API rate limiter, applied to every GraphQL request.
 * Used in server.js in development only; production relies on infrastructure rate limiting.
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests, please try again later",
});
