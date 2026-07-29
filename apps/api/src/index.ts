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

// `credentials: true` with an explicit origin allowlist. A wildcard is not
// permitted alongside credentials, so the deployed web origin must be named.
const allowedOrigins = new Set([
  ...env.webOrigins,
  ...(env.isProduction ? [] : ["http://127.0.0.1:5173", "http://localhost:5173"]),
]);

await app.register(cors, {
  origin(origin, cb) {
    // Same-origin and server-to-server calls arrive without an Origin header —
    // this is the case when the web app proxies through its own domain.
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    cb(new Error(`Origin not allowed: ${origin}`), false);
  },
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
  // 0.0.0.0 is required by container hosts; localhost-only would be unreachable.
  await app.listen({ port: env.port, host: "0.0.0.0" });
  console.log(`api listening on port ${env.port} (${env.NODE_ENV})`);
  console.log(`allowed origins: ${[...allowedOrigins].join(", ") || "(none)"}`);
  console.log(`cookie SameSite: ${env.COOKIE_SAMESITE}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
