# JotModel — Operations & Handoff Runbook

Status: **LIVE in production since 2026-06-16** (Phase 2+3 — accounts, cloud save, share links,
live multiplayer + presence). This file is the operational source of truth for running and
continuing the project. Governance/design law is in `CLAUDE.md`; system design in `architecture.md`;
the deploy quick-start is in `README.md`.

## Live surfaces

| URL | Serves | Cloudflare resource |
|---|---|---|
| `https://jotmodel.com` | Marketing site (`site/`) | Pages project **`jotmodel-site`** |
| `https://app.jotmodel.com` | The SPA (`dist/`) | Pages project **`jotmodel-app`** |
| `https://api.jotmodel.com` | REST `/api/*` + WebSocket relay | Worker **`jotmodel`** (custom-domain route) |

## Cloudflare resources (account `a5e8d83cb53d250f2615b1b758ae4dbb`, jotmodel.app@gmail.com)

- **Zone** `jotmodel.com` → id `42f0eb54d20ebc423dfef5733e139604`. **Plan: Pro (~$20/mo, upgraded
  2026-06-16).** The upgrade exists to disable **ECH** (see Gotchas) — Free zones force ECH on with no
  toggle. **Do not downgrade to Free** without re-checking ECH, or `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
  returns for some browsers. (Distinct from the account-level **Workers Paid** sub that backs Durable
  Objects — the two are billed and managed separately.)
- **D1** `jotmodel` → id `b19c42df-8010-432a-91e0-92cf504662d9` (pinned in `wrangler.toml`); schema in
  `worker/db/schema.sql` (tables: users, boards, members, share_links — **applied to remote**)
- **R2** bucket `jotmodel-snapshots` (CRDT snapshots, key `board/{id}.ydoc`)
- **Email Routing** (enabled 2026-06-19): apex MX → `route1/2/3.mx.cloudflare.net` + SPF
  `v=spf1 include:_spf.mx.cloudflare.net ~all`; rule **`contact@jotmodel.com` → forward →
  `jotmodel.app@gmail.com`** (catch-all = drop). Managed via `wrangler email routing` (OAuth token has
  `email_routing` write). **Destination needs the one-time Cloudflare verification click** to go live.
  Does not affect Clerk mail (subdomain-based). Set up to receive URL-categorization confirmations.
- **Worker** `jotmodel` → DO `JotBoard` (y-partyserver) + D1 + R2 bindings; `[vars] APP_ORIGIN =
  https://app.jotmodel.com`; secrets `CLERK_SECRET_KEY`, `CLERK_JWT_KEY` (production instance)
- **DNS for Clerk** (5 CNAMEs, **DNS-only / not proxied**): `clerk`, `accounts`, `clkmail`,
  `clk._domainkey`, `clk2._domainkey` → `*.clerk.services`. All validated (DNS+SSL+mail complete).

## Clerk (app "Jot Model" `app_3F2eIl9ATAk3N5XE4b6xpXvrkse`)

- **Production** instance `ins_3FEBpeW338Ira6EzVkfkzwVOw4I`, FAPI `clerk.jotmodel.com`,
  publishable key `pk_live_Y2xlcmsuam90bW9kZWwuY29tJA` (public).
- Development instance pk `pk_test_dm9jYWwtc2tpbmstMzIuY2xlcmsuYWNjb3VudHMuZGV2JA`.
- Auth methods live: email (code) + password. **OAuth (Google/GitHub/Microsoft) is `oauth_pending`** —
  enabled in config but needs production OAuth app credentials (Clerk dashboard → SSO connections).
- CLI: `clerk deploy status`, `clerk config pull --instance prod` (project is `clerk link`ed).

## Build / env model

- The SPA loads the **account-aware** build (`AppRouter` chunk: Clerk + react-router) only when
  `VITE_CLERK_PUBLISHABLE_KEY` is set at **build time**; otherwise it serves the local-only Phase-1
  board (`App`). So production builds **must** export `VITE_CLERK_PUBLISHABLE_KEY=pk_live_…`.
- `VITE_WORKER_HOST=api.jotmodel.com` comes from committed `.env.production`.
- Local dev: `cp .env.example .env.local`; worker secrets in `worker/.dev.vars` (incl. local
  `APP_ORIGIN=http://localhost:5173`).
- **`APP_ORIGIN` must exactly equal the app origin and Clerk `azp`** (no trailing slash) or every
  authenticated call silently 401s.

## CI/CD (`.github/workflows/ci.yml`)

- **Push to `main`** → `verify` (typecheck + `npm test` + build) → **`deploy-pages`**: auto-deploys
  BOTH Pages projects to `--branch main` (production). `main` is the deploy branch.
- **Worker deploy is MANUAL** — run `npm run deploy:worker` locally (OAuth wrangler), or trigger the
  `deploy-worker` job via **Actions → CI → "Run workflow"** (`workflow_dispatch`). Reason: `wrangler
  deploy` reconciles the `api.jotmodel.com` custom-domain route (`/zones/…/workers/routes`), which
  needs **Zone→Workers Routes→Edit + DNS→Edit** — beyond the least-privilege CI token.
