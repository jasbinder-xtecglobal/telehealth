import type { Executor } from "../../db/client.ts";
import { auditEvents } from "../../db/schema/index.ts";
import type { AuditRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

/**
 * Append-only by contract.
 *
 * This class deliberately exposes no update or delete method — the only way to
 * touch `audit_events` through the application is to add a row.
 */
export class DrizzleAuditRepository
  extends DrizzleRepository
  implements AuditRepository
{
  async record(
    input: {
      actorId: string;
      actorName: string;
      eventType: string;
      entityType?: string;
      entityId?: string;
      payload?: Record<string, unknown>;
    },
    tx?: Executor,
  ): Promise<void> {
    await this.exec(tx).insert(auditEvents).values(input);
  }
}
