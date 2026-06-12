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

export interface Anchor { x: number; y: number; side: 1 | -1 }

const edgeClamp = (a: Rect, off: number) => Math.max(-a.h / 2 + 12, Math.min(a.h / 2 - 12, off))

/** Point on `a`'s edge facing `b`; `dy` nudges it (for parallel offset). */
export function anchor(a: Rect, b: Rect, dy = 0): Anchor {
  const side: 1 | -1 = b.cx > a.cx ? 1 : -1
  const x = side === 1 ? a.x + a.w : a.x
  const y = a.cy + edgeClamp(a, (b.cy - a.cy) + dy)
  return { x, y, side }
}

/** Anchor pinned to a specific field row's vertical center (the "as <field>" gesture). */
export function fieldAnchor(e: Entity, fieldId: string | null, toward: Rect, rect: Rect): Anchor {
  const side: 1 | -1 = toward.cx > rect.cx ? 1 : -1
  const x = side === 1 ? rect.x + rect.w : rect.x
  const idx = fieldId ? e.fields.findIndex(f => f.id === fieldId) : -1
  const y = idx < 0
    ? rect.cy + edgeClamp(rect, toward.cy - rect.cy)
    : rect.y + HEADER_H + BODY_PAD + idx * ROW_H + ROW_H / 2
  return { x, y, side }
}

/** Vertical separation for the Nth of `count` relationships sharing the same pair. */
export function parallelOffset(index: number, count: number): number {
  if (count <= 1) return 0
  return (index - (count - 1) / 2) * 16
}

/** A self-loop arc on the right edge of the card. */
export function selfLoopPath(r: Rect): { d: string; lx: number; ly: number; tip: Anchor; start: Anchor } {
  const x = r.x + r.w
  const y1 = r.y + Math.min(r.h * 0.32, r.h / 2 - 6)
  const y2 = r.y + Math.max(r.h * 0.68, r.h / 2 + 6)
  const ext = 48
  const d = `M${x} ${y1} C ${x + ext} ${y1 - 8}, ${x + ext} ${y2 + 8}, ${x} ${y2}`
  return { d, lx: x + ext - 4, ly: (y1 + y2) / 2, tip: { x, y: y2, side: 1 }, start: { x, y: y1, side: 1 } }
}

/** Stable key for the unordered pair of an entity-to-entity relationship. */
export function pairKey(aId: string, bId: string): string {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`
}
