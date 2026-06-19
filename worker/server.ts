import { YServer } from 'y-partyserver'
import type { Connection, ConnectionContext } from 'partyserver'
import * as Y from 'yjs'
import { boardSummaryJSON } from './summary'

interface ConnState { role: string }

/**
 * One Durable Object per board: holds the authoritative Y.Doc, syncs over WebSocket
 * (hibernation → scale-to-zero), and snapshots to R2. The Worker has already authorized
 * the connection (see auth.gateConnection) and injected X-Role; viewers are read-only.
 */
export class JotBoard extends YServer {
  static callbackOptions = { debounceWait: 2000, debounceMaxWait: 10000 }

  get snapshotKey(): string { return `board/${this.name}.ydoc` }

  async onLoad(): Promise<void> {
    const obj = await this.env.SNAPSHOTS.get(this.snapshotKey)
    if (obj) {
      Y.applyUpdate(this.document, new Uint8Array(await obj.arrayBuffer()))
      // Backfill the Home thumbnail for boards last saved before summaries existed. Only when
      // missing, and never touch updated_at — opening a board is not editing it, so the board
      // list's "recently edited" order must not shift just because someone looked at it.
      await this.env.DB.prepare('UPDATE boards SET summary_json=? WHERE id=? AND summary_json IS NULL')
        .bind(boardSummaryJSON(this.document), this.name).run().catch(() => {})
    }
  }

  async onSave(): Promise<void> {
    await this.env.SNAPSHOTS.put(this.snapshotKey, Y.encodeStateAsUpdate(this.document))
    // Keep the board list's "recently edited" ordering honest without a client round-trip, and
    // refresh the thumbnail summary from the same in-memory doc (it's already decoded here).
    // `this.name` is the board id (the Durable Object's name). Best-effort: a missing row
    // (e.g. a board deleted while open) is a harmless no-op.
    await this.env.DB.prepare('UPDATE boards SET updated_at=?, summary_json=? WHERE id=?')
      .bind(Date.now(), boardSummaryJSON(this.document), this.name).run().catch(() => {})
  }

  onConnect(conn: Connection<ConnState>, ctx: ConnectionContext) {
    conn.setState({ role: ctx.request.headers.get('X-Role') ?? 'viewer' })
    return super.onConnect(conn, ctx)
  }

  isReadOnly(conn: Connection<ConnState>): boolean {
    return conn.state?.role === 'viewer'
  }
}