- **GitHub Actions secrets** (set): `CLOUDFLARE_API_TOKEN` (Pages:Edit + Workers Scripts:Edit +
  Zone:Read — *not* DNS/Routes), `CLOUDFLARE_ACCOUNT_ID`, `VITE_CLERK_PUBLISHABLE_KEY`.
- Doc-only changes (`**.md`, `docs/**`) skip the push pipeline (no redeploy).

## Gotchas (these bit us — keep them fixed)

- `npm run db:remote` **must** pass `--remote` (wrangler 4.x requires it) or the schema silently
  never reaches remote D1. Fixed in `package.json`.
- `deploy:app` / `deploy:site` **must** pin `--branch main`, else `wrangler pages deploy` uses the
  current git branch → a *preview* alias, and the custom domains serve the empty production branch
  (→ 404). Fixed in `package.json` and CI.
- Clerk DNS CNAMEs must be **DNS-only (grey cloud)**; proxied breaks SSL/Frontend API.
- Querying a Clerk subdomain *before* its DNS exists can leave a sticky `NXDOMAIN` negative-cache on
  your resolver/LAN (use `1.1.1.1` or wait the TTL). Not a deploy issue.
- **ECH → `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` for *some* browsers** (hit us 2026-06-16). Cloudflare
  advertised **Encrypted ClientHello** in the HTTPS DNS records (SvcParam key `5`, ECHConfig `fe0d`,
  public_name `cloudflare-ech.com`) for all three hosts. DoH-enabled browsers behind a TLS-mangling
  AV/proxy/middlebox fail the ECH handshake; browsers without DoH never try ECH — hence "some
  browsers." The rest of TLS was healthy (dual ECDSA+RSA certs, TLS 1.2/1.3, valid per-host SANs), so
  **check the HTTPS RR for `ech=` before chasing cipher/cert theories.** Diagnose:
  `curl -s 'https://cloudflare-dns.com/dns-query?name=app.jotmodel.com&type=HTTPS' -H 'accept: application/dns-json'`
  (key `5` / bytes `fe 0d` / ASCII `cloudflare-ech.com` = ECH on). **Fix:** SSL/TLS → Edge
  Certificates → Encrypted ClientHello → **Disabled** (needs **Pro+**; Free can't toggle), or
  `PATCH /zones/42f0eb54d20ebc423dfef5733e139604/settings/ech {"value":"off"}`. Propagation ≤ record
  TTL (300s). **Disabled 2026-06-16** — keep it off; a Free downgrade silently re-enables it.

## Outstanding / next steps

1. **Production OAuth** (Google/GitHub/Microsoft) — add prod OAuth app credentials in the Clerk
   dashboard; `oauth_pending` until then. Email+password works now.
2. **Signed-in end-to-end test NOT yet run from a dev machine** (was blocked by the local DNS
   negative-cache). Verify on a clean resolver / cellular, or `echo "104.18.34.146
   clerk.jotmodel.com" >> /etc/hosts` then run via Playwright: sign in → create board → reload
   persists → open in 2 browsers (presence cursors converge) → share-link viewer is read-only.
3. **Design-review pass (in progress).** Objective contract-compliance fixes done across all surfaces
   (wordmark typeface scoping, modal Esc/focus-trap, menu/toggle ARIA, missing review flags, stray
   colour/JS literals, read-only dead tab-stop, reduced-motion guard). Added a sanctioned chrome
   danger layer `--jm-danger*` to both `tokens.css` (PROVISIONAL hues `#C9362C`/`#F2766B` — safe to
   re-tune). Amended law 7 (Space Grotesk = wordmark **+** the create-flow `.namebox`).
   **Signed off & shipped (PR #1, merged to `main` + deployed 2026-06-16):** presence (new palette
   w/ dark values + per-colour ink + every hue ΔE≥25 from `--jm-signal`; top-bar roster;
   deterministic anon names; cursor smoothing), view-only (on-canvas cue, Share hidden for viewers,
   selection kept for inspection), Home/board-list v1 (monochrome row icons, danger-token delete,
   canvas board-title rename), ShareDialog (link summary + revoke, flag dropped), 404/403/error
   (faint Mark backdrop, auth-aware 403 recovery), and the button-class + `.muted` cross-surface
   seams. **Shipped via PR #2 (merged to `main` + deployed 2026-06-18; typecheck/tests/build +
   rendered live):** the four remaining seams — single-source brand mark (site uses one `<symbol>` +
   `<use>`; app stays single-sourced via `Brand.tsx`), app-vs-site cursor glyph (site ghost-cursors
   now use the app's canonical presence glyph), unified status/loading frame (`LoadingState`/
   `EmptyState` share the `.status-screen` frame as a `plain` variant), toggle padding (app+site →
   `6px 12px`, the design-system value); **presence halo attribution** (a peer's selection now shows
   a small initials chip in the peer's colour/ink at the card corner — shared `initials()` +
   `PeerHalo` in `usePresence.ts`; rels stay colour-only); and a found-and-fixed **law-1 bug** — the
   status-screen brand wordmark "jot" was rendering browser-default link blue (`#0000EE`) inside the
   `<Link>`; `.wm` now pins `color:var(--jm-text)`. Themed Clerk auth was rendered (dev key) and the
   token theming holds in light+dark; **one finding:** the OAuth social buttons are low-contrast in
   dark (GitHub mono icon ~invisible) — a `clerkAppearance` tweak, only visible once OAuth is enabled
   (prod is `oauth_pending`). **Still pending:** that dark-mode OAuth button polish, and
   marketing-site ratification (rendered, awaiting eyeball).
