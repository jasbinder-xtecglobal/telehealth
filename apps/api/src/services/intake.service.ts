import type { Doctor } from "../db/schema/doctors.ts";
import type {
  ApplicationStatus,
  AuState,
  ContactMethod,
  EmploymentPreference,
} from "../db/schema/enums.ts";
import type { TransactionRunner } from "../db/transaction-runner.ts";
import { invalid, notFound } from "../domain/errors.ts";
import {
  bookingAcuity,
  categoryForReason,
  checkBooking,
  reasonLabel,
  type BookingProblem,
  type BookingReason,
} from "../domain/intake/intake.policy.ts";
import type { ClockPort, EventBusPort, SmsPort } from "../integrations/ports.ts";
import type {
  AuditRepository,
  ConsultRepository,
  IntakeRepository,
  PatientRepository,
} from "../repositories/ports.ts";

export type BookingInput = {
  firstName: string;
  lastName: string;
  dob: string;
  gender?: string;
  phone: string;
  email?: string;
  addressLine?: string;
  suburb?: string;
  state?: AuState;
  postcode?: string;
  medicareNumber?: string;
  preferredContact: ContactMethod;

  reason: BookingReason;
  symptoms: string;
  symptomsStartedOn?: string;
  painLevel?: number;
  reportedMedications?: string;
  reportedAllergies?: string;
  reportedConditions?: string;

  preference: "phone" | "video";
  preferredDoctor?: string;
  preferredTime?: string;

  /** The website's emergency question. The server does not assume it was asked. */
  emergencyCleared: boolean;
};

const PROBLEM_MESSAGES: Record<BookingProblem, string> = {
  missing_name: "A first and last name are required",
  missing_dob: "A valid date of birth is required",
  future_dob: "Date of birth cannot be in the future",
  missing_phone: "A contactable phone number is required",
  missing_symptoms: "Please describe your symptoms",
  emergency_not_cleared:
    "This form cannot be used for a medical emergency. Call 000.",
};

/**
 * Public intake — patient bookings and doctor applications.
 *
 * The one service reachable without a session, so it is written defensively.
 * It creates queued work and nothing else: no accounts, no artefacts, no
 * billing, and it never reads back an existing patient.
 */
export class IntakeService {
  constructor(
    private readonly intake: IntakeRepository,
    private readonly patients: PatientRepository,
    private readonly consults: ConsultRepository,
    private readonly audit: AuditRepository,
    private readonly sms: SmsPort,
    private readonly events: EventBusPort,
    private readonly clock: ClockPort,
    private readonly tx: TransactionRunner,
  ) {}

  /**
   * Books a consultation from the public website.
   *
   * The patient record and the consult are written together — a patient with
   * no consult is an orphan nobody will ever call, and a consult with no
   * patient cannot be claimed.
   *
   * What the patient typed about allergies, medications and conditions is
   * stored as intake, never as coded clinical data (invariant 7). The doctor
   * codes it during the consult after confirming it.
   */
  async bookConsultation(input: BookingInput) {
    const problems = checkBooking({
      firstName: input.firstName,
      lastName: input.lastName,
      dob: input.dob,
      phone: input.phone,
      symptoms: input.symptoms,
      emergencyCleared: input.emergencyCleared,
      now: this.clock.now(),
    });

    if (problems.length > 0) {
      throw invalid(problems.map((p) => PROBLEM_MESSAGES[p]).join(". "));
    }

    const category = categoryForReason(input.reason);
    const acuity = bookingAcuity({
      reason: input.reason,
      painLevel: input.painLevel ?? null,
    });

    const { consult, patient } = await this.tx.run(async (tx) => {
      const patient = await this.patients.create(
        {
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          dob: input.dob,
          gender: input.gender ?? null,
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          addressLine: input.addressLine?.trim() || null,
          suburb: input.suburb?.trim() || null,
          state: input.state ?? null,
          postcode: input.postcode?.trim() || null,
          medicareNumber: input.medicareNumber?.replace(/\s/g, "") || null,
        },
        tx,
      );

      const consult = await this.consults.create(
        {
          patientId: patient.id,
          channel: "telehealth",
          status: "queued",
          preference: input.preference,
          symptomCategory: category,
          additionalInfo: input.symptoms.trim(),
          acuity,
        },
        tx,
      );

      await this.intake.createConsultIntake(
        {
          consultId: consult.id,
          email: input.email?.trim() || null,
          preferredContact: input.preferredContact,
          reasonLabel: reasonLabel(input.reason),
          symptomsStartedOn: input.symptomsStartedOn || null,
          painLevel: input.painLevel ?? null,
          reportedMedications: input.reportedMedications?.trim() || null,
          reportedAllergies: input.reportedAllergies?.trim() || null,
          reportedConditions: input.reportedConditions?.trim() || null,
          preferredDoctor: input.preferredDoctor ?? null,
          preferredTime: input.preferredTime ?? null,
        },
        tx,
      );

      return { consult, patient };
    });

    // No clinician acted here, and `actorId` is foreign-keyed to `doctors`, so
    // the patient goes in the payload rather than being invented as an actor.
    await this.audit.record({
      actorId: null,
      actorName: "Patient booking (public website)",
      eventType: "consult.booked",
      entityType: "consult",
      entityId: consult.id,
      payload: {
        patientId: patient.id,
        reason: input.reason,
        acuity,
        preference: input.preference,
      },
    });

    await this.sms.send({
      to: patient.phone,
      body: `Thanks ${patient.firstName}. Your consultation request has been received and a doctor will call you shortly. If your condition worsens, call 000.`,
    });

    this.events.publish({ type: "queue.changed", channel: "telehealth" });

    // Only what the patient needs to see their own request through. No
    // identifiers that would let a stranger read the record back.
    return {
      reference: consult.id.slice(0, 8).toUpperCase(),
      firstName: patient.firstName,
      preference: consult.preference,
      requestedAt: consult.requestedAt,
    };
  }

  /**
   * Records an expression of interest from a doctor.
   *
   * It does not create an account. An applicant has not been credentialed and
   * must never hold a session; the operator issues credentials after
   * recruitment, verification and contracting.
   */
  async applyAsDoctor(input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    ahpraNumber: string;
    yearsExperience: string;
    specialty: string;
    employment: EmploymentPreference;
    coverLetter?: string;
  }) {
    const application = await this.intake.createApplication({
      ...input,
      email: input.email.trim().toLowerCase(),
      coverLetter: input.coverLetter?.trim() || null,
      status: "submitted",
    });

    await this.sms.send({
      to: input.phone,
      body: `Thanks Dr ${input.lastName} — your application to join has been received. Our medical team will be in touch within 2 business days.`,
    });

    return {
      reference: application.id.slice(0, 8).toUpperCase(),
      lastName: application.lastName,
    };
  }

  /* ---------------- operator side, session required ---------------- */

  async listApplications() {
    return this.intake.listApplications();
  }

  async reviewApplication(
    doctor: Doctor,
    input: { id: string; status: ApplicationStatus; note?: string },
  ) {
    const updated = await this.intake.updateApplication(input.id, {
      status: input.status,
      reviewedAt: this.clock.now(),
      reviewedByDoctorId: doctor.id,
      reviewNote: input.note?.trim() || null,
    });
    if (!updated) throw notFound("Application");

    await this.audit.record({
      actorId: doctor.id,
      actorName: `${doctor.firstName} ${doctor.lastName}`,
      eventType: "doctor_application.reviewed",
      entityType: "doctor_application",
      entityId: input.id,
      payload: { status: input.status },
    });

    return updated;
  }
}
