import { useMemo, useState, type ReactNode } from 'react'
import type YProvider from 'y-partyserver/provider'
import { useBoard } from '../model/useBoard'
import { makeRelayProvider, type RelayOptions } from '../model/provider'
import { useConnectionStatus } from '../canvas/usePresence'
import type { Role } from '../lib/api'
import { TopBar } from '../ui/TopBar'
import { Canvas } from '../canvas/Canvas'
import '../styles/tokens.css'
import '../styles/app.css'

export interface BoardProps {
  relay?: RelayOptions
  /** The caller's role on this board; 'viewer' makes the board read-only. */
  role?: Role
  /** Display name for this user's presence cursor. */
  presenceName?: string
  /** Cloud board title (shown in the top bar). */
  boardTitle?: string
  /** Account control (Clerk UserButton) — only the cloud route passes it, keeping Clerk out
   *  of the local-only bundle. */
  userSlot?: ReactNode
}

/**
 * The board surface, shared by the local-only Phase-1 entry (`App`) and every cloud route
 * (`BoardRoute`). Pass `relay` to sync the same Y.Doc through the Worker relay and light up
 * presence; omit it for a purely local board. The route remounts this with `key={boardId}`.
 */
export function Board({ relay, role, presenceName, boardTitle, userSlot }: BoardProps) {
  const [provider, setProvider] = useState<YProvider | null>(null)
  const attachProvider = useMemo(
    () => (relay ? makeRelayProvider({ ...relay, onProvider: setProvider }) : undefined),
    // getToken/onProvider captured at first attach; remount-by-key handles board changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relay?.host, relay?.boardId, relay?.share],
  )
  const { board, entities, rels, canUndo, canRedo, undo, redo } = useBoard({
    boardId: relay?.boardId,
    attachProvider,
  })
  const status = useConnectionStatus(provider)
  const readOnly = role === 'viewer'

  return (
    <div className="app">
      <TopBar
        board={board}
        entities={entities}
        rels={rels}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        status={status}
        readOnly={readOnly}
        title={boardTitle}
        boardId={relay?.boardId}
        getToken={relay?.getToken}
        role={role}
        userSlot={userSlot}
      />
      <Canvas
        board={board}
        entities={entities}
        rels={rels}
        awareness={provider?.awareness ?? null}
        presenceName={presenceName ?? 'Guest'}
        readOnly={readOnly}
      />
    </div>
  )
}
