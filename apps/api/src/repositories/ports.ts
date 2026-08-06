/**
 * Repository interfaces.
 *
 * Services depend on these, never on Drizzle directly. That keeps SQL out of
 * the use-case layer and makes services testable with in-memory fakes.
 *
 * Every method accepts an optional `Executor` so a caller can enlist the call
 * in an open transaction — this is how the consult-close path stays atomic
 * without leaking transaction handling into the service.
 */
import type { Executor } from "../db/client.ts";
import type {
  Billing,
  CallSession,
  ChatMessage,
  ClinicalDocument,
  Consult,
  ConsultIntake,
  ConsultTranscript,
  Doctor,
  DoctorApplication,
  NewConsultIntake,
  NewDoctorApplication,
  Drug,
  DuressAlert,
  EmailVerificationToken,
  HiddenPatient,
  NewDoctor,
  Session,
  Investigation,
  MbsItem,
  NoteRevision,
  Patient,
  PatientAllergy,
  Prescription,
  Referral,
  Template,
  Visit,
} from "../db/schema/index.ts";
import type {
  CallMode,
  CallProviderId,
  ChatChannelName,
  ConsultChannel,
  ConsultStatus,
  DocumentType,
  InvestigationType,
  PrescriptionType,
  ReferralType,
  SymptomCategory,
} from "../db/schema/enums.ts";

export type ConsultWithPatient = Consult & { patient: Patient };

/** An ordered investigation carrying enough context to render the inbox row. */
export type InvestigationWithContext = Investigation & {
  consult: ConsultWithPatient;
};

export type ConsultAggregate = Consult & {
  patient: Patient;
  doctor: Doctor | null;
  prescriptions: Prescription[];
  referrals: Referral[];
  investigations: Investigation[];
  documents: ClinicalDocument[];
  billings: Billing[];
};

export interface ConsultRepository {
  findById(id: string, tx?: Executor): Promise<Consult | null>;
  findAggregate(id: string, tx?: Executor): Promise<ConsultAggregate | null>;
  findWithPatient(id: string, tx?: Executor): Promise<ConsultWithPatient | null>;

  /** Everything waiting in one channel, patient joined. Ordering is the domain's job. */
  listQueued(channel: ConsultChannel, tx?: Executor): Promise<ConsultWithPatient[]>;

  listByDoctor(
    doctorId: string,
    statuses: readonly ConsultStatus[],
    tx?: Executor,
  ): Promise<ConsultWithPatient[]>;

  listClosedForPatient(
    patientId: string,
    excludeConsultId: string,
    tx?: Executor,
  ): Promise<(Consult & { doctor: Doctor | null })[]>;

  /**
   * Closed consults for one doctor. `range` bounds the query in SQL so a
   * billing statement is never silently truncated by a row cap.
   */
  listClosedForDoctor(
    doctorId: string,
    range: { from: Date; to: Date } | null,
    tx?: Executor,
  ): Promise<(Consult & { patient: Patient; billings: Billing[] })[]>;

  /** For the header counters. */
  listAllWithBillings(tx?: Executor): Promise<(Consult & { billings: Billing[] })[]>;

  create(input: {
    patientId: string;
    doctorId?: string | null;
    channel: ConsultChannel;
    status: ConsultStatus;
    preference: "phone" | "video";
    symptomCategory: SymptomCategory;
    additionalInfo?: string | null;
    /** 1 = most urgent. Set by triage; defaults to routine when omitted. */
    acuity?: number;
    privateToDoctorId?: string | null;
    claimedAt?: Date | null;
  }, tx?: Executor): Promise<Consult>;

  update(
    id: string,
    patch: Partial<Consult>,
    tx?: Executor,
  ): Promise<Consult | null>;

  /**
   * Conditional claim — updates only if the consult is still claimable.
   * Returns null when another doctor won the race.
   */
  claimIfAvailable(
    id: string,
    doctorId: string,
    claimableStatuses: readonly ConsultStatus[],
    at: Date,
    tx?: Executor,
  ): Promise<Consult | null>;

  claimFamilyGroup(
    familyGroupId: string,
    doctorId: string,
    claimableStatuses: readonly ConsultStatus[],
    at: Date,
    tx?: Executor,
  ): Promise<string[]>;

  /* Notes */
  appendRevision(input: {
    consultId: string;
    authorId: string;
    body: string;
    aiGenerated: boolean;
    aiModel?: string | null;
  }, tx?: Executor): Promise<NoteRevision>;

  listRevisions(consultId: string, tx?: Executor): Promise<NoteRevision[]>;

  /* Transcript */
  findTranscript(consultId: string, tx?: Executor): Promise<ConsultTranscript | null>;
  upsertTranscript(input: {
    consultId: string;
    body: string;
    consentGiven: boolean;
  }, tx?: Executor): Promise<ConsultTranscript>;
}

