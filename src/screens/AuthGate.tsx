import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Mark, Wordmark } from '../ui/Brand'
import { clerkAppearance } from './clerkAppearance'
import { DesignReviewFlag } from './Scaffold'
import '../styles/tokens.css'
import '../styles/app.css'

/**
 * Sign-in screen. Clerk owns the form (sessions, MFA, OAuth); we only re-skin it to the
 * design tokens (see clerkAppearance). Routing is hash-based so Clerk manages its own
 * sub-steps without router coupling. Once signed in, we send the user to `?redirect=` (or home).
 * Flagged for design review per CLAUDE.md — the final auth visuals are not yet signed off.
 */
export function SignInScreen() {
  const [sp] = useSearchParams()
  const redirect = sp.get('redirect') || '/'
  return (
    <>
      <SignedIn>
        <Navigate to={redirect} replace />
      </SignedIn>
      <SignedOut>
        <div className="auth-screen">
          <header className="auth-brand">
            <Mark />
            <Wordmark />
            <DesignReviewFlag />
          </header>
          <SignIn routing="hash" appearance={clerkAppearance} />
          <p className="hint-note">Accounts &amp; cloud save · final auth visuals pending design review.</p>
        </div>
      </SignedOut>
    </>
  )
}
