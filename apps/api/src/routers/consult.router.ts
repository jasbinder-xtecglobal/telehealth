import { z } from "zod";
import { doctorProcedure, router } from "../trpc.ts";
import {
  addFamilyInput,
  billingInput,
  consultIdInput,
  documentInput,
  investigateInput,
  prescribeInput,
  reasonSchema,
  referInput,
  uuid,
} from "./schemas.ts";

/**
 * Consult transport.
 *
 * Every procedure is a one-line delegation. If a procedure in this file ever
 * grows a conditional, that logic belongs in a service or a domain policy.
 */
export const consultRouter = router({
  /* ---------------- read ---------------- */
  get: doctorProcedure
    .input(consultIdInput)
    .query(({ ctx, input }) => ctx.services.consult.getDetail(input.consultId)),

  mine: doctorProcedure.query(({ ctx }) => ctx.services.consult.listMine(ctx.doctor)),

  history: doctorProcedure
    .input(
      z.object({
        onlyIncompleteBilling: z.boolean().default(false),
        days: z.number().int().positive().nullable().default(7),
      }),
    )
    .query(({ ctx, input }) => ctx.services.consult.history(ctx.doctor, input)),

  revisions: doctorProcedure
    .input(consultIdInput)
    .query(({ ctx, input }) => ctx.services.scribe.listRevisions(input.consultId)),

  /* ---------------- queue actions ---------------- */
  claim: doctorProcedure
    .input(consultIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.claim(ctx.doctor, input.consultId),
    ),

  reject: doctorProcedure
    .input(consultIdInput.extend({ reason: reasonSchema }))
    .mutation(({ ctx, input }) =>
      ctx.services.consult.reject(ctx.doctor, input.consultId, input.reason),
    ),

  hidePatient: doctorProcedure
    .input(z.object({ patientId: uuid, reason: reasonSchema }))
    .mutation(({ ctx, input }) =>
      ctx.services.doctor.hidePatient(ctx.doctor, input.patientId, input.reason),
    ),

  /* ---------------- session ---------------- */
  start: doctorProcedure
    .input(consultIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.start(ctx.doctor, input.consultId),
    ),

  requeue: doctorProcedure
    .input(consultIdInput.extend({ reason: z.string().max(500).optional() }))
    .mutation(({ ctx, input }) =>
      ctx.services.consult.requeue(ctx.doctor, input.consultId, input.reason),
    ),

  nudgePatient: doctorProcedure
    .input(consultIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.nudge(ctx.doctor, input.consultId),
    ),

  patientJoin: doctorProcedure
    .input(consultIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.markPatientJoined(input.consultId),
    ),

  /* ---------------- notes and scribe ---------------- */
  saveNotes: doctorProcedure
    .input(consultIdInput.extend({ body: z.string().max(50_000) }))
    .mutation(({ ctx, input }) =>
      ctx.services.scribe.saveNotes({
        doctor: ctx.doctor,
        consultId: input.consultId,
        body: input.body,
      }),
    ),

  attestNotes: doctorProcedure
    .input(consultIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.scribe.attest({ doctor: ctx.doctor, consultId: input.consultId }),
    ),

  captureTranscript: doctorProcedure
    .input(
      consultIdInput.extend({
        body: z.string().max(50_000),
        consentGiven: z.boolean(),
      }),
    )
    .mutation(({ ctx, input }) => ctx.services.scribe.captureTranscript(input)),

  runScribe: doctorProcedure
    .input(consultIdInput.extend({ templateId: uuid.optional() }))
    .mutation(({ ctx, input }) =>
      ctx.services.scribe.runScribe({
        doctor: ctx.doctor,
        consultId: input.consultId,
        templateId: input.templateId,
      }),
    ),

  /* ---------------- prescribing ---------------- */
  checkPrescription: doctorProcedure
    .input(consultIdInput.extend({ drugId: uuid }))
    .query(({ ctx, input }) =>
      ctx.services.prescribing.assess(input.consultId, input.drugId),
    ),

  prescribe: doctorProcedure
    .input(prescribeInput)
    .mutation(({ ctx, input }) =>
      ctx.services.prescribing.prescribe({
        doctor: ctx.doctor,
        consultId: input.consultId,
        drugId: input.drugId,
        quantity: input.quantity,
        repeats: input.repeats,
        directions: input.directions,
        type: input.type,
        streamlineCode: input.streamlineCode ?? null,
        overrideReason: input.overrideReason ?? null,
      }),
    ),

  cancelPrescription: doctorProcedure
    .input(z.object({ prescriptionId: uuid }))
    .mutation(({ ctx, input }) =>
      ctx.services.prescribing.cancel(input.prescriptionId),
    ),

  /* ---------------- other artefacts ---------------- */
  refer: doctorProcedure
    .input(referInput)
    .mutation(({ ctx, input }) => ctx.services.consult.refer(input)),

  investigate: doctorProcedure
    .input(investigateInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.investigate({ ...input, doctor: ctx.doctor }),
    ),

  acknowledgeInvestigation: doctorProcedure
    .input(z.object({ investigationId: uuid }))
    .mutation(({ ctx, input }) =>
      ctx.services.doctor.acknowledgeInvestigation(
        ctx.doctor,
        input.investigationId,
      ),
    ),

  issueDocument: doctorProcedure
    .input(documentInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.issueDocument({
        consultId: input.consultId,
        type: input.type,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        body: input.body,
      }),
    ),

  /* ---------------- billing and close ---------------- */
  setBilling: doctorProcedure
    .input(billingInput)
    .mutation(({ ctx, input }) =>
      ctx.services.billing.record({
        doctor: ctx.doctor,
        consultId: input.consultId,
        itemNumber: input.itemNumber,
        noBillingReason: input.noBillingReason ?? null,
      }),
    ),

  end: doctorProcedure
    .input(consultIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.close(ctx.doctor, input.consultId),
    ),

  /* ---------------- family ---------------- */
  addFamilyMember: doctorProcedure
    .input(addFamilyInput)
    .mutation(({ ctx, input }) =>
      ctx.services.consult.addFamilyMember({ ...input, doctor: ctx.doctor }),
    ),
});