export interface PatientRepository {
  findById(id: string, tx?: Executor): Promise<Patient | null>;
  listAllergies(patientId: string, tx?: Executor): Promise<PatientAllergy[]>;
  create(input: Partial<Patient> & { firstName: string; lastName: string; dob: string; phone: string }, tx?: Executor): Promise<Patient>;
  setFamilyGroup(patientId: string, familyGroupId: string, tx?: Executor): Promise<void>;
}

export interface AuthRepository {
  /* Sessions — looked up by fingerprint, never by raw token. */
  createSession(input: {
    doctorId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }, tx?: Executor): Promise<Session>;
  findSessionByHash(
    tokenHash: string,
    tx?: Executor,
  ): Promise<(Session & { doctor: Doctor }) | null>;
  touchSession(id: string, at: Date, tx?: Executor): Promise<void>;
  revokeSession(id: string, at: Date, tx?: Executor): Promise<void>;
  /** Used when a password changes or an account is suspended. */
  revokeAllForDoctor(doctorId: string, at: Date, tx?: Executor): Promise<number>;

  /* Email verification */
  createVerificationToken(input: {
    doctorId: string;
    tokenHash: string;
    expiresAt: Date;
  }, tx?: Executor): Promise<EmailVerificationToken>;
  findVerificationToken(
    tokenHash: string,
    tx?: Executor,
  ): Promise<EmailVerificationToken | null>;
  consumeVerificationToken(id: string, at: Date, tx?: Executor): Promise<void>;
  /** Invalidates outstanding links when a fresh one is issued. */
  consumeAllVerificationTokens(doctorId: string, at: Date, tx?: Executor): Promise<void>;
}

export interface DoctorRepository {
  findById(id: string, tx?: Executor): Promise<Doctor | null>;
  findByEmail(email: string, tx?: Executor): Promise<Doctor | null>;
  create(input: NewDoctor, tx?: Executor): Promise<Doctor>;
  findFirst(tx?: Executor): Promise<Doctor | null>;
  listAll(tx?: Executor): Promise<Doctor[]>;
  update(id: string, patch: Partial<Doctor>, tx?: Executor): Promise<Doctor | null>;

  listFilters(doctorId: string, tx?: Executor): Promise<SymptomCategory[]>;
  replaceFilters(
    doctorId: string,
    categories: readonly SymptomCategory[],
    tx?: Executor,
  ): Promise<void>;

  listHiddenPatients(
    doctorId: string,
    tx?: Executor,
  ): Promise<(HiddenPatient & { firstName: string; lastName: string })[]>;
  hidePatient(input: { doctorId: string; patientId: string; reason: string }, tx?: Executor): Promise<void>;
  unhidePatient(doctorId: string, patientId: string, tx?: Executor): Promise<void>;

  listTemplates(doctorId: string, tx?: Executor): Promise<Template[]>;
  findDefaultTemplate(doctorId: string, tx?: Executor): Promise<Template | null>;
  findTemplate(id: string, tx?: Executor): Promise<Template | null>;
  upsertTemplate(input: {
    id?: string;
    doctorId: string;
    name: string;
    body: string;
    isDefault: boolean;
  }, tx?: Executor): Promise<Template>;
  clearDefaultTemplates(doctorId: string, tx?: Executor): Promise<void>;
  deleteTemplate(id: string, tx?: Executor): Promise<void>;
}

export interface ArtefactRepository {
  createPrescription(input: {
    consultId: string;
    drugId: string;
    productName: string;
    activeIngredient: string;
    strength: string | null;
    form: string | null;
    quantity: number;
    repeats: number;
    directions: string;
    type: PrescriptionType;
    pbsCode: string | null;
    streamlineCode: string | null;
  }, tx?: Executor): Promise<Prescription>;
  listPrescriptions(consultId: string, tx?: Executor): Promise<Prescription[]>;
  cancelPrescription(id: string, tx?: Executor): Promise<Prescription | null>;
  issuePrescription(id: string, token: string, at: Date, tx?: Executor): Promise<void>;

  createReferral(input: {
    consultId: string;
    type: ReferralType;
    recipient: string;
    body: string;
  }, tx?: Executor): Promise<Referral>;
  issueReferral(id: string, at: Date, tx?: Executor): Promise<void>;

  createInvestigation(input: {
    consultId: string;
    type: InvestigationType;
    tests: string;
    clinicalNotes?: string | null;
    copyToGp: boolean;
    orderedByDoctorId: string;
  }, tx?: Executor): Promise<Investigation>;
  listInvestigationsForDoctor(
    doctorId: string,
    tx?: Executor,
  ): Promise<InvestigationWithContext[]>;
  /** Every investigation for a patient, across all their consults. */
  listInvestigationsForPatient(
    patientId: string,
    tx?: Executor,
  ): Promise<InvestigationWithContext[]>;
  acknowledgeInvestigation(id: string, at: Date, tx?: Executor): Promise<Investigation | null>;

  createDocument(input: {
    consultId: string;
    type: DocumentType;
    startDate: string | null;
    endDate: string | null;
    body?: string | null;
  }, tx?: Executor): Promise<ClinicalDocument>;
  issueDocument(id: string, at: Date, tx?: Executor): Promise<void>;
}

