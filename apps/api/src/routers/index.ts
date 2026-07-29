import { router } from "../trpc.ts";
import { authRouter } from "./auth.router.ts";
import { chatRouter } from "./chat.router.ts";
import { consultRouter } from "./consult.router.ts";
import { dispatchRouter } from "./dispatch.router.ts";
import { doctorRouter } from "./doctor.router.ts";
import { queueRouter } from "./queue.router.ts";
import { referenceRouter } from "./reference.router.ts";

export const appRouter = router({
  auth: authRouter,
  queue: queueRouter,
  consult: consultRouter,
  dispatch: dispatchRouter,
  doctor: doctorRouter,
  chat: chatRouter,
  reference: referenceRouter,
});

export type AppRouter = typeof appRouter;
