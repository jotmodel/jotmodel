/** The JotModel mark — monochrome (uses currentColor), per law 6. Two entities + a crow's-foot:
 *  the smallest possible data model. Shared by the top bar, auth, and home. */
export function Mark({ className = 'mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-label="JotModel">
      <path d="M16 16 C 23 23, 17 36, 26.5 36" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <line x1="26.5" y1="36" x2="30" y2="32.6" /><line x1="26.5" y1="36" x2="30" y2="36" /><line x1="26.5" y1="36" x2="30" y2="39.4" />
      </g>
      <rect x="5" y="5" width="14" height="14" rx="4" fill="currentColor" />
      <rect x="30" y="29" width="13" height="13" rx="3.6" fill="none" stroke="currentColor" strokeWidth="2.8" />
    </svg>
  )
}

/** The wordmark — Space Grotesk only (law 7). `jot` bold, `model` mid-weight. */
export function Wordmark() {
  return <span className="wm"><b>jot</b><span>model</span></span>
}
