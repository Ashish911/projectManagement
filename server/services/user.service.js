import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRepo, PreferenceRepo } from "../repositories/import.repo.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/errors.js";
import { validate } from "../validation/validate.js";
import { registerSchema, loginSchema, idSchema } from "../validation/schema.js";

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
      user: user,
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
    const { user, logger } = context;

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to promote users to admin",
      );
    }

    const userToPromote = await UserRepo.findById(userId).orElseThrow(
      new NotFoundError("User not found"),
    );

    if (
      userToPromote.role == "CLIENT_ADMIN" ||
      userToPromote.role == "SUPER_ADMIN"
    ) {
      throw new ConflictError("User is already a admin.");
    }

    const updated = await UserRepo.update(userId, { role: "CLIENT_ADMIN" });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetClientId: userId,
        action: "PROMOTE_TO_ADMIN",
      },
      "AUDIT",
    );

    return updated;
  },
};
