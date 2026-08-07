import type { Doctor } from "../db/schema/doctors.ts";
import type { PrescriptionType } from "../db/schema/enums.ts";
import { invalid, notFound } from "../domain/errors.ts";
import {
  assessPrescription,
  isOverrideAcceptable,
  type SafetyAssessment,
} from "../domain/prescribing/safety.policy.ts";
import type { PrescriptionMonitoringPort } from "../integrations/ports.ts";
import type {
  ArtefactRepository,
  AuditRepository,
  ConsultRepository,
  PatientRepository,
  ReferenceRepository,
} from "../repositories/ports.ts";

/**
 * Prescribing use cases.
 *
 * The safety decision itself lives in the domain policy; this service gathers
 * the inputs (allergies, current scripts, monitoring register) and enforces the
 * outcome — including that a blocking alert cannot be bypassed without a
 * recorded, audited reason.
 */
export class PrescribingService {
  constructor(
    private readonly consults: ConsultRepository,
    private readonly patients: PatientRepository,
    private readonly artefacts: ArtefactRepository,
    private readonly reference: ReferenceRepository,
    private readonly monitoring: PrescriptionMonitoringPort,
    private readonly audit: AuditRepository,
  ) {}

  async assess(consultId: string, drugId: string): Promise<SafetyAssessment & { drug: NonNullable<Awaited<ReturnType<ReferenceRepository["findDrug"]>>> }> {
    const [consult, drug] = await Promise.all([
      this.consults.findWithPatient(consultId),
      this.reference.findDrug(drugId),
    ]);

    if (!consult) throw notFound("Consult");
    if (!drug) throw notFound("Drug");

    const [allergies, current, monitoring] = await Promise.all([
      this.patients.listAllergies(consult.patientId),
      this.artefacts.listPrescriptions(consultId),
      this.monitoring.check({
        isMonitored: drug.isMonitored,
        patientName: `${consult.patient.firstName} ${consult.patient.lastName}`,
      }),
    ]);

    const assessment = assessPrescription({
      drug,
      allergies,
      currentPrescriptions: current,
      monitoringAlerts: monitoring.alerts,
    });

    return { ...assessment, drug };
  }

  async prescribe(input: {
    doctor: Doctor;
    consultId: string;
    drugId: string;
    quantity: number;
    repeats: number;
    directions: string;
    type: PrescriptionType;
    streamlineCode: string | null;
    overrideReason: string | null;
  }) {
    const assessment = await this.assess(input.consultId, input.drugId);
    const { drug } = assessment;

    // A contraindication is a hard stop unless deliberately overridden.
    if (assessment.blocking.length > 0 && !isOverrideAcceptable(input.overrideReason)) {
      throw invalid(
        "This prescription is contraindicated. Supply an override reason to proceed.",
      );
    }

    const prescription = await this.artefacts.createPrescription({
      consultId: input.consultId,
      drugId: drug.id,
      productName: drug.productName,
      activeIngredient: drug.activeIngredient,
      strength: drug.strength,
      form: drug.form,
      quantity: input.quantity,
      repeats: input.repeats,
      directions: input.directions,
      type: input.type,
      pbsCode: drug.pbsCode,
      streamlineCode:
        input.type === "streamlined_authority" ? input.streamlineCode : null,
    });

    await this.audit.record({
      actorId: input.doctor.id,
      actorName: `${input.doctor.firstName} ${input.doctor.lastName}`,
      eventType:
        assessment.blocking.length > 0
          ? "prescription.overridden"
          : "prescription.drafted",
      entityType: "prescription",
      entityId: prescription.id,
      payload: {
        drug: drug.productName,
        blocking: assessment.blocking,
        overrideReason: input.overrideReason,
      },
    });

    return prescription;
  }

  async cancel(prescriptionId: string) {
    const row = await this.artefacts.cancelPrescription(prescriptionId);
    if (!row) throw notFound("Prescription");
    return row;
  }
}
