/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API endpoint — see `shared/lib/trpc.ts`. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
