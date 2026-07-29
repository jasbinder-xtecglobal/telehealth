import { randomUUID } from "node:crypto";
import type { Doctor } from "../db/schema/doctors.ts";
import type {
  DocumentType,
  InvestigationType,
  ReferralType,
  SymptomCategory,
} from "../db/schema/enums.ts";
import type { TransactionRunner } from "../db/transaction-runner.ts";
import {
  ACTIVE_STATUSES,
  CLAIMABLE_STATUSES,
  assertClosable,
  assertOwnedBy,
  assertTransition,
  evaluateCloseGates,
} from "../domain/consult/consult.policy.ts";
import { conflict, notFound } from "../domain/errors.ts";
import type {
  ClockPort,
  EscriptPort,
  EventBusPort,
  SmsPort,
} from "../integrations/ports.ts";
import type {
  ArtefactRepository,
  AuditRepository,
  BillingRepository,
  ConsultRepository,
  PatientRepository,
} from "../repositories/ports.ts";
import type { ScribeService } from "./scribe.service.ts";

/**
 * Consult lifecycle use cases.
 *
 * Orchestration only: it asks the domain whether something is allowed, asks
 * repositories to read and write, and asks ports to talk to the outside world.
 * No SQL and no business rules are defined in this file.
 */
export class ConsultService {
  constructor(
    private readonly consults: ConsultRepository,
    private readonly patients: PatientRepository,
    private readonly artefacts: ArtefactRepository,
    private readonly billings: BillingRepository,
    private readonly audit: AuditRepository,
    private readonly scribeService: ScribeService,
    private readonly escript: EscriptPort,
    private readonly sms: SmsPort,
    private readonly events: EventBusPort,
    private readonly clock: ClockPort,
    private readonly tx: TransactionRunner,
  ) {}

  private actor(doctor: Doctor) {
    return {
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
    };
  }

  /* ---------------------------------------------------------------- *
   * Read
   * ---------------------------------------------------------------- */

  async getDetail(consultId: string) {
    const consult = await this.consults.findAggregate(consultId);
    if (!consult) throw notFound("Consult");

    const [allergies, summary, transcript] = await Promise.all([
      this.patients.listAllergies(consult.patientId),
      this.scribeService.summarisePatient(consultId, consult.patientId),
      this.consults.findTranscript(consultId),
    ]);

    return {
      ...consult,
      allergies,
      aiSummary: summary.summary,
      priorConsults: summary.priorConsults,
      transcript,
      closeGates: evaluateCloseGates({
        status: consult.status,
        notes: consult.notes,
        notesAttestedAt: consult.notesAttestedAt,
        billingCount: consult.billings.length,
      }),
    };
  }

  async listMine(doctor: Doctor) {
    return this.consults.listByDoctor(doctor.id, ACTIVE_STATUSES);
  }

  async history(doctor: Doctor, opts: { onlyIncompleteBilling: boolean; days: number | null }) {
    const rows = await this.consults.listClosedForDoctor(doctor.id);
    const cutoff = opts.days
      ? new Date(this.clock.now().getTime() - opts.days * 86_400_000)
      : null;

    return rows
      .filter((r) => (cutoff ? (r.endedAt ?? r.createdAt) >= cutoff : true))
      .filter((r) =>
        opts.onlyIncompleteBilling
          ? r.billings.length === 0 || r.billings.some((b) => b.status === "pending")
          : true,
      )
      .map((r) => ({
        id: r.id,
        patientName: `${r.patient.firstName} ${r.patient.lastName}`,
        endedAt: r.endedAt,
        hasNotes: Boolean(r.notes?.trim()),
        fee: r.billings.reduce((s, b) => s + Number(b.fee ?? 0), 0),
        billingStatus: r.billings[0]?.status ?? "pending",
      }));
  }

  /* ---------------------------------------------------------------- *
   * Queue actions
   * ---------------------------------------------------------------- */

