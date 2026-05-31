// packages/shared/src/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .url("DATABASE_URL must be a valid URL"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url("NEXT_PUBLIC_API_URL must be a valid URL")
    .optional(),
});

/** Validated environment variables for CodeVault services. */
export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Validates `process.env` against the CodeVault schema and returns typed config.
 * Caches the result after the first successful validation.
 *
 * @throws {z.ZodError} When required variables are missing or invalid.
 */
export function loadEnv(overrides?: Partial<Record<keyof Env, string>>): Env {
  if (cachedEnv && !overrides) {
    return cachedEnv;
  }

  const raw = {
    DATABASE_URL: overrides?.DATABASE_URL ?? process.env.DATABASE_URL,
    NODE_ENV: overrides?.NODE_ENV ?? process.env.NODE_ENV,
    PORT: overrides?.PORT ?? process.env.PORT,
    NEXT_PUBLIC_API_URL:
      overrides?.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL,
  };

  const parsed = envSchema.parse(raw);
  if (!overrides) {
    cachedEnv = parsed;
  }
  return parsed;
}

/**
 * Validates environment at application startup.
 * Logs a formatted error and exits the process on failure.
 */
export function validateEnvAtStartup(): Env {
  try {
    return loadEnv();
  } catch (error) {
    console.error("[codevault] Environment validation failed:");
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
    throw new Error("unreachable");
  }
}

export { envSchema };
