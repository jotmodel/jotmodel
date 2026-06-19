import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { boardSummary, SUMMARY_MAX_ENTITIES } from './summary'

function addEntity(doc: Y.Doc, id: string, x: number, y: number, fieldCount: number, color: string | null) {
  const m = new Y.Map<any>()
  m.set('id', id); m.set('name', id); m.set('x', x); m.set('y', y); m.set('color', color)
  const fields = new Y.Array<any>()
  fields.push(Array.from({ length: fieldCount }, (_, i) => ({ id: id + i, name: 'f' + i, type: 'string' })))
  m.set('fields', fields)
  doc.getMap('entities').set(id, m)
}
function addRel(doc: Y.Doc, id: string, from: string, to: string) {
  const m = new Y.Map<any>()
  m.set('id', id); m.set('fromId', from); m.set('toId', to)
  doc.getMap('relationships').set(id, m)
}

describe('boardSummary', () => {
  it('is empty for a blank doc', () => {
    expect(boardSummary(new Y.Doc())).toEqual({ v: 1, e: [], r: [] })
  })

  it('captures entity geometry, field count and colour, and the edge list', () => {
    const doc = new Y.Doc()
    addEntity(doc, 'a', 10, 20, 3, 'teal')
    addEntity(doc, 'b', 300, 120, 0, null)
    addRel(doc, 'r1', 'a', 'b')
    const s = boardSummary(doc)
    expect(s.e).toContainEqual({ i: 'a', x: 10, y: 20, n: 3, c: 'teal' })
    expect(s.e).toContainEqual({ i: 'b', x: 300, y: 120, n: 0, c: null })
    expect(s.r).toEqual([['a', 'b']])
  })

  it('drops relationships whose endpoints did not survive', () => {
    const doc = new Y.Doc()
    addEntity(doc, 'a', 0, 0, 1, null)
    addRel(doc, 'r1', 'a', 'ghost')
    expect(boardSummary(doc).r).toEqual([])
  })

  it('caps the number of entities so the list payload stays bounded', () => {
    const doc = new Y.Doc()
    for (let i = 0; i < SUMMARY_MAX_ENTITIES + 10; i++) addEntity(doc, 'e' + i, i, i, 0, null)
    expect(boardSummary(doc).e.length).toBe(SUMMARY_MAX_ENTITIES)
  })
})
