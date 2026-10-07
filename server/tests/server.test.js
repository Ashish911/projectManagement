// tests/server.test.js
import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

// ─── Mock functions ───────────────────────────────────────────────
const mockCounterInc = jest.fn();
const mockLog = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
// Child loggers record the bindings they were created with, so tests can check them.
const mockChild = jest.fn((bindings) => ({ ...mockLog, bindings, child: mockChild }));

// ─── Mock the modules using unstable_mockModule ───────────────────
jest.unstable_mockModule("../graphql/schema.js", () => ({ default: {} }));

jest.unstable_mockModule("../config/logger.js", () => ({
  default: { ...mockLog, child: mockChild },
}));

jest.unstable_mockModule("../config/metrics.js", () => ({
  graphqlRequestCounter: { inc: mockCounterInc },
  graphqlRequestDuration: { observe: jest.fn() },
}));

jest.unstable_mockModule("../middleware/rateLimiter.js", () => ({
  apiLimiter: jest.fn(),
}));

jest.unstable_mockModule("../config/health.js", () => ({
  checkReadiness: jest.fn(),
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { buildHttpContext } = await import("../server.js");

// ─── Helpers ──────────────────────────────────────────────────────
const makeReq = ({ operationName, query, authorization } = {}) => ({
  headers: authorization ? { authorization } : {},
  socket: { remoteAddress: "127.0.0.1" },
  body: { operationName, query },
});

const payload = { id: "user-1", email: "test@example.com", role: "USER" };

beforeAll(() => {
  process.env.SECRET_KEY = "test_secret_key";
});

beforeEach(() => jest.clearAllMocks());

// ─── Tests ────────────────────────────────────────────────────────
describe("buildHttpContext", () => {
  it("🟢 should return a context with a null user for public operations", async () => {
    const context = await buildHttpContext({
      req: makeReq({ operationName: "LoginMutation" }),
    });

    expect(context.user).toBeNull();
    expect(context.operation).toBe("LoginMutation");
    expect(context.logger).toBeDefined();
    expect(typeof context.startTime).toBe("number");
  });

  it("🟢 should decode the JWT and tag the logger with userId", async () => {
    const token = jwt.sign(payload, process.env.SECRET_KEY);

    const context = await buildHttpContext({
      req: makeReq({ operationName: "GetUsers", authorization: `Bearer ${token}` }),
    });

    expect(context.user).toMatchObject(payload);
    expect(context.logger.bindings).toEqual({ userId: "user-1" });
  });

  it("🟢 should read the operation name from the query when operationName is missing", async () => {
    const context = await buildHttpContext({
      req: makeReq({ query: "mutation LoginMutation { login { token } }" }),
    });

    expect(context.operation).toBe("LoginMutation");
  });

  it("🟢 should group operation names that are not plain identifiers as unknown", async () => {
    const token = jwt.sign(payload, process.env.SECRET_KEY);

    const context = await buildHttpContext({
      req: makeReq({
        operationName: "x".repeat(65),
        authorization: `Bearer ${token}`,
      }),
    });

    expect(context.operation).toBe("unknown");
  });

  it("🔴 should reject a missing token and count it as unauthenticated", async () => {
    await expect(
      buildHttpContext({ req: makeReq({ operationName: "GetUsers" }) }),
    ).rejects.toThrow("Authorization required");

    expect(mockCounterInc).toHaveBeenCalledWith({
      operation: "GetUsers",
      status: "unauthenticated",
    });
    expect(mockLog.warn).toHaveBeenCalledWith(
      { reason: "missing_token" },
      "Authentication failed",
    );
  });

  it("🔴 should reject with a 401 UNAUTHORIZED error, not a 500", async () => {
    const error = await buildHttpContext({
      req: makeReq({ operationName: "GetUsers" }),
    }).catch((err) => err);

    expect(error.extensions).toMatchObject({
      code: "UNAUTHORIZED",
      statusCode: 401,
      http: { status: 401 },
    });
  });

  it("🔴 should reject an invalid token and count it as unauthenticated", async () => {
    await expect(
      buildHttpContext({
        req: makeReq({ operationName: "GetUsers", authorization: "Bearer not-a-jwt" }),
      }),
    ).rejects.toThrow("Invalid or expired token");

    expect(mockCounterInc).toHaveBeenCalledWith({
      operation: "GetUsers",
      status: "unauthenticated",
    });
  });

  it("🔴 should not treat a spoofed public name as public once it is grouped as unknown", async () => {
    await expect(
      buildHttpContext({ req: makeReq({ operationName: "LoginMutation!" }) }),
    ).rejects.toThrow("Authorization required");
  });
});
