import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SignedIn, SignedOut, useAuth, UserButton } from '@clerk/clerk-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api, type BoardSummary, type Project } from '../lib/api'
import { Mark, Wordmark } from '../ui/Brand'
import { IconMove, IconRename, IconTrash } from '../ui/icons'
import { BoardThumb } from './BoardThumb'
import { clerkAppearance } from './clerkAppearance'
import { DesignReviewFlag } from './Scaffold'
import '../styles/tokens.css'
import '../styles/app.css'

/** Your boards. A signed-in index — a grid of board cards (each with a live thumbnail), grouped
 *  into flat projects you can create, rename (double-click), delete, and file boards into by drag
 *  or the per-board move menu. Not a gallery of templates: it shows the user's own work. Flagged
 *  for design review per CLAUDE.md. */
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

function msg(e: unknown): string { return e instanceof Error ? e.message : String(e) }

function timeAgo(ms: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(ms).toLocaleDateString()
}

const DND_TYPE = 'text/jm-board'

function BoardList() {
  const { getToken } = useAuth()
  const token = useCallback(() => getToken(), [getToken])
  const navigate = useNavigate()
  const [boards, setBoards] = useState<BoardSummary[] | null>(null)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmBoard, setConfirmBoard] = useState<string | null>(null)
  const [confirmProject, setConfirmProject] = useState<string | null>(null)
  const [editProject, setEditProject] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)   // board currently being dragged
  const [moveFor, setMoveFor] = useState<string | null>(null) // board whose move-menu is open

  const reload = useCallback(() => {
    api.listBoards(token).then(setBoards).catch(e => setError(msg(e)))
    // Projects are additive: if the endpoint isn't deployed yet (old worker), degrade to a flat
    // grid rather than erroring the whole screen.
    api.listProjects(token).then(setProjects).catch(() => setProjects([]))
  }, [token])
  useEffect(() => { reload() }, [reload])

  async function createBoard() {
    setBusy(true); setError(null)
    try { const id = await api.createBoard(token, 'untitled board'); navigate(`/b/${id}`) }
    catch (e) { setError(msg(e)); setBusy(false) }
  }
  async function renameBoard(id: string, title: string) {
    const t = title.trim(); if (!t) return
    setBoards(bs => bs?.map(b => b.id === id ? { ...b, title: t } : b) ?? bs)
    try { await api.renameBoard(token, id, t) } catch (e) { setError(msg(e)); reload() }
  }
  async function removeBoard(id: string) {
    if (confirmBoard !== id) { setConfirmBoard(id); return }
    setConfirmBoard(null)
    setBoards(bs => bs?.filter(b => b.id !== id) ?? bs)
    try { await api.deleteBoard(token, id) } catch (e) { setError(msg(e)); reload() }
  }
  async function moveBoard(id: string, projectId: string | null) {
    setMoveFor(null)
    // Clear the drag state here too: on a successful drop, React moves the card to its new section
    // and unmounts the source node, so onDragEnd may never fire — leaving every section stuck with
    // the drag-active outline. Filing via the menu (no drag) sets nothing, so this is a harmless no-op there.
    setDragId(null)
    setBoards(bs => bs?.map(b => b.id === id ? { ...b, project_id: projectId } : b) ?? bs)
    try { await api.moveBoard(token, id, projectId) } catch (e) { setError(msg(e)); reload() }
  }
  async function createProject() {
    setError(null)
    try {
      const id = await api.createProject(token, 'untitled project')
      setProjects(ps => [...(ps ?? []), { id, name: 'untitled project', created_at: Date.now() }])
      setEditProject(id) // drop straight into renaming the new project
    } catch (e) { setError(msg(e)) }
  }
  async function renameProject(id: string, name: string) {
    const n = name.trim()
    setEditProject(null)
    if (!n) return
    setProjects(ps => ps?.map(p => p.id === id ? { ...p, name: n } : p) ?? ps)
    try { await api.renameProject(token, id, n) } catch (e) { setError(msg(e)); reload() }
  }
  async function removeProject(id: string) {
    if (confirmProject !== id) { setConfirmProject(id); return }
    setConfirmProject(null)
    // Server un-files the boards (ON DELETE SET NULL); reflect that locally — no board is deleted.
    setProjects(ps => ps?.filter(p => p.id !== id) ?? ps)
    setBoards(bs => bs?.map(b => b.project_id === id ? { ...b, project_id: null } : b) ?? bs)
    try { await api.deleteProject(token, id) } catch (e) { setError(msg(e)); reload() }
  }

  const ready = boards !== null && projects !== null
  const ungrouped = useMemo(() => (boards ?? []).filter(b => b.project_id == null), [boards])
  const grouped = useMemo(
    () => (projects ?? []).map(p => ({ project: p, boards: (boards ?? []).filter(b => b.project_id === p.id) })),
    [projects, boards],
  )

  const cardProps = (b: BoardSummary): BoardCardProps => ({
    board: b,
    confirming: confirmBoard === b.id,
    moveOpen: moveFor === b.id,
    projects: projects ?? [],
    onOpen: () => navigate(`/b/${b.id}`),
    onRename: (t) => renameBoard(b.id, t),
    onDelete: () => removeBoard(b.id),
    onCancelDelete: () => setConfirmBoard(null),
    onToggleMove: () => setMoveFor(m => (m === b.id ? null : b.id)),
    onCloseMove: () => setMoveFor(null),
    onMove: (pid) => moveBoard(b.id, pid),
    onDragState: (on) => setDragId(on ? b.id : null),
  })

  return (
    <div className="home">
      <header className="home-bar">
        <Mark /><Wordmark />
        <DesignReviewFlag />
        <span className="sp" />
        {ready && boards!.length > 0 && (
          <button className="btn" onClick={createProject}>New project</button>
        )}
        <button className="btn btn-primary" onClick={createBoard} disabled={busy} autoFocus>New board</button>
        <UserButton appearance={clerkAppearance} />
      </header>

      <main className="home-main home-boards">
        <h1 className="home-title">Your boards</h1>
        {error && <p className="home-error" role="alert">{error}</p>}
        {!ready && !error && <p className="muted">Loading…</p>}
        {ready && boards!.length === 0 && (
          <p className="muted">No boards yet — <button className="linklike" onClick={createBoard}>create your first</button>.</p>
        )}

        {/* No projects → one flat grid (today's simplicity, now with thumbnails). */}
        {ready && boards!.length > 0 && projects!.length === 0 && (
          <div className="board-grid">
            {boards!.map(b => <BoardCard key={b.id} {...cardProps(b)} />)}
          </div>
        )}

        {/* Projects exist → a section per project (always expanded) + an Ungrouped catch-all. */}
        {ready && boards!.length > 0 && projects!.length > 0 && (
          <div className="proj-list">
            {grouped.map(g => (
              <ProjectSection
                key={g.project.id}
                project={g.project}
                count={g.boards.length}
                editing={editProject === g.project.id}
                confirming={confirmProject === g.project.id}
                dragActive={dragId !== null}
                onRename={(n) => renameProject(g.project.id, n)}
                onStartRename={() => setEditProject(g.project.id)}
                onCancelRename={() => setEditProject(null)}
                onDelete={() => removeProject(g.project.id)}
                onCancelDelete={() => setConfirmProject(null)}
                onDropBoard={(bid) => moveBoard(bid, g.project.id)}
              >
                {g.boards.length === 0
                  ? <p className="proj-empty muted small">No boards yet — drag one here, or use a board’s move menu.</p>
                  : <div className="board-grid">{g.boards.map(b => <BoardCard key={b.id} {...cardProps(b)} />)}</div>}
              </ProjectSection>
            ))}

            <ProjectSection
              ungrouped
              project={{ id: '__ungrouped__', name: 'Ungrouped', created_at: 0 }}
              count={ungrouped.length}
              dragActive={dragId !== null}
              onDropBoard={(bid) => moveBoard(bid, null)}
            >
              {ungrouped.length === 0
                ? <p className="proj-empty muted small">Boards not filed into a project show up here.</p>
                : <div className="board-grid">{ungrouped.map(b => <BoardCard key={b.id} {...cardProps(b)} />)}</div>}
            </ProjectSection>
          </div>
        )}
      </main>
    </div>
  )
}

