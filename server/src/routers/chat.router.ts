import { z } from "zod";
import { doctorProcedure, router } from "../trpc.ts";
import { chatChannelSchema } from "./schemas.ts";

export const chatRouter = router({
  list: doctorProcedure
    .input(z.object({ channel: chatChannelSchema }))
    .query(({ ctx, input }) => ctx.services.chat.list(input.channel)),

  send: doctorProcedure
    .input(
      z.object({
        channel: chatChannelSchema,
        body: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.services.chat.send(ctx.doctor, input.channel, input.body),
    ),

  onMessage: doctorProcedure.subscription(async function* ({ ctx, signal }) {
    for await (const event of ctx.ports.events.subscribe("chat.message", signal!)) {
      yield event;
    }
  }),
});
