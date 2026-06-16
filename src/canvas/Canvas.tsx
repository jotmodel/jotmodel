import { useEffect, useReducer, useRef } from 'react'
import type { Board, Entity, Relationship, Card } from '../model/board'
import {
  addEntity, addFields, addRelationship, cycleFieldType, deleteEntity, deleteField, deleteRelationship,
  entityNameExists, moveEntity, renameEntity, renameField, setEntityColor, SEM,
  setRelationshipCard, setRelationshipEnd, setRelationshipRole,
} from '../model/board'
import {
  rectOf, fieldAnchor, HEADER_H, ROW_H, BODY_PAD, type Sizes, type Rect,
} from '../model/geom'
import { reducer, initialState, type Pt } from './reducer'
import { EntityCard } from './EntityCard'
import { Relationships } from './Relationships'
import { Presence } from './Presence'
import type { Peer, SelSet } from './usePresence'

interface Hit { entityId: string; fieldId: string | null }

const nextCard = (c: Card): Card => (c === 'one' ? 'many' : 'one')

// ---- marquee geometry (world units) ----
interface Box { x: number; y: number; w: number; h: number }
const boxFrom = (x0: number, y0: number, x1: number, y1: number): Box =>
  ({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) })
const boxesOverlap = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const ptInBox = (px: number, py: number, b: Box) =>
  px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h
// Proper-crossing test for segments AB and CD.
function segCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)
}
// Does segment AB touch box B (endpoint inside, or crossing any edge)?
function segHitsBox(ax: number, ay: number, bx: number, by: number, b: Box) {
  if (ptInBox(ax, ay, b) || ptInBox(bx, by, b)) return true
  const r = b.x + b.w, bot = b.y + b.h
  return segCross(ax, ay, bx, by, b.x, b.y, r, b.y) ||
    segCross(ax, ay, bx, by, r, b.y, r, bot) ||
    segCross(ax, ay, bx, by, r, bot, b.x, bot) ||
    segCross(ax, ay, bx, by, b.x, bot, b.x, b.y)
}

