import { z } from "zod";
import { doctorProcedure, router } from "../trpc.ts";
import { categorySchema, profileInput, templateInput, uuid } from "./schemas.ts";

export const doctorRouter = router({
  me: doctorProcedure.query(({ ctx }) => ctx.doctor),

  roster: doctorProcedure.query(({ ctx }) => ctx.services.doctor.roster()),

  /** Prototype affordance: act as another doctor without an auth flow. */
  switchTo: doctorProcedure
    .input(z.object({ doctorId: uuid }))
    .mutation(({ ctx, input }) => ctx.services.doctor.markOnline(input.doctorId)),

  updateProfile: doctorProcedure
    .input(profileInput)
    .mutation(({ ctx, input }) =>
      ctx.services.doctor.updateProfile(ctx.doctor, input),
    ),

  /* ---------------- queue filters ---------------- */
  filters: doctorProcedure.query(({ ctx }) =>
    ctx.services.doctor.listFilters(ctx.doctor),
  ),

  setFilters: doctorProcedure
    .input(z.object({ categories: z.array(categorySchema) }))
    .mutation(({ ctx, input }) =>
      ctx.services.doctor.setFilters(ctx.doctor, input.categories),
    ),

  /* ---------------- hidden patients ---------------- */
  hiddenPatients: doctorProcedure.query(({ ctx }) =>
    ctx.services.doctor.listHiddenPatients(ctx.doctor),
  ),

  unhidePatient: doctorProcedure
    .input(z.object({ patientId: uuid }))
    .mutation(({ ctx, input }) =>
      ctx.services.doctor.unhidePatient(ctx.doctor, input.patientId),
    ),

  /* ---------------- templates ---------------- */
  templates: doctorProcedure.query(({ ctx }) =>
    ctx.services.doctor.listTemplates(ctx.doctor),
  ),

  saveTemplate: doctorProcedure
    .input(templateInput)
    .mutation(({ ctx, input }) =>
      ctx.services.doctor.saveTemplate(ctx.doctor, input),
    ),

  deleteTemplate: doctorProcedure
    .input(z.object({ id: uuid }))
    .mutation(({ ctx, input }) => ctx.services.doctor.deleteTemplate(input.id)),

  /* ---------------- follow-up ---------------- */
  inbox: doctorProcedure.query(({ ctx }) => ctx.services.doctor.inbox(ctx.doctor)),

  smsOutbox: doctorProcedure.query(({ ctx }) => ctx.services.doctor.deliveryLog()),

  onPresenceChange: doctorProcedure.subscription(async function* ({ ctx, signal }) {
    for await (const event of ctx.ports.events.subscribe("presence.changed", signal!)) {
      yield event;
    }
  }),
});
