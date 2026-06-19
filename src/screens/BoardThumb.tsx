import { ENT_W, HEADER_H, ROW_H, BODY_PAD } from '../model/geom'
import type { ThumbModel } from '../lib/api'

/**
 * A board's thumbnail on the Home screen: a live vector mini-canvas drawn from the cached model
 * summary (worker/summary.ts → api ThumbModel). No raster, no stored image — so it themes itself
 * (light/dark parity, law 6) and obeys the colour layers (law 1/2): entities carry the user's
 * --sem-* hue; relationship lines stay neutral --jm-rel chrome and are drawn plain (no crow's-foot,
 * matching the marketing demo). Purely decorative → aria-hidden; the board title carries the label.
 */

interface Card { id: string; c: string | null; x: number; y: number; w: number; h: number }
interface Line { x1: number; y1: number; x2: number; y2: number }
interface Layout { view: { x: number; y: number; w: number; h: number }; cards: Card[]; lines: Line[] }

const PAD = 28 // world-unit breathing room around the model

/** Pure layout: world-space bounds + card rects + centre-to-centre lines. null = nothing to draw. */
export function thumbLayout(model: ThumbModel | null | undefined): Layout | null {
  if (!model || model.e.length === 0) return null
  const cards: Card[] = model.e.map((e) => ({
    id: e.i, c: e.c, x: e.x, y: e.y,
    w: ENT_W, h: HEADER_H + e.n * ROW_H + 2 * BODY_PAD,
  }))
  const byId = new Map(cards.map((c) => [c.id, c]))

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of cards) {
    minX = Math.min(minX, c.x); minY = Math.min(minY, c.y)
    maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h)
  }
  const view = { x: minX - PAD, y: minY - PAD, w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 }

  // Centre-to-centre; cards paint on top, so only the segment between cards shows — reads as a
  // clean connector without per-edge anchoring math at this scale.
  const lines: Line[] = []
  for (const [from, to] of model.r) {
    const a = byId.get(from), b = byId.get(to)
    if (a && b) lines.push({ x1: a.x + a.w / 2, y1: a.y + a.h / 2, x2: b.x + b.w / 2, y2: b.y + b.h / 2 })
  }
  return { view, cards, lines }
}

/** Rounded-top, square-bottom rect path for the card header band. */
function headPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x} ${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} H${x} Z`
}

export function BoardThumb({ model }: { model: ThumbModel | null | undefined }) {
  const layout = thumbLayout(model)
  if (!layout) return <div className="board-thumb board-thumb-empty" aria-hidden="true" />

  const { view, cards, lines } = layout
  const r = 7
  return (
    <svg
      className="board-thumb"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g className="thumb-rels">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {cards.map((c) => (
        <g key={c.id} className={`thumb-card${c.c ? ' c-' + c.c : ''}`}>
          <rect className="thumb-body" x={c.x} y={c.y} width={c.w} height={c.h} rx={r} vectorEffect="non-scaling-stroke" />
          <path className="thumb-head" d={headPath(c.x, c.y, c.w, Math.min(HEADER_H, c.h), r)} />
          <line className="thumb-accent" x1={c.x} y1={c.y + r} x2={c.x} y2={c.y + c.h - r} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  )
}
