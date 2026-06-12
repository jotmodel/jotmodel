/**
 * Typed REST client for the Worker (Phase 2+). Every authenticated call carries the Clerk
 * session JWT as a Bearer token (fetched via the `getToken` passed in from `useAuth`). The
 * Worker's D1 ACL is the source of truth for permissions; this is just the wire format.
 */
export type Role = 'owner' | 'editor' | 'viewer'
export interface BoardSummary { id: string; title: string; updated_at: number }
export interface BoardMeta { id: string; title: string; role: Role }
export interface ShareResult { token: string; url: string }
export type GetToken = () => Promise<string | null>

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Worker origin from VITE_WORKER_HOST. http for localhost, https everywhere else. */
function base(): string {
  const host = import.meta.env.VITE_WORKER_HOST
  if (!host) throw new ApiError(0, 'VITE_WORKER_HOST is not set')
  const local = host.startsWith('localhost') || host.startsWith('127.')
  return `${local ? 'http' : 'https'}://${host}`
}

async function req<T>(getToken: GetToken, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const res = await fetch(base() + path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) throw new ApiError(res.status, (await res.text().catch(() => '')) || res.statusText)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  listBoards: (t: GetToken) =>
    req<{ boards: BoardSummary[] }>(t, '/api/boards').then(r => r.boards),
  createBoard: (t: GetToken, title?: string) =>
    req<{ id: string }>(t, '/api/boards', { method: 'POST', body: JSON.stringify({ title }) }).then(r => r.id),
  getBoard: (t: GetToken, id: string) =>
    req<BoardMeta>(t, `/api/boards/${id}`),
  renameBoard: (t: GetToken, id: string, title: string) =>
    req<{ ok: true }>(t, `/api/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteBoard: (t: GetToken, id: string) =>
    req<void>(t, `/api/boards/${id}`, { method: 'DELETE' }),
  createShare: (t: GetToken, id: string, role: 'editor' | 'viewer', expiresInDays?: number) =>
    req<ShareResult>(t, `/api/boards/${id}/share`, { method: 'POST', body: JSON.stringify({ role, expiresInDays }) }),
  revokeShare: (t: GetToken, id: string, token: string) =>
    req<void>(t, `/api/boards/${id}/share/${token}`, { method: 'DELETE' }),
  /** Unauthenticated: a share viewer fetching just the board title + their granted role. */
  getSharedMeta: (id: string, share: string) =>
    fetch(`${base()}/api/boards/${id}?share=${encodeURIComponent(share)}`).then(r =>
      r.ok ? (r.json() as Promise<{ title: string; role: Role }>) : Promise.reject(new ApiError(r.status, r.statusText)),
    ),
}
