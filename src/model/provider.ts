import YProvider from 'y-partyserver/provider'
import type { Board } from './board'

export interface RelayOptions {
  /** Worker host, e.g. "api.jotmodel.com" or "localhost:8787". */
  host: string
  boardId: string
  /** A static Clerk session JWT (named accounts) … */
  token?: string
  /** … or a share-link capability token (anonymous, role-scoped). */
  share?: string
  /**
   * Dynamic auth: re-read on every (re)connect so a Clerk JWT can't go stale. Preferred over
   * `token` for signed-in users — y-partyserver's YProvider re-invokes the params function in
   * `_reconnectWS`, so the socket reconnects with a fresh token.
   */
  getToken?: () => Promise<string | null>
  /** Receives the live provider once attached (for awareness/presence + connection status). */
  onProvider?: (provider: YProvider) => void
}

/**
 * The Phase-3 provider seam. Returns an `attachProvider` for `useBoard` that points the
 * SAME Y.Doc at the relay — the one-line swap the architecture promises; the canvas,
 * model, and undo (origins exclude provider updates) are untouched.
 *
 *   useBoard({ boardId, attachProvider: makeRelayProvider({ host, boardId, getToken }) })
 */
export function makeRelayProvider(opts: RelayOptions) {
  return (board: Board): (() => void) => {
    const staticParams: Record<string, string> = {}
    if (opts.token) staticParams.token = opts.token
    if (opts.share) staticParams.share = opts.share

    // When a token-getter is supplied, pass `params` as a function so the JWT is fetched fresh
    // on each (re)connect. Share tokens are static capability strings, so they stay in staticParams.
    const params = opts.getToken
      ? async () => {
          const t = await opts.getToken!()
          return { ...staticParams, ...(t ? { token: t } : {}) }
        }
      : staticParams

    // party "jot-board" = kebab-case of the `JotBoard` Durable Object binding.
    const provider = new YProvider(opts.host, opts.boardId, board.doc, { party: 'jot-board', params })
    opts.onProvider?.(provider)
    return () => provider.destroy()
  }
}
