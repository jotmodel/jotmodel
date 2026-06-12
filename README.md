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
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the build
npm run typecheck  # client + worker type-check
```

## What's implemented

**Canvas (the product).**
- Create: click empty canvas → name → `Enter` → type comma-separated fields (types infer) → `Enter`.
- Natural-language type inference (`email`→email, `paid?`→boolean, `placed_at`→timestamp, …) — gentle, optional, overridable.
- Relate: drag a card's edge dot — or **a field row** (`as <field>`) — drop on a table to connect, on empty to spawn a related table, on its **own** table for a self-loop. Parallel offset for multiple links between a pair.
- Cardinality: click a relationship endpoint to toggle one(bar)↔many(crow's-foot) → 1:1 / 1:N / N:M; midpoint `1:N` label (click to cycle). Re-route by dragging an endpoint (click-vs-drag threshold). Role label editable inline.
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

## Deploy (staged — needs your Cloudflare account; ~$5/mo Workers Paid for DO/D1/R2)

```bash
# Pages (Phase 1 static app, free):
npm run deploy:pages

# Worker + data (Phase 2–3):
wrangler d1 create jotmodel          # put the printed id in wrangler.toml
npm run db:remote                    # apply schema
wrangler r2 bucket create jotmodel-snapshots
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_JWT_KEY
npm run deploy:worker
```

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
