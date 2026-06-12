import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

// ---- types ----
export type FieldType =
  | 'pk' | 'fk' | 'string' | 'text' | 'number' | 'boolean' | 'date' | 'timestamp' | 'email'
export interface Field { id: string; name: string; type: FieldType }
export type Card = 'one' | 'many'
export interface Entity {
  id: string; name: string; x: number; y: number
  color: string | null; fields: Field[]
}
export interface Relationship {
  id: string; fromId: string; toId: string
  /** Field.id on each end, or null for a table-level (edge) relationship. */
  fromField: string | null; toField: string | null
  fromCard: Card; toCard: Card; role: string | null
}

export const SEM = ['slate', 'cyan', 'teal', 'green', 'amber', 'orange', 'rose', 'violet'] as const

/** Origin stamped on every local edit, so UndoManager tracks only this user's changes
 *  (remote/provider edits use the provider as origin and are excluded — future-proof for the relay). */
export const LOCAL_ORIGIN = Symbol('jotmodel-local')
const SCHEMA = 2

// ---- doc ----
export interface Board { doc: Y.Doc; provider: IndexeddbPersistence; undo: Y.UndoManager }
export function createBoard(boardId = 'local'): Board {
  const doc = new Y.Doc()
  const provider = new IndexeddbPersistence('jotmodel-' + boardId, doc)
  const undo = new Y.UndoManager([entitiesMap(doc), relsMap(doc)], {
    trackedOrigins: new Set([LOCAL_ORIGIN]),
    captureTimeout: 350,
  })
  // schema marker for the future; not tracked by undo, merges idempotently.
  doc.transact(() => doc.getMap('meta').set('schema', SCHEMA))
  return { doc, provider, undo }
}
const entitiesMap = (doc: Y.Doc) => doc.getMap<Y.Map<any>>('entities')
const relsMap = (doc: Y.Doc) => doc.getMap<Y.Map<any>>('relationships')