interface BoardCardProps {
  board: BoardSummary
  confirming: boolean
  moveOpen: boolean
  projects: Project[]
  onOpen: () => void
  onRename: (title: string) => void
  onDelete: () => void
  onCancelDelete: () => void
  onToggleMove: () => void
  onCloseMove: () => void
  onMove: (projectId: string | null) => void
  onDragState: (dragging: boolean) => void
}

function BoardCard({
  board, confirming, moveOpen, projects,
  onOpen, onRename, onDelete, onCancelDelete, onToggleMove, onCloseMove, onMove, onDragState,
}: BoardCardProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function commit(v: string) { if (!cancelRef.current) onRename(v); cancelRef.current = false; setEditing(false) }

  return (
    <article
      className="board-card"
      draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.setData(DND_TYPE, board.id); e.dataTransfer.effectAllowed = 'move'; onDragState(true) }}
      onDragEnd={() => onDragState(false)}
    >
      <button className="board-thumb-wrap" onClick={onOpen} onDoubleClick={() => setEditing(true)}
        aria-label={`Open ${board.title}`} title="Open board">
        <BoardThumb model={board.summary} />
      </button>

      <div className="board-card-foot">
        {editing ? (
          <input
            ref={inputRef}
            className="board-rename"
            defaultValue={board.title}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
              else if (e.key === 'Escape') { cancelRef.current = true; setEditing(false) }
            }}
          />
        ) : (
          <button className="board-name-btn" onClick={onOpen} onDoubleClick={() => setEditing(true)} title="Double-click to rename">
            <span className="board-name">{board.title}</span>
            <span className="board-time">{timeAgo(board.updated_at)}</span>
          </button>
        )}

        <span className="board-actions">
          <span className="menu">
            <button className="btn btn-icon" title="Move to project" aria-haspopup="menu" aria-expanded={moveOpen} onClick={onToggleMove}><IconMove /></button>
            {moveOpen && <MoveMenu projects={projects} current={board.project_id} onPick={onMove} onClose={onCloseMove} />}
          </span>
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
      </div>
    </article>
  )
}

