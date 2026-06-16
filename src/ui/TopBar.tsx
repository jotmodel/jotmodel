import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  toDBML, toDbt, toSQL, exportJotmodel, parseJotmodel, download, type Dialect,
} from '../model/export'
import { importUpdate } from '../model/board'
import type { Board, Entity, Relationship } from '../model/board'
import { ShareDialog } from '../screens/ShareDialog'
import { Mark, Wordmark } from './Brand'
import { PeerRoster } from './PeerRoster'
import type { ConnStatus, Peer } from '../canvas/usePresence'
import { api, type GetToken, type Role } from '../lib/api'

export interface TopBarProps {
  board: Board
  entities: Entity[]
  rels: Relationship[]
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  // Cloud / multiplayer — all optional; the local-only path passes none.
  status?: ConnStatus | null
  peers?: Peer[]
  readOnly?: boolean
  title?: string
  boardId?: string
  getToken?: GetToken
  role?: Role
  userSlot?: ReactNode
}

const STATUS_LABEL: Record<ConnStatus, string> = {
  online: 'Live', syncing: 'Syncing…', connecting: 'Connecting…', offline: 'Offline',
}

export function TopBar(props: TopBarProps) {
  const { board, entities, rels, canUndo, canRedo, onUndo, onRedo, status, readOnly, title } = props
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme as 'light' | 'dark') || 'light',
  )
  const [menu, setMenu] = useState(false)
  const [share, setShare] = useState(false)
  const [titleVal, setTitleVal] = useState(title ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Rename the board from the canvas (double-click the title, or Enter/F2 when focused). Owner/
  // editor only; needs the cloud handle (boardId + getToken) — local-only boards carry no title.
  const canRename = !readOnly && !!props.boardId && !!props.getToken
  function commitTitle(v: string) {
    const t = v.trim()
    setEditingTitle(false)
    if (!t || t === titleVal) return
    setTitleVal(t)
    if (props.boardId && props.getToken) api.renameBoard(props.getToken, props.boardId, t).catch(() => { /* keep optimistic value */ })
  }

  function setT(t: 'light' | 'dark') {
    document.documentElement.dataset.theme = t
    try { localStorage.setItem('jm-theme', t) } catch { /* ignore */ }
    setTheme(t)
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenu(false) }
    if (menu) { document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey) }
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [menu])

  const sql = (d: Dialect) => { download(`model.${d}.sql`, toSQL(entities, rels, d)); setMenu(false) }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    file.text().then(text => {
      const { update } = parseJotmodel(text)
      const mode = entities.length > 0 && confirm('Merge into the current board?\n\nOK = merge · Cancel = replace') ? 'merge' : 'replace'
      importUpdate(board.doc, update, mode)
    }).catch(err => alert('Could not import: ' + err.message))
    e.target.value = ''
  }

  return (
    <div className="topbar">
      <Mark />
      <Wordmark />
      {title && (
        <>
          <span className="sep" />
          {editingTitle ? (
            <input
              className="board-title-edit"
              defaultValue={titleVal}
              autoFocus
              onMouseDown={(e) => e.stopPropagation()}
              onBlur={(e) => commitTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle((e.target as HTMLInputElement).value)
                else if (e.key === 'Escape') setEditingTitle(false)
              }}
            />
          ) : (
            <span
              className="board-title"
              title={canRename ? `${titleVal} — double-click to rename` : titleVal}
              tabIndex={canRename ? 0 : undefined}
              onDoubleClick={canRename ? () => setEditingTitle(true) : undefined}
              onKeyDown={canRename ? (e) => { if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); setEditingTitle(true) } } : undefined}
            >{titleVal}</span>
          )}
        </>
      )}
      {readOnly && <span className="viewonly-tag" role="status" title="You have view-only access to this board">View only</span>}

      {!readOnly && (
        <>
          <span className="sep" />
          <button className="btn btn-icon" title="Undo (⌘Z)" disabled={!canUndo} onClick={onUndo}>↶</button>
          <button className="btn btn-icon" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={onRedo}>↷</button>
        </>
      )}

      <span className="sp" />

      <PeerRoster peers={props.peers ?? []} />
      {status && (
        <span className="conn" title={`Multiplayer: ${STATUS_LABEL[status]}`}>
          <span className={`conn-dot ${status}`} />{STATUS_LABEL[status]}
        </span>
      )}

      <div className="menu" ref={menuRef}>
        <button className="btn" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu(m => !m)}>Export ▾</button>
        {menu && (
          <div className="menu-pop">
            <button onClick={() => { download('model.dbml', toDBML(entities, rels)); setMenu(false) }}>DBML <span className="k">.dbml</span></button>
            <button onClick={() => { download('models.dbt.txt', toDbt(entities, rels)); setMenu(false) }}>dbt <span className="k">schema.yml</span></button>
            <div className="hr" />
            <button onClick={() => sql('postgres')}>SQL — Postgres <span className="k">.sql</span></button>
            <button onClick={() => sql('mysql')}>SQL — MySQL <span className="k">.sql</span></button>
            <button onClick={() => sql('sqlserver')}>SQL — SQL Server <span className="k">.sql</span></button>
            <div className="hr" />
            <button onClick={() => { download('board.jotmodel', exportJotmodel(board.doc)); setMenu(false) }}>JotModel file <span className="k">.jotmodel</span></button>
            {!readOnly && (
              <button onClick={() => { fileRef.current?.click(); setMenu(false) }}>Import… <span className="k">.jotmodel</span></button>
            )}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".jotmodel,application/json" hidden onChange={onPickFile} />

      {/* a viewer can't grant access they don't have — no Share in read-only (Export stays). */}
      {!readOnly && (
        <>
          <button className="btn" onClick={() => setShare(true)}>Share</button>
          {share && (
            <ShareDialog
              board={board}
              boardId={props.boardId}
              getToken={props.getToken}
              role={props.role}
              onClose={() => setShare(false)}
            />
          )}
        </>
      )}

      <span className="toggle" role="group" aria-label="Color theme">
        <button className={theme === 'light' ? 'on' : ''} aria-pressed={theme === 'light'} onClick={() => setT('light')}>Light</button>
        <button className={theme === 'dark' ? 'on' : ''} aria-pressed={theme === 'dark'} onClick={() => setT('dark')}>Dark</button>
      </span>

      {props.userSlot}
    </div>
  )
}
