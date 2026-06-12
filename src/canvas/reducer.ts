// Pure interaction state machine for the canvas. No React, no Y.Doc here —
// Canvas dispatches actions and performs the actual document mutations as side effects.

export const THRESHOLD = 5 // screen px; click-vs-drag split on endpoints
export const MIN_SCALE = 0.2
export const MAX_SCALE = 2.5

export interface View { tx: number; ty: number; scale: number }
export interface Pt { x: number; y: number }

export type Sel =
  | { type: 'entity'; id: string }
  | { type: 'rel'; id: string; end: 'from' | 'to' | null }

export type Tool =
  | { k: 'idle' }
  | { k: 'naming'; at: Pt }
  | { k: 'moving'; id: string; dx: number; dy: number }
  | { k: 'movingMany'; items: { id: string; dx: number; dy: number }[] }
  | { k: 'relating'; fromId: string; fromField: string | null; from: Pt; cur: Pt }
  | { k: 'panning'; sx: number; sy: number; tx0: number; ty0: number }
  | { k: 'endpointDown'; relId: string; end: 'from' | 'to'; sx0: number; sy0: number; cur: Pt }
  | { k: 'rerouting'; relId: string; end: 'from' | 'to'; cur: Pt }
  // empty-canvas press: not yet a drag. Releasing without moving opens the name box (create);
  // moving past the threshold turns it into a marquee selection.
  | { k: 'pressing'; sx0: number; sy0: number; x0: number; y0: number }
  | { k: 'marquee'; x0: number; y0: number; cur: Pt }

/** Multi-selection: ids of every selected entity and relationship. */
export interface SelSet { entities: string[]; rels: string[] }
const EMPTY_SET: SelSet = { entities: [], rels: [] }

export interface CanvasState {
  tool: Tool
  view: View
  // `selection` is the single "active" selection that drives inline controls (rel cardinality,
  // endpoints, rename-on-Enter). `selected` is the full multi-select group used for move + delete.
  // When exactly one thing is selected the two agree; a multi-marquee leaves `selection` null.
  selection: Sel | null
  selected: SelSet
  newId: string | null // entity whose field input should auto-focus
}

export const initialState: CanvasState = {
  tool: { k: 'idle' },
  view: { tx: 0, ty: 0, scale: 1 },
  selection: null,
  selected: EMPTY_SET,
  newId: null,
}

/** A single selection exists only when exactly one thing (entity xor rel) is selected. */
function deriveSel(set: SelSet): Sel | null {
  if (set.entities.length === 1 && set.rels.length === 0) return { type: 'entity', id: set.entities[0] }
  if (set.rels.length === 1 && set.entities.length === 0) return { type: 'rel', id: set.rels[0], end: null }
  return null
}

const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))

/** Zoom keeping the screen point (sx,sy) fixed. */
export function zoomAt(view: View, sx: number, sy: number, factor: number): View {
  const scale = clampScale(view.scale * factor)
  if (scale === view.scale) return view
  const k = scale / view.scale
  return { scale, tx: sx - (sx - view.tx) * k, ty: sy - (sy - view.ty) * k }
}

export type Action =
  | { t: 'selectEntity'; id: string }
  | { t: 'selectRel'; id: string; end?: 'from' | 'to' | null }
  | { t: 'clearSel' }
  | { t: 'openName'; at: Pt }
  | { t: 'closeName' }
  | { t: 'startMove'; id: string; dx: number; dy: number }
  | { t: 'startMoveMany'; items: { id: string; dx: number; dy: number }[] }
  | { t: 'startRelate'; fromId: string; fromField: string | null; from: Pt }
  | { t: 'startPan'; sx: number; sy: number }
  | { t: 'startPress'; sx: number; sy: number; x: number; y: number }
  | { t: 'setSelected'; entities: string[]; rels: string[] }
  | { t: 'startEndpoint'; relId: string; end: 'from' | 'to'; sx: number; sy: number; cur: Pt }
  | { t: 'pointerMove'; world: Pt; sx: number; sy: number; ddx: number; ddy: number }
  | { t: 'endTool' }
  | { t: 'setView'; view: View }
  | { t: 'panBy'; dx: number; dy: number }
  | { t: 'zoomAt'; sx: number; sy: number; factor: number }
  | { t: 'setNewId'; id: string | null }
  | { t: 'escape' }

