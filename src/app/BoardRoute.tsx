import { useParams, useSearchParams, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { Board } from './Board'
import type { RelayOptions } from '../model/provider'

const HOST = import.meta.env.VITE_WORKER_HOST

/**
 * One board, addressed by URL. A `?share=<token>` capability opens the board with no sign-in
 * (the Worker gate resolves the token to a role); otherwise the route requires a signed-in user.
 * When no Worker host is configured (local dev), the board falls back to local-only.
 */
export function BoardRoute() {
  const { boardId = '' } = useParams()
  const [sp] = useSearchParams()
  const share = sp.get('share') ?? undefined

  if (share) {
    return <Board key={boardId} relay={HOST ? { host: HOST, boardId, share } : undefined} />
  }
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

function AuthedBoard({ boardId }: { boardId: string }) {
  const { getToken } = useAuth()
  const relay: RelayOptions | undefined = HOST ? { host: HOST, boardId, getToken: () => getToken() } : undefined
  return <Board key={boardId} relay={relay} />
}
