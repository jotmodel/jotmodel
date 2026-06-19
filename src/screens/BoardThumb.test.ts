import { describe, it, expect } from 'vitest'
import { thumbLayout } from './BoardThumb'
import { ENT_W, HEADER_H, ROW_H, BODY_PAD } from '../model/geom'

describe('thumbLayout', () => {
  it('returns null when there is nothing to draw', () => {
    expect(thumbLayout(null)).toBeNull()
    expect(thumbLayout(undefined)).toBeNull()
    expect(thumbLayout({ v: 1, e: [], r: [] })).toBeNull()
  })

  it('sizes cards from the field count and encloses them with padding', () => {
    const layout = thumbLayout({
      v: 1,
      e: [{ i: 'a', x: 0, y: 0, n: 2, c: 'teal' }, { i: 'b', x: 300, y: 120, n: 0, c: null }],
      r: [['a', 'b']],
    })!
    expect(layout).not.toBeNull()
    const a = layout.cards.find(c => c.id === 'a')!
    expect(a.w).toBe(ENT_W)
    expect(a.h).toBe(HEADER_H + 2 * ROW_H + 2 * BODY_PAD)
    // one connector between the two card centres
    expect(layout.lines).toHaveLength(1)
    // viewBox starts above/left of the top-left card (padding applied)
    expect(layout.view.x).toBeLessThan(0)
    expect(layout.view.y).toBeLessThan(0)
  })

  it('skips a line whose endpoint is absent from the entity list', () => {
    const layout = thumbLayout({ v: 1, e: [{ i: 'a', x: 0, y: 0, n: 0, c: null }], r: [['a', 'ghost']] })!
    expect(layout.lines).toHaveLength(0)
  })
})
