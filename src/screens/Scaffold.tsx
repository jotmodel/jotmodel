import type { ReactNode } from 'react'

/**
 * Per CLAUDE.md: only the board/canvas is designed. Every other screen is scaffolded from
 * tokens + primitives and FLAGGED for design review — never given invented final visuals.
 * These helpers carry that flag visibly so a scaffold is never mistaken for finished UI.
 */
export function DesignReviewFlag({ note }: { note?: string }) {
  return <span className="review-flag" title="Scaffold — pending design review">◆ design review{note ? ` · ${note}` : ''}</span>
}

export function ScaffoldModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-h">
          <h2>{title}</h2>
          <DesignReviewFlag />
          <span className="sp" />
          <button className="btn icon" aria-label="close" onClick={onClose}>×</button>
        </div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  )
}

export function ScaffoldScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="scaffold-screen">
      <div className="scaffold-card">
        <div className="modal-h"><h2>{title}</h2><DesignReviewFlag /></div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  )
}
