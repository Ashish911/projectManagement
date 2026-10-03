import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  UserRepo,
  PreferenceRepo,
  ClientRepo,
  ProjectRepo,
} from "../repositories/import.repo.js";
import { cache } from "../config/cache.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors.js";
import crypto from "crypto";
import { validate } from "../validation/validate.js";
import {
  registerSchema,
  loginSchema,
  idSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/schema.js";
import { NotificationService } from "./notification.service.js";
import { createLogger } from "../config/logger.js";
import { EmailService } from "./email.service.js";

const MAX_LOGIN_ATTEMPTS = 5; // Failed logins allowed before the account is locked
const LOCKOUT_MS = 60 * 60 * 1000; // Lockout lasts 1 hour from the last failed attempt
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // Reset links are valid for 1 hour

// Same message for unknown emails and wrong passwords, so login can't be used to probe for accounts.
const INVALID_CREDENTIALS = "Invalid email or password";
const RESET_REQUESTED_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

// Compared against when the email is unknown, so both paths take a similar time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", 10);

/** Reset tokens are stored as SHA-256 hashes, so a database leak doesn't expose usable links. */
const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/** Authentication, password reset, and user management. */
export const UserService = {
  /**
   * Logs a user in and returns a one-hour JWT.
   * @param {string} email     The user's email address.
   * @param {string} password  The user's password.
   * @param {object} [context] GraphQL context, used for logging.
   * @returns {Promise<object>} `{ id, email, token, tokenExpiration }` (expiration in hours).
   * @throws {UnauthorizedError} If the account is locked out, or the email or password is wrong (same message for both).
   */
  async login(email, password, context) {
    validate(loginSchema, { email, password });
    const logger = createLogger(context);

    const user = await UserRepo.findByEmail(email);

    if (!user) {
      // Dummy compare keeps timing in line with the wrong-password path
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      logger.warn(
        { audit: true, action: "LOGIN_FAILED", reason: "unknown_email" },
        "AUDIT",
      );
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    // Reject while locked out; the lock lifts once LOCKOUT_MS has passed
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS && user.lastFailedLogin) {
      const elapsed = Date.now() - new Date(user.lastFailedLogin).getTime();
      if (elapsed < LOCKOUT_MS) {
        logger.warn(
          {
            audit: true,
            userId: user.id,
            action: "LOGIN_FAILED",
            reason: "locked_out",
          },
          "AUDIT",
        );
        throw new UnauthorizedError(
          "Too many failed login attempts. Try again later.",
        );
      }
    }

    // Wrong password: count the attempt toward the lockout
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const attempts = user.loginAttempts + 1;
      await UserRepo.update(user.id, {
        loginAttempts: attempts,
        lastFailedLogin: new Date().toISOString(),
      });
      logger.warn(
        {
          audit: true,
          userId: user.id,
          action: "LOGIN_FAILED",
          reason: "invalid_password",
          attempts,
        },
        "AUDIT",
      );
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    // Successful login clears the failed-attempt counter
    await UserRepo.update(user.id, {
      loginAttempts: 0,
      lastFailedLogin: null,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "1h" },
    );

    logger.info({ audit: true, userId: user.id, action: "LOGIN" }, "AUDIT");

    return {
      id: user.id,
      email: user.email,
      token,
      tokenExpiration: 1,
    };
  },

  /**
   * Registers a new USER and creates their default preferences.
   * @param {object} data      `{ email, name, number, dob, password, gender }`.
   * @param {object} [context] GraphQL context, used for logging.
   * @returns {Promise<object>} The registered user.
   * @throws {ConflictError} If the email is already registered.
   */
  async register(data, context) {
    validate(registerSchema, data);
    const logger = createLogger(context);

    const existing = await UserRepo.findByEmail(data.email);
    if (existing)
      throw new ConflictError(
        "Email already exists please use a different email",
      );

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await UserRepo.create({
      ...data,
      role: "USER", // Public sign-up is always a USER; admins are made via promoteToAdmin/assignAdmin
      password: hashedPassword,
      loginAttempts: 0,
      lastFailedLogin: null,
    });

    // Every user starts with default preferences
    try {
      await PreferenceRepo.create({
        theme: "LIGHT",
        language: "ENGLISH",
        user: user.id,
      });
    } catch (err) {
      // Roll back the user so re-registration with the same email works
      await UserRepo.delete(user.id);
      throw err;
    }

    logger.info({ audit: true, userId: user.id, action: "REGISTER" }, "AUDIT");

    return user;
  },

  /**
   * Returns a user's profile by ID.
   * @param {string} id User ID.
   * @returns {Promise<object>} The user.
   * @throws {NotFoundError} If the user does not exist.
   */
  async getProfile(id) {
    validate(idSchema, { id });

    const user = await UserRepo.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  /**
   * Lists users: all for SUPER_ADMIN, or those on the CLIENT_ADMIN's client projects.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The visible users.
   * @throws {ForbiddenError} If the user is a USER or a CLIENT_ADMIN with no client.
   */
  async getUsers(context) {
    const { user } = context;

    // SUPER_ADMIN: every user, cached
    if (user.role === "SUPER_ADMIN") {
      const cacheKey = "users:all";
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const users = await UserRepo.find();
      await cache.set(cacheKey, users);
      return users;
    }

    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findByAssignedAdmin(user.id);
      if (!client)
        throw new ForbiddenError("You are not assigned to any client");

      // Unique IDs of users assigned to any of the client's projects
      const projects = await ProjectRepo.findByClientId(client.id);
      const userIds = [
        ...new Set(projects.flatMap((p) => p.assignedUsers.map(String))),
      ];

      if (userIds.length === 0) return [];
      return await UserRepo.findByIds(userIds);
    }

    throw new ForbiddenError(
      "Current role does not have the permission to get users",
    );
  },

  /**
   * Fetches one user. SUPER_ADMIN sees anyone; CLIENT_ADMIN only users on their client's projects.
   * @param {string} id      User ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The user.
   * @throws {ForbiddenError} If the caller may not view this user.
   */
  async getUser(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    if (user.role === "SUPER_ADMIN") {
      const cacheKey = `users:${id}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const targetUser = await UserRepo.findById(id);
      if (!targetUser) throw new NotFoundError("User not found");

      await cache.set(cacheKey, targetUser);
      return targetUser;
    }

    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findByAssignedAdmin(user.id);
      if (!client)
        throw new ForbiddenError("You are not assigned to any client");

      // Target must be assigned to one of the client's projects
      const projects = await ProjectRepo.findByClientId(client.id);
      const userIds = projects.flatMap((p) => p.assignedUsers.map(String));

      if (!userIds.includes(id))
        throw new ForbiddenError("You do not have access to this user");

      const targetUser = await UserRepo.findById(id);
      if (!targetUser) throw new NotFoundError("User not found");
      return targetUser;
    }

    throw new ForbiddenError(
      "Current role does not have the permission to get users",
    );
  },

  /**
   * Deletes a user. SUPER_ADMIN only, and not their own account.
   * @param {string} userId  ID of the user to delete.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted user.
   * @throws {ForbiddenError} If the caller is not a SUPER_ADMIN or targets themselves.
   */
  async deleteUser(userId, context) {
    validate(idSchema, { id: userId });

    const { user } = context;
    const logger = createLogger(context);

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to delete users",
      );
    }

    if (user.id === userId) {
      throw new ForbiddenError("You cannot delete your own account");
    }

    const target = await UserRepo.findById(userId);
    if (!target) throw new NotFoundError("User not found");

    const deleted = await UserRepo.delete(userId);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetUserId: userId,
        action: "DELETE_USER",
      },
      "AUDIT",
    );

    return deleted;
  },

  /**
   * Promotes a USER to CLIENT_ADMIN and notifies them. SUPER_ADMIN only.
   * @param {string} userId  ID of the user to promote.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated user.
   * @throws {ForbiddenError} If the caller is not a SUPER_ADMIN.
   * @throws {ConflictError}  If the user is already an admin.
   */
  async promoteToAdmin(userId, context) {
    validate(idSchema, { id: userId });

    const { user } = context;
    const logger = createLogger(context);

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to promote users to admin",
      );
    }

    const userToPromote = await UserRepo.findById(userId);
    if (!userToPromote) throw new NotFoundError("User not found");

    if (
      userToPromote.role === "CLIENT_ADMIN" ||
      userToPromote.role === "SUPER_ADMIN"
    ) {
      throw new ConflictError("User is already a admin.");
    }

    const updated = await UserRepo.update(userId, { role: "CLIENT_ADMIN" });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetUserId: userId,
        action: "PROMOTE_TO_ADMIN",
      },
      "AUDIT",
    );

    // A failed notification should not fail the promotion
    await NotificationService.notify(
      userId,
      "You have been promoted to Client Admin.",
    ).catch(() => {});

    return updated;
  },

  /**
   * Emails a one-hour password reset link if the account exists.
   * Always returns the same message, so callers can't tell which emails are registered.
   * @param {string} email The account's email address.
   * @param {object} [context] GraphQL context, used for logging.
   * @returns {Promise<{ token: null, message: string }>}
   */
  async forgotPassword(email, context) {
    validate(forgotPasswordSchema, { email });
    const logger = createLogger(context);

    // Respond the same way whether or not the account exists.
    const user = await UserRepo.findByEmail(email);
    if (!user) {
      logger.info(
        {
          audit: true,
          action: "PASSWORD_RESET_REQUESTED",
          reason: "unknown_email",
        },
        "AUDIT",
      );
      return { token: null, message: RESET_REQUESTED_MESSAGE };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await UserRepo.update(user.id, {
      resetToken: hashResetToken(token),
      resetTokenExpiry: expiry,
    });

    // The raw token only ever leaves the server inside the emailed link.
    const appUrl = process.env.APP_URL || "http://localhost:4000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Not awaited, so the response time doesn't reveal whether an email was sent.
    EmailService.sendPasswordReset(user.email, resetUrl).catch((err) =>
      logger.error({ err, userId: user.id }, "Password reset email failed"),
    );

    // Never log the token itself.
    logger.info(
      { audit: true, userId: user.id, action: "PASSWORD_RESET_REQUESTED" },
      "AUDIT",
    );

    return { token: null, message: RESET_REQUESTED_MESSAGE };
  },

  /**
   * Sets a new password using an emailed reset token, then clears the token and lockout.
   * @param {string} token     Raw token from the reset link.
   * @param {string} password  New password.
   * @param {object} [context] GraphQL context, used for logging.
   * @returns {Promise<{ message: string }>}
   * @throws {NotFoundError}     If the token does not match any user.
   * @throws {UnauthorizedError} If the token has expired.
   */
  async resetPassword(token, password, context) {
    validate(resetPasswordSchema, { token, password });
    const logger = createLogger(context);

    // Look up by hash, since only the hash is stored
    const user = await UserRepo.findOne({ resetToken: hashResetToken(token) });
    if (!user) {
      logger.warn(
        {
          audit: true,
          action: "PASSWORD_RESET_FAILED",
          reason: "invalid_token",
        },
        "AUDIT",
      );
      throw new NotFoundError("Invalid or expired reset token");
    }

    if (
      !user.resetTokenExpiry ||
      new Date(user.resetTokenExpiry) < new Date()
    ) {
      logger.warn(
        {
          audit: true,
          userId: user.id,
          action: "PASSWORD_RESET_FAILED",
          reason: "expired_token",
        },
        "AUDIT",
      );
      throw new UnauthorizedError("Reset token has expired");
    }

    // Save the new password, make the token single-use, and lift any lockout
    const hashedPassword = await bcrypt.hash(password, 10);
    await UserRepo.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      loginAttempts: 0,
      lastFailedLogin: null,
    });

    logger.info(
      { audit: true, userId: user.id, action: "PASSWORD_RESET" },
      "AUDIT",
    );

    return { message: "Password reset successfully" };
  },

  async updateProfile(data, context) {
    validate(updateProfileSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const updated = await UserRepo.update(user.id, data);
    if (!updated) throw new NotFoundError("User not found");

    await cache.invalidate(`users:${user.id}`);

    logger.info(
      { audit: true, userId: user.id, action: "UPDATE_PROFILE" },
      "AUDIT",
    );

    return updated;
  },
};
