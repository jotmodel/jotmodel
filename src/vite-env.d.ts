/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  /** Worker host for the relay, e.g. "jotmodel.<acct>.workers.dev" or "localhost:8787". */
  readonly VITE_WORKER_HOST?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
