# JotModel — Marketing Strategy

_Generated 2026-06-19 from a research workflow (competitor + pricing teardown, ICP, niche differentiation, freemium pricing, messaging, landing-page structure → synthesis). This is the **direction proposal**; the live marketing site is unchanged pending sign-off. Per CLAUDE.md, new non-canvas sections (pricing, FAQ, personas, trust bar) and any in-app upgrade UI are scaffold + **design-review**, not final visuals._

## Positioning

**One-liner:** JotModel is the collaborative data-modeling tool the whole room can use: PMs, analysts, and engineers design the data model together in plain English, and it exports production-clean DBML, dbt, and SQL — no syntax in the room, no cleanup pass after it.

**Category to own:** Collaborative data modeling (the conceptual-to-physical modeling tool a mixed room can use together) — a new middle between engineer-only ERD editors and model-less diagramming whiteboards.

**Competitive summary:** JotModel sits in an empty intersection no competitor occupies: plain-English input as persistent editable primitives + mixed-role real-time multiplayer + clean compile-to-schema. Engineer-first ERD tools (dbdiagram, drawSQL, Azimutt, ChartDB, SqlDBM, Vertabelo, erwin, Mermaid) exclude non-engineers by requiring syntax; whiteboards (Miro, Lucidchart, Whimsical, Excalidraw, Eraser) include everyone but produce a dead, model-less artifact; AI entrants treat English as a throwaway prompt that emits code. The marketing wedge is therefore 'the data-modeling tool the whole room can use' — the one thing both camps structurally cannot say — backed by a transparent, generous, board-count freemium that pointedly inverts the field's anti-patterns (free=public, free-can't-save, opaque sales-led pricing, stingy 3-board caps).

## The wedge (differentiation)

- Plain-English input as the on-ramp: type 'order date', 'amount', 'active?' (never order_date/is_active) and the model appears with gentle, always-overridable type inference — so a PM or BA can LEAD the modeling session, not spectate. This is the one claim no syntax-bound competitor can make.
- Loose in the room, strict underneath: untyped plain-English fields are first-class during the conversation, yet the same model exports clean DBML, dbt (schema.yml + stubs), and SQL DDL (Postgres/MySQL/SQL Server) with no cleanup pass. Whiteboards can't export real schema; ERD tools can't stay loose.
- Mixed-role real-time multiplayer over a REAL model object — presence cursors, share-by-link, live co-editing of an authoritative schema, not a picture of one. drawSQL/ChartDB lock multiplayer behind $59/mo; whiteboards have collaboration but no model underneath.
- Local-first (CRDT + IndexedDB): instant load, works offline, your boards live on your machine first, sync when you want — a felt speed/ownership advantage cloud-only incumbents structurally cannot match.
- Generous, transparent, no-entry-barrier freemium gated on board COUNT, not on the magic: private boards free, collaboration free, export free — the inverse of the incumbent norm of paywalled private boards and metered AI credits.
- Interoperate, don't fight: DBML/dbt/SQL export (and Mermaid-friendly) make JotModel the welcoming front-of-funnel that FEEDS dbdiagram/DBeaver/dbt rather than a rip-and-replace — lowering adoption risk and turning incumbents into export targets.

## Who it's for (ICP)

- **Product Manager / Business Analyst (champion)** — Most sidelined by today's tools and most relieved by plain-English input. They can finally drive the modeling session — pin down entities/relationships before the PRD — and hand engineering a real model instead of a stale Miro screenshot. They bring the tool into a session; the no-barrier free tier lets them adopt without procurement.
- **Domain expert / Solutions or Domain Architect (champion in enterprise / user)** — Can describe the business fluently but freeze in front of any tool that demands syntax. JotModel reads their own words, so elicitation becomes genuine participation instead of a BA transcribing — and the conceptual model carries 'strict underneath' into implementation instead of being redone.
- **Analytics Engineer / dbt practitioner (technical co-champion)** — Can model WITH non-technical stakeholders in real time, then walk away with real dbt output (schema.yml + stubs) plus DBML/SQL. Collapses the 'align in one tool, rebuild in another' two-tool tax into one artifact, and validates the export is trustworthy.
- **Engineering Lead / Backend or Founding Engineer (buyer + blocker/approver)** — Freed from sole-scribe duty while still getting rigorous output: clean DBML and SQL DDL across Postgres/MySQL/SQL Server, type-first with full keyboard parity, local-first and instant. If export fidelity isn't clean, they veto — so 'strict underneath' is buying-critical, not nice-to-have.

