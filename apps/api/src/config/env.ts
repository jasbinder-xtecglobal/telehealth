import { z } from "zod";

/**
 * Environment loading and validation.
 *
 * Single source of truth for configuration. Nothing else in the codebase reads
 * `process.env` — everything imports `env` from here, so a missing or malformed
 * variable fails once, at startup, with a readable message.
 */

// Node's built-in loader — no dotenv dependency. Absent in hosted
// environments, where variables are injected directly.
for (const path of ["../../.env", "../.env", ".env"]) {
  try {
    process.loadEnvFile(path);
  } catch {
    // Nothing to load here; keep looking.
  }
}

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a postgres:// connection string",
    }),

  /**
   * Hosts inject the listening port as `PORT`; locally we use `API_PORT`.
   * Render will not route traffic to a process listening anywhere else.
   */
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),

  /**
   * Comma-separated list of browser origins allowed to call the API with
   * credentials. Must name the deployed web app exactly — a wildcard is not
   * permitted alongside `credentials: true`.
   */
  WEB_ORIGIN: z.string().default("http://localhost:5173"),

  /**
   * `lax` when the web app and API share a domain (including via a proxy
   * rewrite), `none` when they are on genuinely different sites.
   *
   * `none` also requires `Secure`, and is subject to third-party cookie
   * blocking in Safari and increasingly in Chrome — prefer the proxy.
   */
  COOKIE_SAMESITE: z.enum(["lax", "none"]).default("lax"),

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
      "Locally: copy .env.example to .env and set DATABASE_URL to your Neon connection string.",
      "Hosted:  set the variables in your platform's environment settings.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  /** The port to actually bind. */
  port: raw.PORT ?? raw.API_PORT,
  /** Browser origins permitted to send credentials. */
  webOrigins: raw.WEB_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  isProduction: raw.NODE_ENV === "production",
};

export type Env = typeof env;
