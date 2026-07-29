import cors from "@fastify/cors";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { env } from "./config/env.ts";
import { closeDatabase } from "./db/client.ts";
import { appRouter, type AppRouter } from "./routers/index.ts";
import { createContext } from "./trpc.ts";

/**
 * HTTP entry point.
 *
 * Responsible only for wiring the transport: CORS, the tRPC plugin, a health
 * probe and graceful shutdown. All behaviour lives behind the router.
 */
const app = Fastify({ routerOptions: { maxParamLength: 8000 }, logger: false });

// `credentials: true` with an explicit origin allowlist — required for the
// session cookie to be sent from the web app on a different port.
await app.register(cors, {
  origin: [env.WEB_ORIGIN, "http://127.0.0.1:5173", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["content-type", "authorization", "trpc-accept"],
});

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[trpc] ${path}:`, error);
      }
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

app.get("/health", async () => ({ ok: true, at: new Date().toISOString() }));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await closeDatabase();
    process.exit(0);
  });
}

try {
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  console.log(`api listening on http://localhost:${env.API_PORT}`);
  console.log(`trpc endpoint     http://localhost:${env.API_PORT}/trpc`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
