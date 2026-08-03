import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The booking form's reason list is a domain constant, not site copy.
      // Aliased so the site imports the one definition instead of a duplicate
      // that would quietly drift from the doctor's queue filters.
      "@telehealth/domain": fileURLToPath(
        new URL("../api/src/domain", import.meta.url),
      ),
    },
  },
  server: {
    // 5174 so the console on 5173 and the public site can run side by side —
    // the demo is one person switching between them.
    port: 5174,
    strictPort: true,
  },
});
