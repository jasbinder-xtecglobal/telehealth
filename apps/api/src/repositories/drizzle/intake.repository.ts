import { desc, eq } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import { consultIntake, doctorApplications } from "../../db/schema/index.ts";
import type { DoctorApplication } from "../../db/schema/index.ts";
import type { IntakeRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleIntakeRepository
  extends DrizzleRepository
  implements IntakeRepository
{
  async createConsultIntake(
    input: Parameters<IntakeRepository["createConsultIntake"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx).insert(consultIntake).values(input).returning();
    return row!;
  }

  async findConsultIntake(consultId: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.consultIntake.findFirst({
        where: eq(consultIntake.consultId, consultId),
      })) ?? null
    );
  }

  async createApplication(
    input: Parameters<IntakeRepository["createApplication"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(doctorApplications)
      .values(input)
      .returning();
    return row!;
  }

  async listApplications(tx?: Executor) {
    return this.exec(tx).query.doctorApplications.findMany({
      orderBy: [desc(doctorApplications.createdAt)],
      limit: 200,
    });
  }

  async updateApplication(
    id: string,
    patch: Partial<DoctorApplication>,
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .update(doctorApplications)
      .set(patch)
      .where(eq(doctorApplications.id, id))
      .returning();
    return row ?? null;
  }
}
