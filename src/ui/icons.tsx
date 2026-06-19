/** Quiet monochrome line icons (currentColor) for chrome controls — law 1: chrome carries no
 *  colour of its own, so these inherit the button's text colour and stay neutral in both themes.
 *  Sized to the surrounding control. */
export function IconRename({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.5 2.5 13.5 5.5 6 13 3 13.5 3.5 10.5 10.5 2.5Z" />
      <path d="M9.5 3.5 12.5 6.5" />
    </svg>
  )
}

export function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4.5h10" />
      <path d="M6.5 4.5V3h3v1.5" />
      <path d="M4.5 4.5 5 13h6l.5-8.5" />
    </svg>
  )
}

/** Folder — "move to project". Quiet monochrome line icon (law 1). */
export function IconMove({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4.5a1 1 0 0 1 1-1h3l1.3 1.4H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z" />
    </svg>
  )
}
