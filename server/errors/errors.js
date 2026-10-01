// Specific error types thrown by services. Each one sets its own error code and HTTP status.
import { AppError } from "./AppError.js";

/**
 * The requested resource does not exist (404).
 * @param {string} [message] Error message shown to the client.
 */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
  }
}

/**
 * The request has no valid authentication token (401).
 * @param {string} [message] Error message shown to the client.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

/**
 * The user is logged in but not allowed to perform this action (403).
 * @param {string} [message] Error message shown to the client.
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

/**
 * The input is missing or invalid (400).
 * @param {string} [message] Error message shown to the client.
 */
export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, "VALIDATION_ERROR", 400);
  }
}

/**
 * The resource already exists, e.g. a duplicate record (409).
 * @param {string} [message] Error message shown to the client.
 */
export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, "CONFLICT", 409);
  }
}

/**
 * An unexpected failure on the server (500).
 * @param {string} [message] Error message shown to the client.
 */
export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message, "INTERNAL_SERVER_ERROR", 500);
  }
}

/**
 * The client has exceeded the rate limit (429).
 * @param {string} [message] Error message shown to the client.
 */
export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, "TOO_MANY_REQUESTS", 429);
  }
}