export function Canvas({ board, entities, rels, peers, setCursor, setSelection, readOnly = false }: {
  board: Board; entities: Entity[]; rels: Relationship[]
  peers: Peer[]; setCursor: (c: { x: number; y: number } | null) => void
  setSelection: (s: SelSet) => void; readOnly?: boolean
}) {
  const doc = board.doc
  const stageRef = useRef<HTMLDivElement>(null)
  const [state, dispatch] = useReducer(reducer, initialState)

  // ---- presence (multiplayer) — the hook lives in Board so the top-bar roster shares one feed ----
  const setCursorRef = useRef(setCursor); setCursorRef.current = setCursor
  const lastCursorPub = useRef(0)
  // Latest read-only flag for the once-attached global listeners (mirrors the entitiesRef pattern).
  const readOnlyRef = useRef(readOnly); readOnlyRef.current = readOnly
  // Broadcast our selection to peers whenever it changes (ephemeral — never in the Y.Doc).
  useEffect(() => { setSelection(state.selected) }, [state.selected, setSelection])
  // Peer selections → halo colour per id (first peer to claim an id wins).
  const peerEntityColor = new Map<string, string>()
  const peerRelColor = new Map<string, string>()
  for (const p of peers) {
    for (const id of p.selection.entities) if (!peerEntityColor.has(id)) peerEntityColor.set(id, p.color)
    for (const id of p.selection.rels) if (!peerRelColor.has(id)) peerRelColor.set(id, p.color)
  }

  // Latest values for the once-attached global listeners.
  const stateRef = useRef(state); stateRef.current = state
  const entitiesRef = useRef(entities); entitiesRef.current = entities
  const relsRef = useRef(rels); relsRef.current = rels

  // Measured card sizes (world units) via one shared ResizeObserver.
  const sizesRef = useRef<Sizes>(new Map())
  const elsRef = useRef<Map<string, HTMLElement>>(new Map())
  const roRef = useRef<ResizeObserver | null>(null)
  const [, forceSizes] = useReducer((n: number) => n + 1, 0)

  // Transient UI not worth putting in the reducer.
  const spaceRef = useRef(false)
  const pendingRelate = useRef<{ fromId: string; fromField: string | null; from: Pt; sx: number; sy: number } | null>(null)
  const renameRef = useRef<string | null>(null)
  // Press on a member of a multi-selection: keep the group (so a drag moves it all), but if the
  // pointer is released without dragging, collapse the selection to just that card on mouseup.
  const collapseRef = useRef<{ id: string; sx: number; sy: number } | null>(null)
  // Entity that should focus its field input once its name is committed (relate-create flow).
  const pendingFieldsRef = useRef<string | null>(null)
  // Animated "make room" push: target offsets per entity, plus a 0→1 glide amount.
  const pushRef = useRef<{ offsets: Map<string, { dx: number; dy: number }>; amt: number; target: number; timer: ReturnType<typeof setTimeout> | null }>({ offsets: new Map(), amt: 0, target: 0, timer: null })
  const [, forceUi] = useReducer((n: number) => n + 1, 0)
  const dupRef = useRef<string | null>(null)
  // A relationship that just seated into an entity: its new end glides from the drop point into its
  // routed port (amt 1→0, ease-out) — the "plug" settle. Driven by a timer (rAF pauses on hidden tabs).
  const plugRef = useRef<{ relId: string; end: 'from' | 'to'; drop: Pt; amt: number } | null>(null)
  const plugTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- coordinates ----
  function screenToWorld(clientX: number, clientY: number) {
    const r = stageRef.current!.getBoundingClientRect()
    const sx = clientX - r.left, sy = clientY - r.top
    const { tx, ty, scale } = stateRef.current.view
    return { x: (sx - tx) / scale, y: (sy - ty) / scale, sx, sy }
  }
  function hitTest(clientX: number, clientY: number): Hit | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    const card = el?.closest<HTMLElement>('[data-entity-id]')
    if (!card) return null
    const row = el?.closest<HTMLElement>('[data-field-id]')
    return { entityId: card.dataset.entityId!, fieldId: row?.dataset.fieldId ?? null }
  }
  const entityById = (id: string) => entitiesRef.current.find(e => e.id === id) || null

  // Magnetic capture for a relate/reroute drag: the table whose rect (grown by a capture radius)
  // the pointer is over — so the connector "snatches" onto a port a touch before the cursor lands.
  // The drag's own origin table is *inset* instead, so dragging out across your own card doesn't
  // instantly snap to a self-loop. Topmost (last-drawn) table wins.
  function relateSnapTarget(x: number, y: number, originId: string): Entity | null {
    for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
      const e = entitiesRef.current[i]
      const r = rectOf(e, sizesRef.current)
      const m = e.id === originId ? -8 : 14
      if (x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m) return e
    }
    return null
  }
  // Nearest point on a table's border to the pointer — where the connector seats ("snatches") while
  // hovering a target. Keeps the seat under the pointer (on the rim it crossed), not a far port.
  function edgeSnap(r: Rect, px: number, py: number): Pt {
    const cx = Math.max(r.x, Math.min(r.x + r.w, px))
    const cy = Math.max(r.y, Math.min(r.y + r.h, py))
    const dl = cx - r.x, dr = r.x + r.w - cx, dt = cy - r.y, db = r.y + r.h - cy
    const m = Math.min(dl, dr, dt, db)
    if (m === dl) return { x: r.x, y: cy }
    if (m === dr) return { x: r.x + r.w, y: cy }
    if (m === dt) return { x: cx, y: r.y }
    return { x: cx, y: r.y + r.h }
  }
  // Glide the just-seated end from the drop point toward its routed port (exponential ease-out).
  function plugStep() {
    const p = plugRef.current
    if (!p) return
    p.amt = p.amt < 0.03 ? 0 : p.amt * 0.78
    if (p.amt > 0) plugTimer.current = setTimeout(plugStep, 16)
    else plugRef.current = null
    forceUi()
  }
  // Start the plug settle: the `end` of `relId` slides in from where the pointer let go (`drop`).
  function firePlug(relId: string, end: 'from' | 'to', drop: Pt) {
    if (plugTimer.current) clearTimeout(plugTimer.current)
    plugRef.current = { relId, end, drop, amt: 1 }
    plugTimer.current = setTimeout(plugStep, 16)
    forceUi()
  }

  // Everything the marquee box (world units) touches: entities whose rect it overlaps, and rels
  // whose line it crosses (approximated by the segment between the two tables' centres; a self-loop
  // counts when the box meets its table).
  function marqueeHits(x0: number, y0: number, x1: number, y1: number): { entities: string[]; rels: string[] } {
    const box = boxFrom(x0, y0, x1, y1)
    const entities: string[] = []
    for (const e of entitiesRef.current) {
      const r = rectOf(e, sizesRef.current)
      if (boxesOverlap(box, { x: r.x, y: r.y, w: r.w, h: r.h })) entities.push(e.id)
    }
    const rels: string[] = []
    for (const rel of relsRef.current) {
      const ea = entityById(rel.fromId), eb = entityById(rel.toId)
      if (!ea || !eb) continue
      if (rel.fromId === rel.toId) {
        const r = rectOf(ea, sizesRef.current)
        if (boxesOverlap(box, { x: r.x, y: r.y, w: r.w, h: r.h })) rels.push(rel.id)
        continue
      }
      const ra = rectOf(ea, sizesRef.current), rb = rectOf(eb, sizesRef.current)
      if (segHitsBox(ra.cx, ra.cy, rb.cx, rb.cy, box)) rels.push(rel.id)
    }
    return { entities, rels }
  }

  // ---- measuring (content-sized cards → relationship anchors track real width) ----
  function ensureRO(): ResizeObserver {
    if (!roRef.current) {
      roRef.current = new ResizeObserver(entriesList => {
        let changed = false
        for (const e of entriesList) {
          const el = e.target as HTMLElement
          const id = el.dataset.entityId
          if (id && readSize(id, el)) changed = true
        }
        if (changed) forceSizes()
      })
    }
    return roRef.current
  }
  function measure(id: string, el: HTMLElement | null) {
    const ro = ensureRO()
    const prev = elsRef.current.get(id)
    if (prev && prev !== el) ro.unobserve(prev)
    if (el) { elsRef.current.set(id, el); ro.observe(el); if (readSize(id, el)) forceSizes() }
    else { elsRef.current.delete(id); sizesRef.current.delete(id) }
  }
  function readSize(id: string, el: HTMLElement) {
    const w = el.offsetWidth, h = el.offsetHeight
    const cur = sizesRef.current.get(id)
    if (!cur || cur.w !== w || cur.h !== h) { sizesRef.current.set(id, { w, h }); return true }
    return false
  }
  useEffect(() => () => { roRef.current?.disconnect(); roRef.current = null }, [])

  // ---- field/edge anchor world points (drag starts) ----
  function edgeAnchorWorld(e: Entity): Pt {
    const r = rectOf(e, sizesRef.current)
    return { x: r.x + r.w, y: r.cy }
  }
  function fieldStartWorld(e: Entity, fieldId: string): Pt {
    const r = rectOf(e, sizesRef.current)
    const idx = e.fields.findIndex(f => f.id === fieldId)
    return { x: r.x + r.w, y: r.y + HEADER_H + BODY_PAD + (idx < 0 ? 0 : idx) * ROW_H + ROW_H / 2 }
  }

  // ---- global listeners ----
  useEffect(() => {
    function onMove(ev: MouseEvent) {
      const p = screenToWorld(ev.clientX, ev.clientY)
      // Broadcast our cursor to peers (throttled). No-op when there's no relay (awareness null).
      const now = Date.now()
      if (now - lastCursorPub.current > 40) { lastCursorPub.current = now; setCursorRef.current({ x: p.x, y: p.y }) }
      const tl = stateRef.current.tool
      // Any real drag cancels the pending click-collapse — the press was a move, not a click.
      const cc = collapseRef.current
      if (cc && Math.hypot(p.sx - cc.sx, p.sy - cc.sy) > 5) collapseRef.current = null
      // field-drag becomes a relate once it passes the threshold
      const pr = pendingRelate.current
      if (pr && Math.hypot(p.sx - pr.sx, p.sy - pr.sy) > 5) {
        dispatch({ t: 'startRelate', fromId: pr.fromId, fromField: pr.fromField, from: pr.from })
        pendingRelate.current = null
      }
      if (tl.k === 'moving') {
        moveEntity(doc, tl.id, p.x - tl.dx, p.y - tl.dy)
      } else if (tl.k === 'movingMany') {
        for (const it of tl.items) moveEntity(doc, it.id, p.x - it.dx, p.y - it.dy)
      }
      dispatch({ t: 'pointerMove', world: { x: p.x, y: p.y }, sx: p.sx, sy: p.sy, ddx: 0, ddy: 0 })
    }
    function onUp(ev: MouseEvent) {
      const tl = stateRef.current.tool
      const p = screenToWorld(ev.clientX, ev.clientY)
      pendingRelate.current = null
      // Released on a group member without dragging → collapse selection to just that card.
      if (collapseRef.current) {
        dispatch({ t: 'selectEntity', id: collapseRef.current.id })
        collapseRef.current = null
        dispatch({ t: 'endTool' })
        return
      }
      // View-only: no create / relate / reroute (marquee-select + pan still work for inspection).
      if (readOnlyRef.current && (tl.k === 'relating' || tl.k === 'rerouting' || tl.k === 'pressing')) {
        dispatch({ t: 'endTool' }); return
      }
      if (tl.k === 'relating') {
        const hit = hitTest(ev.clientX, ev.clientY)
        // Prefer the precise DOM hit (gives field-level targeting); fall back to the magnetic capture
        // target so anything that looked *armed* actually connects, even a few px off the card.
        const tEnt = hit?.entityId ?? relateSnapTarget(p.x, p.y, tl.fromId)?.id ?? null
        const tField = hit?.fieldId ?? null
        const role = tl.fromField ? fieldName(tl.fromId, tl.fromField) : null
        if (tEnt) {
          const rid = addRelationship(doc, tl.fromId, tEnt, { fromField: tl.fromField, toField: tField, role })
          const te = entityById(tEnt)
          firePlug(rid, 'to', te ? edgeSnap(rectOf(te, sizesRef.current), p.x, p.y) : { x: p.x, y: p.y })
        } else {
          const id = addEntity(doc, p.x - 91, p.y - 18, 'new_table')
          addRelationship(doc, tl.fromId, id, { fromField: tl.fromField, role })
          // Match the click-create flow: focus the name first, then jump to fields on commit.
          renameRef.current = id
          pendingFieldsRef.current = id
          forceUi()
        }
      } else if (tl.k === 'rerouting') {
        const hit = hitTest(ev.clientX, ev.clientY)
        const r = relsRef.current.find(x => x.id === tl.relId)
        const originId = r ? (tl.end === 'from' ? r.fromId : r.toId) : tl.relId
        const tEnt = hit?.entityId ?? relateSnapTarget(p.x, p.y, originId)?.id ?? null
        if (tEnt) {
          setRelationshipEnd(doc, tl.relId, tl.end, tEnt, hit?.fieldId ?? null)
          const te = entityById(tEnt)
          firePlug(tl.relId, tl.end, te ? edgeSnap(rectOf(te, sizesRef.current), p.x, p.y) : { x: p.x, y: p.y })
        }
      } else if (tl.k === 'pressing') {
        // pressed empty canvas and released without dragging → the create-flow name box
        dispatch({ t: 'openName', at: { x: tl.x0, y: tl.y0 } })
        return
      } else if (tl.k === 'marquee') {
        const caught = marqueeHits(tl.x0, tl.y0, p.x, p.y)
        dispatch({ t: 'setSelected', entities: caught.entities, rels: caught.rels })
        dispatch({ t: 'endTool' })
        return
      }
      dispatch({ t: 'endTool' })
    }
    function onKey(ev: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const meta = ev.metaKey || ev.ctrlKey
      if (meta && (ev.key === 'z' || ev.key === 'Z')) {
        if (typing || readOnlyRef.current) return
        ev.preventDefault()
        if (ev.shiftKey) board.undo.redo(); else board.undo.undo()
        return
      }
      if (meta && (ev.key === 'y' || ev.key === 'Y')) { if (!typing && !readOnlyRef.current) { ev.preventDefault(); board.undo.redo() } return }
      if (meta && (ev.key === 'a' || ev.key === 'A')) {
        if (typing) return
        ev.preventDefault()
        dispatch({ t: 'setSelected', entities: entitiesRef.current.map(e => e.id), rels: relsRef.current.map(r => r.id) })
        return
      }
      if (typing) return
      const sel = stateRef.current.selection
      const seld = stateRef.current.selected
      if (ev.key === 'Escape') { dispatch({ t: 'escape' }); renameRef.current = null; dupRef.current = null; forceUi(); return }
      if (ev.key === ' ') { spaceRef.current = true; if (stageRef.current) stageRef.current.style.cursor = 'grab' }
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && !readOnlyRef.current && (seld.entities.length || seld.rels.length)) {
        // Delete the whole selected group. Rels first, then entities (deleting an entity also
        // sweeps its own rels). Within the 350ms capture window this is one undo step.
        for (const id of seld.rels) deleteRelationship(doc, id)
        for (const id of seld.entities) deleteEntity(doc, id)
        dispatch({ t: 'clearSel' }); return
      }
      if (sel?.type === 'entity' && !readOnlyRef.current && (ev.key === 'Enter' || ev.key === 'F2')) {
        renameRef.current = sel.id; forceUi(); return
      }
      if (sel?.type === 'rel' && !readOnlyRef.current) {
        const r = relsRef.current.find(x => x.id === sel.id); if (!r) return
        const end = sel.end ?? 'to'
        if (ev.key === '1') { setRelationshipCard(doc, r.id, end, 'one') }
        else if (ev.key === 'n' || ev.key === 'N') { setRelationshipCard(doc, r.id, end, 'many') }
        else if (ev.key === ' ') { ev.preventDefault(); setRelationshipCard(doc, r.id, end, nextCard(end === 'from' ? r.fromCard : r.toCard)) }
      }
      // viewport keyboard parity
      if (!sel) {
        const step = 60
        if (ev.key === 'ArrowLeft') dispatch({ t: 'panBy', dx: step, dy: 0 })
        else if (ev.key === 'ArrowRight') dispatch({ t: 'panBy', dx: -step, dy: 0 })
        else if (ev.key === 'ArrowUp') dispatch({ t: 'panBy', dx: 0, dy: step })
        else if (ev.key === 'ArrowDown') dispatch({ t: 'panBy', dx: 0, dy: -step })
      }
      if (ev.key === '+' || ev.key === '=') zoomCenter(1.2)
      else if (ev.key === '-' || ev.key === '_') zoomCenter(1 / 1.2)
      else if (meta && ev.key === '0') { ev.preventDefault(); dispatch({ t: 'setView', view: { tx: 0, ty: 0, scale: 1 } }) }
      else if (ev.shiftKey && ev.key === '!') fitToContent()
    }
    function onKeyUp(ev: KeyboardEvent) {
      if (ev.key === ' ') { spaceRef.current = false; if (stageRef.current) stageRef.current.style.cursor = '' }
    }
    function onWheel(ev: WheelEvent) {
      ev.preventDefault()
      const r = stageRef.current!.getBoundingClientRect()
      const sx = ev.clientX - r.left, sy = ev.clientY - r.top
      if (ev.ctrlKey || ev.metaKey) dispatch({ t: 'zoomAt', sx, sy, factor: Math.exp(-ev.deltaY * 0.0015) })
      else dispatch({ t: 'panBy', dx: -ev.deltaX, dy: -ev.deltaY })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    const stage = stageRef.current!
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
      stage.removeEventListener('wheel', onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])

  function fieldName(entityId: string, fieldId: string): string | null {
    const e = entityById(entityId); const f = e?.fields.find(x => x.id === fieldId)
    return f?.name ?? null
  }

  // ---- "make room" push for a selected, too-close relationship ----
  // When the two tables are closer than the inline controls need, shift both apart symmetrically
  // (visual only — saved positions untouched). Computed each render from the current selection.
  const PUSH_NEED = 168 // px of facing-edge gap the inline controls want
  function computePush(): Map<string, { dx: number; dy: number }> {
    const out = new Map<string, { dx: number; dy: number }>()
    const sel = state.selection
    if (sel?.type !== 'rel') return out
    const r = rels.find(x => x.id === sel.id)
    if (!r || r.fromId === r.toId) return out
    const ea = entities.find(e => e.id === r.fromId), eb = entities.find(e => e.id === r.toId)
    if (!ea || !eb) return out
    const ra = rectOf(ea, sizesRef.current), rb = rectOf(eb, sizesRef.current)
    const dx = rb.cx - ra.cx, dy = rb.cy - ra.cy
    const dist = Math.hypot(dx, dy) || 1
    const ux = dx / dist, uy = dy / dist
    const gap = dist - (Math.abs(ux) * ra.w + Math.abs(uy) * ra.h) / 2 - (Math.abs(ux) * rb.w + Math.abs(uy) * rb.h) / 2
    if (gap >= PUSH_NEED) return out
    const d = (PUSH_NEED - gap) / 2
    out.set(ea.id, { dx: -ux * d, dy: -uy * d })
    out.set(eb.id, { dx: ux * d, dy: uy * d })
    return out
  }
  // Glide the push amount toward its target each frame (timer, not rAF — rAF pauses when the page
  // is hidden, which would leave the controls cramped). Cards and the line both read `amt`, so they
  // move together.
  function pushStep() {
    const p = pushRef.current
    p.timer = null
    const speed = 0.18
    p.amt = p.amt < p.target ? Math.min(p.target, p.amt + speed) : Math.max(p.target, p.amt - speed)
    forceUi()
    if (p.amt !== p.target) p.timer = setTimeout(pushStep, 16)
    else if (p.amt === 0) p.offsets = new Map()
  }
  useEffect(() => {
    const p = pushRef.current
    const target = computePush()
    if (target.size) { p.offsets = target; p.target = 1 } else { p.target = 0 }
    if (p.timer) clearTimeout(p.timer)
    p.timer = setTimeout(pushStep, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selection])
  useEffect(() => () => { const p = pushRef.current; if (p.timer) { clearTimeout(p.timer); p.timer = null } }, [])
  useEffect(() => () => { if (plugTimer.current) clearTimeout(plugTimer.current) }, [])

  // ---- viewport helpers ----
  function zoomCenter(factor: number) {
    const st = stageRef.current; if (!st) return
    dispatch({ t: 'zoomAt', sx: st.clientWidth / 2, sy: st.clientHeight / 2, factor })
  }
  function fitToContent() {
    const st = stageRef.current; if (!st || entitiesRef.current.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const e of entitiesRef.current) {
      const r = rectOf(e, sizesRef.current)
      minX = Math.min(minX, r.x); minY = Math.min(minY, r.y)
      maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h)
    }
    const pad = 80
    const bw = maxX - minX, bh = maxY - minY
    const scale = Math.max(0.2, Math.min(2.5, Math.min((st.clientWidth - pad) / bw, (st.clientHeight - pad) / bh)))
    const tx = (st.clientWidth - bw * scale) / 2 - minX * scale
    const ty = (st.clientHeight - bh * scale) / 2 - minY * scale
    dispatch({ t: 'setView', view: { tx, ty, scale } })
  }

  // ---- stage interactions ----
  function onStageMouseDown(ev: React.MouseEvent) {
    // .world is pointer-events:none, so empty-canvas clicks land on the stage itself.
    if (ev.target !== stageRef.current) return
    const p = screenToWorld(ev.clientX, ev.clientY)
    if (spaceRef.current || ev.button === 1) { ev.preventDefault(); dispatch({ t: 'startPan', sx: p.sx, sy: p.sy }); return }
    if (ev.button !== 0) return
    // Keep the browser from moving focus to <body> / starting a text selection; the name
    // input set on mount then keeps its focus. A bare press waits: release-in-place opens the
    // name box (create), drag-past-threshold becomes a marquee selection (see onUp / pointerMove).
    ev.preventDefault()
    dispatch({ t: 'startPress', sx: p.sx, sy: p.sy, x: p.x, y: p.y })
    dupRef.current = null
  }

  // ---- card callbacks ----
  function inGroup(id: string) {
    const sd = stateRef.current.selected
    return sd.entities.includes(id) && sd.entities.length + sd.rels.length > 1
  }
  // Pressing a card that's already part of a multi-selection keeps the group (so a drag can move
  // it all); a release without dragging then collapses to just that card (see onUp). Pressing any
  // other card selects just that one immediately.
  function onCardSelect(id: string, ev: React.MouseEvent) {
    if (inGroup(id)) {
      const p = screenToWorld(ev.clientX, ev.clientY)
      collapseRef.current = { id, sx: p.sx, sy: p.sy }
    } else {
      collapseRef.current = null
      dispatch({ t: 'selectEntity', id })
    }
  }
  function onCardMove(e: Entity, ev: React.MouseEvent) {
    if (readOnlyRef.current) { dispatch({ t: 'selectEntity', id: e.id }); return }
    const p = screenToWorld(ev.clientX, ev.clientY)
    if (inGroup(e.id)) {
      const items = stateRef.current.selected.entities.map(id => {
        const en = entityById(id)
        return { id, dx: p.x - (en?.x ?? 0), dy: p.y - (en?.y ?? 0) }
      })
      dispatch({ t: 'startMoveMany', items })
    } else {
      dispatch({ t: 'selectEntity', id: e.id })
      dispatch({ t: 'startMove', id: e.id, dx: p.x - e.x, dy: p.y - e.y })
    }
  }
  // Relate from a table's edge (the whole border, or the hover dot). Arm a pending drag from the
  // grab point — a press that doesn't move just selects; passing the threshold draws the line.
  function armRelate(e: Entity, ev: React.MouseEvent) {
    if (readOnlyRef.current) return
    const p = screenToWorld(ev.clientX, ev.clientY)
    pendingRelate.current = { fromId: e.id, fromField: null, from: { x: p.x, y: p.y }, sx: p.sx, sy: p.sy }
  }
  function onFieldPointerDown(e: Entity, fieldId: string, ev: React.MouseEvent) {
    if (readOnlyRef.current) return
    const p = screenToWorld(ev.clientX, ev.clientY)
    pendingRelate.current = { fromId: e.id, fromField: fieldId, from: fieldStartWorld(e, fieldId), sx: p.sx, sy: p.sy }
  }

  // ---- rel callbacks ----
  function onEndpointDown(relId: string, end: 'from' | 'to', ev: React.MouseEvent) {
    if (readOnlyRef.current) return
    const p = screenToWorld(ev.clientX, ev.clientY)
    dispatch({ t: 'startEndpoint', relId, end, sx: p.sx, sy: p.sy, cur: { x: p.x, y: p.y } })
  }
  function cycleCardinality(r: Relationship) {
    // 1:1 -> 1:N -> N:M -> 1:1
    const cur = `${r.fromCard}-${r.toCard}`
    const next: [Card, Card] = cur === 'one-one' ? ['one', 'many'] : cur === 'one-many' ? ['many', 'many'] : ['one', 'one']
    setRelationshipCard(doc, r.id, 'from', next[0]); setRelationshipCard(doc, r.id, 'to', next[1])
  }

  // temp drag line. Off a table the tip trails the pointer (dashed). Over a target the connector
  // *snatches* onto that table's border at the point under the pointer and the table arms — a
  // magnetic seat in place. The final move to the routed port is the post-release plug glide.
  let temp: { x1: number; y1: number; x2: number; y2: number; armed: boolean; tid: string | null } | null = null
  let armedId: string | null = null
  const tool = state.tool
  if (tool.k === 'relating') {
    const tgt = relateSnapTarget(tool.cur.x, tool.cur.y, tool.fromId)
    armedId = tgt?.id ?? null
    const s = tgt ? edgeSnap(rectOf(tgt, sizesRef.current), tool.cur.x, tool.cur.y) : { x: tool.cur.x, y: tool.cur.y }
    temp = { x1: tool.from.x, y1: tool.from.y, x2: s.x, y2: s.y, armed: !!tgt, tid: armedId }
  } else if (tool.k === 'rerouting') {
    const relId = tool.relId, end = tool.end, cur = tool.cur
    const r = rels.find(x => x.id === relId)
    if (r) {
      const fe = entityById(end === 'from' ? r.toId : r.fromId)
      if (fe) {
        const a = edgeAnchorWorld(fe)
        const tgt = relateSnapTarget(cur.x, cur.y, end === 'from' ? r.fromId : r.toId)
        armedId = tgt?.id ?? null
        const s = tgt ? edgeSnap(rectOf(tgt, sizesRef.current), cur.x, cur.y) : { x: cur.x, y: cur.y }
        temp = { x1: a.x, y1: a.y, x2: s.x, y2: s.y, armed: !!tgt, tid: armedId }
      }
    }
  }

  const { tx, ty, scale } = state.view
  const movingId = state.tool.k === 'moving' ? state.tool.id : null
  const showHint = entities.length === 0 && state.tool.k !== 'naming'

  // Interpolated push offsets (target offsets scaled by the current glide amount).
  const pushed = new Map<string, { dx: number; dy: number }>()
  if (pushRef.current.amt > 0) {
    const amt = pushRef.current.amt
    for (const [id, o] of pushRef.current.offsets) pushed.set(id, { dx: o.dx * amt, dy: o.dy * amt })
  }

  return (
    <div
      className={'stage' + (readOnly ? ' readonly' : '')}
      ref={stageRef}
      onMouseDown={onStageMouseDown}
      style={{ backgroundPosition: `${tx}px ${ty}px`, backgroundSize: `${24 * scale}px ${24 * scale}px` }}
    >
      {showHint && (
        <div className="hint">
          <b>Click anywhere</b> to add a table<br />
          fields are comma-separated · types infer<br />
          drag a table's edge (or a field) to relate · click the header dot to color-code<br />
          <span className="hint-kbd">space-drag to pan · ⌘-scroll to zoom · ⌫ deletes · ⌘Z undoes</span>
        </div>
      )}

      <div className="world" style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
        <Relationships
          entities={entities}
          rels={rels}
          sizes={sizesRef.current}
          pushOffsets={pushed}
          temp={temp}
          selected={state.selection?.type === 'rel' ? state.selection : null}
          groupSelected={state.selected.rels}
          plug={plugRef.current}
          onSelectRel={(id, end) => dispatch({ t: 'selectRel', id, end })}
          onDeleteRel={(id) => { deleteRelationship(doc, id); dispatch({ t: 'clearSel' }) }}
          onEndpointDown={onEndpointDown}
          onCycleCardinality={cycleCardinality}
          onEditRole={(id, role) => setRelationshipRole(doc, id, role)}
          readOnly={readOnly}
          peerSel={peerRelColor}
        />

        {state.tool.k === 'marquee' && (() => {
          const t = state.tool
          const b = boxFrom(t.x0, t.y0, t.cur.x, t.cur.y)
          return <div className="marquee" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
        })()}

        {entities.map((e) => (
          <EntityCard
            key={e.id}
            entity={e}
            selected={state.selected.entities.includes(e.id)}
            armed={armedId === e.id}
            dragging={movingId === e.id}
            renaming={renameRef.current === e.id}
            autoFocusFields={e.id === state.newId}
            offset={pushed.get(e.id) ?? null}
            readOnly={readOnly}
            peerColor={peerEntityColor.get(e.id) ?? null}
            onMeasure={measure}
            onSelect={(ev) => onCardSelect(e.id, ev)}
            onStartMove={(ev) => onCardMove(e, ev)}
            onStartRelate={(ev) => armRelate(e, ev)}
            onFieldPointerDown={(fieldId, ev) => onFieldPointerDown(e, fieldId, ev)}
            onCycleColor={() => {
              const i = e.color ? SEM.indexOf(e.color as any) : -1
              const next = i + 1 >= SEM.length ? null : SEM[i + 1]
              setEntityColor(doc, e.id, next)
            }}
            onRenameStart={() => { renameRef.current = e.id; forceUi() }}
            onRenameCommit={(name) => {
              renameEntity(doc, e.id, name); renameRef.current = null
              if (pendingFieldsRef.current === e.id) { pendingFieldsRef.current = null; dispatch({ t: 'setNewId', id: e.id }) }
              forceUi()
            }}
            onRenameCancel={() => { renameRef.current = null; pendingFieldsRef.current = null; forceUi() }}
            onDelete={() => { deleteEntity(doc, e.id); dispatch({ t: 'clearSel' }) }}
            onAddFields={(csv) => addFields(doc, e.id, csv)}
            onRenameField={(fid, name) => renameField(doc, e.id, fid, name)}
            onDeleteField={(fid) => deleteField(doc, e.id, fid)}
            onCycleFieldType={(fid, dir) => cycleFieldType(doc, e.id, fid, dir)}
          />
        ))}

        {state.tool.k === 'naming' && (
          <NameBox
            at={state.tool.at}
            duplicate={dupRef.current}
            onCancel={() => { dispatch({ t: 'closeName' }); dupRef.current = null }}
            onSubmit={(v) => {
              const name = v.trim()
              if (!name) { dispatch({ t: 'closeName' }); return }
              if (entityNameExists(doc, name) && dupRef.current !== name) { dupRef.current = name; forceUi(); return }
              dupRef.current = null
              const id = addEntity(doc, state.tool.k === 'naming' ? state.tool.at.x : 0, state.tool.k === 'naming' ? state.tool.at.y : 0, name)
              dispatch({ t: 'closeName' }); dispatch({ t: 'setNewId', id })
            }}
          />
        )}
      </div>

      <Presence peers={peers} view={state.view} />

      <div className="zoomctl">
        <button title="Zoom out (-)" onClick={() => zoomCenter(1 / 1.2)}>–</button>
        <button className="pct" title="Reset to 100% (⌘0)" onClick={() => dispatch({ t: 'setView', view: { tx: 0, ty: 0, scale: 1 } })}>{Math.round(scale * 100)}%</button>
        <button title="Zoom in (+)" onClick={() => zoomCenter(1.2)}>+</button>
        <button title="Fit to content (⇧1)" onClick={fitToContent}>⤢</button>
      </div>

      {/* read-only mode cue — stays legible anywhere on the board (the top-bar pill can scroll out of
          view). aria-hidden: the pill already announces the mode, so this is visual reinforcement. */}
      {readOnly && <div className="viewonly-cue" aria-hidden="true">Viewing · read only</div>}
    </div>
  )
}

function NameBox({ at, duplicate, onSubmit, onCancel }: {
  at: Pt; duplicate: string | null; onSubmit: (v: string) => void; onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="namebox" style={{ left: at.x, top: at.y }}>
      <input
        ref={ref}
        placeholder="Table name…"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit((e.target as HTMLInputElement).value)
          else if (e.key === 'Escape') onCancel()
        }}
      />
      {duplicate && (
        <div className="namebox-dup">“{duplicate}” already exists — press <b>Enter</b> again to keep both, or edit the name.</div>
      )}
    </div>
  )
}
