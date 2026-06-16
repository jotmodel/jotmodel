import { useCallback, useEffect, useRef, useState } from 'react'
import { SignedIn, SignedOut, useAuth, UserButton } from '@clerk/clerk-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api, type BoardSummary } from '../lib/api'
import { Mark, Wordmark } from '../ui/Brand'
import { IconRename, IconTrash } from '../ui/icons'
import { clerkAppearance } from './clerkAppearance'
import { DesignReviewFlag } from './Scaffold'
import '../styles/tokens.css'
import '../styles/app.css'

/** Your boards. A signed-in index (a list, not a gallery): open / rename / delete inline,
 *  plus "new board". Flagged for design review per CLAUDE.md. */
export function Home() {
  return (
    <>
      <SignedIn>
        <BoardList />
      </SignedIn>
      <SignedOut>
        <Navigate to="/sign-in?redirect=/" replace />
      </SignedOut>
    </>
  )
}

function timeAgo(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(ms).toLocaleDateString()
}

function BoardList() {
  const { getToken } = useAuth()
  const token = useCallback(() => getToken(), [getToken])
  const navigate = useNavigate()
  const [boards, setBoards] = useState<BoardSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const reload = useCallback(() => {
    api.listBoards(token).then(setBoards).catch(e => setError(e.message ?? String(e)))
  }, [token])
  useEffect(() => { reload() }, [reload])

  async function create() {
    setBusy(true); setError(null)
    try {
      const id = await api.createBoard(token, 'untitled board')
      navigate(`/b/${id}`)
    } catch (e: any) { setError(e.message ?? String(e)); setBusy(false) }
  }
  async function rename(id: string, title: string) {
    const t = title.trim(); if (!t) return
    setBoards(bs => bs?.map(b => b.id === id ? { ...b, title: t } : b) ?? bs)
    try { await api.renameBoard(token, id, t) } catch (e: any) { setError(e.message ?? String(e)); reload() }
  }
  async function remove(id: string) {
    if (confirmId !== id) { setConfirmId(id); return }
    setConfirmId(null)
    setBoards(bs => bs?.filter(b => b.id !== id) ?? bs)
    try { await api.deleteBoard(token, id) } catch (e: any) { setError(e.message ?? String(e)); reload() }
  }

  return (
    <div className="home">
      <header className="home-bar">
        <Mark /><Wordmark />
        <DesignReviewFlag />
        <span className="sp" />
        <button className="btn btn-primary" onClick={create} disabled={busy} autoFocus>New board</button>
        <UserButton appearance={clerkAppearance} />
      </header>

      <main className="home-main">
        <h1 className="home-title">Your boards</h1>
        {error && <p className="home-error" role="alert">{error}</p>}
        {boards === null && !error && <p className="muted">Loading…</p>}
        {boards?.length === 0 && (
          <p className="muted">No boards yet — <button className="linklike" onClick={create}>create your first</button>.</p>
        )}
        {boards && boards.length > 0 && (
          <ul className="board-list">
            {boards.map(b => (
              <BoardRow
                key={b.id}
                board={b}
                confirming={confirmId === b.id}
                onOpen={() => navigate(`/b/${b.id}`)}
                onRename={(t) => rename(b.id, t)}
                onDelete={() => remove(b.id)}
                onCancelDelete={() => setConfirmId(null)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function BoardRow({ board, confirming, onOpen, onRename, onDelete, onCancelDelete }: {
  board: BoardSummary
  confirming: boolean
  onOpen: () => void
  onRename: (title: string) => void
  onDelete: () => void
  onCancelDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  return (
    <li className="board-row">
      {editing ? (
        <input
          ref={inputRef}
          className="board-rename"
          defaultValue={board.title}
          onBlur={(e) => { onRename(e.target.value); setEditing(false) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onRename((e.target as HTMLInputElement).value); setEditing(false) }
            else if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <button className="board-open" onClick={onOpen} onDoubleClick={() => setEditing(true)}>
          <span className="board-name">{board.title}</span>
          <span className="board-time">{timeAgo(board.updated_at)}</span>
        </button>
      )}
      <span className="board-actions">
        <button className="btn btn-icon" title="Rename" aria-label="Rename board" onClick={() => setEditing(true)}><IconRename /></button>
        {confirming ? (
          <>
            <button className="btn btn-danger" title="Confirm delete" onClick={onDelete}>Delete?</button>
            <button className="btn btn-icon" title="Cancel" aria-label="Cancel delete" onClick={onCancelDelete}>×</button>
          </>
        ) : (
          <button className="btn btn-icon" title="Delete" aria-label="Delete board" onClick={onDelete}><IconTrash /></button>
        )}
      </span>
    </li>
  )
}
