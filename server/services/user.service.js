import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRepo } from "../repositories/user.repo.js";
import {gqlError} from "../util.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

export const UserService = {
    async login (email, password) {
        const user = await UserRepo.findByEmail(email);

        if (!user) return gqlError("User not found");

        if (user.loginAttempts >= 5 && user.lastFailedLogin) {
            const elapsed = Date.now() - new Date(user.lastFailedLogin).getTime();
            if (elapsed < 3600000) {
                return gqlError("Too many failed login attempts. Try again later.");
            }
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            user.loginAttempts++;
            user.lastFailedLogin = new Date().toISOString();
            await user.save();
            return gqlError("Invalid password");
        }

        user.loginAttempts = 0;
        user.lastFailedLogin = null;
        await user.save();

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: "1h" }
        );

        return gqlResponse({
            id: user.id,
            email: user.email,
            token,
            tokenExpiration: 1,
        }, "Login successful");

    },
    async register(data) {
        const existing = await UserRepo.findByEmail(data.email);
        if (existing) return gqlError("Email already exists")

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await UserRepo.create({
            ...data,
            password: hashedPassword,
            loginAttempts: 0,
            lastFailedLogin: null,
        });

        return gqlResponse(user, "User registered successfully");
    },
}