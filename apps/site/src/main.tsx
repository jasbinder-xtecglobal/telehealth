import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import superjson from "superjson";
import type { AppRouter } from "@telehealth/api";
import { App } from "./App.tsx";
import { API_URL, TRPCProvider } from "./lib/trpc.ts";
import "./styles.css";

function Root() {
  const [queryClient] = useState(() => new QueryClient());

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: API_URL,
          transformer: superjson,
          // No subscriptions here: the public site only submits forms. It has
          // no session and nothing to keep live.
          //
          // The timeout matters — an API host that accepts the connection but
          // never answers would otherwise leave a patient staring at a
          // spinner with no way to know their booking failed.
          fetch: (url, options) =>
            fetch(url, {
              ...options,
              signal: options?.signal ?? AbortSignal.timeout(15_000),
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
