import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  inferType, addEntity, addFields, addRelationship, setRelationshipCard,
  deleteField, deleteEntity, readEntities, readRels, setFieldType, renameField,
} from './board'

describe('inferType — natural language, no conventions required', () => {
  it.each([
    ['id', 'pk'],
    ['user_id', 'fk'],
    ['email', 'email'],
    ['active?', 'boolean'],
    ['is active', 'boolean'],
    ['created_at', 'timestamp'],
    ['order date', 'date'],
    ['amount', 'number'],
    ['total', 'number'],
    ['phone', 'text'],
    ['sender', 'string'],
  ] as const)('%s → %s', (name, type) => {
    expect(inferType(name)).toBe(type)
  })
})

describe('field mutations', () => {
  it('addFields infers types from comma-separated natural language', () => {
    const doc = new Y.Doc()
    const id = addEntity(doc, 0, 0, 'users')
    addFields(doc, id, 'email, amount, active?')
    const e = readEntities(doc).find(x => x.id === id)!
    expect(e.fields.map(f => [f.name, f.type])).toEqual([
      ['email', 'email'], ['amount', 'number'], ['active?', 'boolean'],
    ])
  })

  it('a hand-set type is preserved when the field is renamed', () => {
    const doc = new Y.Doc()
    const id = addEntity(doc, 0, 0, 'users')
    addFields(doc, id, 'amount')
    const fid = readEntities(doc).find(x => x.id === id)!.fields[0].id
    setFieldType(doc, id, fid, 'string')      // user override → typed=true
    renameField(doc, id, fid, 'total')        // would infer 'number', but must keep 'string'
    const f = readEntities(doc).find(x => x.id === id)!.fields[0]
    expect(f).toMatchObject({ name: 'total', type: 'string', typed: true })
  })
})

describe('relationship mutations', () => {
  it('defaults to 1:N and toggles per end', () => {
    const doc = new Y.Doc()
    const a = addEntity(doc, 0, 0, 'orders')
    const b = addEntity(doc, 300, 0, 'users')
    const rid = addRelationship(doc, a, b, {})
    let r = readRels(doc)[0]
    expect([r.fromCard, r.toCard]).toEqual(['one', 'many'])
    setRelationshipCard(doc, rid, 'from', 'many')
    setRelationshipCard(doc, rid, 'to', 'many')
    r = readRels(doc)[0]
    expect([r.fromCard, r.toCard]).toEqual(['many', 'many'])
  })

  it('deleteField nulls the relationship ref but keeps the relationship', () => {
    const doc = new Y.Doc()
    const a = addEntity(doc, 0, 0, 'orders')
    const b = addEntity(doc, 300, 0, 'users')
    addFields(doc, a, 'user_id')
    const fid = readEntities(doc).find(e => e.id === a)!.fields[0].id
    addRelationship(doc, a, b, { fromField: fid })
    deleteField(doc, a, fid)
    const r = readRels(doc)[0]
    expect(r.fromField).toBeNull()
    expect(readRels(doc)).toHaveLength(1)
  })

  it('deleteEntity sweeps its relationships', () => {
    const doc = new Y.Doc()
    const a = addEntity(doc, 0, 0, 'orders')
    const b = addEntity(doc, 300, 0, 'users')
    addRelationship(doc, a, b, {})
    expect(readRels(doc)).toHaveLength(1)
    deleteEntity(doc, a)
    expect(readEntities(doc)).toHaveLength(1)
    expect(readRels(doc)).toHaveLength(0)
  })
})
