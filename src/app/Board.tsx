import { useMemo } from 'react'
import { useBoard } from '../model/useBoard'
import { makeRelayProvider, type RelayOptions } from '../model/provider'
import { TopBar } from '../ui/TopBar'
import { Canvas } from '../canvas/Canvas'
import '../styles/tokens.css'
import '../styles/app.css'

/**
 * The board surface, shared by the local-only Phase-1 entry (`App`) and every cloud route
 * (`BoardRoute`). Pass `relay` to sync the same Y.Doc through the Worker relay; omit it for a
 * purely local board. The route remounts this with `key={boardId}` so `useBoard`/`createBoard`
 * (which run once per mount) get a fresh doc when the board changes.
 */
export function Board({ relay }: { relay?: RelayOptions }) {
  const attachProvider = useMemo(
    () => (relay ? makeRelayProvider(relay) : undefined),
    // getToken/onProvider are captured at first attach (useBoard attaches once per mount);
    // remount-by-key handles board changes, so host/boardId/share are sufficient deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relay?.host, relay?.boardId, relay?.share],
  )
  const { board, entities, rels, canUndo, canRedo, undo, redo } = useBoard({
    boardId: relay?.boardId,
    attachProvider,
  })
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
      />
      <Canvas board={board} entities={entities} rels={rels} />
    </div>
  )
}