function MoveMenu({ projects, current, onPick, onClose }: {
  projects: Project[]
  current: string | null
  onPick: (projectId: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div className="menu-pop move-pop" ref={ref} role="menu">
      <button role="menuitemradio" aria-checked={current == null} onClick={() => onPick(null)}>
        <span className="move-name">Ungrouped</span>{current == null && <span className="k">✓</span>}
      </button>
      {projects.length > 0 && <div className="hr" />}
      {projects.map(p => (
        <button key={p.id} role="menuitemradio" aria-checked={current === p.id} onClick={() => onPick(p.id)}>
          <span className="move-name">{p.name}</span>{current === p.id && <span className="k">✓</span>}
        </button>
      ))}
    </div>
  )
}

interface ProjectSectionProps {
  project: Project
  count: number
  dragActive: boolean
  ungrouped?: boolean
  editing?: boolean
  confirming?: boolean
  children: React.ReactNode
  onRename?: (name: string) => void
  onStartRename?: () => void
  onCancelRename?: () => void
  onDelete?: () => void
  onCancelDelete?: () => void
  onDropBoard: (boardId: string) => void
}

function ProjectSection({
  project, count, dragActive, ungrouped, editing, confirming, children,
  onRename, onStartRename, onCancelRename, onDelete, onCancelDelete, onDropBoard,
}: ProjectSectionProps) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function commit(v: string) {
    if (cancelRef.current) { cancelRef.current = false; onCancelRename?.(); return }
    onRename?.(v)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setOver(false)
    const id = e.dataTransfer.getData(DND_TYPE)
    if (id) onDropBoard(id)
  }

  return (
    <section
      className={`proj${over ? ' drag-over' : ''}${dragActive ? ' drag-active' : ''}`}
      onDragOver={(e) => { if (dragActive) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } }}
      onDragEnter={() => { if (dragActive) setOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
      onDrop={onDrop}
    >
      <header className="proj-head">
        {editing ? (
          <input
            ref={inputRef}
            className="proj-rename"
            defaultValue={project.name}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
              else if (e.key === 'Escape') { cancelRef.current = true; onCancelRename?.() }
            }}
          />
        ) : (
          <h2 className="proj-name" onDoubleClick={ungrouped ? undefined : onStartRename}
            title={ungrouped ? undefined : 'Double-click to rename'}>{project.name}</h2>
        )}
        <span className="proj-count">{count}</span>
        {!ungrouped && (
          <span className="proj-actions">
            <button className="btn btn-icon" title="Rename project" aria-label="Rename project" onClick={onStartRename}><IconRename /></button>
            {confirming ? (
              <>
                <button className="btn btn-danger" title="Delete project — its boards move to Ungrouped" onClick={onDelete}>Delete?</button>
                <button className="btn btn-icon" title="Cancel" aria-label="Cancel delete" onClick={onCancelDelete}>×</button>
              </>
            ) : (
              <button className="btn btn-icon" title="Delete project" aria-label="Delete project" onClick={onDelete}><IconTrash /></button>
            )}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}
