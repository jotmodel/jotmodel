# JotModel — Build Spec (reference)

Read this **only when building or changing** the canvas, its interactions, or components — then
the code is the source of truth and you don't need it again. The always-on rules live in
`CLAUDE.md`; the palette is `tokens.css`; the visual + interaction reference is
`jotmodel-design-system.html`. Everything here still obeys the laws in `CLAUDE.md`.

## Tokens (source of truth: `tokens.css`)

- **Surfaces / neutrals:** `--jm-bg`, `--jm-canvas`, `--jm-surface`, `--jm-surface-2`,
  `--jm-line`, `--jm-line-2`, `--jm-text`, `--jm-text-mid`, `--jm-text-dim`, `--jm-rel`.
- **The one accent:** `--jm-signal`, `--jm-signal-weak`, `--jm-signal-text`. Interaction only.
- **Semantic palette (user color-coding):** `--sem-slate|cyan|teal|green|amber|orange|rose|violet`.
  **No plain blue** — blue is reserved for the interface.
- **Type:** `--jm-ui` = Inter (UI + headings) · `--jm-display` = Space Grotesk (**wordmark only**)
  · `--jm-mono` = JetBrains Mono (fields, types, code).
- **Space:** `--jm-1`…`--jm-16` (4px base). **Radius:** `--jm-r-sm|md|card|lg|pill`.
  **Motion:** `--jm-dur-fast|dur`, `--jm-ease`; entities pop in; feedback under ~200ms.
- Metadata (`pk`, `fk`, `timestamp`) is shown with **type and weight, never color** — badges stay
  neutral so color stays the user's.

## Canonical interaction (the create-flow — do not redesign)

- **Create:** click empty canvas → focused name input → `Enter` → entity appears focused → type
  comma-separated fields → `Enter` → rows added → empty `Enter` finishes.
- **Type inference — gentle, optional, never required.** Read *natural* cues only where confident:
  "email"→email, "phone"→text, "date"/"when"/"… date"→date, "amount/price/total/cost/quantity/
  number of"→number, "paid?/active/done/yes-no"→boolean, a word matching another table→a
  relationship. Otherwise **leave it a plain field** — never force a guess, demand a convention,
  or make anyone rename to be understood. Always overridable; the model works fully untyped.
- **Relate:** drag an entity's edge handle → dashed line follows the cursor → drop on empty canvas
  = new related table; drop on an existing table = connect.
- **Move:** drag the entity header. **Color-code:** click the header dot → assign a `--sem` hue
  (left bar + faint header tint). Relationship lines are neutral (`--jm-rel`), never colored.

## Components & required states

Build every state listed. A state not listed = stop and ask.

- **Entity card:** default · hover · selected (signal ring) · dragging · color-coded (per `--sem`)
  · field-focused · renaming (inline) · empty. Header = name + color dot + relate handle (hover)
  + delete `×` (hover, far corner).
- **Field row:** default · pk (weight, neutral badge) · fk · editing · renaming · hover delete `×`.
  Badge always neutral.
- **Name / field input:** focused (signal ring) · placeholder · duplicate-name → ask, don't guess.
- **Relationship:** default neutral · hover/selected (signal) · dragging (dashed) · cardinality
  **1:1 / 1:N / N:M** (single bar = "one", crow's-foot = "many") + midpoint `1:N` label · role
  label `as …` · parallel offset when >1 to the same pair · self-loop · endpoints draggable
  (re-route) · midpoint `×` (delete).
- **Buttons:** primary (`--jm-signal`) · ghost (hairline) · disabled.
- **Canvas:** dot grid, light + dark.
- **Presence cursors (multiplayer):** the ONE sanctioned extra color — per-user identity colors on
  cursors/avatars only, never on content or chrome. Distinct from both color layers.

## Interaction decisions (the resolved gestures)

Each obeys the laws and pairs a mouse path with a keyboard path. Unifying idea: **the control sits
on the thing it changes** — no menus, no drawers.

- **Change cardinality (1:1 / 1:N / N:M).** The endpoint *is* the control: hover the line, **click
  an end** to toggle one (bar) ↔ many (crow's-foot); independent ends give all four states;
  midpoint reads `1:N`. *Keyboard:* select line → `1`/`N` sets the focused end, `Space` toggles.
  *Fallback:* click the `1:N` label to cycle 1:1 → 1:N → N:M.
- **Multiple relationships / roles ("as").** **Drag from the field row** → the link takes that
  field's word (`as sender`); a second from `recipient` draws a parallel offset line `as
  recipient`. From the table edge instead → a small pre-filled, editable midpoint label. *Keyboard:*
  select line → type the role into the label.
- **Self-relationship.** The relate drag may **drop on its own table** → a self-loop arc with a
  role label (e.g. `as manager`). Same gesture, target = source.
- **Re-route.** **Drag a relationship endpoint** onto a different table/field to rebind that end;
  drop in empty space snaps back (cancel). Click vs. drag on the endpoint split by a small drag
  threshold (click = cardinality toggle, drag = re-route). *Keyboard:* delete, then redraw.
- **Delete a relationship.** Select the line → `Delete`/`Backspace`; mouse-only gets a midpoint
  `×` on hover. Undo restores.
- **Rename an entity or field.** **Double-click the name** → edit in place → `Enter` commits,
  `Esc` cancels, `Tab` jumps to the next field. *Keyboard:* select → `Enter`/`F2`.
- **Delete an entity or field.** Select → `Delete`; hover gives a far-corner `×` (entity) or
  row-end `×` (field). Deleting an entity removes its relationships. Undo restores — **no confirm
  dialog** (modals are friction).
