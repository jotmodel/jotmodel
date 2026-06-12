import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import App from '../App'
import { ScaffoldScreen } from './Scaffold'

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

/**
 * Phase 2 auth shell, activated only when VITE_CLERK_PUBLISHABLE_KEY is set (main.tsx
 * loads this lazily so Phase 1 stays Clerk-free). Signed-in users get the board; the
 * sign-in screen is a scaffold — Clerk's default UI is unstyled and flagged for design review.
 */
export function AuthApp() {
  return (
    <ClerkProvider publishableKey={KEY}>
      <SignedOut>
        <ScaffoldScreen title="Sign in to JotModel">
          <p className="muted">Accounts + cloud save (Phase 2). The control below is Clerk's default UI — final auth visuals are pending design review.</p>
          <SignIn routing="hash" />
        </ScaffoldScreen>
      </SignedOut>
      <SignedIn>
        <App />
      </SignedIn>
    </ClerkProvider>
  )
}
