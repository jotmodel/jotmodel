import { describe, it, expect } from 'vitest'
import { resolveShare, checkAcl } from './auth'

type Row = Record<string, unknown> | null

/** Minimal D1 stub: route each prepared statement to a canned row by SQL substring. */
function mockEnv(route: (sql: string, binds: unknown[]) => Row): any {
  return {
    DB: {
      prepare(sql: string) {
        return {
          bind: (...binds: unknown[]) => ({
            first: async () => route(sql, binds),
            all: async () => ({ results: [] }),
            run: async () => ({}),
          }),
        }
      },
    },
  }
}

describe('resolveShare — capability token → identity', () => {
  it('resolves a valid, unexpired token scoped to the board', async () => {
    const env = mockEnv(() => ({ board_id: 'b1', role: 'viewer', expires_at: null }))
    const id = await resolveShare(env, 'tok123456', 'b1')
    expect(id?.role).toBe('viewer')
    expect(id?.userId).toMatch(/^share:/)
  })
  it('rejects a token issued for a different board', async () => {
    const env = mockEnv(() => ({ board_id: 'other', role: 'viewer', expires_at: null }))
    expect(await resolveShare(env, 'tok123456', 'b1')).toBeNull()
  })
  it('rejects an expired token', async () => {
    const env = mockEnv(() => ({ board_id: 'b1', role: 'editor', expires_at: Date.now() - 1000 }))
    expect(await resolveShare(env, 'tok123456', 'b1')).toBeNull()
  })
  it('rejects an unknown token', async () => {
    const env = mockEnv(() => null)
    expect(await resolveShare(env, 'nope', 'b1')).toBeNull()
  })
})

describe('checkAcl — owner via boards, else members.role', () => {
  it('returns owner when boards.owner_id matches', async () => {
    const env = mockEnv((sql) => (sql.includes('FROM boards') ? { owner_id: 'u1' } : null))
    expect(await checkAcl(env, 'u1', 'b1')).toBe('owner')
  })
  it('falls back to the members role for a non-owner', async () => {
    const env = mockEnv((sql) =>
      sql.includes('FROM boards') ? { owner_id: 'someone-else' } : { role: 'editor' })
    expect(await checkAcl(env, 'u2', 'b1')).toBe('editor')
  })
  it('returns null when the user is neither owner nor member', async () => {
    const env = mockEnv((sql) => (sql.includes('FROM boards') ? { owner_id: 'someone-else' } : null))
    expect(await checkAcl(env, 'stranger', 'b1')).toBeNull()
  })
})
