import { desc, eq } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import {
  documents,
  investigations,
  prescriptions,
  referrals,
} from "../../db/schema/index.ts";
import type { ArtefactRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

/**
 * All four artefact types share one repository because they share one
 * lifecycle: created as a draft during the consult, issued together when it
 * closes. Splitting them would scatter that invariant.
 */
export class DrizzleArtefactRepository
  extends DrizzleRepository
  implements ArtefactRepository
{
  /* ---------------- prescriptions ---------------- */

  async createPrescription(
    input: Parameters<ArtefactRepository["createPrescription"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(prescriptions)
      .values({ ...input, status: "draft" })
      .returning();
    return row!;
  }

  async listPrescriptions(consultId: string, tx?: Executor) {
    return this.exec(tx).query.prescriptions.findMany({
      where: eq(prescriptions.consultId, consultId),
    });
  }

  async cancelPrescription(id: string, tx?: Executor) {
    const [row] = await this.exec(tx)
      .update(prescriptions)
      .set({ status: "cancelled" })
      .where(eq(prescriptions.id, id))
      .returning();
    return row ?? null;
  }

  async issuePrescription(id: string, token: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(prescriptions)
      .set({ status: "issued", issuedAt: at, escriptToken: token })
      .where(eq(prescriptions.id, id));
  }

  /* ---------------- referrals ---------------- */

  async createReferral(
    input: Parameters<ArtefactRepository["createReferral"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(referrals)
      .values({ ...input, status: "draft" })
      .returning();
    return row!;
  }

  async issueReferral(id: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(referrals)
      .set({ status: "issued", issuedAt: at })
      .where(eq(referrals.id, id));
  }

  /* ---------------- investigations ---------------- */

  async createInvestigation(
    input: Parameters<ArtefactRepository["createInvestigation"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(investigations)
      .values({ ...input, status: "ordered" })
      .returning();
    return row!;
  }

  async listInvestigationsForDoctor(doctorId: string, tx?: Executor) {
    return this.exec(tx).query.investigations.findMany({
      where: eq(investigations.orderedByDoctorId, doctorId),
      orderBy: [desc(investigations.createdAt)],
    });
  }

  async acknowledgeInvestigation(id: string, at: Date, tx?: Executor) {
    const [row] = await this.exec(tx)
      .update(investigations)
      .set({ status: "acknowledged", acknowledgedAt: at })
      .where(eq(investigations.id, id))
      .returning();
    return row ?? null;
  }

  /* ---------------- documents ---------------- */

  async createDocument(
    input: Parameters<ArtefactRepository["createDocument"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(documents)
      .values({ ...input, status: "draft" })
      .returning();
    return row!;
  }

  async issueDocument(id: string, at: Date, tx?: Executor) {
    await this.exec(tx)
      .update(documents)
      .set({ status: "issued", issuedAt: at })
      .where(eq(documents.id, id));
  }
}