export function reducer(s: CanvasState, a: Action): CanvasState {
  switch (a.t) {
    case 'selectEntity':
      // Preserve an in-flight tool (e.g. the header's start-move dispatched just before this);
      // only a still-open namebox should close on selecting a card.
      return { ...s, selection: { type: 'entity', id: a.id }, selected: { entities: [a.id], rels: [] }, tool: s.tool.k === 'naming' ? { k: 'idle' } : s.tool }
    case 'selectRel':
      return { ...s, selection: { type: 'rel', id: a.id, end: a.end ?? null }, selected: { entities: [], rels: [a.id] } }
    case 'setSelected': {
      const set: SelSet = { entities: a.entities, rels: a.rels }
      return { ...s, selected: set, selection: deriveSel(set) }
    }
    case 'clearSel':
      return { ...s, selection: null, selected: EMPTY_SET }
    case 'openName':
      return { ...s, tool: { k: 'naming', at: a.at }, selection: null, selected: EMPTY_SET }
    case 'closeName':
      return s.tool.k === 'naming' ? { ...s, tool: { k: 'idle' } } : s
    case 'startMove':
      return { ...s, tool: { k: 'moving', id: a.id, dx: a.dx, dy: a.dy } }
    case 'startMoveMany':
      return { ...s, tool: { k: 'movingMany', items: a.items } }
    case 'startPress':
      return { ...s, tool: { k: 'pressing', sx0: a.sx, sy0: a.sy, x0: a.x, y0: a.y } }
    case 'startRelate':
      return { ...s, tool: { k: 'relating', fromId: a.fromId, fromField: a.fromField, from: a.from, cur: a.from } }
    case 'startPan':
      return { ...s, tool: { k: 'panning', sx: a.sx, sy: a.sy, tx0: s.view.tx, ty0: s.view.ty } }
    case 'startEndpoint':
      return { ...s, tool: { k: 'endpointDown', relId: a.relId, end: a.end, sx0: a.sx, sy0: a.sy, cur: a.cur }, selection: { type: 'rel', id: a.relId, end: a.end }, selected: { entities: [], rels: [a.relId] } }
    case 'pointerMove': {
      const tl = s.tool
      if (tl.k === 'pressing') {
        // promote to a marquee once the pointer travels past the click/drag threshold
        if (Math.hypot(a.sx - tl.sx0, a.sy - tl.sy0) > THRESHOLD)
          return { ...s, tool: { k: 'marquee', x0: tl.x0, y0: tl.y0, cur: a.world }, selection: null, selected: EMPTY_SET }
        return s
      }
      if (tl.k === 'marquee') return { ...s, tool: { ...tl, cur: a.world } }
      if (tl.k === 'relating') return { ...s, tool: { ...tl, cur: a.world } }
      if (tl.k === 'rerouting') return { ...s, tool: { ...tl, cur: a.world } }
      if (tl.k === 'panning')
        return { ...s, view: { ...s.view, tx: tl.tx0 + (a.sx - tl.sx), ty: tl.ty0 + (a.sy - tl.sy) } }
      if (tl.k === 'endpointDown') {
        if (Math.hypot(a.sx - tl.sx0, a.sy - tl.sy0) > THRESHOLD)
          return { ...s, tool: { k: 'rerouting', relId: tl.relId, end: tl.end, cur: a.world } }
        return { ...s, tool: { ...tl, cur: a.world } }
      }
      return s
    }
    case 'endTool':
      return s.tool.k === 'naming' ? s : { ...s, tool: { k: 'idle' } }
    case 'setView':
      return { ...s, view: a.view }
    case 'panBy':
      return { ...s, view: { ...s.view, tx: s.view.tx + a.dx, ty: s.view.ty + a.dy } }
    case 'zoomAt':
      return { ...s, view: zoomAt(s.view, a.sx, a.sy, a.factor) }
    case 'setNewId':
      return { ...s, newId: a.id }
    case 'escape':
      return { ...s, tool: { k: 'idle' }, selection: null, selected: EMPTY_SET }
    default:
      return s
  }
}
