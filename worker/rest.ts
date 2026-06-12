import { verifyClerk, upsertUser, checkAcl } from './auth'

export function corsHeaders(env: Cloudflare.Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.APP_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }
}
function json(env: Cloudflare.Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}
const rid = () => crypto.randomUUID().replace(/-/g, '')

async function requireUser(req: Request, env: Cloudflare.Env): Promise<string | null> {
  const auth = req.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const userId = await verifyClerk(token, env)
  if (userId) await upsertUser(env, userId)
  return userId
}

/** REST: list/create boards + create share links. Clerk-authenticated; D1 is the ACL. */
export async function handleRest(req: Request, env: Cloudflare.Env): Promise<Response> {
  const url = new URL(req.url)
  const userId = await requireUser(req, env)
  if (!userId) return json(env, { error: 'unauthorized' }, 401)
  const path = url.pathname

  if (path === '/api/boards' && req.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT b.id, b.title, b.updated_at FROM boards b
       LEFT JOIN members m ON m.board_id = b.id AND m.user_id = ?1
       WHERE b.owner_id = ?1 OR m.user_id = ?1
       GROUP BY b.id ORDER BY b.updated_at DESC`,
    ).bind(userId).all()
    return json(env, { boards: results })
  }

  if (path === '/api/boards' && req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as { title?: string }
    const id = rid()
    await env.DB.prepare('INSERT INTO boards (id, owner_id, title, updated_at) VALUES (?, ?, ?, ?)')
      .bind(id, userId, body.title || 'untitled board', Date.now()).run()
    return json(env, { id })
  }

  const share = path.match(/^\/api\/boards\/([^/]+)\/share$/)
  if (share && req.method === 'POST') {
    const boardId = share[1]
    if (await checkAcl(env, userId, boardId) !== 'owner') return json(env, { error: 'forbidden' }, 403)
    const body = await req.json().catch(() => ({})) as { role?: 'editor' | 'viewer'; expiresInDays?: number }
    const token = rid() + rid()
    const expires = body.expiresInDays ? Date.now() + body.expiresInDays * 86_400_000 : null
    await env.DB.prepare('INSERT INTO share_links (token, board_id, role, expires_at) VALUES (?, ?, ?, ?)')
      .bind(token, boardId, body.role || 'viewer', expires).run()
    return json(env, { token, url: `${env.APP_ORIGIN}/b/${boardId}?share=${token}` })
  }

  return json(env, { error: 'not found' }, 404)
}
