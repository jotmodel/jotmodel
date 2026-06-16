# JotModel — Build Contract (always loaded)

Supreme law for any agent (Claude Code or Claude Design) building JotModel UI. Two rules above
all: **when a decision isn't covered, stop and ask; when you see friction, propose — never
improvise.**

This file holds only what must steer **every** session. Implementation detail — the create-flow,
gesture mechanics, component states, resolved interactions — lives in **`build-spec.md`**, read
**only when building or changing those areas**, not every session. Sources of truth: `tokens.css`
(the palette) and `jotmodel-design-system.html` (visual + interaction reference).

JotModel is a fast, fit-to-purpose whiteboard for data-modeling conversations. The differentiator
is the **input model** — type an entity, drag a relationship, the model just appears; the tool
gets out of the room's way.

**Audience:** the people in the room — PMs, BAs, and domain experts as much as engineers. The tool
reads **natural language**; it never requires conventions, syntax, or code. Users type "sender",
"amount", "order date", "active?" — not `sender_id`/`is_active`. Snake_case supported, never assumed.

## The laws (non-negotiable)

1. **Chrome is quiet; color means the user said so.** Neutrals carry the UI; one accent
   (`--jm-signal`) is for interaction only. The app never decorates with color.
2. **Two color layers, never mixed.** `--jm-signal*` only on chrome you click; `--sem-*` only as
   fills on objects the user made. Never cross them.
3. **Type-first, mouse-equal.** Every action works from the keyboard and from direct manipulation.
4. **No galleries, no drawers.** Structure is entered inline; a control sits on the thing it changes.
5. **Loose in the room, strict underneath.** Untyped fields are fine; the model still exports
   clean DBML / dbt / SQL.
6. **Light and dark are equals.** Every token has both; always declare `color-scheme`. Logo is
   monochrome.
7. **`tokens.css` is the only palette.** No color/size literal in a component — raw hex lives only
   there. Type: Inter = UI, JetBrains Mono = data, Space Grotesk = the wordmark **and** the
   create-flow name box (the canvas's one branded typographic moment) — nowhere else.

## Proposing interactions (encouraged)

Propose new gestures/shortcuts when they remove friction and obey the laws — but
**propose-and-confirm, never silent.** Show your reasoning on: **natural motion** (control on the
thing it changes) · **ergonomics** (mouse + trackpad, generous targets, no chords) · **first-try
learnability** ("obvious in hindsight") · **reversibility** (easy undo, hard to mis-trigger) ·
**keyboard parity**. Present: friction removed · the motion · those five · a fallback. Then wait.

## Screens

Only the **board / canvas** is designed (see the reference). For any other screen — top bar, home,
share/export, auth, settings, billing, empty/loading/error, marketing — scaffold with tokens +
existing primitives and **flag for design review**. Don't invent final visuals.

## Done check (run before declaring any UI task complete)

- [ ] No color literal outside `tokens.css`; no color on content except user `--sem-*`.
- [ ] No `--sem-*` on chrome; no `--jm-signal` on content fills.
- [ ] Every mouse action has a keyboard path.
- [ ] No gallery / no drawer added.
- [ ] Light + dark verified; `color-scheme` declared; logo monochrome; Space Grotesk only in wordmark.
- [ ] Any new or changed **interaction** was proposed to and approved by the human.

## Escalation

If a decision is uncovered, or a rule seems to force bad UX: stop, state the conflict, offer 2–3
options + a recommendation, wait. Silence-and-improvise is the one thing never allowed.
