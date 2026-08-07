import type { Config } from "drizzle-kit";
import { env } from "./src/config/env.ts";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  verbose: true,
  strict: false,
} satisfies Config;
