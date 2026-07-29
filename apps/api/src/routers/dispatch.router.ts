import { z } from "zod";
import { doctorProcedure, router } from "../trpc.ts";
import { reasonSchema, uuid } from "./schemas.ts";

const visitIdInput = z.object({ visitId: uuid });

/**
 * Home-visit dispatch transport.
 *
 * Sequencing and safety rules live in `domain/dispatch`; assignment and
 * escalation orchestration lives in `DispatchService`.
 */
export const dispatchRouter = router({
  /* ---------------- board ---------------- */
  board: doctorProcedure.query(({ ctx }) => ctx.services.dispatch.board()),

  myRun: doctorProcedure.query(({ ctx }) =>
    ctx.services.dispatch.myRun(ctx.doctor),
  ),

  openAlerts: doctorProcedure.query(({ ctx }) =>
    ctx.services.dispatch.openAlerts(),
  ),

  /* ---------------- assignment ---------------- */
  offer: doctorProcedure
    .input(visitIdInput.extend({ toDoctorId: uuid }))
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.offer(ctx.doctor, input.visitId, input.toDoctorId),
    ),

  accept: doctorProcedure
    .input(visitIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.accept(ctx.doctor, input.visitId),
    ),

  decline: doctorProcedure
    .input(visitIdInput.extend({ reason: reasonSchema }))
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.decline(ctx.doctor, input.visitId, input.reason),
    ),

  /* ---------------- route ---------------- */
  optimiseRoute: doctorProcedure.mutation(({ ctx }) =>
    ctx.services.dispatch.buildRoute(ctx.doctor),
  ),

  updateLocation: doctorProcedure
    .input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }))
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.updateLocation(ctx.doctor, input.latitude, input.longitude),
    ),

  /* ---------------- travel and safety timer ---------------- */
  departFor: doctorProcedure
    .input(visitIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.departFor(ctx.doctor, input.visitId),
    ),

  /** Check-in — starts the lone-worker timer. */
  arrive: doctorProcedure
    .input(visitIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.arrive(ctx.doctor, input.visitId),
    ),

  /** Check-out — stops it and resolves any auto-raised alert. */
  depart: doctorProcedure
    .input(visitIdInput)
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.depart(ctx.doctor, input.visitId),
    ),

  /* ---------------- duress ---------------- */
  raisePanic: doctorProcedure
    .input(z.object({ visitId: uuid.optional(), note: z.string().max(500).optional() }))
    .mutation(({ ctx, input }) => ctx.services.dispatch.raisePanic(ctx.doctor, input)),

  /** Fires alerts for any visit past its escalation threshold. Idempotent. */
  runSafetySweep: doctorProcedure.mutation(({ ctx }) =>
    ctx.services.dispatch.runSafetySweep(),
  ),

  resolveAlert: doctorProcedure
    .input(z.object({ alertId: uuid }))
    .mutation(({ ctx, input }) =>
      ctx.services.dispatch.resolveAlert(ctx.doctor, input.alertId),
    ),

  onChange: doctorProcedure.subscription(async function* ({ ctx, signal }) {
    for await (const event of ctx.ports.events.subscribe("dispatch.changed", signal!)) {
      yield event;
    }
  }),
});
