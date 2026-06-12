import { useEffect, useReducer, useRef } from 'react'
import type { Board, Entity, Relationship, Card } from '../model/board'
import {
  addEntity, addFields, addRelationship, cycleFieldType, deleteEntity, deleteField, deleteRelationship,
  entityNameExists, moveEntity, renameEntity, renameField, setEntityColor, SEM,
  setRelationshipCard, setRelationshipEnd, setRelationshipRole,
} from '../model/board'
import {
  rectOf, fieldAnchor, HEADER_H, ROW_H, BODY_PAD, type Sizes,
} from '../model/geom'
import { reducer, initialState, type Pt } from './reducer'
import { EntityCard } from './EntityCard'
import { Relationships } from './Relationships'

interface Hit { entityId: string; fieldId: string | null }

const nextCard = (c: Card): Card => (c === 'one' ? 'many' : 'one')

export function Canvas({ board, entities, rels }: { board: Board; entities: Entity[]; rels: Relationship[] }) {
  const doc = board.doc
  const stageRef = useRef<HTMLDivElement>(null)
  const [state, dispatch] = useReducer(reducer, initialState)

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
  const pendingRelate = useRef<{ fromId: string; fromField: string; from: Pt; sx: number; sy: number } | null>(null)
  const renameRef = useRef<string | null>(null)
  // Entity that should focus its field input once its name is committed (relate-create flow).
  const pendingFieldsRef = useRef<string | null>(null)
  const [, forceUi] = useReducer((n: number) => n + 1, 0)
  const dupRef = useRef<string | null>(null)

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
      const tl = stateRef.current.tool
      // field-drag becomes a relate once it passes the threshold
      const pr = pendingRelate.current
      if (pr && Math.hypot(p.sx - pr.sx, p.sy - pr.sy) > 5) {
        dispatch({ t: 'startRelate', fromId: pr.fromId, fromField: pr.fromField, from: pr.from })
        pendingRelate.current = null
      }
      if (tl.k === 'moving') {
        moveEntity(doc, tl.id, p.x - tl.dx, p.y - tl.dy)
      }
      dispatch({ t: 'pointerMove', world: { x: p.x, y: p.y }, sx: p.sx, sy: p.sy, ddx: 0, ddy: 0 })
    }
    function onUp(ev: MouseEvent) {
      const tl = stateRef.current.tool
      const p = screenToWorld(ev.clientX, ev.clientY)
      pendingRelate.current = null
      if (tl.k === 'relating') {
        const hit = hitTest(ev.clientX, ev.clientY)
        const role = tl.fromField ? fieldName(tl.fromId, tl.fromField) : null
        if (hit) {
          addRelationship(doc, tl.fromId, hit.entityId, { fromField: tl.fromField, toField: hit.fieldId, role })
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
        if (hit) setRelationshipEnd(doc, tl.relId, tl.end, hit.entityId, hit.fieldId)
      }
      dispatch({ t: 'endTool' })
    }
    function onKey(ev: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const meta = ev.metaKey || ev.ctrlKey
      if (meta && (ev.key === 'z' || ev.key === 'Z')) {
        if (typing) return
        ev.preventDefault()
        if (ev.shiftKey) board.undo.redo(); else board.undo.undo()
        return
      }
      if (meta && (ev.key === 'y' || ev.key === 'Y')) { if (!typing) { ev.preventDefault(); board.undo.redo() } return }
      if (typing) return
      const sel = stateRef.current.selection
      if (ev.key === 'Escape') { dispatch({ t: 'escape' }); renameRef.current = null; dupRef.current = null; forceUi(); return }
      if (ev.key === ' ') { spaceRef.current = true; if (stageRef.current) stageRef.current.style.cursor = 'grab' }
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && sel) {
        if (sel.type === 'entity') deleteEntity(doc, sel.id)
        else deleteRelationship(doc, sel.id)
        dispatch({ t: 'clearSel' }); return
      }
      if (sel?.type === 'entity' && (ev.key === 'Enter' || ev.key === 'F2')) {
        renameRef.current = sel.id; forceUi(); return
      }
      if (sel?.type === 'rel') {
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
    // Keep the browser from moving focus to <body> on mouseup, so the name input's
    // focus (set on mount) sticks instead of being yanked away.
    ev.preventDefault()
    dispatch({ t: 'openName', at: { x: p.x, y: p.y } })
    dupRef.current = null
  }

  // ---- card callbacks ----
  function onCardSelect(id: string) { dispatch({ t: 'selectEntity', id }) }
  function onCardMove(e: Entity, ev: React.MouseEvent) {
    const p = screenToWorld(ev.clientX, ev.clientY)
    dispatch({ t: 'selectEntity', id: e.id })
    dispatch({ t: 'startMove', id: e.id, dx: p.x - e.x, dy: p.y - e.y })
  }
  function onCardRelateHandle(e: Entity) {
    dispatch({ t: 'startRelate', fromId: e.id, fromField: null, from: edgeAnchorWorld(e) })
  }
  function onFieldPointerDown(e: Entity, fieldId: string, ev: React.MouseEvent) {
    const p = screenToWorld(ev.clientX, ev.clientY)
    pendingRelate.current = { fromId: e.id, fromField: fieldId, from: fieldStartWorld(e, fieldId), sx: p.sx, sy: p.sy }
  }

  // ---- rel callbacks ----
  function onEndpointDown(relId: string, end: 'from' | 'to', ev: React.MouseEvent) {
    const p = screenToWorld(ev.clientX, ev.clientY)
    dispatch({ t: 'startEndpoint', relId, end, sx: p.sx, sy: p.sy, cur: { x: p.x, y: p.y } })
  }
  function cycleCardinality(r: Relationship) {
    // 1:1 -> 1:N -> N:M -> 1:1
    const cur = `${r.fromCard}-${r.toCard}`
    const next: [Card, Card] = cur === 'one-one' ? ['one', 'many'] : cur === 'one-many' ? ['many', 'many'] : ['one', 'one']
    setRelationshipCard(doc, r.id, 'from', next[0]); setRelationshipCard(doc, r.id, 'to', next[1])
  }

  // temp drag line
  let temp: { x1: number; y1: number; x2: number; y2: number } | null = null
  const tool = state.tool
  if (tool.k === 'relating') temp = { x1: tool.from.x, y1: tool.from.y, x2: tool.cur.x, y2: tool.cur.y }
  else if (tool.k === 'rerouting') {
    const relId = tool.relId, end = tool.end, cur = tool.cur
    const r = rels.find(x => x.id === relId)
    if (r) {
      const fe = entityById(end === 'from' ? r.toId : r.fromId)
      if (fe) { const a = edgeAnchorWorld(fe); temp = { x1: a.x, y1: a.y, x2: cur.x, y2: cur.y } }
    }
  }

  const { tx, ty, scale } = state.view
  const movingId = state.tool.k === 'moving' ? state.tool.id : null
  const showHint = entities.length === 0 && state.tool.k !== 'naming'

  const pushed = computePush()

  return (
    <div
      className="stage"
      ref={stageRef}
      onMouseDown={onStageMouseDown}
      style={{ backgroundPosition: `${tx}px ${ty}px`, backgroundSize: `${24 * scale}px ${24 * scale}px` }}
    >
      {showHint && (
        <div className="hint">
          <b>Click anywhere</b> to add a table<br />
          fields are comma-separated · types infer<br />
          drag the edge dot (or a field) to relate · click the header dot to color-code<br />
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
          onSelectRel={(id, end) => dispatch({ t: 'selectRel', id, end })}
          onDeleteRel={(id) => { deleteRelationship(doc, id); dispatch({ t: 'clearSel' }) }}
          onEndpointDown={onEndpointDown}
          onCycleCardinality={cycleCardinality}
          onEditRole={(id, role) => setRelationshipRole(doc, id, role)}
        />

        {entities.map((e) => (
          <EntityCard
            key={e.id}
            entity={e}
            selected={state.selection?.type === 'entity' && state.selection.id === e.id}
            dragging={movingId === e.id}
            renaming={renameRef.current === e.id}
            autoFocusFields={e.id === state.newId}
            offset={pushed.get(e.id) ?? null}
            onMeasure={measure}
            onSelect={() => onCardSelect(e.id)}
            onStartMove={(ev) => onCardMove(e, ev)}
            onStartRelate={() => onCardRelateHandle(e)}
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

      <div className="zoomctl">
        <button title="Zoom out (-)" onClick={() => zoomCenter(1 / 1.2)}>–</button>
        <button className="pct" title="Reset to 100% (⌘0)" onClick={() => dispatch({ t: 'setView', view: { tx: 0, ty: 0, scale: 1 } })}>{Math.round(scale * 100)}%</button>
        <button title="Zoom in (+)" onClick={() => zoomCenter(1.2)}>+</button>
        <button title="Fit to content (⇧1)" onClick={fitToContent}>⤢</button>
      </div>
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
