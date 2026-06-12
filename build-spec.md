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
- **Relate:** drag from an entity's edge — the **whole card border is the relate handle** (a dot
  tracks your pointer along the border to mark where the line will spring from) → dashed line follows
  the cursor → drop on empty canvas
  = new related table; drop on an existing table = connect. A table made by dropping on empty canvas
  opens with its **name focused** (type to replace `new_table`); committing the name jumps to its
  field input — the same name→fields flow as click-create. (Click-create's name box focuses on open
  via `preventDefault` on the canvas mousedown, so the input isn't blurred on mouseup.)
- **Move:** drag the entity header. **Color-code:** click the header dot → assign a `--sem` hue
  (left bar + faint header tint). Relationship lines are neutral (`--jm-rel`), never colored.

## Components & required states

Build every state listed. A state not listed = stop and ask.

- **Entity card:** default · hover · selected (signal ring) · dragging · color-coded (per `--sem`)
  · field-focused · renaming (inline) · empty. Header = name + color dot + relate handle (hover)
  + delete `×` (hover, far corner).
- **Field row:** default · pk (weight, neutral badge) · fk · editing · renaming · hover delete `×`
  · **type badge** (click / focus+Enter to change the type — see *Interaction decisions*). Badge
  always neutral, even while interactive (focus ring is `--jm-signal`, fill stays neutral).
- **Name / field input:** focused (signal ring) · placeholder · duplicate-name → ask, don't guess.
- **Relationship:** default neutral · hover/selected (signal) · dragging (dashed) · cardinality
  **1:1 / 1:N / N:M** (single bar = "one", crow's-foot = "many"). Routing is **orientation-aware**:
  a line leaves the **nearest edges** — sides when the tables sit side-by-side, top/bottom when
  stacked — and curves out perpendicular to each edge. Multiple links to the same pair **fan apart**
  along that edge (band-fit so they never collapse onto the corner). Each link's annotations sit on
  a **single lane on its own line**, with a canvas-coloured plate masking the line so it reads
  `── 1:N as client ──`; when selected, that lane shows `1:N` (cardinality) · the `as …` field · the
  `×` delete. Endpoints (shown when selected) are **drag-to-reroute** handles only. Self-loop = arc
  on one edge. When the two tables are too close for the inline controls, they temporarily make room
  (see *Interaction decisions*).
- **Buttons:** primary (`--jm-signal`) · ghost (hairline) · disabled.
- **Canvas:** dot grid, light + dark.
- **Presence cursors (multiplayer):** the ONE sanctioned extra color — per-user identity colors on
  cursors/avatars only, never on content or chrome. Distinct from both color layers.

## Interaction decisions (the resolved gestures)

Each obeys the laws and pairs a mouse path with a keyboard path. Unifying idea: **the control sits
on the thing it changes** — no menus, no drawers.

- **Change cardinality (1:1 / 1:N / N:M).** Select the line, then **click its `1:N` label** to cycle
  1:1 → 1:N → N:M; the label is on the selected control lane and updates live. *Keyboard:* select
  line → `1`/`N` sets the focused end, `Space` toggles. *(History: the endpoints once toggled each
  end, but that fought the role field and overlapped the delete — cardinality is the label only,
  endpoints are reroute-only. Don't move cardinality back onto the endpoints.)*
- **Relate from the table edge.** The relate-drag starts from **anywhere on the card's border**, not
  just a dot — left/right/bottom edge strips all arm the same drag, and **the relate dot follows the
  pointer**, snapping to the nearest of those edges so the connector is always under the mouse (it
  hides over the header). The strips sit *below* the header (header stays drag-to-move) and field rows keep their
  `as <field>` relate. Like a field-drag, it's a **pending** drag: a press that doesn't pass the
  ~5px threshold just selects the table; passing it draws the dashed line. *(Chosen over the single
  13px hover dot, which forced you to hunt for the connector.)*
- **Multiple relationships / roles ("as").** **Drag from the field row** → the link takes that
  field's word (`as sender`); a second from `recipient` draws a parallel offset line `as
  recipient`. From the table edge instead → a small pre-filled, editable midpoint label. *Keyboard:*
  select line → type the role into the label.
- **Self-relationship.** The relate drag may **drop on its own table** → a self-loop arc with a
  role label (e.g. `as manager`). Same gesture, target = source.
- **Re-route.** **Drag a relationship endpoint** onto a different table/field to rebind that end;
  drop in empty space snaps back (cancel). The endpoint is **drag-only** (no click action).
  *Keyboard:* delete, then redraw.
- **Delete a relationship.** Select the line → `Delete`/`Backspace`; mouse-only gets the `×` on the
  selected control lane (right of the `as …` field). Undo restores.
- **Rename an entity or field.** **Double-click the name** → edit in place → `Enter` commits,
  `Esc` cancels, `Tab` jumps to the next field. *Keyboard:* select → `Enter`/`F2`.
- **Delete an entity or field.** Select → `Delete`; hover gives a far-corner `×` (entity) or
  row-end `×` (field). Deleting an entity removes its relationships. Undo restores — **no confirm
  dialog** (modals are friction).
- **Change a field's type (override inference).** **Click the type badge** to cycle the types
  (`string → text → number → boolean → date → timestamp → email → pk → fk`); **⇧-click reverses**.
  *Keyboard:* focus the badge → `Enter`/`Space` (`⇧` reverses). A hand-set type is remembered (a
  `typed` flag), so **renaming the field no longer re-infers over it**; untouched fields still infer.
  This is the concrete answer to inference being "always overridable."
- **Make room for relationship controls.** When a selected relationship's two tables sit too close
  for the inline `1:N · as … · ×` controls to fit, **both tables glide apart symmetrically** to open
  the gap, and **glide back** on deselect. **Visual only** — saved positions and undo history are
  untouched. The glide is driven by a **timer, not `requestAnimationFrame`** (rAF pauses on hidden
  tabs, which would leave the room un-made). *(Chosen over floating the controls off the line — the
  user preferred moving the tables.)*
- **Marquee (drag-select).** **Press empty canvas and drag** → a signal-coloured rectangle follows
  the cursor; on release, every entity it overlaps and every relationship whose line it crosses
  becomes selected. A press that **releases without moving** still opens the create name box — the
  click-create flow is unchanged, it just fires on mouse-up once we know it wasn't a drag (≤5px =
  click, >5px = marquee). The selected **group moves together** (drag any member's header) and
  **deletes together** (`Delete`/`Backspace`); the group stays selected after a move. Pressing a
  member keeps the group so a drag moves it all, but a **plain click on a member collapses** the
  selection to just that card (Figma-style). *Keyboard:* `⌘/Ctrl-A` selects all · `Esc` clears ·
  `Delete` removes the group. *(Selection is multi: `selected = {entities, rels}`; a single active
  selection — the one that still shows inline rel controls / rename-on-Enter — exists only when
  exactly one thing is selected, so a multi-marquee shows highlight without per-item controls.)*
