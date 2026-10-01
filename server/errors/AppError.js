/**
 * Base class for application errors.
 * `code` and `statusCode` are returned to the client via GraphQL `extensions`.
 */
export class AppError extends Error {
  /**
   * @param {string} message      Error message shown to the client.
   * @param {string} [code]       Error code, e.g. "NOT_FOUND".
   * @param {number} [statusCode] HTTP status code, e.g. 404.
   */
  constructor(message, code = "BAD_REQUEST", statusCode = 400) {
    super(message);
    this.name = this.constructor.name; // Subclass name, e.g. "NotFoundError"
    this.code = code;
    this.statusCode = statusCode;
  }
}
