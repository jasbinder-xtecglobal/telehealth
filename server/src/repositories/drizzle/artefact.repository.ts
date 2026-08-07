import { desc, eq, inArray } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import {
  consults,
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

  /**
   * The inbox row shows who the result belongs to and what they originally
   * asked for, so the consult and patient come back with it rather than in a
   * second round trip per row.
   */
  async listInvestigationsForDoctor(doctorId: string, tx?: Executor) {
    return (await this.exec(tx).query.investigations.findMany({
      where: eq(investigations.orderedByDoctorId, doctorId),
      with: { consult: { with: { patient: true } } },
      orderBy: [desc(investigations.createdAt)],
    })) as never;
  }

  /**
   * The results panel in the consult console spans the patient's whole
   * history, not just the consult being written — a result ordered last month
   * is exactly what the doctor needs to see now.
   */
  async listInvestigationsForPatient(patientId: string, tx?: Executor) {
    const db = this.exec(tx);
    return (await db.query.investigations.findMany({
      where: inArray(
        investigations.consultId,
        db
          .select({ id: consults.id })
          .from(consults)
          .where(eq(consults.patientId, patientId)),
      ),
      with: { consult: { with: { patient: true } } },
      orderBy: [desc(investigations.createdAt)],
    })) as never;
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
