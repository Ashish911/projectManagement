import { ValidationError } from "../errors/import.error.js";

const requestCounts = new Map();
// Simple in-memory rate limiter
export const createRateLimiter = ({ windowMs, max, message }) => {
  return (ip, operationName) => {
    const key = `${ip}:${operationName}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requestCounts.has(key)) {
      requestCounts.set(key, []);
    }

    // Filter out old requests outside the window
    const requests = requestCounts
      .get(key)
      .filter((time) => time > windowStart);
    requests.push(now);
    requestCounts.set(key, requests);

    if (requests.length > max) {
      throw new ValidationError(message);
    }
  };
};

// General API rate limiter - 100 requests per minute
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later",
});
