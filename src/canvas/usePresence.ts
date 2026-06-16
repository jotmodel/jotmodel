import { useCallback, useEffect, useState } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import type YProvider from 'y-partyserver/provider'

export type ConnStatus = 'offline' | 'connecting' | 'syncing' | 'online'
export interface SelSet { entities: string[]; rels: string[] }
export interface Peer {
  clientId: number
  name: string
  color: string
  ink: string
  cursor: { x: number; y: number } | null
  selection: SelSet
}

/** Deterministic per-client identity colour from the sanctioned presence palette (law 2 — this
 *  is the ONE place a third colour layer is allowed; never on content or chrome). */
export function presenceColor(clientId: number): string {
  return `var(--jm-presence-${presenceSlot(clientId)})`
}

/** The paired pill-text ink for that identity colour — guarantees WCAG AA on the name pill in
 *  both themes (each slot's ink is black-or-white per the palette, defined in tokens.css). */
export function presenceInk(clientId: number): string {
  return `var(--jm-presence-${presenceSlot(clientId)}-ink)`
}

const presenceSlot = (clientId: number) => (Math.abs(clientId) % 8) + 1

/** Friendly, deterministic display name for an anonymous peer, so several guests are told apart by
 *  more than colour alone (pairs with the per-client presence colour). */
const GUEST_NAMES = ['Otter', 'Finch', 'Maple', 'Heron', 'Sable', 'Wren', 'Cedar', 'Lark', 'Fox', 'Moth', 'Reed', 'Vale']
export function guestName(clientId: number): string {
  return `Guest · ${GUEST_NAMES[Math.abs(clientId) % GUEST_NAMES.length]}`
}

/** Live connection state for the quiet top-bar dot. Null when there is no relay (local-only). */
export function useConnectionStatus(provider: YProvider | null): ConnStatus | null {
  const [status, setStatus] = useState<ConnStatus | null>(provider ? 'connecting' : null)
  useEffect(() => {
    if (!provider) { setStatus(null); return }
    const recompute = () =>
      setStatus(provider.wsconnected ? (provider.synced ? 'online' : 'syncing')
        : provider.wsconnecting ? 'connecting' : 'offline')
    provider.on('status', recompute)
    provider.on('sync', recompute)
    recompute()
    return () => { provider.off('status', recompute); provider.off('sync', recompute) }
  }, [provider])
  return status
}

/**
 * Yjs awareness → live peers, plus setters to publish our own cursor + selection. Awareness is
 * ephemeral (over the socket, never in the Y.Doc), so it's never persisted and never undoable —
 * the whole feature is impossible to mis-trigger.
 */
export function usePresence(awareness: Awareness | null, name: string) {
  const [peers, setPeers] = useState<Peer[]>([])

  useEffect(() => {
    if (!awareness) { setPeers([]); return }
    const localName = name && name !== 'Guest' ? name : guestName(awareness.clientID)
    awareness.setLocalStateField('user', {
      name: localName, color: presenceColor(awareness.clientID), ink: presenceInk(awareness.clientID),
    })
    const update = () => {
      const out: Peer[] = []
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return
        const user = (state.user ?? {}) as { name?: string; color?: string; ink?: string }
        out.push({
          clientId,
          name: user.name || guestName(clientId),
          color: user.color || presenceColor(clientId),
          ink: user.ink || presenceInk(clientId),
          cursor: (state.cursor as { x: number; y: number } | undefined) ?? null,
          selection: (state.selection as SelSet | undefined) ?? { entities: [], rels: [] },
        })
      })
      setPeers(out)
    }
    awareness.on('change', update)
    update()
    return () => { awareness.off('change', update); awareness.setLocalState(null) }
  }, [awareness, name])

  const setCursor = useCallback(
    (c: { x: number; y: number } | null) => { awareness?.setLocalStateField('cursor', c) },
    [awareness],
  )
  const setSelection = useCallback(
    (s: SelSet) => { awareness?.setLocalStateField('selection', s) },
    [awareness],
  )
  return { peers, setCursor, setSelection }
}
