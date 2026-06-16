import { useState } from 'react'
import { ScaffoldModal } from './Scaffold'
import { exportJotmodel, download } from '../model/export'
import type { Board } from '../model/board'
import { api, type GetToken, type Role } from '../lib/api'

/**
 * Share. Owners can mint a role-scoped, optionally-expiring link (capability token), see what it
 * grants, and revoke it; everyone keeps the portable, local-first `.jotmodel` file.
 */
export function ShareDialog({ board, boardId, getToken, role, onClose }: {
  board: Board
  boardId?: string
  getToken?: GetToken
  role?: Role
  onClose: () => void
}) {
  const canLink = !!(boardId && getToken && role === 'owner')
  const [linkRole, setLinkRole] = useState<'viewer' | 'editor'>('viewer')
  const [expires, setExpires] = useState('0')
  const [minted, setMinted] = useState<{ url: string; token: string; role: 'viewer' | 'editor'; days: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function createLink() {
    if (!boardId || !getToken) return
    setBusy(true); setError(null)
    try {
      const days = Number(expires) || undefined
      const res = await api.createShare(getToken, boardId, linkRole, days)
      setMinted({ url: res.url, token: res.token, role: linkRole, days: days ?? 0 })
    } catch (e: any) { setError(e.message ?? String(e)) } finally { setBusy(false) }
  }
  async function revoke() {
    if (!minted || !boardId || !getToken) return
    setBusy(true); setError(null)
    try { await api.revokeShare(getToken, boardId, minted.token); setMinted(null); setCopied(false) }
    catch (e: any) { setError(e.message ?? String(e)) } finally { setBusy(false) }
  }
  async function copy() {
    if (!minted) return
    try { await navigator.clipboard.writeText(minted.url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  const summary = (m: NonNullable<typeof minted>) =>
    `Anyone with the link can ${m.role === 'editor' ? 'edit' : 'view'} · ${m.days ? `expires in ${m.days} day${m.days === 1 ? '' : 's'}` : 'never expires'}`

  return (
    <ScaffoldModal title="Share" onClose={onClose} flagged={false}>
      <div className="stack">
        <p className="muted">Send a link, or take the model anywhere as a portable file.</p>

        {canLink ? (
          <>
            <div className="cloud-form">
              <label className="field">
                <span>Anyone with the link can</span>
                <select value={linkRole} onChange={e => setLinkRole(e.target.value as 'viewer' | 'editor')}>
                  <option value="viewer">view</option>
                  <option value="editor">edit</option>
                </select>
              </label>
              <label className="field">
                <span>Expires</span>
                <select value={expires} onChange={e => setExpires(e.target.value)}>
                  <option value="0">never</option>
                  <option value="7">in 7 days</option>
                  <option value="30">in 30 days</option>
                </select>
              </label>
              <button className="btn primary" onClick={createLink} disabled={busy}>
                {busy ? 'Creating…' : 'Create link'}
              </button>
            </div>
            {error && <p className="home-error">{error}</p>}
            {minted && (
              <div className="stack">
                <p className="hint-note">{summary(minted)}</p>
                <div className="share-link">
                  <input readOnly value={minted.url} onFocus={e => e.target.select()} />
                  <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
                </div>
                <div className="row-between">
                  <span className="small">Anyone who already has this link will lose access.</span>
                  <button className="linklike" onClick={revoke} disabled={busy}>Revoke link</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="hint-note">
            {role && role !== 'owner'
              ? 'Only the board owner can create share links.'
              : 'Open a cloud board to create share links.'}
          </p>
        )}

        <div className="hr-line" />
        <button className="btn" onClick={() => { download('board.jotmodel', exportJotmodel(board.doc)); onClose() }}>
          Download .jotmodel
        </button>
      </div>
    </ScaffoldModal>
  )
}
