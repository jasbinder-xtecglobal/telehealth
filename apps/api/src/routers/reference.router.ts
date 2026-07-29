import { z } from "zod";
import { doctorProcedure, router } from "../trpc.ts";
import { channelInput } from "./schemas.ts";

export const referenceRouter = router({
  /** Drug lookup — the mock stands in for a licensed MIMS or AMT feed. */
  searchDrugs: doctorProcedure
    .input(
      z.object({
        term: z.string().default(""),
        allDrugs: z.boolean().default(true),
      }),
    )
    .query(({ ctx, input }) => ctx.services.reference.searchDrugs(input.term)),

  /** MBS items filtered to the acting doctor's registration type and channel. */
  mbsItems: doctorProcedure
    .input(channelInput.partial().default({ channel: "telehealth" }))
    .query(({ ctx, input }) =>
      ctx.services.billing.selectableFor(ctx.doctor, input.channel ?? "telehealth"),
    ),
});
