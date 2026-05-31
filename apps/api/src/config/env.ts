// apps/api/src/config/env.ts

import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  REDIS_URL: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url().optional(),
  ),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Parses and validates process environment at startup.
 * @throws ZodError when required variables are missing or invalid
 */
export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const raw = {
    NODE_ENV: process.env["NODE_ENV"],
    PORT: process.env["PORT"],
    CORS_ORIGIN: process.env["CORS_ORIGIN"],
    JWT_ACCESS_SECRET: process.env["JWT_ACCESS_SECRET"],
    JWT_REFRESH_SECRET: process.env["JWT_REFRESH_SECRET"],
    FIREBASE_PROJECT_ID: process.env["FIREBASE_PROJECT_ID"],
    FIREBASE_CLIENT_EMAIL: process.env["FIREBASE_CLIENT_EMAIL"],
    FIREBASE_PRIVATE_KEY: process.env["FIREBASE_PRIVATE_KEY"]?.replace(
      /\\n/g,
      "\n",
    ),
    REDIS_URL: process.env["REDIS_URL"],
    DATABASE_URL: process.env["DATABASE_URL"],
  };

  cachedEnv = envSchema.parse(raw);
  return cachedEnv;
}
