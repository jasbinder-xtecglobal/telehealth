import { eq } from "drizzle-orm";
import type { Executor } from "../../db/client.ts";
import type { Patient } from "../../db/schema/patients.ts";
import { patientAllergies, patients } from "../../db/schema/index.ts";
import type { PatientRepository } from "../ports.ts";
import { DrizzleRepository } from "./base.repository.ts";

export class DrizzlePatientRepository
  extends DrizzleRepository
  implements PatientRepository
{
  async findById(id: string, tx?: Executor) {
    return (
      (await this.exec(tx).query.patients.findFirst({
        where: eq(patients.id, id),
      })) ?? null
    );
  }

  async listAllergies(patientId: string, tx?: Executor) {
    return this.exec(tx).query.patientAllergies.findMany({
      where: eq(patientAllergies.patientId, patientId),
    });
  }

  async create(
    input: Partial<Patient> & {
      firstName: string;
      lastName: string;
      dob: string;
      phone: string;
    },
    tx?: Executor,
  ) {
    const [row] = await this.exec(tx)
      .insert(patients)
      .values(input as never)
      .returning();
    return row!;
  }

  async setFamilyGroup(patientId: string, familyGroupId: string, tx?: Executor) {
    await this.exec(tx)
      .update(patients)
      .set({ familyGroupId })
      .where(eq(patients.id, patientId));
  }
}
