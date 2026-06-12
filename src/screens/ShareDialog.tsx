import { ScaffoldModal } from './Scaffold'
import { exportJotmodel, download } from '../model/export'
import type { Board } from '../model/board'

/**
 * Share (scaffold). Phase 1 is local-first, so the working action is the portable
 * .jotmodel file. The cloud role/expiry form below is scaffolded + disabled until
 * accounts (Phase 2) land; final visuals pending design review.
 */
export function ShareDialog({ board, onClose }: { board: Board; onClose: () => void }) {
  const cloudReady = !!import.meta.env.VITE_WORKER_HOST
  return (
    <ScaffoldModal title="Share" onClose={onClose}>
      <div className="stack">
        <p className="muted">
          Your board is local-first — it lives in this browser. Share it as a portable file
          that re-opens (or merges) anywhere.
        </p>
        <button className="btn primary" onClick={() => { download('board.jotmodel', exportJotmodel(board.doc)); onClose() }}>
          Download .jotmodel
        </button>

        <div className="hr-line" />
        <div className="row-between">
          <strong>Link sharing</strong>
          <span className="muted small">Phase 2 · accounts</span>
        </div>
        <fieldset className="cloud-form" disabled={!cloudReady}>
          <label className="field">
            <span>Anyone with the link can</span>
            <select defaultValue="viewer"><option value="viewer">view</option><option value="editor">edit</option></select>
          </label>
          <label className="field">
            <span>Expires</span>
            <select defaultValue="0"><option value="0">never</option><option value="7">in 7 days</option><option value="30">in 30 days</option></select>
          </label>
          <button className="btn" type="button" disabled>{cloudReady ? 'Create link' : 'Sign in to create a link'}</button>
        </fieldset>
        <p className="hint-note">Scaffolded — final link UI (copy, revoke, role) pending design review.</p>
      </div>
    </ScaffoldModal>
  )
}
