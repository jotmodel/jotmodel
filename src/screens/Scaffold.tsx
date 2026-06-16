import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Per CLAUDE.md: only the board/canvas is designed. Every other screen is scaffolded from
 * tokens + primitives and FLAGGED for design review — never given invented final visuals.
 * These helpers carry that flag visibly so a scaffold is never mistaken for finished UI.
 */
export function DesignReviewFlag({ note }: { note?: string }) {
  return <span className="review-flag" title="Scaffold — pending design review">◆ design review{note ? ` · ${note}` : ''}</span>
}

export function ScaffoldModal({ title, onClose, children, flagged = true }: {
  title: string; onClose: () => void; children: ReactNode; flagged?: boolean
}) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Law 3 / Done-check: a dialog needs a keyboard path — Esc to close, focus moved in + trapped,
  // and focus returned to the trigger on close.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    const modal = modalRef.current
    modal?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab' || !modal) return
      const f = modal.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      prevFocus?.focus?.()
    }
  }, [onClose])

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div className="modal" ref={modalRef} onMouseDown={(e) => e.stopPropagation()}
           role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-h">
          <h2 id={titleId}>{title}</h2>
          {flagged && <DesignReviewFlag />}
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
