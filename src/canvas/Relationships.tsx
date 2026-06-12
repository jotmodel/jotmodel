import type { Entity, Relationship, Card } from '../model/board'
import {
  rectOf, anchor, fieldAnchor, parallelOffset, selfLoopPath, pairKey,
  type Rect, type Anchor, type Sizes,
} from '../model/geom'

interface Props {
  entities: Entity[]
  rels: Relationship[]
  sizes: Sizes
  pushOffsets: Map<string, { dx: number; dy: number }>
  temp: { x1: number; y1: number; x2: number; y2: number } | null
  selected: { id: string; end: 'from' | 'to' | null } | null
  // Rels in the multi-select group: highlighted like a single selection, but without the inline
  // controls (those only make sense for one active rel — see `selected`).
  groupSelected: string[]
  onSelectRel: (id: string, end?: 'from' | 'to' | null) => void
  onDeleteRel: (id: string) => void
  onEndpointDown: (relId: string, end: 'from' | 'to', e: React.MouseEvent) => void
  onCycleCardinality: (r: Relationship) => void
  onEditRole: (id: string, role: string) => void
}

// Glyphs are drawn relative to the edge's outward normal (nx,ny) so they orient correctly
// whether the line leaves a side or a top/bottom edge. Tangent (along the edge) = (-ny, nx).
function crow(x: number, y: number, nx: number, ny: number) {
  const tx = -ny, ty = nx
  const bx = x - nx * 9, by = y - ny * 9 // prong base, just inside the edge
  return (
    <g className="glyph" strokeWidth={1.8} strokeLinecap="round">
      <line x1={x} y1={y} x2={bx + tx * 6} y2={by + ty * 6} />
      <line x1={x} y1={y} x2={bx} y2={by} />
      <line x1={x} y1={y} x2={bx - tx * 6} y2={by - ty * 6} />
    </g>
  )
}
function bar(x: number, y: number, nx: number, ny: number) {
  const tx = -ny, ty = nx
  const cx = x - nx * 8, cy = y - ny * 8
  return <line className="glyph" x1={cx - tx * 6} y1={cy - ty * 6} x2={cx + tx * 6} y2={cy + ty * 6} strokeWidth={1.8} strokeLinecap="round" />
}
function glyph(card: Card, x: number, y: number, nx: number, ny: number) {
  return card === 'many' ? crow(x, y, nx, ny) : bar(x, y, nx, ny)
}
function cardLabel(from: Card, to: Card): string {
  const l = from === 'one' ? '1' : 'N'
  const r = to === 'one' ? '1' : from === 'many' ? 'M' : 'N'
  return `${l}:${r}`
}

export function Relationships(props: Props) {
  const { entities, rels, sizes, pushOffsets, temp, selected, groupSelected } = props
  const rectById = new Map<string, Rect>(entities.map(e => {
    const r = rectOf(e, sizes)
    const o = pushOffsets.get(e.id)
    return [e.id, o ? { ...r, x: r.x + o.dx, y: r.y + o.dy, cx: r.cx + o.dx, cy: r.cy + o.dy } : r]
  }))
  const entById = new Map<string, Entity>(entities.map(e => [e.id, e]))

  // parallel-offset bookkeeping for multiple rels on the same pair (excludes self-loops)
  const groups = new Map<string, string[]>()
  for (const r of rels) {
    if (r.fromId === r.toId) continue
    const k = pairKey(r.fromId, r.toId)
    ;(groups.get(k) ?? groups.set(k, []).get(k)!).push(r.id)
  }

  return (
    <svg className="rels">
      {rels.map((r) => {
        const ra = rectById.get(r.fromId), rb = rectById.get(r.toId)
        const ea = entById.get(r.fromId), eb = entById.get(r.toId)
        if (!ra || !rb || !ea || !eb) return null
        const isSel = selected?.id === r.id
        const cls = 'rg' + (isSel || groupSelected.includes(r.id) ? ' sel' : '')

        // ---- self-loop ----
        if (r.fromId === r.toId) {
          const loop = selfLoopPath(ra)
          return (
            <g key={r.id} className={cls}>
              <path className="hit" d={loop.d} fill="none" strokeWidth={12} stroke="transparent"
                onMouseDown={(e) => { e.stopPropagation(); props.onSelectRel(r.id) }} />
              <path className="rline" d={loop.d} fill="none" strokeWidth={2} strokeLinecap="round" />
              {glyph(r.toCard, loop.tip.x, loop.tip.y, loop.tip.nx, loop.tip.ny)}
              {!isSel && label(r, loop.lx, loop.ly, props)}
              {isSel && controls(r, loop.lx, loop.ly, props)}
            </g>
          )
        }

        // ---- straight relationship (with parallel offset) ----
        const grp = groups.get(pairKey(r.fromId, r.toId))!
        const idx = grp.indexOf(r.id), n = grp.length
        const off = parallelOffset(idx, n)
        const reserve = parallelOffset(n - 1, n) // half-band: keep parallels on-edge
        const a: Anchor = r.fromField ? fieldAnchor(ea, r.fromField, rb, ra) : anchor(ra, rb, off, reserve)
        const b: Anchor = r.toField ? fieldAnchor(eb, r.toField, ra, rb) : anchor(rb, ra, off, reserve)
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        // Leave each card perpendicular to its edge → smooth in any orientation.
        const k = Math.max(30, 0.5 * Math.hypot(b.x - a.x, b.y - a.y))
        const d = `M${a.x} ${a.y} C ${a.x + a.nx * k} ${a.y + a.ny * k}, ${b.x + b.nx * k} ${b.y + b.ny * k}, ${b.x} ${b.y}`
        // Slide each parallel label along its line so they don't stack on the same point —
        // scaled by verticality, since horizontal parallels already separate vertically.
        const dxL = b.x - a.x, dyL = b.y - a.y
        const vert = Math.abs(dyL) / (Math.abs(dxL) + Math.abs(dyL) + 0.001)
        const t = 0.5 + (idx - (n - 1) / 2) * 0.16 * vert
        const lx = a.x + dxL * t, ly = a.y + dyL * t
        return (
          <g key={r.id} className={cls}>
            <path className="hit" d={d} fill="none" strokeWidth={12} stroke="transparent"
              onMouseDown={(e) => { e.stopPropagation(); props.onSelectRel(r.id) }} />
            <path className="rline" d={d} fill="none" strokeWidth={2} strokeLinecap="round" />
            {glyph(r.fromCard, a.x, a.y, a.nx, a.ny)}
            {glyph(r.toCard, b.x, b.y, b.nx, b.ny)}
            {!isSel && label(r, lx, ly, props)}
            {isSel && (
              <>
                {controls(r, lx, ly, props)}
                {endpoint(a.x, a.y, () => {}, (e) => props.onEndpointDown(r.id, 'from', e))}
                {endpoint(b.x, b.y, () => {}, (e) => props.onEndpointDown(r.id, 'to', e))}
              </>
            )}
          </g>
        )
      })}

      {temp && (
        <path className="rline temp" d={`M${temp.x1} ${temp.y1} L ${temp.x2} ${temp.y2}`}
          fill="none" strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
      )}
    </svg>
  )
}

