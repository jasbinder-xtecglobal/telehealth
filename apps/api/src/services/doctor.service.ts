import type { Doctor } from "../db/schema/doctors.ts";
import type { SymptomCategory } from "../db/schema/enums.ts";
import { notFound } from "../domain/errors.ts";
import type { ClockPort, EventBusPort, SmsPort } from "../integrations/ports.ts";
import type {
  ArtefactRepository,
  AuditRepository,
  DoctorRepository,
} from "../repositories/ports.ts";

/**
 * Doctor profile, preferences, templates and the follow-up inbox.
 */
export class DoctorService {
  constructor(
    private readonly doctors: DoctorRepository,
    private readonly artefacts: ArtefactRepository,
    private readonly audit: AuditRepository,
    private readonly sms: SmsPort,
    private readonly events: EventBusPort,
    private readonly clock: ClockPort,
  ) {}

  async roster() {
    return this.doctors.listAll();
  }

  /** Prototype affordance: switch acting doctor without an auth flow. */
  async markOnline(doctorId: string) {
    await this.doctors.update(doctorId, {
      isOnline: true,
      lastSeenAt: this.clock.now(),
    });
    this.events.publish({ type: "presence.changed", doctorId });
    return { ok: true as const };
  }

  async updateProfile(doctor: Doctor, patch: Partial<Doctor>) {
    const updated = await this.doctors.update(doctor.id, patch);
    if (!updated) throw notFound("Doctor");
    return updated;
  }

  /* ---------------- queue filters ---------------- */

  async listFilters(doctor: Doctor) {
    return this.doctors.listFilters(doctor.id);
  }

  async setFilters(doctor: Doctor, categories: readonly SymptomCategory[]) {
    await this.doctors.replaceFilters(doctor.id, categories);

    // Opt-outs are visible to clinical governance, so they are audited.
    await this.audit.record({
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
      eventType: "queue.filters_changed",
      entityType: "doctor",
      entityId: doctor.id,
      payload: { categories: [...categories] },
    });

    this.events.publish({ type: "queue.changed", channel: "telehealth" });
    return categories;
  }

  /* ---------------- hidden patients ---------------- */

  async listHiddenPatients(doctor: Doctor) {
    return this.doctors.listHiddenPatients(doctor.id);
  }

  async hidePatient(doctor: Doctor, patientId: string, reason: string) {
    await this.doctors.hidePatient({ doctorId: doctor.id, patientId, reason });

    await this.audit.record({
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
      eventType: "patient.hidden",
      entityType: "patient",
      entityId: patientId,
      payload: { reason },
    });

    this.events.publish({ type: "queue.changed", channel: "telehealth" });
    return { ok: true as const };
  }

  async unhidePatient(doctor: Doctor, patientId: string) {
    await this.doctors.unhidePatient(doctor.id, patientId);
    this.events.publish({ type: "queue.changed", channel: "telehealth" });
    return { ok: true as const };
  }

  /* ---------------- templates ---------------- */

  async listTemplates(doctor: Doctor) {
    return this.doctors.listTemplates(doctor.id);
  }

  async saveTemplate(
    doctor: Doctor,
    input: { id?: string; name: string; body: string; isDefault: boolean },
  ) {
    // Only one default per doctor.
    if (input.isDefault) {
      await this.doctors.clearDefaultTemplates(doctor.id);
    }
    return this.doctors.upsertTemplate({ ...input, doctorId: doctor.id });
  }

  async deleteTemplate(id: string) {
    await this.doctors.deleteTemplate(id);
    return { ok: true as const };
  }

  /* ---------------- follow-up inbox ---------------- */

  /**
   * Investigations this doctor ordered that are not yet acknowledged.
   * Follow-up sits with the orderer — copying the GP does not transfer it.
   */
  async inbox(doctor: Doctor) {
    const all = await this.artefacts.listInvestigationsForDoctor(doctor.id);
    return all.filter((i) => i.status !== "acknowledged");
  }

  async acknowledgeInvestigation(doctor: Doctor, investigationId: string) {
    const row = await this.artefacts.acknowledgeInvestigation(
      investigationId,
      this.clock.now(),
    );
    if (!row) throw notFound("Investigation");

    await this.audit.record({
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
      eventType: "investigation.acknowledged",
      entityType: "investigation",
      entityId: investigationId,
    });

    return row;
  }

  /** What the platform has sent to patients — proves the close-gate behaviour. */
  async deliveryLog(limit = 50) {
    return this.sms.recent(limit);
  }
}
