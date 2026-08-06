import { and, desc, eq, isNull } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import type { CallMode, CallProviderId } from "../../db/schema/enums.ts";
import { callSessions } from "../../db/schema/index.ts";
import type { CallRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleCallRepository
  extends DrizzleRepository
  implements CallRepository
{
  async findActive(consultId: string, tx?: Executor) {
    const row = await this.exec(tx).query.callSessions.findFirst({
      where: and(
        eq(callSessions.consultId, consultId),
        isNull(callSessions.endedAt),
      ),
      orderBy: [desc(callSessions.startedAt)],
    });
    return row ?? null;
  }

  async findById(id: string, tx?: Executor) {
    const row = await this.exec(tx).query.callSessions.findFirst({
      where: eq(callSessions.id, id),
    });
    return row ?? null;
  }

  async listForConsult(consultId: string, tx?: Executor) {
    return this.exec(tx).query.callSessions.findMany({
      where: eq(callSessions.consultId, consultId),
      orderBy: [desc(callSessions.startedAt)],
    });
  }

  async open(
    input: {
      consultId: string;
      provider: CallProviderId;
      mode: CallMode;
      roomName: string;
      startedByDoctorId: string;
    },
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx).insert(callSessions).values(input).returning();
    return row!;
  }

  async close(id: string, input: { endedAt: Date; reason: string }, tx?: Executor) {
    // `isNull(endedAt)` makes this idempotent — a second close is a no-op
    // rather than a rewrite of the original end time.
    const [row] = await this.exec(tx)
      .update(callSessions)
      .set({ endedAt: input.endedAt, endedReason: input.reason })
      .where(and(eq(callSessions.id, id), isNull(callSessions.endedAt)))
      .returning();

    return row ?? this.findById(id, tx);
  }
}