// Unselected readout: `1:N as role` on the line (canvas plate masks the line so it reads
// `── as Client ──`). Selected controls (readout · role field · delete) render separately, at
// the midpoint when the line is long enough, or floated into clear space when it's too short.
const CH = 6 // monospace advance at 10px

function label(r: Relationship, x: number, y: number, props: Props) {
  const card = cardLabel(r.fromCard, r.toCard)
  const txt = r.role ? `${card} as ${r.role}` : card
  const w = txt.length * CH + 10
  return (
    <g>
      <rect className="rel-label-bg" x={x - w / 2} y={y - 7} width={w} height={14} rx={4} />
      <text className="rel-card" x={x} y={y + 3} textAnchor="middle"
        onMouseDown={(e) => { e.stopPropagation(); props.onSelectRel(r.id) }}>
        {card}{r.role ? <tspan className="rel-role-inline"> as {r.role}</tspan> : null}
      </text>
    </g>
  )
}

// The editable role field, centred on (x, y).
function roleBox(r: Relationship, x: number, y: number, props: Props) {
  return (
    <foreignObject x={x - 46} y={y - 11} width={92} height={22} style={{ overflow: 'visible' }}>
      <div className="rel-role-wrap">
        <input
          className="rel-role-input"
          defaultValue={r.role ?? ''}
          placeholder="as …"
          onMouseDown={(e) => e.stopPropagation()}
          onBlur={(e) => props.onEditRole(r.id, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
      </div>
    </foreignObject>
  )
}

// The selected controls — cardinality readout · role field · delete — laid out around (cx, cy).
function controls(r: Relationship, cx: number, cy: number, props: Props) {
  return (
    <>
      {cardReadout(r, cx - 66, cy, props)}
      {roleBox(r, cx, cy, props)}
      {delBtn(cx + 64, cy, () => props.onDeleteRel(r.id))}
    </>
  )
}

// Cardinality control + readout (`1:N`): click to cycle 1:1 → 1:N → N:M. Sits above the line
// (clear of the role box), with a plate to mask the line behind it.
function cardReadout(r: Relationship, x: number, y: number, props: Props) {
  const txt = cardLabel(r.fromCard, r.toCard)
  const w = txt.length * CH + 8
  return (
    <g>
      <rect className="rel-label-bg" x={x - w / 2} y={y - 7} width={w} height={14} rx={4} />
      <text className="rel-card" x={x} y={y + 3} textAnchor="middle"
        onMouseDown={(e) => { e.stopPropagation(); props.onSelectRel(r.id) }}
        onClick={(e) => { e.stopPropagation(); props.onCycleCardinality(r) }}>{txt}</text>
    </g>
  )
}

function endpoint(x: number, y: number, _click: () => void, onDown: (e: React.MouseEvent) => void) {
  // Drag to re-route this end to another table; cardinality is changed via the label.
  return <circle className="rel-end" cx={x} cy={y} r={5}
    onMouseDown={(e) => { e.stopPropagation(); onDown(e) }} />
}

function delBtn(x: number, y: number, onDel: () => void) {
  return (
    <g className="rel-del" onMouseDown={(e) => { e.stopPropagation(); onDel() }}>
      <circle cx={x} cy={y} r={8} className="rel-del-bg" />
      <line x1={x - 3} y1={y - 3} x2={x + 3} y2={y + 3} />
      <line x1={x + 3} y1={y - 3} x2={x - 3} y2={y + 3} />
    </g>
  )
}