  /**
   * Claim a consult, taking the whole family group with it.
   *
   * The guard lives in the repository's conditional UPDATE, so two doctors
   * clicking simultaneously cannot both win.
   */
  async claim(doctor: Doctor, consultId: string) {
    const result = await this.tx.run(async (tx) => {
      const target = await this.consults.findWithPatient(consultId, tx);
      if (!target) throw notFound("Consult");

      const at = this.clock.now();
      const claimed = await this.consults.claimIfAvailable(
        consultId,
        doctor.id,
        CLAIMABLE_STATUSES,
        at,
        tx,
      );

      if (!claimed) {
        throw conflict("Another doctor has already claimed this patient");
      }

      const groupId = target.patient.familyGroupId;
      const alsoClaimed = groupId
        ? await this.consults.claimFamilyGroup(
            groupId,
            doctor.id,
            CLAIMABLE_STATUSES,
            at,
            tx,
          )
        : [];

      return { consult: claimed, alsoClaimed };
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "consult.claimed",
      entityType: "consult",
      entityId: consultId,
      payload: { alsoClaimed: result.alsoClaimed },
    });

    this.events.publish({ type: "queue.changed", channel: result.consult.channel });
    return result;
  }

  async reject(doctor: Doctor, consultId: string, reason: string) {
    const consult = await this.consults.findById(consultId);
    if (!consult) throw notFound("Consult");

    await this.consults.update(consultId, { rejectionReason: reason });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "consult.rejected",
      entityType: "consult",
      entityId: consultId,
      payload: { reason },
    });

    this.events.publish({ type: "queue.changed", channel: consult.channel });
    return { ok: true as const };
  }

  async start(doctor: Doctor, consultId: string) {
    const consult = await this.consults.findById(consultId);
    if (!consult) throw notFound("Consult");

    assertOwnedBy(consult, doctor.id);
    assertTransition(consult.status, "in_consult");

    const updated = await this.consults.update(consultId, {
      status: "in_consult",
      startedAt: this.clock.now(),
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "consult.started",
      entityType: "consult",
      entityId: consultId,
    });

    this.events.publish({ type: "queue.changed", channel: consult.channel });
    this.events.publish({ type: "consult.changed", consultId });
    return updated!;
  }

  async requeue(doctor: Doctor, consultId: string, reason?: string) {
    const consult = await this.consults.findById(consultId);
    if (!consult) throw notFound("Consult");

    assertTransition(consult.status, "requeued");

    await this.consults.update(consultId, {
      status: "requeued",
      doctorId: null,
      claimedAt: null,
      startedAt: null,
      requeueCount: consult.requeueCount + 1,
    });

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "consult.requeued",
      entityType: "consult",
      entityId: consultId,
      payload: { reason, attempt: consult.requeueCount + 1 },
    });

    this.events.publish({ type: "queue.changed", channel: consult.channel });
    return { ok: true as const };
  }

  /* ---------------------------------------------------------------- *
   * Patient contact
   * ---------------------------------------------------------------- */

  async nudge(doctor: Doctor, consultId: string) {
    const consult = await this.consults.findWithPatient(consultId);
    if (!consult) throw notFound("Consult");

    await this.sms.send({
      to: consult.patient.phone,
      body: `Dr ${doctor.chosenName ?? doctor.lastName} is ready for your consultation. Tap to join.`,
      links: [`https://consult.example.test/join/${consult.id}`],
    });

    return { ok: true as const };
  }

  async markPatientJoined(consultId: string) {
    const updated = await this.consults.update(consultId, {
      patientJoinedAt: this.clock.now(),
    });
    if (!updated) throw notFound("Consult");

    this.events.publish({ type: "consult.changed", consultId });
    return updated;
  }

  /* ---------------------------------------------------------------- *
   * Artefacts — drafted now, released at close
   * ---------------------------------------------------------------- */

  async refer(input: {
    consultId: string;
    type: ReferralType;
    recipient: string;
    body: string;
  }) {
    return this.artefacts.createReferral(input);
  }

  async investigate(input: {
    doctor: Doctor;
    consultId: string;
    type: InvestigationType;
    tests: string;
    clinicalNotes?: string;
    copyToGp: boolean;
  }) {
    return this.artefacts.createInvestigation({
      consultId: input.consultId,
      type: input.type,
      tests: input.tests,
      clinicalNotes: input.clinicalNotes ?? null,
      copyToGp: input.copyToGp,
      orderedByDoctorId: input.doctor.id,
    });
  }

  async issueDocument(input: {
    consultId: string;
    type: DocumentType;
    startDate: string | null;
    endDate: string | null;
    body?: string;
  }) {
    return this.artefacts.createDocument({
      consultId: input.consultId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      body: input.body ?? null,
    });
  }

  /* ---------------------------------------------------------------- *
   * Close — the transaction boundary
   * ---------------------------------------------------------------- */

  /**
   * Ends the consult.
   *
   * Gated by the domain policy, then executed atomically: every drafted
   * artefact is issued, the claim is queued, and the consult is closed inside
   * one transaction. Nothing reaches the patient before this commits.
   */
  async close(doctor: Doctor, consultId: string) {
    const consult = await this.consults.findAggregate(consultId);
    if (!consult) throw notFound("Consult");

    assertOwnedBy(consult, doctor.id);
    assertClosable({
      status: consult.status,
      notes: consult.notes,
      notesAttestedAt: consult.notesAttestedAt,
      billingCount: consult.billings.length,
    });

    const at = this.clock.now();
    const links: string[] = [];
    const issued = { prescriptions: 0, referrals: 0, investigations: 0, documents: 0 };

    // Tokens are minted outside the transaction so a slow external call cannot
    // hold a database lock open; they are written inside it.
    const tokens = new Map<string, string>();
    for (const p of consult.prescriptions) {
      if (p.status !== "draft") continue;
      tokens.set(
        p.id,
        await this.escript.issueToken({
          prescriptionId: p.id,
          productName: p.productName,
        }),
      );
    }

    await this.tx.run(async (tx) => {
      for (const p of consult.prescriptions) {
        if (p.status !== "draft") continue;
        const token = tokens.get(p.id)!;
        await this.artefacts.issuePrescription(p.id, token, at, tx);
        links.push(`eScript ${p.productName}: ${token}`);
        issued.prescriptions++;
      }

      for (const r of consult.referrals) {
        if (r.status !== "draft") continue;
        await this.artefacts.issueReferral(r.id, at, tx);
        links.push(`Referral to ${r.recipient}`);
        issued.referrals++;
      }

      for (const i of consult.investigations) {
        if (i.status !== "ordered") continue;
        links.push(`${i.type === "pathology" ? "Pathology" : "Radiology"} request`);
        issued.investigations++;
      }

      for (const d of consult.documents) {
        if (d.status !== "draft") continue;
        await this.artefacts.issueDocument(d.id, at, tx);
        links.push(d.type.startsWith("med_cert") ? "Medical certificate" : "Document");
        issued.documents++;
      }

      await this.billings.markSubmitted(consultId, at, tx);
      await this.consults.update(consultId, { status: "closed", endedAt: at }, tx);
    });

    if (links.length > 0) {
      await this.sms.send({
        to: consult.patient.phone,
        body: `Your consultation is complete. ${links.length} document(s) are ready.`,
        links,
      });
    }

    await this.audit.record({
      ...this.actor(doctor),
      eventType: "consult.closed",
      entityType: "consult",
      entityId: consultId,
      payload: { issued },
    });

    this.events.publish({ type: "queue.changed", channel: consult.channel });
    this.events.publish({ type: "consult.changed", consultId });

    return { issued, links };
  }

  /* ---------------------------------------------------------------- *
   * Family
   * ---------------------------------------------------------------- */

  /** Adds a household member mid-consult, private to the creating doctor. */
  async addFamilyMember(input: {
    doctor: Doctor;
    consultId: string;
    firstName: string;
    lastName: string;
    dob: string;
    gender?: string;
    symptomCategory: SymptomCategory;
    additionalInfo?: string;
  }) {
    const parent = await this.consults.findWithPatient(input.consultId);
    if (!parent) throw notFound("Consult");

    let groupId = parent.patient.familyGroupId;
    if (!groupId) {
      groupId = randomUUID();
      await this.patients.setFamilyGroup(parent.patientId, groupId);
    }

    const patient = await this.patients.create({
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob,
      gender: input.gender,
      phone: parent.patient.phone,
      addressLine: parent.patient.addressLine,
      suburb: parent.patient.suburb,
      state: parent.patient.state,
      postcode: parent.patient.postcode,
      concessionCard: parent.patient.concessionCard,
      familyGroupId: groupId,
    });

    const consult = await this.consults.create({
      patientId: patient.id,
      doctorId: input.doctor.id,
      channel: parent.channel,
      status: "claimed",
      preference: parent.preference,
      symptomCategory: input.symptomCategory,
      additionalInfo: input.additionalInfo ?? null,
      privateToDoctorId: input.doctor.id,
      claimedAt: this.clock.now(),
    });

    this.events.publish({ type: "queue.changed", channel: parent.channel });
    return consult;
  }
}
