/**
 * Call transport endpoints.
 *
 * Transport only — every procedure is one line. Which vendors exist, and
 * whether one may be used right now, is decided in the domain and answered by
 * `call.options`; there is deliberately no conditional in this file.
 */
import { z } from "zod";
import { doctorProcedure, router } from "../trpc.ts";
import {
  callModeSchema,
  callProviderSchema,
  consultIdInput,
  uuid,
} from "./schemas.ts";

export const callRouter = router({
  /** Populates the provider picker. */
  options: doctorProcedure
    .input(consultIdInput.extend({ mode: callModeSchema }))
    .query(({ ctx, input }) => ctx.services.call.options(ctx.doctor, input)),

  start: doctorProcedure
    .input(
      consultIdInput.extend({
        provider: callProviderSchema,
        mode: callModeSchema,
      }),
    )
    .mutation(({ ctx, input }) => ctx.services.call.start(ctx.doctor, input)),

  end: doctorProcedure
    .input(consultIdInput.extend({ reason: z.string().max(60).optional() }))
    .mutation(({ ctx, input }) => ctx.services.call.end(ctx.doctor, input)),

  history: doctorProcedure
    .input(z.object({ consultId: uuid }))
    .query(({ ctx, input }) => ctx.services.call.history(ctx.doctor, input.consultId)),
});
