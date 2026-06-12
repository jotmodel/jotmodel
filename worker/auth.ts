import { verifyToken } from '@clerk/backend'

export type Role = 'owner' | 'editor' | 'viewer'
export interface Identity { userId: string; role: Role }

/** Verify a Clerk session JWT (networkless via jwtKey). Returns the user id (`sub`) or null. */
export async function verifyClerk(token: string, env: Cloudflare.Env): Promise<string | null> {
  try {
    const payload = await verifyToken(token, {
      jwtKey: env.CLERK_JWT_KEY,
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: env.APP_ORIGIN ? [env.APP_ORIGIN] : undefined,
    })
    return (payload as { sub?: string }).sub ?? null
  } catch {
    return null
  }
}

export async function upsertUser(env: Cloudflare.Env, userId: string): Promise<void> {
  await env.DB.prepare('INSERT INTO users (id) VALUES (?) ON CONFLICT(id) DO NOTHING').bind(userId).run()
}

/** The user's role on a board: owner via boards.owner_id, else members.role, else null. */
export async function checkAcl(env: Cloudflare.Env, userId: string, boardId: string): Promise<Role | null> {
  const board = await env.DB.prepare('SELECT owner_id FROM boards WHERE id=?')
    .bind(boardId).first<{ owner_id: string }>()
  if (board?.owner_id === userId) return 'owner'
  const m = await env.DB.prepare('SELECT role FROM members WHERE board_id=? AND user_id=?')
    .bind(boardId, userId).first<{ role: Role }>()
  return m?.role ?? null
}

/** Resolve a share-link capability token to an identity for this board. */
export async function resolveShare(env: Cloudflare.Env, token: string, boardId: string): Promise<Identity | null> {
  const row = await env.DB.prepare('SELECT board_id, role, expires_at FROM share_links WHERE token=?')
    .bind(token).first<{ board_id: string; role: Role; expires_at: number | null }>()
  if (!row || row.board_id !== boardId) return null
  if (row.expires_at && row.expires_at < Date.now()) return null
  return { userId: 'share:' + token.slice(0, 8), role: row.role }
}

/**
 * onBeforeConnect gate: validate the Clerk JWT (+ D1 ACL) OR a share token BEFORE the
 * WebSocket is upgraded to the Durable Object. On success, inject identity headers the DO
 * trusts (client-supplied copies are stripped first). On failure, short-circuit with 403.
 */
export async function gateConnection(req: Request, boardId: string, env: Cloudflare.Env): Promise<Response | Request> {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const share = url.searchParams.get('share')

  let identity: Identity | null = null
  if (share) {
    identity = await resolveShare(env, share, boardId)
  } else if (token) {
    const userId = await verifyClerk(token, env)
    if (userId) {
      await upsertUser(env, userId)
      const role = await checkAcl(env, userId, boardId)
      if (role) identity = { userId, role }
    }
  }
  if (!identity) return new Response('Forbidden', { status: 403 })

  const headers = new Headers(req.headers)
  headers.delete('X-User-Id'); headers.delete('X-Role') // never trust the client
  headers.set('X-User-Id', identity.userId)
  headers.set('X-Role', identity.role)
  return new Request(req, { headers })
}
