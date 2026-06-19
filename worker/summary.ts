import * as Y from 'yjs'

/**
 * A tiny, render-only summary of a board's model, computed server-side from the authoritative
 * Y.Doc and cached in D1 (`boards.summary_json`). The Home screen draws it as a vector thumbnail
 * (see src/screens/BoardThumb.tsx) — so we keep ONLY the geometry needed to lay out cards + lines:
 * positions, a field count (→ card height), the semantic colour, and relationship endpoints.
 * Field names / types are deliberately omitted (illegible at thumbnail scale, and no need to ship
 * model content in every board-list response).
 *
 * Shapes mirror the CRDT in src/model/board.ts: doc.getMap('entities') / .getMap('relationships'),
 * each value a Y.Map. The matching client type lives in src/lib/api.ts (ThumbModel).
 */
export const SUMMARY_MAX_ENTITIES = 80
export const SUMMARY_MAX_RELS = 160

export interface ThumbEntity { i: string; x: number; y: number; n: number; c: string | null }
export interface ThumbModel { v: 1; e: ThumbEntity[]; r: [string, string][] }

export function boardSummary(doc: Y.Doc): ThumbModel {
  const entities = doc.getMap('entities') as Y.Map<Y.Map<any>>
  const rels = doc.getMap('relationships') as Y.Map<Y.Map<any>>

  const e: ThumbEntity[] = []
  for (const m of entities.values()) {
    const fields = m.get('fields') as Y.Array<any> | undefined
    e.push({
      i: String(m.get('id')),
      x: Number(m.get('x')) || 0,
      y: Number(m.get('y')) || 0,
      n: fields ? fields.length : 0,
      c: (m.get('color') as string | null) ?? null,
    })
    if (e.length >= SUMMARY_MAX_ENTITIES) break
  }

  const ids = new Set(e.map((x) => x.i))
  const r: [string, string][] = []
  for (const m of rels.values()) {
    const from = String(m.get('fromId'))
    const to = String(m.get('toId'))
    // Only keep edges whose both ends survived the entity cap, so the thumbnail never
    // draws a line to a card that isn't there.
    if (ids.has(from) && ids.has(to)) {
      r.push([from, to])
      if (r.length >= SUMMARY_MAX_RELS) break
    }
  }

  return { v: 1, e, r }
}

export function boardSummaryJSON(doc: Y.Doc): string {
  return JSON.stringify(boardSummary(doc))
}
