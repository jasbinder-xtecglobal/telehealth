import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpSubscriptionLink,
  splitLink,
} from "@trpc/client";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import superjson from "superjson";
import type { AppRouter } from "@telehealth/api";
import { App } from "./app/App.tsx";
import { API_URL, TRPCProvider } from "./shared/lib/trpc.ts";
import "./styles.css";

function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          // Server-sent events carry the live queue, presence and chat pushes.
          true: httpSubscriptionLink({
            url: API_URL,
            transformer: superjson,
            eventSourceOptions: () => ({ withCredentials: true }),
          }),
          false: httpBatchLink({
            url: API_URL,
            transformer: superjson,
            // The session lives in an httpOnly cookie, so it is never readable
            // from JavaScript — it has to be sent by the browser instead.
            //
            // The timeout matters: without it, an API host that accepts the
            // connection but never answers leaves every query pending forever
            // and the app renders a loading state with no error to diagnose.
            fetch: (url, options) =>
              fetch(url, {
                ...options,
                credentials: "include",
                signal: options?.signal ?? AbortSignal.timeout(15_000),
              }),
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TRPCProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