export interface BillingRepository {
  listForConsult(consultId: string, tx?: Executor): Promise<Billing[]>;
  clearForConsult(consultId: string, tx?: Executor): Promise<void>;
  create(input: {
    consultId: string;
    doctorId: string;
    itemNumber: string | null;
    description: string | null;
    fee: string;
    status: "pending" | "no_billing";
    noBillingReason?: string | null;
  }, tx?: Executor): Promise<Billing>;
  markSubmitted(consultId: string, at: Date, tx?: Executor): Promise<void>;
}

export interface ReferenceRepository {
  searchDrugs(term: string, limit?: number, tx?: Executor): Promise<Drug[]>;
  findDrug(id: string, tx?: Executor): Promise<Drug | null>;
  listMbsItems(tx?: Executor): Promise<MbsItem[]>;
  findMbsItem(itemNumber: string, tx?: Executor): Promise<MbsItem | null>;
}

export interface ChatRepository {
  list(channel: ChatChannelName, limit?: number, tx?: Executor): Promise<ChatMessage[]>;
  create(input: {
    channel: ChatChannelName;
    authorId: string | null;
    authorName: string;
    body: string;
  }, tx?: Executor): Promise<ChatMessage>;
}

export type VisitWithContext = Visit & {
  consult: Consult & { patient: Patient };
};

export interface DispatchRepository {
  findById(id: string, tx?: Executor): Promise<Visit | null>;
  findByIdWithContext(id: string, tx?: Executor): Promise<VisitWithContext | null>;
  findByConsult(consultId: string, tx?: Executor): Promise<Visit | null>;

  /** Every home-visit consult with its dispatch record, if one exists. */
  listBoard(tx?: Executor): Promise<VisitWithContext[]>;
  listForDoctor(doctorId: string, tx?: Executor): Promise<VisitWithContext[]>;
  /** Active visits across all doctors — input to the safety sweep. */
  listActive(tx?: Executor): Promise<VisitWithContext[]>;

  create(input: { consultId: string; doctorId?: string | null }, tx?: Executor): Promise<Visit>;
  update(id: string, patch: Partial<Visit>, tx?: Executor): Promise<Visit | null>;

  /** Applies a computed route sequence to a doctor's accepted visits. */
  applyRoute(
    legs: readonly { id: string; order: number; distanceKm: number; etaMinutes: number }[],
    tx?: Executor,
  ): Promise<void>;

  /* Duress */
  raiseAlert(input: {
    doctorId: string;
    visitId: string | null;
    source: string;
    latitude: string | null;
    longitude: string | null;
    note?: string | null;
  }, tx?: Executor): Promise<DuressAlert>;
  listOpenAlerts(tx?: Executor): Promise<DuressAlert[]>;
  findOpenAlertForVisit(visitId: string, tx?: Executor): Promise<DuressAlert | null>;
  resolveAlert(id: string, resolvedBy: string, at: Date, tx?: Executor): Promise<DuressAlert | null>;
}

export interface IntakeRepository {
  /** The patient's own words, kept beside the consult they booked. */
  createConsultIntake(input: NewConsultIntake, tx?: Executor): Promise<ConsultIntake>;
  findConsultIntake(consultId: string, tx?: Executor): Promise<ConsultIntake | null>;

  createApplication(
    input: NewDoctorApplication,
    tx?: Executor,
  ): Promise<DoctorApplication>;
  listApplications(tx?: Executor): Promise<DoctorApplication[]>;
  updateApplication(
    id: string,
    patch: Partial<DoctorApplication>,
    tx?: Executor,
  ): Promise<DoctorApplication | null>;
}

/**
 * Call sessions.
 *
 * Vendor-neutral: the repository stores whichever provider carried the call and
 * never interprets it, so adding or removing a vendor touches no SQL.
 */
export interface CallRepository {
  /** The live session for a consult, if one is open. At most one at a time. */
  findActive(consultId: string, tx?: Executor): Promise<CallSession | null>;

  findById(id: string, tx?: Executor): Promise<CallSession | null>;

  /** Every session on a consult, newest first — the per-consult call history. */
  listForConsult(consultId: string, tx?: Executor): Promise<CallSession[]>;

  open(
    input: {
      consultId: string;
      provider: CallProviderId;
      mode: CallMode;
      roomName: string;
      startedByDoctorId: string;
    },
    tx?: Executor,
  ): Promise<CallSession>;

  /** Idempotent: a session already ended keeps its original `endedAt`. */
  close(
    id: string,
    input: { endedAt: Date; reason: string },
    tx?: Executor,
  ): Promise<CallSession | null>;
}

/** Write-only by contract — audit events are never updated or deleted. */
export interface AuditRepository {
  record(input: {
    /**
     * The doctor who acted, or null for an event with no clinician behind it —
     * a patient booking from the public site. The column is foreign-keyed to
     * `doctors`, so anything else must go in the payload.
     */
    actorId: string | null;
    actorName: string;
    eventType: string;
    entityType?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  }, tx?: Executor): Promise<void>;
}
