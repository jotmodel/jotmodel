import type { Peer } from '../canvas/usePresence'

/**
 * Top-bar presence roster — a quiet overlapping stack of peer chips so "who's here / how many" is
 * legible at a glance even when a cursor is off-screen or still, and so peer identity has a
 * keyboard/screen-reader path (cursors alone are visual + colour only). Each chip carries that
 * peer's identity colour from the sanctioned presence palette (the ONE place a third colour layer
 * is allowed) with its paired ink; the +N overflow chip is neutral chrome.
 * Scaffold — pending design review (matches the project convention for non-board chrome).
 */
const MAX = 4

function initials(name: string): string {
  const parts = name.replace(/·/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function PeerRoster({ peers }: { peers: Peer[] }) {
  if (!peers.length) return null
  const shown = peers.slice(0, MAX)
  const extra = peers.length - shown.length
  const label = `${peers.length} other ${peers.length === 1 ? 'person' : 'people'} on this board`
  return (
    <div className="roster" role="group" aria-label={label}>
      {shown.map((p) => (
        <span key={p.clientId} className="ava" role="img" aria-label={p.name} title={p.name}
              style={{ background: p.color, color: p.ink }}>{initials(p.name)}</span>
      ))}
      {extra > 0 && (
        <span className="ava ava-more" aria-label={`${extra} more`}
              title={peers.slice(MAX).map((p) => p.name).join(', ')}>+{extra}</span>
      )}
    </div>
  )
}
