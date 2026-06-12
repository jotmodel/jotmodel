# JotModel

A fast, fit-to-purpose whiteboard for data-modeling conversations. Type an entity, drag a
relationship, and the model just appears — the tool gets out of the room's way. Local-first
(CRDT + IndexedDB): boards live in your browser, load instantly, and work offline, with a
rewrite-free path to cloud save, link sharing, and real-time multiplayer.

The laws that govern the UI live in `CLAUDE.md`; the interaction spec in `build-spec.md`; the
system design in `architecture.md`; the visual reference in `jotmodel-design-system.html`; the
palette in `src/styles/tokens.css`.

## Run (Phase 1 — local, $0, no accounts)

```bash
npm install
npm run dev        # http://localhost:5173  (local-only board; no account, no backend)
npm run build      # type-check + production build → dist/
npm run preview    # serve the build
npm run typecheck  # client + worker type-check
npm test           # vitest — export, inference, worker ACL
```

Copy `.env.example` → `.env.local` and set `VITE_CLERK_PUBLISHABLE_KEY` (+ run the worker, below)
to switch on the full account-aware app: accounts, cloud boards, share links, and live
multiplayer with presence. The marketing site is a standalone static site in `site/`.

## What's implemented

**Canvas (the product).**
- Create: click empty canvas → name → `Enter` → type comma-separated fields (types infer) → `Enter`.
- Natural-language type inference (`email`→email, `paid?`→boolean, `placed_at`→timestamp, …) — gentle, optional, overridable.
- Relate: drag **any of a card's edges** (a dot tracks your pointer along the border) — or **a field row** (`as <field>`) — drop on a table to connect (the connector snatches onto the edge, then settles into its routed port), on empty to spawn a related table, on its **own** table for a self-loop. Parallel offset for multiple links between a pair.
- Cardinality: select a relationship and **click its `1:N` label** to cycle 1:1 → 1:N → N:M (one = bar, many = crow's-foot); keyboard `1`/`N`/`Space` on the focused end. Endpoints are **drag-to-reroute only** (no click action). Role (`as …`) label editable inline.
- Move (drag header), rename (double-click entity/field, `Enter`/`F2`), field add/rename/delete, color-code (header dot → `--sem` hue), delete (no confirm — undo has your back).
- **Infinite canvas:** space/middle-drag or trackpad to pan, ⌘/Ctrl-scroll (or pinch) to zoom around the cursor, fit-to-content, full keyboard parity (arrows pan, `+`/`-` zoom, ⌘0 reset, ⇧1 fit).
- **Undo/redo** (`Y.UndoManager`, per-user) via ⌘Z / ⇧⌘Z and toolbar.
- Light/dark (persisted; `color-scheme` declared), local persistence (reload keeps your board).

**Export & portability** (`Export ▾`): column-level **DBML**, **dbt** (schema.yml + model stubs),
**SQL DDL** (Postgres / MySQL / SQL Server), and a portable **`.jotmodel`** file (import merges or
replaces, CRDT-safe).

**Backend (Phases 2–3, authored & locally testable; deploy staged).** `worker/` holds a Cloudflare
Worker (REST list/create/share) + a Durable Object per board (`y-partyserver`, WebSocket
hibernation) + D1 (users/boards/members/share_links) + R2 (snapshots), with **Clerk** JWT
verification and a D1 ACL gating every privileged call and the WebSocket upgrade (share-link
capability tokens for anonymous, role-scoped access). The client keeps a one-line **provider seam**
(`src/model/provider.ts`) so the same `Y.Doc` syncs to the relay with no canvas changes.

## Backend: local test (no paid plan)

```bash
cp worker/.dev.vars.example worker/.dev.vars   # add Clerk dev keys (CLERK_SECRET_KEY, CLERK_JWT_KEY)
npm run db:local                                # apply schema to local D1
npm run dev:worker                              # wrangler dev — Worker + DO + local D1/R2 (Miniflare)
```

The share-token WebSocket path is testable without Clerk; the REST + Clerk path needs a free Clerk
**development** instance. Activate the client cloud path by setting `VITE_CLERK_PUBLISHABLE_KEY` and
`VITE_WORKER_HOST` (`.env.local`).

## Go-live (jotmodel.com + app.jotmodel.com)

Three Cloudflare targets, one repo:

```
jotmodel.com      → Pages "jotmodel-site"  (marketing, site/)
app.jotmodel.com  → Pages "jotmodel-app"   (the SPA, dist/, SPA fallback)
api.jotmodel.com  → Worker                 (REST /api/* + WebSocket relay → JotBoard DO)
                     └ D1 (jotmodel) · R2 (jotmodel-snapshots) · Clerk (prod)
```

CI (`.github/workflows/ci.yml`) runs typecheck + tests + build on every push/PR and deploys all
three on push to `main`. Run the one-time provisioning below first (needs your credentials).

```bash
# 1. Data
wrangler d1 create jotmodel              # paste database_id into wrangler.toml
npm run db:remote                        # apply worker/db/schema.sql
wrangler r2 bucket create jotmodel-snapshots

# 2. Clerk (production instance): set allowed origin https://app.jotmodel.com; copy the keys.
wrangler secret put CLERK_SECRET_KEY     # sk_live_...
wrangler secret put CLERK_JWT_KEY        # PEM public key

# 3. Worker (provisions the api.jotmodel.com custom domain declared in wrangler.toml)
npm run deploy:worker

# 4. Pages projects + custom domains
wrangler pages project create jotmodel-app
wrangler pages project create jotmodel-site
#   add custom domains app.jotmodel.com / jotmodel.com in the dashboard,
#   and set the app's build env: VITE_CLERK_PUBLISHABLE_KEY (pk_live_...).
npm run deploy:app
npm run deploy:site

# 5. CI secrets (GitHub → repo → Settings → Secrets):
#   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, VITE_CLERK_PUBLISHABLE_KEY
```

`APP_ORIGIN` in `wrangler.toml` must EXACTLY equal `https://app.jotmodel.com` and Clerk's `azp`
(no trailing slash) or every authenticated call silently 401s. The app loads the routed,
account-aware build only when `VITE_CLERK_PUBLISHABLE_KEY` is set at build time; without it the
local-only Phase-1 board is served (the `npm run dev` default).

## Project layout

```
src/
  model/   board.ts (CRDT, types, mutations, UndoManager, inference)
           useBoard.ts · geom.ts · export.ts · provider.ts (relay seam)
  canvas/  Canvas.tsx (orchestration, pan/zoom, gestures) · reducer.ts (state machine)
           EntityCard.tsx · Relationships.tsx
  ui/      TopBar.tsx
  screens/ Scaffold/ShareDialog/AuthGate/Placeholders — non-board UIs, flagged for design review
  styles/  tokens.css (source of truth) · app.css
worker/    index.ts · auth.ts · rest.ts · server.ts (DO) · db/schema.sql · env.d.ts
```

## Governance (read these — they are the law)

- **`CLAUDE.md`** — always-loaded build contract. **`build-spec.md`** — interactions + states.
  **`architecture.md`** — system design, phases, cost. Only the board/canvas is designed; other
  screens are scaffolded from tokens and flagged for design review.
