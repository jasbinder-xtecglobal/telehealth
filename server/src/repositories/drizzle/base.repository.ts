import type { Database, Executor } from "../../db/client.ts";

/**
 * Shared plumbing for Drizzle repositories.
 *
 * The only responsibility is resolving which executor to use: the pooled
 * connection by default, or an open transaction when the caller supplies one.
 * That lets a service compose several repository calls into one atomic unit
 * without any repository knowing about transactions.
 */
export abstract class DrizzleRepository {
  constructor(protected readonly db: Database) {}

  protected exec(tx?: Executor): Database {
    return (tx ?? this.db) as Database;
  }
}
