import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserRepo } from "../repositories/user.repo.js";
import {PreferenceRepo} from "../repositories/import.repo.js";
import User from "../models/User.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

export const UserService = {
    async login (email, password) {
        console.log(email, password);
        const user = await UserRepo.findByEmail(email);

        if (!user) throw new Error("User not found");

        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS && user.lastFailedLogin) {
            const elapsed = Date.now() - new Date(user.lastFailedLogin).getTime();
            if (elapsed < LOCKOUT_MS) {
                throw new Error("Too many failed login attempts. Try again later.");
            }
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            user.loginAttempts++;
            user.lastFailedLogin = new Date().toISOString();
            await user.save();
            throw new Error("Invalid password");
        }

        user.loginAttempts = 0;
        user.lastFailedLogin = null;
        await user.save();

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: "1h" }
        );

        return {
            id: user[0]?.id,
            email: user[0]?.email,
            token,
            tokenExpiration: 1,
        }
    },
    async register(data) {
        const existing = await UserRepo.findByEmail(data.email);
        if (existing) throw new Error("Email already exists please use a different email")

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

    async getProfile(id) {
        const user = await UserRepo.findById(id);
        if (!user) throw new Error("User not found");
        return user;
    }
}