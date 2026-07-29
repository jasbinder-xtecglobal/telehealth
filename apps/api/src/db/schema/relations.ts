/**
 * Drizzle relation graph.
 *
 * Kept separate from the table definitions so the domain modules stay free of
 * cross-references, and so both sides of every relation are declared in one
 * place — Drizzle cannot infer a `with: { … }` join unless the `one()` side
 * exists.
 */
import { relations } from "drizzle-orm";
import {
  documents,
  investigations,
  prescriptions,
  referrals,
} from "./artefacts.ts";
import { billings } from "./billing.ts";
import { chatMessages } from "./collaboration.ts";
import { emailVerificationTokens, sessions } from "./auth.ts";
import { consults, noteRevisions } from "./consults.ts";
import { duressAlerts, visits } from "./dispatch.ts";
import { doctorFilters, doctors, hiddenPatients, templates } from "./doctors.ts";
import { patientAllergies, patients } from "./patients.ts";
import { drugs } from "./reference.ts";

export const doctorsRelations = relations(doctors, ({ many }) => ({
  consults: many(consults),
  templates: many(templates),
  filters: many(doctorFilters),
  hiddenPatients: many(hiddenPatients),
  visits: many(visits),
  duressAlerts: many(duressAlerts),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  doctor: one(doctors, {
    fields: [sessions.doctorId],
    references: [doctors.id],
  }),
}));

export const emailVerificationTokensRelations = relations(
  emailVerificationTokens,
  ({ one }) => ({
    doctor: one(doctors, {
      fields: [emailVerificationTokens.doctorId],
      references: [doctors.id],
    }),
  }),
);

export const patientsRelations = relations(patients, ({ many }) => ({
  consults: many(consults),
  allergies: many(patientAllergies),
}));

export const consultsRelations = relations(consults, ({ one, many }) => ({
  patient: one(patients, {
    fields: [consults.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [consults.doctorId],
    references: [doctors.id],
  }),
  prescriptions: many(prescriptions),
  referrals: many(referrals),
  investigations: many(investigations),
  documents: many(documents),
  billings: many(billings),
  revisions: many(noteRevisions),
  // The reverse side (consults → visit) is deliberately not declared: the
  // foreign key lives on `visits`, and declaring `one()` with fields on both
  // sides leaves Drizzle unable to tell which side owns the relation.
}));

export const visitsRelations = relations(visits, ({ one, many }) => ({
  consult: one(consults, {
    fields: [visits.consultId],
    references: [consults.id],
  }),
  doctor: one(doctors, {
    fields: [visits.doctorId],
    references: [doctors.id],
  }),
  duressAlerts: many(duressAlerts),
}));

export const duressAlertsRelations = relations(duressAlerts, ({ one }) => ({
  doctor: one(doctors, {
    fields: [duressAlerts.doctorId],
    references: [doctors.id],
  }),
  visit: one(visits, {
    fields: [duressAlerts.visitId],
    references: [visits.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  consult: one(consults, {
    fields: [prescriptions.consultId],
    references: [consults.id],
  }),
  drug: one(drugs, { fields: [prescriptions.drugId], references: [drugs.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  consult: one(consults, {
    fields: [referrals.consultId],
    references: [consults.id],
  }),
}));

export const investigationsRelations = relations(investigations, ({ one }) => ({
  consult: one(consults, {
    fields: [investigations.consultId],
    references: [consults.id],
  }),
  orderedBy: one(doctors, {
    fields: [investigations.orderedByDoctorId],
    references: [doctors.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  consult: one(consults, {
    fields: [documents.consultId],
    references: [consults.id],
  }),
}));

export const billingsRelations = relations(billings, ({ one }) => ({
  consult: one(consults, {
    fields: [billings.consultId],
    references: [consults.id],
  }),
  doctor: one(doctors, {
    fields: [billings.doctorId],
    references: [doctors.id],
  }),
}));

export const noteRevisionsRelations = relations(noteRevisions, ({ one }) => ({
  consult: one(consults, {
    fields: [noteRevisions.consultId],
    references: [consults.id],
  }),
  author: one(doctors, {
    fields: [noteRevisions.authorId],
    references: [doctors.id],
  }),
}));

export const patientAllergiesRelations = relations(patientAllergies, ({ one }) => ({
  patient: one(patients, {
    fields: [patientAllergies.patientId],
    references: [patients.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  doctor: one(doctors, {
    fields: [templates.doctorId],
    references: [doctors.id],
  }),
}));

export const hiddenPatientsRelations = relations(hiddenPatients, ({ one }) => ({
  doctor: one(doctors, {
    fields: [hiddenPatients.doctorId],
    references: [doctors.id],
  }),
  patient: one(patients, {
    fields: [hiddenPatients.patientId],
    references: [patients.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  author: one(doctors, {
    fields: [chatMessages.authorId],
    references: [doctors.id],
  }),
}));
