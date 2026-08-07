import type { Database, Executor } from "./client.ts";

/**
 * Transaction boundary abstraction.
 *
 * Services declare "these writes are atomic" without importing Drizzle or
 * knowing which driver is underneath. The composition root supplies the
 * concrete runner; a test can supply one that simply calls the function.
 */
export interface TransactionRunner {
  run<T>(fn: (tx: Executor) => Promise<T>): Promise<T>;
}

export class DrizzleTransactionRunner implements TransactionRunner {
  constructor(private readonly db: Database) {}

  run<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => fn(tx));
  }
}

/** Test double — no real transaction, just executes the body. */
export class PassthroughTransactionRunner implements TransactionRunner {
  constructor(private readonly db: Database) {}

  run<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
    return fn(this.db);
  }
}
