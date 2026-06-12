import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, useAuth, useUser, UserButton } from '@clerk/clerk-react'
import { Board } from './Board'
import type { RelayOptions } from '../model/provider'
import { api, ApiError, type Role } from '../lib/api'
import { LoadingState } from '../screens/Placeholders'
import { clerkAppearance } from '../screens/clerkAppearance'

const HOST = import.meta.env.VITE_WORKER_HOST

/**
 * One board, addressed by URL. A `?share=<token>` capability opens the board with no sign-in
 * (the Worker gate resolves the token to a role); otherwise the route requires a signed-in user.
 * Without a Worker host (local dev), the board falls back to local-only.
 */
export function BoardRoute() {
  const { boardId = '' } = useParams()
  const [sp] = useSearchParams()
  const share = sp.get('share') ?? undefined

  if (share) return <SharedBoard boardId={boardId} share={share} />
  return (
    <>
      <SignedIn>
        <AuthedBoard boardId={boardId} />
      </SignedIn>
      <SignedOut>
        <Navigate to={`/sign-in?redirect=${encodeURIComponent(`/b/${boardId}`)}`} replace />
      </SignedOut>
    </>
  )
}

type Meta = { title: string; role: Role } | 'loading' | 'forbidden' | 'notfound' | 'error'

function AuthedBoard({ boardId }: { boardId: string }) {
  const { getToken } = useAuth()
  const { user } = useUser()
  const token = useCallback(() => getToken(), [getToken])
  const [meta, setMeta] = useState<Meta>('loading')

  useEffect(() => {
    if (!HOST) { setMeta({ title: 'Board', role: 'owner' }); return }
    let alive = true
    api.getBoard(token, boardId)
      .then(m => alive && setMeta({ title: m.title, role: m.role }))
      .catch((e: unknown) => {
        const status = e instanceof ApiError ? e.status : 0
        if (alive) setMeta(status === 403 ? 'forbidden' : status === 404 ? 'notfound' : 'error')
      })
    return () => { alive = false }
  }, [boardId, token])

  if (meta === 'loading') return <LoadingState />
  if (meta === 'forbidden') return <Navigate to="/forbidden" replace />
  if (meta === 'notfound' || meta === 'error') return <Navigate to="/not-found" replace />

  const relay: RelayOptions | undefined = HOST ? { host: HOST, boardId, getToken: token } : undefined
  const name = user?.firstName || user?.username || 'You'
  return (
    <Board
      key={boardId}
      relay={relay}
      role={meta.role}
      presenceName={name}
      boardTitle={meta.title}
      userSlot={<UserButton appearance={clerkAppearance} />}
    />
  )
}

function SharedBoard({ boardId, share }: { boardId: string; share: string }) {
  const [meta, setMeta] = useState<Meta>('loading')
  useEffect(() => {
    if (!HOST) { setMeta({ title: 'Shared board', role: 'viewer' }); return }
    let alive = true
    api.getSharedMeta(boardId, share)
      .then(m => alive && setMeta({ title: m.title, role: m.role }))
      .catch((e: unknown) => {
        const status = e instanceof ApiError ? e.status : 0
        if (alive) setMeta(status === 404 ? 'notfound' : 'forbidden')
      })
    return () => { alive = false }
  }, [boardId, share])

  if (meta === 'loading') return <LoadingState />
  if (meta === 'forbidden' || meta === 'error') return <Navigate to="/forbidden" replace />
  if (meta === 'notfound') return <Navigate to="/not-found" replace />

  const relay: RelayOptions | undefined = HOST ? { host: HOST, boardId, share } : undefined
  return <Board key={boardId} relay={relay} role={meta.role} presenceName="Guest" boardTitle={meta.title} />
}
