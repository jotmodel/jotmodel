import { useEffect, useRef, useState } from 'react'
import {
  toDBML, toDbt, toSQL, exportJotmodel, parseJotmodel, download, type Dialect,
} from '../model/export'
import { importUpdate } from '../model/board'
import type { Board, Entity, Relationship } from '../model/board'
import { ShareDialog } from '../screens/ShareDialog'
import { Mark, Wordmark } from './Brand'

export interface TopBarProps {
  board: Board
  entities: Entity[]
  rels: Relationship[]
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function TopBar({ board, entities, rels, canUndo, canRedo, onUndo, onRedo }: TopBarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme as 'light' | 'dark') || 'light',
  )
  const [menu, setMenu] = useState(false)
  const [share, setShare] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function setT(t: 'light' | 'dark') {
    document.documentElement.dataset.theme = t
    try { localStorage.setItem('jm-theme', t) } catch { /* ignore */ }
    setTheme(t)
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    if (menu) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
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

      <span className="sep" />
      <button className="btn icon" title="Undo (⌘Z)" disabled={!canUndo} onClick={onUndo}>↶</button>
      <button className="btn icon" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={onRedo}>↷</button>

      <span className="sp" />

      <div className="menu" ref={menuRef}>
        <button className="btn" onClick={() => setMenu(m => !m)}>Export ▾</button>
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
            <button onClick={() => { fileRef.current?.click(); setMenu(false) }}>Import… <span className="k">.jotmodel</span></button>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".jotmodel,application/json" hidden onChange={onPickFile} />

      <button className="btn" onClick={() => setShare(true)}>Share</button>
      {share && <ShareDialog board={board} onClose={() => setShare(false)} />}

      <span className="toggle">
        <button className={theme === 'light' ? 'on' : ''} onClick={() => setT('light')}>Light</button>
        <button className={theme === 'dark' ? 'on' : ''} onClick={() => setT('dark')}>Dark</button>
      </span>
    </div>
  )
}
