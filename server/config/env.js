// Validates environment variables at startup. Imported first in app.js.
import z from "zod";

// Required environment variables and their rules.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("8000"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  SECRET_KEY: z.string().min(32, "SECRET_KEY must be at least 32 characters"), // Long enough to keep JWT signing secure
});

const env = envSchema.safeParse(process.env);

// Stop the app immediately if any variable is missing or invalid.
if (!env.success) {
  console.error("Invalid environment variables:", env.error.format());
  process.exit(1);
}

/**
 * Validated environment variables.
 * Defaults (e.g. PORT) apply here only; they are not written back to `process.env`.
 */
export const config = env.data;
