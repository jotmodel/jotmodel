import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Entity } from '../model/board'

// Header height fallback before .ent-h is measured (matches the design system / geom HEADER_H).
const HEADER_FALLBACK = 38
// The relate dot only appears within this many px of a relate-edge (keeps it clear of row controls).
const EDGE_GATE = 24

export interface EntityCardProps {
  entity: Entity
  selected: boolean
  armed: boolean
  dragging: boolean
  renaming: boolean
  autoFocusFields: boolean
  offset: { dx: number; dy: number } | null
  onMeasure: (id: string, el: HTMLElement | null) => void
  onSelect: (e: React.MouseEvent) => void
  onStartMove: (e: React.MouseEvent) => void
  onStartRelate: (e: React.MouseEvent) => void
  onFieldPointerDown: (fieldId: string, e: React.MouseEvent) => void
  onCycleColor: () => void
  onRenameStart: () => void
  onRenameCommit: (name: string) => void
  onRenameCancel: () => void
  onDelete: () => void
  onAddFields: (csv: string) => void
  onRenameField: (fieldId: string, name: string) => void
  onDeleteField: (fieldId: string) => void
  onCycleFieldType: (fieldId: string, dir: 1 | -1) => void
}

export function EntityCard(props: EntityCardProps) {
  const { entity, selected, armed, dragging, renaming, autoFocusFields } = props
  const [showField, setShowField] = useState(autoFocusFields)
  const [editing, setEditing] = useState<string | null>(null) // field id being renamed
  const fieldRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  // The relate dot tracks the pointer: it snaps to the nearest relate-edge (left/right/bottom) at
  // the cursor's position so the connector is always under the mouse, and hides over the header
  // (move zone). Driven by direct DOM writes — no re-render per mouse-move.
  function onCardMouseMove(e: React.MouseEvent) {
    const root = rootRef.current, dot = handleRef.current
    if (!root || !dot) return
    const rect = root.getBoundingClientRect()
    const scale = rect.width / root.offsetWidth || 1
    const W = root.offsetWidth, H = root.offsetHeight
    const lx = (e.clientX - rect.left) / scale
    const ly = (e.clientY - rect.top) / scale
    const headerH = headerRef.current?.offsetHeight ?? HEADER_FALLBACK
    if (ly < headerH) { dot.style.opacity = '0'; return }
    const sy = Math.max(headerH, Math.min(H, ly))
    const cands = [
      { x: 0, y: sy, d: lx },                                  // left edge
      { x: W, y: sy, d: W - lx },                              // right edge
      { x: Math.max(0, Math.min(W, lx)), y: H, d: H - ly },    // bottom edge
    ]
    const best = cands.reduce((a, b) => (b.d < a.d ? b : a))
    // Only show near an edge — keep the dot out of the way while reaching for in-row controls.
    if (best.d > EDGE_GATE) { dot.style.opacity = '0'; return }
    dot.style.left = `${best.x}px`
    dot.style.top = `${best.y}px`
    dot.style.right = 'auto'
    dot.style.transform = 'translate(-50%, -50%)'
    dot.style.opacity = '1'
  }
  function onCardMouseLeave() {
    const dot = handleRef.current
    if (!dot) return
    // Reset every inline prop so the dot returns to its CSS default (right-center, hover-gated).
    dot.style.left = dot.style.top = dot.style.right = dot.style.transform = dot.style.opacity = ''
  }

  useLayoutEffect(() => {
    props.onMeasure(entity.id, rootRef.current)
    return () => props.onMeasure(entity.id, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (showField) fieldRef.current?.focus() }, [showField])
  useEffect(() => { if (autoFocusFields) setShowField(true) }, [autoFocusFields])

  const cls = ['ent', 'pop', selected ? 'selected' : '', armed ? 'armed' : '', dragging ? 'dragging' : '',
    entity.color ? `c-${entity.color}` : ''].filter(Boolean).join(' ')

  return (
    <div
      ref={rootRef}
      className={cls}
      data-entity-id={entity.id}
      style={{
        left: entity.x,
        top: entity.y,
        // Transient "make room" shift while a touching relationship is selected; only set when
        // non-zero so it never clobbers the .pop entrance animation's transform.
        transform: props.offset ? `translate(${props.offset.dx}px, ${props.offset.dy}px)` : undefined,
      }}
      onMouseDown={(e) => { e.stopPropagation(); props.onSelect(e) }}
      onMouseMove={onCardMouseMove}
      onMouseLeave={onCardMouseLeave}
    >
      <div
        ref={headerRef}
        className="ent-h"
        onMouseDown={(e) => {
          const t = e.target as HTMLElement
          if (t.classList.contains('cdot') || t.classList.contains('ent-x') || t.tagName === 'INPUT') return
          props.onStartMove(e)
        }}
        onDoubleClick={() => props.onRenameStart()}
      >
        <span className="cdot" title="color-code" onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); props.onCycleColor() }} />
        {renaming ? (
          <input
            autoFocus
            defaultValue={entity.name}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => props.onRenameCommit(e.target.value.trim() || entity.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') props.onRenameCommit((e.target as HTMLInputElement).value.trim() || entity.name)
              if (e.key === 'Escape') props.onRenameCancel()
            }}
          />
        ) : (
          <span className="nm">{entity.name}</span>
        )}
        <button className="ent-x" title="delete table" onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); props.onDelete() }}>×</button>
      </div>

      <div className="ent-b">
        {entity.fields.map((f) => (
          <div
            className="row"
            key={f.id}
            data-field-id={f.id}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).classList.contains('row-x')) return
              if (editing) return
              props.onFieldPointerDown(f.id, e)
            }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(f.id) }}
          >
            {editing === f.id ? (
              <input
                className="fn-edit"
                autoFocus
                defaultValue={f.name}
                onFocus={(e) => e.target.select()}
                onMouseDown={(e) => e.stopPropagation()}
                onBlur={(e) => { props.onRenameField(f.id, e.target.value.trim() || f.name); setEditing(null) }}
                onKeyDown={(e) => {
                  const el = e.target as HTMLInputElement
                  if (e.key === 'Enter') { props.onRenameField(f.id, el.value.trim() || f.name); setEditing(null) }
                  else if (e.key === 'Escape') setEditing(null)
                  else if (e.key === 'Tab') {
                    e.preventDefault()
                    props.onRenameField(f.id, el.value.trim() || f.name)
                    const i = entity.fields.findIndex(x => x.id === f.id)
                    const nextF = entity.fields[i + 1]
                    setEditing(nextF ? nextF.id : null)
                    if (!nextF) setShowField(true)
                  }
                }}
              />
            ) : (
              <>
                <span className={'fn' + (f.type === 'pk' ? ' pk' : '')}>{f.name}</span>
                <span
                  className="ty"
                  role="button"
                  tabIndex={0}
                  title="Change type (click; ⇧-click to reverse)"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); props.onCycleFieldType(f.id, e.shiftKey ? -1 : 1) }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onCycleFieldType(f.id, e.shiftKey ? -1 : 1) }
                  }}
                >{f.type}</span>
                <button className="row-x" title="delete field" onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); props.onDeleteField(f.id) }}>×</button>
              </>
            )}
          </div>
        ))}

        {/* Relate-from-edge: pressing any of these border strips (or the hover dot) arms a relate
            drag — the whole table edge is the connector. Siblings of the rows (not inside them), so
            they bubble to the card root for selection but don't trigger a field's `as <field>`. */}
        <div className="redge r-l" title="drag to relate" onMouseDown={(e) => props.onStartRelate(e)} />
        <div className="redge r-r" title="drag to relate" onMouseDown={(e) => props.onStartRelate(e)} />
        <div className="redge r-b" title="drag to relate" onMouseDown={(e) => props.onStartRelate(e)} />

        {showField ? (
          <div className="fieldinput">
            <input
              ref={fieldRef}
              placeholder="fields, comma-separated…  ↵"
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                const el = e.target as HTMLInputElement
                if (e.key === 'Enter') {
                  if (el.value.trim() === '') { setShowField(false); return }
                  props.onAddFields(el.value); el.value = ''
                } else if (e.key === 'Escape') setShowField(false)
              }}
            />
          </div>
        ) : (
          <button className="addfield" onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowField(true) }}>＋ field</button>
        )}
      </div>

      {/* Top-edge relate. Sibling of the root (not the body), so it sits on the card's true top
          border — a thin rim straddling it, mostly *above* the card so it doesn't eat the header's
          move zone (only the top ~2px of the header is given to relate, mirroring the other edges). */}
      <div className="redge r-t" title="drag to relate" onMouseDown={(e) => props.onStartRelate(e)} />

      <div ref={handleRef} className="handle" title="drag to relate"
        onMouseDown={(e) => props.onStartRelate(e)} />
    </div>
  )
}
