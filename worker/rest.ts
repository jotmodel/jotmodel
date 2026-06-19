import { verifyClerk, upsertUser, checkAcl, resolveShare } from './auth'

export function corsHeaders(env: Cloudflare.Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.APP_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }
}
function json(env: Cloudflare.Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}
function noContent(env: Cloudflare.Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(env) })
}
const rid = () => crypto.randomUUID().replace(/-/g, '')
function safeParse(s: string): unknown { try { return JSON.parse(s) } catch { return null } }

async function requireUser(req: Request, env: Cloudflare.Env): Promise<string | null> {
  const auth = req.headers.get('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const userId = await verifyClerk(token, env)
  if (userId) await upsertUser(env, userId)
  return userId
}

/** REST: boards CRUD + share links. Clerk-authenticated (D1 is the ACL), with one
 *  unauthenticated path: a share viewer reading just a board's title + their granted role. */
export async function handleRest(req: Request, env: Cloudflare.Env): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method
  const oneBoard = path.match(/^\/api\/boards\/([^/]+)$/)

  // --- unauthenticated, share-scoped read: title + role for a link viewer (no account) ---
  if (oneBoard && method === 'GET') {
    const share = url.searchParams.get('share')
    if (share) {
      const id = oneBoard[1]
      const ident = await resolveShare(env, share, id)
      if (!ident) return json(env, { error: 'forbidden' }, 403)
      const row = await env.DB.prepare('SELECT title FROM boards WHERE id=?').bind(id).first<{ title: string }>()
      if (!row) return json(env, { error: 'not found' }, 404)
      return json(env, { title: row.title, role: ident.role })
    }
  }

  // --- everything below requires a signed-in user ---
  const userId = await requireUser(req, env)
  if (!userId) return json(env, { error: 'unauthorized' }, 401)

  if (path === '/api/boards' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT b.id, b.title, b.updated_at, b.project_id, b.summary_json FROM boards b
       LEFT JOIN members m ON m.board_id = b.id AND m.user_id = ?1
       WHERE b.owner_id = ?1 OR m.user_id = ?1
       GROUP BY b.id ORDER BY b.updated_at DESC`,
    ).bind(userId).all<{ id: string; title: string; updated_at: number; project_id: string | null; summary_json: string | null }>()
    // Parse the cached thumbnail summary here so the wire shape is a clean object|null
    // (a board project_id only ever surfaces for boards the user owns or co-owns).
    const boards = results.map((b) => ({
      id: b.id, title: b.title, updated_at: b.updated_at,
      project_id: b.project_id ?? null,
      summary: b.summary_json ? safeParse(b.summary_json) : null,
    }))
    return json(env, { boards })
  }

  if (path === '/api/boards' && method === 'POST') {
    const body = await req.json().catch(() => ({})) as { title?: string }
    const id = rid()
    await env.DB.prepare('INSERT INTO boards (id, owner_id, title, updated_at) VALUES (?, ?, ?, ?)')
      .bind(id, userId, (body.title || 'untitled board').trim() || 'untitled board', Date.now()).run()
    return json(env, { id })
  }

  if (oneBoard) {
    const id = oneBoard[1]
    const role = await checkAcl(env, userId, id)

    if (method === 'GET') {
      if (!role) return json(env, { error: 'forbidden' }, 403)
      const row = await env.DB.prepare('SELECT id, title FROM boards WHERE id=?')
        .bind(id).first<{ id: string; title: string }>()
      if (!row) return json(env, { error: 'not found' }, 404)
      return json(env, { id: row.id, title: row.title, role })
    }

    if (method === 'PATCH') {
      if (role !== 'owner' && role !== 'editor') return json(env, { error: 'forbidden' }, 403)
      const body = await req.json().catch(() => ({})) as { title?: string; project_id?: string | null }
      const sets: string[] = []
      const binds: unknown[] = []

      if (body.title !== undefined) {
        const title = body.title.trim()
        if (!title) return json(env, { error: 'title required' }, 400)
        sets.push('title=?'); binds.push(title)
        // A title change is a real edit → bump recency. A pure move (below) is filing, not editing.
        sets.push('updated_at=?'); binds.push(Date.now())
      }

      if ('project_id' in body) {
        const pid = body.project_id ?? null
        if (pid !== null) {
          // You can only file a board into a project you own.
          const proj = await env.DB.prepare('SELECT owner_id FROM projects WHERE id=?')
            .bind(pid).first<{ owner_id: string }>()
          if (!proj || proj.owner_id !== userId) return json(env, { error: 'forbidden' }, 403)
        }
        sets.push('project_id=?'); binds.push(pid)
      }

      if (!sets.length) return json(env, { error: 'nothing to update' }, 400)
      binds.push(id)
      await env.DB.prepare(`UPDATE boards SET ${sets.join(', ')} WHERE id=?`).bind(...binds).run()
      return json(env, { ok: true })
    }

    if (method === 'DELETE') {
      if (role !== 'owner') return json(env, { error: 'forbidden' }, 403)
      await env.DB.prepare('DELETE FROM boards WHERE id=?').bind(id).run() // cascades members/share_links
      await env.SNAPSHOTS.delete(`board/${id}.ydoc`).catch(() => {})
      return noContent(env)
    }
  }

  // --- projects: owner-scoped grouping for the board list (a board belongs to ≤1 project) ---
  if (path === '/api/projects' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, name, created_at FROM projects WHERE owner_id=? ORDER BY created_at ASC',
    ).bind(userId).all()
    return json(env, { projects: results })
  }

  if (path === '/api/projects' && method === 'POST') {
    const body = await req.json().catch(() => ({})) as { name?: string }
    const id = rid()
    const name = (body.name || 'untitled project').trim() || 'untitled project'
    await env.DB.prepare('INSERT INTO projects (id, owner_id, name) VALUES (?, ?, ?)')
      .bind(id, userId, name).run()
    return json(env, { id })
  }

  const oneProject = path.match(/^\/api\/projects\/([^/]+)$/)
  if (oneProject) {
    const pid = oneProject[1]
    const owner = await env.DB.prepare('SELECT owner_id FROM projects WHERE id=?')
      .bind(pid).first<{ owner_id: string }>()
    if (!owner) return json(env, { error: 'not found' }, 404)
    if (owner.owner_id !== userId) return json(env, { error: 'forbidden' }, 403)

    if (method === 'PATCH') {
      const body = await req.json().catch(() => ({})) as { name?: string }
      const name = (body.name ?? '').trim()
      if (!name) return json(env, { error: 'name required' }, 400)
      await env.DB.prepare('UPDATE projects SET name=? WHERE id=?').bind(name, pid).run()
      return json(env, { ok: true })
    }

    if (method === 'DELETE') {
      // ON DELETE SET NULL un-files this project's boards; their drawings are untouched.
      await env.DB.prepare('DELETE FROM projects WHERE id=?').bind(pid).run()
      return noContent(env)
    }
  }

  const share = path.match(/^\/api\/boards\/([^/]+)\/share$/)
  if (share && method === 'POST') {
    const boardId = share[1]
    if (await checkAcl(env, userId, boardId) !== 'owner') return json(env, { error: 'forbidden' }, 403)
    const body = await req.json().catch(() => ({})) as { role?: 'editor' | 'viewer'; expiresInDays?: number }
    const token = rid() + rid()
    const expires = body.expiresInDays ? Date.now() + body.expiresInDays * 86_400_000 : null
    await env.DB.prepare('INSERT INTO share_links (token, board_id, role, expires_at) VALUES (?, ?, ?, ?)')
      .bind(token, boardId, body.role || 'viewer', expires).run()
    return json(env, { token, url: `${env.APP_ORIGIN}/b/${boardId}?share=${token}` })
  }

  const revoke = path.match(/^\/api\/boards\/([^/]+)\/share\/([^/]+)$/)
  if (revoke && method === 'DELETE') {
    const [, boardId, token] = revoke
    if (await checkAcl(env, userId, boardId) !== 'owner') return json(env, { error: 'forbidden' }, 403)
    await env.DB.prepare('DELETE FROM share_links WHERE token=? AND board_id=?').bind(token, boardId).run()
    return noContent(env)
  }

  return json(env, { error: 'not found' }, 404)
}
