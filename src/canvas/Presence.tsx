import type { Peer } from './usePresence'
import type { View } from './reducer'

/**
 * Remote cursors + name pills, drawn in SCREEN space (a sibling of `.world`) so they stay a
 * constant size at any zoom — each peer's world cursor is projected through the current view.
 * Selection halos live on the cards/rels themselves (they should scale with the content).
 * The whole layer is pointer-events:none — presence never intercepts your interactions.
 */
export function Presence({ peers, view }: { peers: Peer[]; view: View }) {
  return (
    <div className="presence-layer">
      {peers.map((p) => {
        if (!p.cursor) return null
        const x = p.cursor.x * view.scale + view.tx
        const y = p.cursor.y * view.scale + view.ty
        return (
          <div key={p.clientId} className="peer-cursor" style={{ left: x, top: y, color: p.color }}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 1.5 L2 13 L5.4 9.6 L7.8 14.5 L9.6 13.7 L7.2 9 L12 9 Z"
                fill="currentColor" stroke="var(--jm-canvas)" strokeWidth="1" />
            </svg>
            <span className="peer-pill" style={{ background: p.color, color: p.ink }}>{p.name}</span>
          </div>
        )
      })}
    </div>
  )
}
