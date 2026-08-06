import { pgEnum } from "drizzle-orm/pg-core";

export const consultChannel = pgEnum("consult_channel", [
  "telehealth",
  "home_visit",
  "nh_telehealth",
]);

/** Consult lifecycle. A consult is in exactly one of these at any time. */
export const consultStatus = pgEnum("consult_status", [
  "requested",
  "queued",
  "claimed",
  "in_consult",
  "pending_attestation",
  "closed",
  "requeued",
  "rejected",
  "abandoned",
]);

export const consultPreference = pgEnum("consult_preference", ["phone", "video"]);

/**
 * Presenting-complaint categories. Closed set by design — the doctor's
 * "I do not wish to see" filter cannot operate reliably on free text.
 */
export const symptomCategory = pgEnum("symptom_category", [
  "mens_health",
  "womens_health",
  "gut_related",
  "skin",
  "mental_health_sleep_headache",
  "medical_certificate_only",
  "prescribed_weight_loss",
  "opioids",
  "other_issues",
]);

export const doctorType = pgEnum("doctor_type", [
  "gp_fellow",
  "vr",
  "non_vr",
  "registrar",
]);

export const artefactStatus = pgEnum("artefact_status", [
  "draft",
  "issued",
  "cancelled",
]);

export const prescriptionType = pgEnum("prescription_type", [
  "pbs",
  "streamlined_authority",
  "private",
]);

export const referralType = pgEnum("referral_type", ["specialist", "hospital"]);

export const investigationType = pgEnum("investigation_type", [
  "pathology",
  "radiology",
]);

export const investigationStatus = pgEnum("investigation_status", [
  "ordered",
  "resulted",
  "acknowledged",
]);

export const documentType = pgEnum("document_type", [
  "med_cert_work",
  "med_cert_school",
  "med_cert_university",
  "med_cert_carers",
  "fit_to_return",
  "blank",
]);

export const billingStatus = pgEnum("billing_status", [
  "pending",
  "submitted",
  "paid",
  "rejected",
  "no_billing",
]);

export const chatChannel = pgEnum("chat_channel", ["clinical", "dispatcher"]);

/**
 * Lives here rather than in `auth.ts` because `doctors` needs it and `auth`
 * needs `doctors` — declaring it beside the other enums breaks that cycle.
 */
export const accountStatus = pgEnum("account_status", [
  "pending_verification",
  "active",
  "suspended",
]);

export const auStateEnum = pgEnum("au_state", [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
]);

/**
 * A doctor application is a recruitment record, not an account. An accepted
 * application is followed by credentialing and a contract before the operator
 * issues credentials — nothing here can sign in.
 */
export const applicationStatus = pgEnum("application_status", [
  "submitted",
  "reviewing",
  "accepted",
  "declined",
]);

export const employmentPreference = pgEnum("employment_preference", [
  "part_time",
  "full_time",
]);

/** How the patient asked to be contacted about their booking. */
export const contactMethod = pgEnum("contact_method", ["phone", "email", "sms"]);

/**
 * Real-time transport vendors under evaluation.
 *
 * The set is open by intent — no vendor has been chosen yet, and each is
 * implemented as an independent adapter so one can be added or removed without
 * touching the others. A value here does not imply an adapter exists; ask the
 * provider registry what is actually installed and configured.
 */
export const callProvider = pgEnum("call_provider", [
  "livekit",
  "agora",
  "twilio",
  "zoom",
]);

/** Audio-only or audio plus video. Mirrors `consultPreference`, separately
 * recorded because the doctor may escalate a phone consult to video mid-call. */
export const callMode = pgEnum("call_mode", ["audio", "video"]);

export type ConsultChannel = (typeof consultChannel.enumValues)[number];
export type ConsultStatus = (typeof consultStatus.enumValues)[number];
export type ConsultPreference = (typeof consultPreference.enumValues)[number];
export type SymptomCategory = (typeof symptomCategory.enumValues)[number];
export type DoctorType = (typeof doctorType.enumValues)[number];
export type PrescriptionType = (typeof prescriptionType.enumValues)[number];
export type ReferralType = (typeof referralType.enumValues)[number];
export type InvestigationType = (typeof investigationType.enumValues)[number];
export type DocumentType = (typeof documentType.enumValues)[number];
export type BillingStatus = (typeof billingStatus.enumValues)[number];
export type ChatChannelName = (typeof chatChannel.enumValues)[number];
export type AccountStatus = (typeof accountStatus.enumValues)[number];
export type AuState = (typeof auStateEnum.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number];
export type EmploymentPreference = (typeof employmentPreference.enumValues)[number];
export type ContactMethod = (typeof contactMethod.enumValues)[number];
export type CallProviderId = (typeof callProvider.enumValues)[number];
export type CallMode = (typeof callMode.enumValues)[number];
