import z from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("8000"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  SECRET_KEY: z.string().min(32, "SECRET_KEY must be at least 32 characters"),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("Invalid environment variables:", env.error.format());
  process.exit(1);
}

export const config = env.data;