## Messaging pillars

- **Everyone in the room can model — not just the engineer** — The PM, analyst, and domain expert shape the model live in their own words instead of watching one person type, so the model reflects the whole room and decisions get made with the people who know the business rules.
  - _proof:_ Plain-English input ('order date', 'amount', 'active?') with no syntax or conventions; type an entity, drag a relationship, and it appears; gentle, always-overridable type inference.
- **A model everyone can shape, together** — Modeling stops being a one-keyboard activity — anyone can add an entity, rename a field, or draw a relationship at the same time, from anywhere, so remote sessions feel like standing at one whiteboard.
  - _proof:_ Real-time multiplayer with named presence cursors; share-by-link with viewer/editor roles; cloud save; local-first instant load.
- **Hand off clean to engineering** — The session ends with something engineering can ship from, not a whiteboard photo to re-key. Fields stay loose while you talk; the moment you need artifacts, the model exports clean with no cleanup pass.
  - _proof:_ 'Loose in the room, strict underneath'; exports DBML, dbt (schema.yml + model stubs), SQL DDL for Postgres/MySQL/SQL Server; no cleanup pass required.
- **Gets out of the room's way** — The tool never becomes the meeting — it loads with no spinner, works offline even on conference-room wifi, and the controls sit on the thing they change, so attention stays on the data.
  - _proof:_ Local-first (instant, offline-capable, cloud sync when wanted); direct-manipulation canvas with full keyboard parity; no galleries, no drawers; first-class light and dark.
- **Free to start, no barrier** — Open it and model — no signup wall, no trial clock, no credit card. Your boards are yours from the first second; you only think about an account when you want to bring others in.
  - _proof:_ Free forever for 10 boards with the full app — input model, exports, and real-time collaboration all included; accounts optional until you save to the cloud or share.

## Hero

- **Headline:** Turn the conversation into a data model — while you're still in the room
- **Subhead:** Type what you mean — 'order date', 'amount', 'active?' — and the model appears. No syntax, no conventions, no code. PMs, analysts, and engineers shape it together, then it exports clean DBML, dbt, and SQL.
- **Primary CTA:** Start free  ·  **Secondary:** See how it works

## Proposed site structure (replaces the current too-technical layout)

### 1. Hero — “Turn the conversation into a data model — while you're still in the room”
Lead with the OUTCOME (a shared, agreed model produced in the meeting), name the audience in the subhead so non-engineers self-identify ('PMs, analysts, and engineers'). Keep the live mini-canvas demo (it IS the proof) but caption it with a benefit. One dominant primary CTA 'Start free' with friction-killer microcopy beside it: 'Free forever for 10 boards · no credit card · works offline'. Demote 'See how it works' to a quiet ghost/anchor link. Do NOT lead with light/dark or canvas mechanics. Keep 'Type it. Drag it. It's a model.' only as a small tagline beneath, not the H1.

### 2. Trust / proof bar — “Built for the people in the room — not just the people who write SQL”
NEW section — the biggest current gap (zero social proof). Until real named testimonials/logos exist, scaffold with honest substitutes only: an export-format trust row ('Exports to DBML · dbt · PostgreSQL · MySQL · SQL Server'), a 'works with your stack' line, and 'Local-first — your data stays on your machine'. FLAG: testimonial/logo slots are placeholders; do NOT fabricate. Founder should collect 2-3 named quotes pre-launch, at least one from a non-engineer (a PM/BA voice proves the plain-English claim).

### 3. Who it's for (personas) — “Everyone in the meeting can model now — not just the engineers”
Three persona cards/tabs, each one-line pain→outcome. (1) PMs & business analysts: 'Map the domain in plain English; hand engineering a clean model, not a Google Doc.' (2) Engineers & data folks: 'Skip the cleanup — loose notes export as real DBML, dbt, and SQL.' (3) Domain experts: 'Describe how your business actually works; watch it become a model you can correct live.' Reinforce the core promise in each: you type 'order date', 'active?', 'amount' — never order_date/is_active.

