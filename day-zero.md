# JotModel — Day Zero Checklist

Phase 1 has **no backend**, so almost nothing here blocks building. Most of this is cheap
insurance (claiming names), not infrastructure you need yet.

## Today — the only things that actually block building
- [ ] **Register `jotmodel.com`** — grab it before anything else. Use **Cloudflare Registrar**
      (wholesale price, no markup, free WHOIS privacy; keeps DNS with the rest of the stack).
- [ ] **Cloudflare account** (free) — home for Phase 1 hosting (Pages) and everything later
      (Workers, Durable Objects, D1, R2). One vendor, one bill.
- [ ] **GitHub** — create the repo/org `jotmodel` (private to start).
- [ ] **Local toolchain** — Node LTS + `pnpm` (or npm). That's all you need to scaffold.

## Cheap insurance — claim now, mostly free
- [ ] **Cloudflare Email Routing** (free) → forward `hello@` / `founder@jotmodel.com` to your inbox.
      No paid mailbox needed.
- [ ] **Handles**: GitHub org, X `@jotmodel`, Bluesky, and the **npm org** `jotmodel` (you'll likely
      publish the design tokens). LinkedIn page / Product Hunt can wait for launch.
- [ ] **Defensive TLDs** — only if budget-comfortable: `jotmodel.io` / `.app`. The `.com` is the
      one that matters; don't overspend.

## This week — still free, Phase 1 polish
- [ ] Connect the repo to **Cloudflare Pages** (auto-deploy on every push).
- [ ] **Cloudflare Web Analytics** (free, privacy-friendly, no cookie banner).
- [ ] Every credential in a **password manager**; enable **2FA** as you create each account.

## Defer — don't create these yet (and the trigger)
- **Auth** (Clerk or Better Auth) → Phase 2, when you add accounts.
- **Workers Paid ($5/mo)** + **D1** + **R2** + **Durable Objects** → Phase 2–3 (cloud save / realtime).
- **Stripe** → when you actually charge.
- **Sentry / PostHog** (errors / product analytics) → optional, once you have users.

## Take seriously
Your **registrar, Cloudflare, and GitHub** are the crown jewels. 2FA on all three; store recovery
codes in the password manager. A hijacked registrar is about the only item here that's genuinely
hard to undo.

**Net cost to stand up Day Zero: a domain (~$10/yr). Nothing else.**
