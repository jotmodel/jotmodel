import YProvider from 'y-partyserver/provider'
import type { Board } from './board'

export interface RelayOptions {
  /** Worker host, e.g. "jotmodel.<account>.workers.dev" or "localhost:8787". */
  host: string
  boardId: string
  /** Clerk session JWT (named accounts) … */
  token?: string
  /** … or a share-link capability token (anonymous, role-scoped). */
  share?: string
}

/**
 * The Phase-3 provider seam. Returns an `attachProvider` for `useBoard` that points the
 * SAME Y.Doc at the relay — the one-line swap the architecture promises; the canvas,
 * model, and undo (origins exclude provider updates) are untouched.
 *
 *   useBoard({ boardId, attachProvider: makeRelayProvider({ host, boardId, token }) })
 */
export function makeRelayProvider(opts: RelayOptions) {
  return (board: Board): (() => void) => {
    const params: Record<string, string> = {}
    if (opts.token) params.token = opts.token
    if (opts.share) params.share = opts.share
    // party "jot-board" = kebab-case of the `JotBoard` Durable Object binding.
    const provider = new YProvider(opts.host, opts.boardId, board.doc, { party: 'jot-board', params })
    return () => provider.destroy()
  }
}