### 4. How it works (3 steps) — “Type an entity. Drag to relate. Done.”
Exactly three steps, each one line with a small visual: (1) Type an entity in plain English. (2) Types infer themselves — keep the compact 'you type → JotModel reads' table (order date→date, active?→boolean), trim the snake_case note to one short line. (3) Drag to relate — the relationship draws itself. Repeat the primary CTA at the end. No fourth step, no galleries (honors the product's own 'no galleries, no drawers' law).

### 5. Hand off clean (export proof) — “A whiteboard on top. Production-clean DBML, dbt, and SQL underneath.”
Keep the existing DBML code card — it's strong proof. Show the transformation literally: loose plain-English fields left → clean DBML/SQL right. List targets as benefits: DBML (portable, dbdiagram-ready), dbt (schema.yml + model stubs), SQL DDL (Postgres/MySQL/SQL Server). Add the objection-killer: 'No cleanup pass. The messy notes ARE the model.' This is the engineer-trust block and is SEO-load-bearing (export ERD to SQL, DBML, dbt, dialect keywords).

### 6. Model together (collaboration) — “Model together, live — the whole room on one board”
Reframe technical features as team outcomes: local-first → 'Loads instantly, works offline — even on conference-room wifi.' Cloud save + share-by-link → 'Send a link; the whole room sees the same model.' Live multiplayer + presence → 'Model together in real time — see where everyone's pointing.' Keep the presence-cursor demo. Tie back to audience: collaboration is what lets mixed roles co-create instead of one person transcribing.

### 7. Pricing — “Free for 10 boards. Generous on purpose.”
NEW section (founder requirement) — inline on the landing page, not a buried page. Free tier is the hero of the block: 10 boards, the full app (input model, exports, real-time collaboration all free), private boards free, no credit card. CTA 'Start free' with 'No credit card' beside it. Show Pro ($10/mo, or $8/mo annual — unlimited boards) and Team ($16/seat) with real prices but marked 'Coming soon' (no billing exists yet). Enterprise = 'Contact us'. Per CLAUDE.md this is a non-canvas screen → scaffold with tokens + existing primitives and FLAG FOR DESIGN REVIEW; do not finalize visuals.

### 8. FAQ — “Questions, answered”
NEW section + FAQPage JSON-LD (site already has SoftwareApplication schema). Lead with trust/differentiator: 'Do I need to know SQL?' (No — plain English, inferred types, override anything), 'I'm a PM/BA, can I use this?' (Yes — that's exactly who it's for), 'Does it really export clean schema?' (Yes — DBML/dbt/SQL, no cleanup). Then logistics: pricing (free for 10 boards; paid coming soon), accounts (email+password today, OAuth pending — state honestly), offline (yes, local-first), data ownership (local-first, cloud opt-in), real-time collaboration (yes). Answer import honestly only if confirmed; otherwise omit rather than fabricate.

### 9. Final CTA — “Have the conversation. Leave with the model. Start free.”
One outcome headline, one primary CTA 'Start free', same friction-killer microcopy ('Free forever for 10 boards · no credit card'). No competing links. Optionally echo 'No SQL required.' Should feel like the close of the story, not a verbatim repeat of the hero. Demote the old 'Type it. Drag it.' restatement to a small tagline.

## Pricing — freemium, gated on board count

Freemium, gated on number of boards. The entire create→model→export→collaborate loop is free forever; paid tiers lift the board cap and add comfort/control/scale features around the loop. No entry barrier: no signup wall for local boards, no trial clock, no credit card, private boards free. Anti-patterns explicitly avoided: never 'free=public' (drawSQL), never 'free can't save' (Azimutt), never gating export or the core 'aha', never AI-credit metering on the core motion.

### Free — $0 forever (10 boards)
- The full input model: plain-English entities, type inference, drag-to-relate — the differentiator, never gated
- All export formats: DBML, dbt (schema.yml + stubs), SQL DDL (Postgres/MySQL/SQL Server)
- Local-first + full offline use; no account required for purely-local boards
- Up to 10 cloud-saved, private boards with cross-device sync (free email account)
- Real-time multiplayer + presence cursors and share-by-link (viewer/editor) on free boards
- Light/dark and all UI — never a paid feature
- Basic version history (last 7 days)

### Paid tiers (publish prices now, mark **Coming soon** — no billing yet)

| Tier | Monthly | Annual | Limits | For |
|---|---|---|---|---|
| **Pro** | $10/mo | $8/mo billed annually ($96/yr, ~20% off) | Unlimited boards, single user | The individual power user who outgrew 10 boards — the BA/PM/engineer who models regularly, the consultant juggling many client schemas. Priced dead-center of the solo whiteboard/ERD WTP cluster ($8 dbdiagram annual, $10 Whimsical, ~$8 Lucidchart/Miro Starter) for a frictionless yes. |
| **Team** | $16/user/mo | $13/user/mo billed annually ($156/user/yr) | Unlimited boards, per-seat, ~2-3 seat minimum | Squads and data teams modeling together — shared workspace, governed collaboration, the 'we standardized on this' buyer. Anchored to Miro Business ($16), far below drawSQL Growth ($59 for 5). |
| **Enterprise** | Custom (contact us) | Custom annual contract | Unlimited everything, volume seats | Larger orgs with security/procurement requirements; where SSO/compliance and high-ACV revenue live. |

**Pro features:** Unlimited boards; Unlimited / extended version history (vs 7-day free); Private share links with access control — expiry, password, view-only vs edit (share_links already supports role + expires_at); Larger multiplayer rooms and unlimited guests on your boards; Folders / organization for managing many boards; Priority email support
**Team features:** Everything in Pro, per seat; Shared team workspace with shared boards and a centralized board library; Roles & permissions: admin/editor/viewer (members table already has owner/editor/viewer); Centralized billing and member management; Higher multiplayer / guest limits for big-room sessions; Audit of board changes; Priority support
**Enterprise features:** SSO / SAML and SCIM provisioning — the canonical enterprise gate; never put SSO below this tier; Advanced security & admin (domain capture, enforced sharing restrictions, data residency where applicable); Audit logs / compliance; Dedicated support / SLA and onboarding; Volume pricing

**Gating rationale:** Board count is the right value metric — it scales directly with how embedded the tool is and is the cleanest, most honest lever for a board tool. Free cap is 10, NOT 3: it out-generouses the entire whiteboard cohort (Miro/Whimsical/Lucidchart/Eraser all cap free at 3 and users resent it), matches the closest direct analog (dbdiagram = 10), and creates the upgrade moment AFTER real adoption ('I live here now') rather than during evaluation ('I just got started'). Never gate the 'aha' (input model) or export — they are the acquisition wedge and the proof; let them SELL the upgrade, not BE it. Multiplayer EXISTENCE stays free (it is the viral loop — every shared board is an invite); only multiplayer SCALE (room size, guest limits, managed access) and privacy/control (private link expiry/password) are paid — the highest-value, lowest-resentment upsell. SSO/SAML stays at Enterprise so small teams aren't SSO-taxed. Honesty constraint resolved: real prices are published on the site to satisfy the founder's mandate and set the anchor, but paid tiers are marked 'Coming soon' because no billing exists yet — launch free at 10 boards now, instrument the wall, turn paid on once conversion data exists. Per CLAUDE.md the pricing page and any in-app upgrade UI are undesigned non-canvas screens → scaffold with tokens + primitives and flag for design review; surface the wall gracefully (at board #11: 'archive an old board or go unlimited').

## Open questions / decisions needed

- Free real-time multiplayer is infra-costly (direct competitors gate it at $59/mo). Confirm the cost model is sustainable before making 'free multiplayer' a loud headline claim; gate SCALE not existence as the hedge. (CLAUDE.md escalation flag.)
- No billing/entitlement code exists today — paid tiers must ship marked 'Coming soon' with real prices, not as live plans. Recommend launching free at 10 boards, instrumenting the wall, and turning paid on once conversion data exists.
- 'Natural language' now connotes AI/LLM BI tools (camelAI, Power BI Copilot) in 2026. All buyer-facing copy must say 'plain English / plain language' — JotModel's inference is deterministic over field names during DESIGN, not an AI query over data. Avoid being miscategorized as an AI-query tool.
- Social proof must not be fabricated. Testimonial/logo slots are placeholders until real named quotes exist; founder should collect 2-3 pre-launch, at least one from a non-engineer to prove the plain-English claim.
- Whether schema IMPORT exists is unconfirmed. Competitors lead with SQL/DB import, so it will be asked in the FAQ — answer honestly or omit; do not fabricate the capability.
- Account/OAuth status: email+password today, OAuth pending — state accurately on the site and in the FAQ.
- All new sections (pricing, FAQ, personas, trust bar) and in-app upgrade UI are non-canvas screens per CLAUDE.md — scaffold with tokens.css + existing primitives and FLAG FOR DESIGN REVIEW; do not invent final visuals. Marketing-site changes here are copy/IA + scaffold only.
- Confirm exact free board cap (recommended 10), Team seat minimum, and whether to expose Enterprise publicly before any deals exist.
- Verify current competitor prices (esp. quote-only SqlDBM/erwin and dbdiagram's exact free cap) before publishing comparison numbers on the site.

## Paid-plan setup tasks (captured in OPERATIONS.md too)

- **Add a billing provider (Stripe)** — Integrate Stripe Checkout + Customer Portal + webhooks via the Cloudflare Worker. Store customer/subscription ids in D1 (new columns/table; none exist today). Handle subscription lifecycle events (created/updated/canceled/past_due) idempotently. Use Stripe test mode behind a flag until launch.
- **Model plans & entitlements in D1** — Add a plan dimension keyed to the owner (e.g. users.plan or a subscriptions table) with effective entitlements: board_limit (10 for free, null/unlimited for paid), history_window_days (7 vs unlimited), private_link_controls (bool), multiplayer_room_cap, guest_cap. Make entitlements a single resolved function the worker and app both call — never scatter limit literals.
- **Enforce the board-count limit server-side** — On board create, count owner's boards (idx_boards_owner already exists) against the resolved board_limit; reject create over the cap with a structured 'limit reached' response. Enforce in the worker, not just the client — the client check is UX, the server check is the gate. Recommend: existing boards stay editable, new creates blocked with an 'archive or upgrade' path.
- **Build the upgrade / limit-reached UI (flag for design review)** — In-app: a graceful board #11 prompt ('archive an old board or go unlimited') and inline Pro affordances on gated controls (private link expiry/password) — per CLAUDE.md law 4, a control sits on the thing it changes. Scaffold with tokens + existing primitives; this is an undesigned non-canvas screen → FLAG FOR DESIGN REVIEW, no final visuals without sign-off.
- **Team workspace, roles & seat management** — Extend the existing members table (owner/editor/viewer already present) into a team/workspace concept: shared board library, admin role, seat counting tied to billing quantity, centralized member invite/remove. Add per-seat proration via Stripe.
- **Private share-link controls (Pro gate)** — share_links already has role + expires_at; add password/hash and view-only enforcement, and gate setting expiry/password behind the Pro entitlement. Enforce expiry server-side on token resolution.
- **Multiplayer scale gating** — Cap concurrent participants / guest count per board by entitlement at the realtime/CRDT layer (free = small room, Pro/Team = larger). Keep real-time existence free; only scale is gated. Confirm the cost model is sustainable before marketing 'free multiplayer' loudly (flagged pricing-design decision).
- **Version-history retention by plan** — Enforce a 7-day snapshot retention window on free and unlimited/extended on paid (snapshot_ref in boards points to R2; add a retention/prune job keyed to the owner's entitlement).
- **Enterprise: SSO/SAML + audit logs** — Defer to an Enterprise milestone: SAML/SCIM via Clerk's enterprise features (already on Clerk), audit log table, enforced sharing restrictions. Keep entirely out of lower tiers.
- **Update marketing JSON-LD when paid launches** — site/index.html currently advertises offers price '0' (lines 65-69). Keep it 0 while only free exists; when paid ships, update the SoftwareApplication offers to reflect free + paid tiers and remove 'coming soon' labels from the pricing section.
- **Instrument the board-limit wall before pricing day** — Add analytics on board create attempts, boards-per-owner distribution, and hits against the 10-board cap. Launch free at 10 now, watch where users actually hit the wall, and turn on paid once there is conversion data — rather than pricing on day one.
