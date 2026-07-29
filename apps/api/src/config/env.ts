import { z } from "zod";

/**
 * Environment loading and validation.
 *
 * Single source of truth for configuration. Nothing else in the codebase reads
 * `process.env` — everything imports `env` from here, so a missing or malformed
 * variable fails once, at startup, with a readable message.
 */

// Node's built-in loader — no dotenv dependency.
for (const path of ["../../.env", "../.env", ".env"]) {
  try {
    process.loadEnvFile(path);
  } catch {
    // Absent file is fine; real deployments inject variables directly.
  }
}

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a postgres:// connection string",
    }),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");

  console.error(
    [
      "",
      "Configuration error:",
      issues,
      "",
      "Copy .env.example to .env and set DATABASE_URL to your Neon connection string.",
      "Neon → project → Connection Details → copy the pooled connection string.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

/** Neon hosts require TLS; local Postgres generally does not. */
export const isNeon = /\.neon\.tech/i.test(env.DATABASE_URL);
