/**
 * Re-skins Clerk's hosted components to the JotModel tokens (law 7 — no raw hex here; only
 * token references). Clerk applies `variables` as CSS custom-property values inside its own
 * in-page DOM, so `var(--jm-*)` resolves and flips with light/dark automatically.
 * Kept deliberately minimal — flagged for design review alongside the auth screen.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--jm-signal)',
    colorText: 'var(--jm-text)',
    colorTextSecondary: 'var(--jm-text-mid)',
    colorTextOnPrimaryBackground: 'var(--jm-on-signal)',
    colorBackground: 'var(--jm-surface)',
    colorInputBackground: 'var(--jm-surface)',
    colorInputText: 'var(--jm-text)',
    colorDanger: 'var(--sem-rose)',
    fontFamily: 'var(--jm-ui)',
    borderRadius: 'var(--jm-r-md)',
  },
  elements: {
    card: 'jm-clerk-card',
    rootBox: 'jm-clerk-root',
  },
} as const
