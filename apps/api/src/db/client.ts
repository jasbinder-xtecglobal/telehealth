import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "../config/env.ts";
import * as schema from "./schema/index.ts";

/**
 * Database connection.
 *
 * Uses Neon's serverless driver over WebSockets rather than the HTTP driver,
 * because the consult close path runs inside a transaction and the HTTP driver
 * does not support them.
 *
 * The driver speaks standard Postgres, so any Postgres connection string works
 * — Neon is the default target but nothing here is Neon-specific beyond the
 * WebSocket transport.
 */
neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });

/** The concrete database handle. Repositories accept this or a transaction. */
export type Database = typeof db;

/** Inside `db.transaction(...)` the handle is a different type but the same surface. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Either a pooled connection or an open transaction. */
export type Executor = Database | Transaction;

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export { schema };
