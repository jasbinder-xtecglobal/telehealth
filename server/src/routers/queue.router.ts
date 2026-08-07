import { doctorProcedure, router } from "../trpc.ts";
import { channelInput } from "./schemas.ts";

/**
 * Waiting-room transport.
 *
 * Validate, delegate, return. Ordering, visibility and family grouping live in
 * the queue policy; counters live in QueueService.
 */
export const queueRouter = router({
  list: doctorProcedure
    .input(channelInput)
    .query(({ ctx, input }) => ctx.services.queue.listFor(ctx.doctor, input.channel)),

  stats: doctorProcedure.query(({ ctx }) => ctx.services.queue.statsFor(ctx.doctor)),

  /** Pushed whenever any queue mutation occurs, so clients can invalidate. */
  onChange: doctorProcedure.subscription(async function* ({ ctx, signal }) {
    for await (const event of ctx.ports.events.subscribe("queue.changed", signal!)) {
      yield event;
    }
  }),
});