4. Optional: broaden the CI token (Workers Routes + DNS + D1 + R2 edit) to auto-deploy the worker
   too; add error tracking/analytics (Cloudflare Web Analytics snippet is commented in `index.html`).
5. `develop` branch is behind `main` — fast-forward it if you keep using it.
6. **Flat "projects" (board grouping) — captured, not yet built.** One level: a board belongs to at
   most one project; Home shows a project list + an "All boards" view. Scope:
   - **D1:** new `projects` table (`id`, `owner_id`, `name`, `created_at`) + a nullable
     `boards.project_id` (NULL = root / "All boards"); index on `project_id`. Apply to remote with
     `npm run db:remote`.
   - **API / worker:** list/create/rename/delete projects (owner-scoped ACL like boards); `listBoards`
     returns `project_id`; add a "move board to project" endpoint. New routes in `worker/rest.ts` →
     needs a **manual worker deploy** (see CI/CD note above).
   - **UI (Home):** project list + "All boards", create project, rename via **double-click** (the
     sanctioned rename gesture), move a board into a project. Extends the existing Home v1 list.
   - Already live: rename-by-double-click on Home rows **and** the canvas board title (top bar).
7. **Paid plans (freemium) — strategy set 2026-06-19, not built.** Full marketing + pricing strategy
   in repo `MARKETING.md`. Model: free tier = **10 boards**, full app (input model + all exports +
   real-time collab) free forever; paid lifts the cap + adds control/scale. Publish real prices but
   mark paid tiers **"Coming soon"** until billing exists. Engineering tasks to stand it up:
   - **Stripe billing** — Checkout + Customer Portal + idempotent webhooks via the Worker; store
     customer/subscription ids in D1 (none today); test-mode behind a flag.
   - **Plans & entitlements in D1** — `users.plan`/`subscriptions` keyed to owner; one resolved
     entitlements function (board_limit, history_window_days, private_link_controls, room/guest caps)
     called by worker + app — never scatter limit literals.
   - **Enforce board-count limit server-side** — on create, count owner's boards (`idx_boards_owner`)
     vs the resolved limit; reject over-cap with a structured response; existing boards stay editable.
   - **Upgrade / limit-reached UI** — graceful board-#11 prompt + inline Pro affordances on gated
     controls. Non-canvas screen → **scaffold + design review**.
   - **Team workspace/roles/seats** — extend `members` (owner/editor/viewer exists) into shared
     workspace + seat counting tied to Stripe quantity.
   - **Private share-link controls (Pro)** — `share_links` has role + `expires_at`; add password +
     view-only enforcement, gate expiry/password behind Pro; enforce expiry server-side.
   - **Multiplayer scale gating** — cap concurrent/guest count by entitlement (existence stays free,
     only scale gated). ⚠️ confirm cost model before marketing "free multiplayer" loudly.
   - **Version-history retention by plan** — 7-day free vs extended paid (R2 prune job by entitlement).
   - **Enterprise (deferred)** — SSO/SAML + SCIM via Clerk enterprise; audit logs; out of lower tiers.
   - **Instrument the board-limit wall before pricing day** — track create attempts + boards-per-owner
     + cap hits; launch free at 10 now, turn paid on once conversion data exists.
   - **Update JSON-LD when paid launches** — `site/index.html` offers price `0` today; update when live.

## Verify current state next session

```bash
npx wrangler whoami
npx wrangler d1 execute jotmodel --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
npx wrangler pages deployment list --project-name jotmodel-app | grep Production | head -1
clerk deploy status                       # expect dns/ssl/mail complete
curl -s -o /dev/null -w "%{http_code}\n" https://jotmodel.com https://app.jotmodel.com
curl -s -o /dev/null -w "%{http_code}\n" https://api.jotmodel.com/api/boards   # 401 = healthy
gh run list --limit 3                      # CI history
npm run typecheck && npm test && npm run build
```

## Pointers

- Plan: `~/.claude/plans/plan-and-implement-to-precious-phoenix.md`
- Agent memory: `~/.claude/projects/-Users-emiliolopez-Projects-jotmodel/memory/` (`go-live-decisions.md`)
- Go-live commits on `main`: `cf35fb4..` (spine → worker → infra/CI/tests → marketing → presence/share/read-only → copy/runbook → provisioning fixes → CI Pages-only).
