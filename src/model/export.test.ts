import { describe, it, expect } from 'vitest'
import { toDBML, toSQL, toDbt } from './export'
import type { Entity, Relationship } from './board'

// A small known model: users (id, email) ← orders (id, user_id, amount).
const users: Entity = {
  id: 'u', name: 'users', x: 0, y: 0, color: null,
  fields: [
    { id: 'u_id', name: 'id', type: 'pk' },
    { id: 'u_email', name: 'email', type: 'email' },
  ],
}
const orders: Entity = {
  id: 'o', name: 'orders', x: 0, y: 0, color: null,
  fields: [
    { id: 'o_id', name: 'id', type: 'pk' },
    { id: 'o_uid', name: 'user_id', type: 'fk' },
    { id: 'o_amt', name: 'amount', type: 'number' },
  ],
}
const rel: Relationship = {
  id: 'r', fromId: 'o', toId: 'u', fromField: 'o_uid', toField: 'u_id',
  fromCard: 'many', toCard: 'one', role: 'buyer',
}
const entities = [users, orders]
const rels = [rel]

describe('toDBML', () => {
  const out = toDBML(entities, rels)
  it('emits tables with pk-marked columns', () => {
    expect(out).toContain('Table users {')
    expect(out).toContain('id int [pk]')
    expect(out).toContain('email varchar')
    expect(out).toContain('Table orders {')
  })
  it('emits a column-level ref carrying the role and cardinality', () => {
    expect(out).toContain('Ref buyer: orders.user_id > users.id')
  })
})

describe('toSQL', () => {
  it('postgres: quoted idents, serial pk, fk constraint', () => {
    const out = toSQL(entities, rels, 'postgres')
    expect(out).toContain('create table "users" (')
    expect(out).toContain('"id" serial primary key')
    expect(out).toContain('foreign key ("user_id") references "users" ("id")')
  })
  it('mysql: backtick quoting and auto_increment', () => {
    const out = toSQL(entities, rels, 'mysql')
    expect(out).toContain('create table `orders` (')
    expect(out).toContain('`id` int auto_increment primary key')
  })
  it('sqlserver: bracket quoting and identity', () => {
    const out = toSQL(entities, rels, 'sqlserver')
    expect(out).toContain('create table [users] (')
    expect(out).toContain('[id] int identity(1,1) primary key')
  })
})

describe('toDbt', () => {
  const out = toDbt(entities, rels)
  it('emits schema.yml with a relationships test on the fk', () => {
    expect(out).toContain('version: 2')
    expect(out).toContain('- name: orders')
    expect(out).toContain('- relationships:')
    expect(out).toContain("to: ref('users')")
    expect(out).toContain('field: id')
  })
  it('emits a model stub per entity', () => {
    expect(out).toContain("source('raw', 'users')")
    expect(out).toContain("source('raw', 'orders')")
  })
})
