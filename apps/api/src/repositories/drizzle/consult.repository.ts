import { and, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import {
  consults,
  consultTranscripts,
  noteRevisions,
  patients,
} from "../../db/schema/index.ts";
import type { ConsultChannel, ConsultStatus } from "../../db/schema/enums.ts";
import type { Consult } from "../../db/schema/consults.ts";
import type {
  ConsultAggregate,
  ConsultRepository,
  ConsultWithPatient,
} from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleConsultRepository
  extends DrizzleRepository
  implements ConsultRepository
{
  async findById(id: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.consults.findFirst({
        where: eq(consults.id, id),
      })) ?? null
    );
  }

  async findAggregate(id: string, tx?: Executor) {
    return (
      ((await this.exec(tx).query.consults.findFirst({
        where: eq(consults.id, id),
        with: {
          patient: true,
          doctor: true,
          prescriptions: true,
          referrals: true,
          investigations: true,
          documents: true,
          billings: true,
        },
      })) as ConsultAggregate | undefined) ?? null
    );
  }

  async findWithPatient(id: string, tx?: Executor) {
    return (
      ((await this.exec(tx).query.consults.findFirst({
        where: eq(consults.id, id),
        with: { patient: true },
      })) as ConsultWithPatient | undefined) ?? null
    );
  }

  /** Ordering is deliberately left to the queue policy, not encoded in SQL. */
  async listQueued(channel: ConsultChannel, tx?: Executor) {
    return (await this.exec(tx).query.consults.findMany({
      where: and(
        eq(consults.channel, channel),
        inArray(consults.status, ["queued", "requeued"]),
      ),
      with: { patient: true },
    })) as ConsultWithPatient[];
  }

  async listByDoctor(
    doctorId: string,
    statuses: readonly ConsultStatus[],
    tx?: Executor,
  ) {
    return (await this.exec(tx).query.consults.findMany({
      where: and(
        eq(consults.doctorId, doctorId),
        inArray(consults.status, [...statuses]),
      ),
      with: { patient: true },
      orderBy: [desc(consults.claimedAt)],
    })) as ConsultWithPatient[];
  }

  async listClosedForPatient(
    patientId: string,
    excludeConsultId: string,
    tx?: Executor,
  ) {
    return (await this.exec(tx).query.consults.findMany({
      where: and(
        eq(consults.patientId, patientId),
        eq(consults.status, "closed"),
        ne(consults.id, excludeConsultId),
        isNotNull(consults.notes),
      ),
      with: { doctor: true },
      orderBy: [desc(consults.endedAt)],
      limit: 20,
    })) as (Consult & { doctor: NonNullable<ConsultAggregate["doctor"]> | null })[];
  }

  async listClosedForDoctor(doctorId: string, tx?: Executor) {
    return (await this.exec(tx).query.consults.findMany({
      where: and(eq(consults.doctorId, doctorId), eq(consults.status, "closed")),
      with: { patient: true, billings: true },
      orderBy: [desc(consults.endedAt)],
      limit: 200,
    })) as never;
  }

  async listAllWithBillings(tx?: Executor) {
    return (await this.exec(tx).query.consults.findMany({
      with: { billings: true },
    })) as never;
  }

  async create(
    input: Parameters<ConsultRepository["create"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx).insert(consults).values(input).returning();
    return row!;
  }

  async update(id: string, patch: Partial<Consult>, tx?: Executor) {
    const [row] = await this.exec(tx)
      .update(consults)
      .set(patch)
      .where(eq(consults.id, id))
      .returning();
    return row ?? null;
  }

  /**
   * Conditional update — the WHERE clause carries the claimable-status guard,
   * so two concurrent claims cannot both succeed. The loser gets null.
   */
  async claimIfAvailable(
    id: string,
    doctorId: string,
    claimableStatuses: readonly ConsultStatus[],
    at: Date,
    tx?: Executor,
  ) {
    const rows = await this.exec(tx)
      .update(consults)
      .set({ doctorId, status: "claimed", claimedAt: at })
      .where(
        and(eq(consults.id, id), inArray(consults.status, [...claimableStatuses])),
      )
      .returning();
    return rows[0] ?? null;
  }

  async claimFamilyGroup(
    familyGroupId: string,
    doctorId: string,
    claimableStatuses: readonly ConsultStatus[],
    at: Date,
    tx?: Executor,
  ) {
    const db = this.exec(tx);

    const siblings = await db
      .select({ id: consults.id })
      .from(consults)
      .innerJoin(patients, eq(patients.id, consults.patientId))
      .where(
        and(
          eq(patients.familyGroupId, familyGroupId),
          inArray(consults.status, [...claimableStatuses]),
        ),
      );

    const ids = siblings.map((s) => s.id);
    if (ids.length === 0) return [];

    const rows = await db
      .update(consults)
      .set({ doctorId, status: "claimed", claimedAt: at })
      .where(
        and(
          inArray(consults.id, ids),
          inArray(consults.status, [...claimableStatuses]),
        ),
      )
      .returning({ id: consults.id });

    return rows.map((r) => r.id);
  }

  async appendRevision(
    input: Parameters<ConsultRepository["appendRevision"]>[0],
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(noteRevisions)
      .values(input)
      .returning();
    return row!;
  }

  async listRevisions(consultId: string, tx?: Executor) {
    return this.exec(tx).query.noteRevisions.findMany({
      where: eq(noteRevisions.consultId, consultId),
      orderBy: [desc(noteRevisions.createdAt)],
    });
  }

  async findTranscript(consultId: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.consultTranscripts.findFirst({
        where: eq(consultTranscripts.consultId, consultId),
      })) ?? null
    );
  }

  async upsertTranscript(
    input: { consultId: string; body: string; consentGiven: boolean },
    tx?: Executor,
  ) {
    const db = this.exec(tx);
    const existing = await this.findTranscript(input.consultId, tx);

    if (existing) {
      const [row] = await db
        .update(consultTranscripts)
        .set({ body: input.body, consentGiven: input.consentGiven })
        .where(eq(consultTranscripts.id, existing.id))
        .returning();
      return row!;
    }

    const [row] = await db.insert(consultTranscripts).values(input).returning();
    return row!;
  }
}
