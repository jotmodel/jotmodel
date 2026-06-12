import type { Entity } from './board'

// Layout constants (fallbacks before the DOM is measured; match the design system).
export const ENT_W = 200
export const MIN_W = 182
export const HEADER_H = 38
export const ROW_H = 23
export const BODY_PAD = 3

/** Measured card sizes in world units (CSS layout px === world px under the .world transform). */
export type Sizes = Map<string, { w: number; h: number }>

export function entHeight(e: Entity): number {
  return HEADER_H + e.fields.length * ROW_H + 2 * BODY_PAD
}

export interface Rect { x: number; y: number; w: number; h: number; cx: number; cy: number }

/** World-space rect for an entity, using the measured size when available. */
export function rectOf(e: Entity, sizes?: Sizes): Rect {
  const m = sizes?.get(e.id)
  const w = m?.w ?? ENT_W
  const h = m?.h ?? entHeight(e)
  return { x: e.x, y: e.y, w, h, cx: e.x + w / 2, cy: e.y + h / 2 }
}

// Outward unit normal of the chosen edge: (±1,0) for a side, (0,±1) for top/bottom.
export interface Anchor { x: number; y: number; nx: number; ny: number }

const EDGE_MARGIN = 12

/** Clamp an along-edge position to within the edge, reserving `reserve` px at each end
 *  so a band of parallel anchors fits without collapsing onto the corner. */
function clampEdge(size: number, v: number, reserve: number): number {
  const lo = -size / 2 + EDGE_MARGIN, hi = size / 2 - EDGE_MARGIN
  if (lo + reserve >= hi - reserve) return 0 // band wider than edge → centre it
  return Math.max(lo + reserve, Math.min(hi - reserve, v))
}

/** Point on the edge of `a` facing `b`. Picks the side vs. top/bottom edge by the dominant
 *  direction, so stacked tables exit top/bottom instead of bunching on one side. `off` shifts
 *  the anchor along the chosen edge (parallel offset); `reserve` keeps the offset band on-edge. */
export function anchor(a: Rect, b: Rect, off = 0, reserve = 0): Anchor {
  const dx = b.cx - a.cx, dy = b.cy - a.cy
  if (Math.abs(dx) >= Math.abs(dy)) {
    const nx = dx >= 0 ? 1 : -1
    return { x: nx === 1 ? a.x + a.w : a.x, y: a.cy + clampEdge(a.h, dy, reserve) + off, nx, ny: 0 }
  }
  const ny = dy >= 0 ? 1 : -1
  return { x: a.cx + clampEdge(a.w, dx, reserve) + off, y: ny === 1 ? a.y + a.h : a.y, nx: 0, ny }
}

/** Anchor pinned to a specific field row's vertical center (the "as <field>" gesture).
 *  Field rows are horizontal, so these always exit the left/right edge. */
export function fieldAnchor(e: Entity, fieldId: string | null, toward: Rect, rect: Rect): Anchor {
  const nx: 1 | -1 = toward.cx > rect.cx ? 1 : -1
  const x = nx === 1 ? rect.x + rect.w : rect.x
  const idx = fieldId ? e.fields.findIndex(f => f.id === fieldId) : -1
  const y = idx < 0
    ? rect.cy + clampEdge(rect.h, toward.cy - rect.cy, 0)
    : rect.y + HEADER_H + BODY_PAD + idx * ROW_H + ROW_H / 2
  return { x, y, nx, ny: 0 }
}

/** Along-edge separation for the Nth of `count` relationships sharing the same pair.
 *  Spacing leaves room for each line's label/edit lane so they don't overlap. */
export function parallelOffset(index: number, count: number): number {
  if (count <= 1) return 0
  return (index - (count - 1) / 2) * 22
}

/** A self-loop arc on the right edge of the card. */
export function selfLoopPath(r: Rect): { d: string; lx: number; ly: number; tip: Anchor; start: Anchor } {
  const x = r.x + r.w
  const y1 = r.y + Math.min(r.h * 0.32, r.h / 2 - 6)
  const y2 = r.y + Math.max(r.h * 0.68, r.h / 2 + 6)
  const ext = 48
  const d = `M${x} ${y1} C ${x + ext} ${y1 - 8}, ${x + ext} ${y2 + 8}, ${x} ${y2}`
  return { d, lx: x + ext - 4, ly: (y1 + y2) / 2, tip: { x, y: y2, nx: 1, ny: 0 }, start: { x, y: y1, nx: 1, ny: 0 } }
}

/** Stable key for the unordered pair of an entity-to-entity relationship. */
export function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`
}
