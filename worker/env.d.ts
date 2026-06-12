// Ambient binding types for the Worker. partyserver/y-partyserver type `this.env`
// as `Cloudflare.Env`, so we augment that namespace with our bindings.
declare global {
  namespace Cloudflare {
    interface Env {
      JotBoard: DurableObjectNamespace
      DB: D1Database
      SNAPSHOTS: R2Bucket
      APP_ORIGIN: string
      CLERK_SECRET_KEY: string
      CLERK_JWT_KEY: string
    }
  }
}

export {}
