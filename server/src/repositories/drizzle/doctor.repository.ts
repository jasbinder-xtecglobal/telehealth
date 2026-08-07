import { and, asc, desc, eq } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import type { SymptomCategory } from "../../db/schema/enums.ts";
import type { Doctor, NewDoctor } from "../../db/schema/doctors.ts";
import {
  doctorFilters,
  doctors,
  hiddenPatients,
  patients,
  templates,
} from "../../db/schema/index.ts";
import type { DoctorRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzleDoctorRepository
  extends DrizzleRepository
  implements DoctorRepository
{
  async findById(id: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.doctors.findFirst({
        where: eq(doctors.id, id),
      })) ?? null
    );
  }

  /** Email is stored normalised, so callers must normalise before looking up. */
  async findByEmail(email: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.doctors.findFirst({
        where: eq(doctors.email, email),
      })) ?? null
    );
  }

  async create(input: NewDoctor, tx?: Executor) {
    const [row] = await this.exec(tx).insert(doctors).values(input).returning();
    return row!;
  }

  async findFirst(tx?: Executor) {
    return (await this.exec(tx).query.doctors.findFirst()) ?? null;
  }

  async listAll(tx?: Executor) {
    return this.exec(tx).query.doctors.findMany({
      orderBy: [desc(doctors.isOnline), asc(doctors.firstName)],
    });
  }

  async update(id: string, patch: Partial<Doctor>, tx?: Executor) {
    const [row] = await this.exec(tx)
      .update(doctors)
      .set(patch)
      .where(eq(doctors.id, id))
      .returning();
    return row ?? null;
  }

  /* ---------------- category opt-outs ---------------- */

  async listFilters(doctorId: string, tx?: Executor) {
    const rows = await this.exec(tx)
      .select({ category: doctorFilters.category })
      .from(doctorFilters)
      .where(eq(doctorFilters.doctorId, doctorId));
    return rows.map((r) => r.category);
  }

  async replaceFilters(
    doctorId: string,
    categories: readonly SymptomCategory[],
    tx?: Executor,
  ) {
    const db = this.exec(tx);
    await db.delete(doctorFilters).where(eq(doctorFilters.doctorId, doctorId));
    if (categories.length === 0) return;
    await db
      .insert(doctorFilters)
      .values(categories.map((category) => ({ doctorId, category })));
  }

  /* ---------------- hidden patients ---------------- */

  async listHiddenPatients(doctorId: string, tx?: Executor) {
    return (await this.exec(tx)
      .select({
        id: hiddenPatients.id,
        doctorId: hiddenPatients.doctorId,
        patientId: hiddenPatients.patientId,
        reason: hiddenPatients.reason,
        createdAt: hiddenPatients.createdAt,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(hiddenPatients)
      .innerJoin(patients, eq(patients.id, hiddenPatients.patientId))
      .where(eq(hiddenPatients.doctorId, doctorId))) as never;
  }

  async hidePatient(
    input: { doctorId: string; patientId: string; reason: string },
    tx?: Executor,
  ) {
    await this.exec(tx).insert(hiddenPatients).values(input).onConflictDoNothing();
  }

  async unhidePatient(doctorId: string, patientId: string, tx?: Executor) {
    await this.exec(tx)
      .delete(hiddenPatients)
      .where(
        and(
          eq(hiddenPatients.doctorId, doctorId),
          eq(hiddenPatients.patientId, patientId),
        ),
      );
  }

  /* ---------------- templates ---------------- */

  async listTemplates(doctorId: string, tx?: Executor) {
    return this.exec(tx).query.templates.findMany({
      where: eq(templates.doctorId, doctorId),
      orderBy: [asc(templates.sortOrder), asc(templates.createdAt)],
    });
  }

  async findDefaultTemplate(doctorId: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.templates.findFirst({
        where: and(
          eq(templates.doctorId, doctorId),
          eq(templates.isDefault, true),
        ),
      })) ?? null
    );
  }

  async findTemplate(id: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.templates.findFirst({
        where: eq(templates.id, id),
      })) ?? null
    );
  }

  async clearDefaultTemplates(doctorId: string, tx?: Executor) {
    await this.exec(tx)
      .update(templates)
      .set({ isDefault: false })
      .where(eq(templates.doctorId, doctorId));
  }

  async upsertTemplate(
    input: {
      id?: string;
      doctorId: string;
      name: string;
      body: string;
      isDefault: boolean;
    },
    tx?: Executor,
  ) {
    const db = this.exec(tx);

    if (input.id) {
      const [row] = await db
        .update(templates)
        .set({ name: input.name, body: input.body, isDefault: input.isDefault })
        .where(eq(templates.id, input.id))
        .returning();
      return row!;
    }

    const [row] = await db
      .insert(templates)
      .values({
        doctorId: input.doctorId,
        name: input.name,
        body: input.body,
        isDefault: input.isDefault,
      })
      .returning();
    return row!;
  }

  async deleteTemplate(id: string, tx?: Executor) {
    await this.exec(tx).delete(templates).where(eq(templates.id, id));
  }
}