let counter = 0
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(counter++).toString(36)}`

/** Run a mutation as a single local (undoable) transaction. */
function edit(doc: Y.Doc, fn: () => void) {
  doc.transact(fn, LOCAL_ORIGIN)
}

// ---- gentle, natural-language type inference (never required) ----
export function inferType(name: string): FieldType {
  const n = name.trim().toLowerCase()
  if (!n) return 'string'
  if (n === 'id') return 'pk'
  if (/(^|[\s_])email([\s_]|$)/.test(n)) return 'email'
  if (/_id$|\bid of\b|\bref\b/.test(n)) return 'fk'
  if (/^(is|has)\s|\?$|\b(active|paid|done|enabled|verified|complete)\b/.test(n)) return 'boolean'
  if (/_at$|\b(created|updated|timestamp|time)\b/.test(n)) return 'timestamp'
  if (/\bdate\b|date$|\bwhen\b/.test(n)) return 'date'
  if (/\b(amount|price|total|cost|qty|quantity|count|number of|sum|balance)\b/.test(n)) return 'number'
  if (/\b(phone|address|notes?|description|bio|comment)\b/.test(n)) return 'text'
  return 'string'
}

// ---- read helpers ----
function toEntity(m: Y.Map<any>): Entity {
  const fields = (m.get('fields') as Y.Array<Field> | undefined)?.toArray() ?? []
  return {
    id: m.get('id'), name: m.get('name'),
    x: m.get('x'), y: m.get('y'),
    color: m.get('color') ?? null, fields,
  }
}
function toRel(m: Y.Map<any>): Relationship {
  return {
    id: m.get('id'), fromId: m.get('fromId'), toId: m.get('toId'),
    fromField: m.get('fromField') ?? null, toField: m.get('toField') ?? null,
    fromCard: m.get('fromCard'), toCard: m.get('toCard'), role: m.get('role') ?? null,
  }
}
export function readEntities(doc: Y.Doc): Entity[] {
  return Array.from(entitiesMap(doc).values()).map(toEntity)
}
export function readRels(doc: Y.Doc): Relationship[] {
  return Array.from(relsMap(doc).values()).map(toRel)
}
export function observe(doc: Y.Doc, cb: () => void): () => void {
  const e = entitiesMap(doc), r = relsMap(doc)
  e.observeDeep(cb); r.observeDeep(cb)
  return () => { e.unobserveDeep(cb); r.unobserveDeep(cb) }
}

// ---- name helpers (ask, don't guess) ----
export function entityNameExists(doc: Y.Doc, name: string, exceptId?: string): boolean {
  const want = name.trim().toLowerCase()
  return readEntities(doc).some(e => e.id !== exceptId && e.name.trim().toLowerCase() === want)
}
export function fieldNameExists(doc: Y.Doc, entityId: string, name: string, exceptId?: string): boolean {
  const m = entitiesMap(doc).get(entityId)
  if (!m) return false
  const want = name.trim().toLowerCase()
  const arr = (m.get('fields') as Y.Array<Field>).toArray()
  return arr.some(f => f.id !== exceptId && f.name.trim().toLowerCase() === want)
}

// ---- entity mutations ----
export function addEntity(doc: Y.Doc, x: number, y: number, name: string): string {
  const id = uid('e')
  edit(doc, () => {
    const m = new Y.Map<any>()
    m.set('id', id); m.set('name', name)
    m.set('x', x); m.set('y', y); m.set('color', null)
    m.set('fields', new Y.Array<Field>())
    entitiesMap(doc).set(id, m)
  })
  return id
}
export function renameEntity(doc: Y.Doc, id: string, name: string) {
  const m = entitiesMap(doc).get(id); if (m) edit(doc, () => m.set('name', name))
}
export function moveEntity(doc: Y.Doc, id: string, x: number, y: number) {
  const m = entitiesMap(doc).get(id)
  if (m) edit(doc, () => { m.set('x', x); m.set('y', y) })
}
export function setEntityColor(doc: Y.Doc, id: string, color: string | null) {
  const m = entitiesMap(doc).get(id); if (m) edit(doc, () => m.set('color', color))
}
export function deleteEntity(doc: Y.Doc, id: string) {
  edit(doc, () => {
    entitiesMap(doc).delete(id)
    const r = relsMap(doc)
    for (const [rid, m] of r) if (m.get('fromId') === id || m.get('toId') === id) r.delete(rid)
  })
}

// ---- field mutations ----
export function addFields(doc: Y.Doc, id: string, csv: string) {
  const m = entitiesMap(doc).get(id); if (!m) return
  const arr = m.get('fields') as Y.Array<Field>
  const next: Field[] = csv.split(',').map(s => s.trim()).filter(Boolean)
    .map(name => ({ id: uid('f'), name, type: inferType(name) }))
  if (next.length) edit(doc, () => arr.push(next))
}
export function renameField(doc: Y.Doc, entityId: string, fieldId: string, name: string) {
  const m = entitiesMap(doc).get(entityId); if (!m) return
  const arr = m.get('fields') as Y.Array<Field>
  const i = arr.toArray().findIndex(f => f.id === fieldId)
  if (i < 0) return
  const f = arr.get(i)
  edit(doc, () => { arr.delete(i, 1); arr.insert(i, [{ ...f, name, type: inferType(name) }]) })
}
export function setFieldType(doc: Y.Doc, entityId: string, fieldId: string, type: FieldType) {
  const m = entitiesMap(doc).get(entityId); if (!m) return
  const arr = m.get('fields') as Y.Array<Field>
  const i = arr.toArray().findIndex(f => f.id === fieldId)
  if (i < 0) return
  const f = arr.get(i)
  edit(doc, () => { arr.delete(i, 1); arr.insert(i, [{ ...f, type }]) })
}
export function deleteField(doc: Y.Doc, entityId: string, fieldId: string) {
  const m = entitiesMap(doc).get(entityId); if (!m) return
  const arr = m.get('fields') as Y.Array<Field>
  const i = arr.toArray().findIndex(f => f.id === fieldId)
  if (i < 0) return
  edit(doc, () => {
    arr.delete(i, 1)
    // keep relationships alive — drop them to table-level by nulling the dead ref
    const r = relsMap(doc)
    for (const [, rm] of r) {
      if (rm.get('fromId') === entityId && rm.get('fromField') === fieldId) rm.set('fromField', null)
      if (rm.get('toId') === entityId && rm.get('toField') === fieldId) rm.set('toField', null)
    }
  })
}

// ---- relationship mutations ----
export interface RelOpts { fromField?: string | null; toField?: string | null; role?: string | null }
export function addRelationship(doc: Y.Doc, fromId: string, toId: string, opts: RelOpts = {}): string {
  const id = uid('r')
  edit(doc, () => {
    const m = new Y.Map<any>()
    m.set('id', id); m.set('fromId', fromId); m.set('toId', toId)
    m.set('fromField', opts.fromField ?? null); m.set('toField', opts.toField ?? null)
    m.set('fromCard', 'one'); m.set('toCard', 'many') // default 1:N
    m.set('role', opts.role ?? null)
    relsMap(doc).set(id, m)
  })
  return id
}
export function setRelationshipEnd(doc: Y.Doc, id: string, end: 'from' | 'to', entityId: string, fieldId: string | null) {
  const m = relsMap(doc).get(id); if (!m) return
  edit(doc, () => {
    m.set(end === 'from' ? 'fromId' : 'toId', entityId)
    m.set(end === 'from' ? 'fromField' : 'toField', fieldId)
  })
}
export function setRelationshipCard(doc: Y.Doc, id: string, end: 'from' | 'to', card: Card) {
  const m = relsMap(doc).get(id); if (!m) return
  edit(doc, () => m.set(end === 'from' ? 'fromCard' : 'toCard', card))
}
export function setRelationshipRole(doc: Y.Doc, id: string, role: string | null) {
  const m = relsMap(doc).get(id); if (!m) return
  edit(doc, () => m.set('role', role && role.trim() ? role.trim() : null))
}
export function deleteRelationship(doc: Y.Doc, id: string) {
  edit(doc, () => relsMap(doc).delete(id))
}

// ---- import (.jotmodel) ----
export function clearBoard(doc: Y.Doc) {
  edit(doc, () => { entitiesMap(doc).clear(); relsMap(doc).clear() })
}
/** Apply an imported CRDT update. 'replace' clears first; 'merge' overlays (CRDT-safe). */
export function importUpdate(doc: Y.Doc, update: Uint8Array, mode: 'replace' | 'merge') {
  if (mode === 'replace') clearBoard(doc)
  Y.applyUpdate(doc, update, LOCAL_ORIGIN)
}
