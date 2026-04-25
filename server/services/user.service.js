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
import { validate } from "../validation/validate.js";
import { registerSchema, loginSchema, idSchema } from "../validation/schema.js";
import { createLogger } from "../config/logger.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

export const UserService = {
  /**
   * Login a user and return a JWT token.
   * @param {string} email The user's email address.
   * @param {string} password The user's password.
   * @returns {Promise<object>} A promise that resolves to an object containing the user's ID, email, JWT token, and token expiration time in hours.
   * @throws {UnauthorizedError} If the user has attempted to login too many times within the lockout period.
   * @throws {UnauthorizedError} If the user's password is invalid.
   * @throws {NotFoundError} If the user is not found.
   */
  async login(email, password) {
    validate(loginSchema, { email, password });

    const user = await UserRepo.findByEmail(email);

    if (!user) throw new NotFoundError("User not found");

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS && user.lastFailedLogin) {
      const elapsed = Date.now() - new Date(user.lastFailedLogin).getTime();
      if (elapsed < LOCKOUT_MS) {
        throw new UnauthorizedError(
          "Too many failed login attempts. Try again later.",
        );
      }
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await UserRepo.update(user.id, {
        loginAttempts: user.loginAttempts + 1,
        lastFailedLogin: new Date().toISOString(),
      });
      throw new UnauthorizedError("Invalid password");
    }

    await UserRepo.update(user.id, {
      loginAttempts: 0,
      lastFailedLogin: null,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "1h" },
    );

    return {
      id: user.id,
      email: user.email,
      token,
      tokenExpiration: 1,
    };
  },

  /**
   * Register a new user.
   * @param {Object} data - The user data to register.
   * @property {string} data.email - The email of the user.
   * @property {string} data.name - The name of the user.
   * @property {string} data.number - The phone number of the user.
   * @property {string} data.dob - The date of birth of the user.
   * @property {string} data.password - The password of the user.
   * @property {string} data.gender - The gender of the user.
   * @property {string} data.role - The role of the user.
   * @throws {ConflictError} - If the email already exists.
   * @returns {Promise<UserDocument>} - The registered user.
   */
  async register(data) {
    validate(registerSchema, data);

    const existing = await UserRepo.findByEmail(data.email);
    if (existing)
      throw new ConflictError(
        "Email already exists please use a different email",
      );

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await UserRepo.create({
      ...data,
      password: hashedPassword,
      loginAttempts: 0,
      lastFailedLogin: null,
    });

    await PreferenceRepo.create({
      theme: "LIGHT",
      language: "ENGLISH",
      user: user._id,
    });

    return user;
  },

  /**
   * Get the user profile based on the user id.
   * @param {string} id - The id of the user.
   * @throws {NotFoundError} - If the user is not found.
   * @returns {Promise<UserDocument>} - The user profile.
   */
  async getProfile(id) {
    validate(idSchema, { id });

    const user = await UserRepo.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  },

  async getUsers(context) {
    const { user } = context;

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
   * Promote a user to admin.
   * @param {string} userId - The id of the user to promote.
   * @param {object} context - The context object containing the user info.
   * @throws {ForbiddenError} - If the current role does not have the permission to promote users to admin.
   * @throws {NotFoundError} - If the user to promote is not found.
   * @throws {ConflictError} - If the user is already an admin.
   * @returns {Promise<UserDocument>} - The updated user profile.
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

    return updated;
  },
};
