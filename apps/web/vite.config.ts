import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    /**
     * Hosts the dev server will answer to. Vite rejects an unrecognised `Host`
     * header, so a tunnel's hostname has to be named here or every request
     * through it returns "Blocked request".
     *
     * Development only, and only while a call is being tested across devices.
     * A quick tunnel's hostname changes every restart.
     */
    allowedHosts: [".trycloudflare.com"],
    /**
     * The API is served under the dev server's own origin.
     *
     * Without this the browser talks to `localhost:4001` while the page itself
     * is on some other host — different sites, so the session cookie is dropped
     * and every login silently bounces back to the login screen. Going through
     * the proxy means the app works identically on localhost and through a
     * tunnel, with no per-host configuration.
     */
    proxy: {
      "/trpc": {
        target: "http://localhost:4001",
        changeOrigin: false,
      },
    },
  },
});
