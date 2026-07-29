import type { Doctor } from "../db/schema/doctors.ts";
import { assertAttestable } from "../domain/consult/consult.policy.ts";
import { forbidden, notFound, precondition } from "../domain/errors.ts";
import type { ScribePort, SummariserPort } from "../integrations/ports.ts";
import type {
  AuditRepository,
  ConsultRepository,
  DoctorRepository,
} from "../repositories/ports.ts";

const FALLBACK_TEMPLATE = "PC -\nHPC -\nImpression -\nPlan -";

/**
 * Documentation use cases: notes, revisions, attestation and the AI scribe.
 *
 * Three invariants live here and are enforced on every path:
 *   1. Every note change appends an immutable revision.
 *   2. Any edit invalidates a prior attestation.
 *   3. The scribe will not run without recorded patient consent to recording.
 */
export class ScribeService {
  constructor(
    private readonly consults: ConsultRepository,
    private readonly doctors: DoctorRepository,
    private readonly scribe: ScribePort,
    private readonly summariser: SummariserPort,
    private readonly audit: AuditRepository,
  ) {}

  async saveNotes(input: { doctor: Doctor; consultId: string; body: string }) {
    // Clearing the attestation is the point: the doctor signed off on specific
    // words, and those words have just changed.
    const updated = await this.consults.update(input.consultId, {
      notes: input.body,
      notesAttestedAt: null,
    });
    if (!updated) throw notFound("Consult");

    await this.consults.appendRevision({
      consultId: input.consultId,
      authorId: input.doctor.id,
      body: input.body,
      aiGenerated: false,
    });

    return updated;
  }

  async attest(input: { doctor: Doctor; consultId: string }) {
    const consult = await this.consults.findById(input.consultId);
    if (!consult) throw notFound("Consult");

    assertAttestable(consult.notes);

    const updated = await this.consults.update(input.consultId, {
      notesAttestedAt: new Date(),
      status: "pending_attestation",
    });

    await this.audit.record({
      actorId: input.doctor.id,
      actorName: `${input.doctor.firstName} ${input.doctor.lastName}`,
      eventType: "notes.attested",
      entityType: "consult",
      entityId: input.consultId,
    });

    return updated!;
  }

  async captureTranscript(input: {
    consultId: string;
    body: string;
    consentGiven: boolean;
  }) {
    return this.consults.upsertTranscript(input);
  }

  /**
   * Runs the scribe and stores the result as an AI-flagged revision carrying
   * the model identifier — without which an AI-drafted note is indefensible.
   */
  async runScribe(input: {
    doctor: Doctor;
    consultId: string;
    templateId?: string;
  }) {
    const consult = await this.consults.findById(input.consultId);
    if (!consult) throw notFound("Consult");

    const transcript = await this.consults.findTranscript(input.consultId);
    if (!transcript) {
      throw precondition("No transcript captured for this consult yet");
    }
    if (!transcript.consentGiven) {
      throw forbidden("Patient consent to recording has not been recorded");
    }

    const template = input.templateId
      ? await this.doctors.findTemplate(input.templateId)
      : await this.doctors.findDefaultTemplate(input.doctor.id);

    const { body, model } = await this.scribe.draftNote({
      template: template?.body ?? FALLBACK_TEMPLATE,
      transcript: transcript.body,
      doctorName: `${input.doctor.firstName} ${input.doctor.lastName}`,
      personalisation: input.doctor.aiScribePersonalisation,
      preference: consult.preference,
    });

    await this.consults.update(input.consultId, {
      notes: body,
      notesAttestedAt: null,
    });

    await this.consults.appendRevision({
      consultId: input.consultId,
      authorId: input.doctor.id,
      body,
      aiGenerated: true,
      aiModel: model,
    });

    await this.audit.record({
      actorId: input.doctor.id,
      actorName: `${input.doctor.firstName} ${input.doctor.lastName}`,
      eventType: "scribe.generated",
      entityType: "consult",
      entityId: input.consultId,
      payload: { model },
    });

    return { body, model };
  }

  async listRevisions(consultId: string) {
    return this.consults.listRevisions(consultId);
  }

  /** Cross-consult summary built from this patient's prior closed consults. */
  async summarisePatient(consultId: string, patientId: string) {
    const prior = await this.consults.listClosedForPatient(patientId, consultId);

    const notes = prior.map((p) => ({
      body: p.notes ?? "",
      doctorName: p.doctor ? `${p.doctor.firstName} ${p.doctor.lastName}` : "Unknown",
      date: p.endedAt ?? p.createdAt,
    }));

    return {
      summary: await this.summariser.summarise(notes),
      priorConsults: prior.map((p, i) => ({
        id: p.id,
        body: notes[i]!.body,
        doctorName: notes[i]!.doctorName,
        date: notes[i]!.date,
      })),
    };
  }
}
