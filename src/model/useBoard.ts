import { useEffect, useReducer, useRef } from 'react'
import {
  createBoard, observe, readEntities, readRels,
  type Board, type Entity, type Relationship,
} from './board'

export interface BoardState {
  board: Board
  entities: Entity[]
  rels: Relationship[]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

export interface UseBoardOptions {
  boardId?: string
  /** Provider seam: attach a sync provider (e.g. y-partyserver) to the same Y.Doc.
   *  Phase 1 is local-only; Phase 3 passes a relay provider here — the canvas never changes. */
  attachProvider?: (board: Board) => () => void
}

/** Subscribes to the local-first CRDT board and re-renders on any change. */
export function useBoard(opts: UseBoardOptions = {}): BoardState {
  const ref = useRef<Board | null>(null)
  if (!ref.current) ref.current = createBoard(opts.boardId)
  const board = ref.current
  const [, force] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const unobserve = observe(board.doc, () => force())
    const onStack = () => force()
    board.undo.on('stack-item-added', onStack)
    board.undo.on('stack-item-popped', onStack)
    board.undo.on('stack-cleared', onStack)
    // y-indexeddb loads asynchronously; re-render once the cached doc is ready,
    // and clear undo so loading the board is never itself "undoable".
    board.provider.whenSynced.then(() => { board.undo.clear(); force() })
    const detach = opts.attachProvider?.(board)
    return () => {
      unobserve()
      board.undo.off('stack-item-added', onStack)
      board.undo.off('stack-item-popped', onStack)
      board.undo.off('stack-cleared', onStack)
      detach?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board])

  return {
    board,
    entities: readEntities(board.doc),
    rels: readRels(board.doc),
    canUndo: board.undo.canUndo(),
    canRedo: board.undo.canRedo(),
    undo: () => board.undo.undo(),
    redo: () => board.undo.redo(),
  }
}
