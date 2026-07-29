import { and, eq } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import { billings } from "../../db/schema/index.ts";
import type { BillingRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleBillingRepository
  extends DrizzleRepository
  implements BillingRepository
{
  async listForConsult(consultId: string, tx?: Executor) {
    return this.exec(tx).query.billings.findMany({
      where: eq(billings.consultId, consultId),
    });
  }

  async clearForConsult(consultId: string, tx?: Executor) {
    await this.exec(tx).delete(billings).where(eq(billings.consultId, consultId));
  }

  async create(
    input: Parameters<BillingRepository["create"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx).insert(billings).values(input).returning();
    return row!;
  }

  async markSubmitted(consultId: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(billings)
      .set({ status: "submitted", submittedAt: at })
      .where(
        and(eq(billings.consultId, consultId), eq(billings.status, "pending")),
      );
  }
}
