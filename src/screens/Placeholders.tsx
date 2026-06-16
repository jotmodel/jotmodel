import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, useClerk } from '@clerk/clerk-react'
import { ScaffoldScreen } from './Scaffold'
import { Mark, Wordmark } from '../ui/Brand'

// Phase 2+ screens — scaffolded from tokens + primitives and flagged for design review.
// Not routed in Phase 1; kept as honest starting points (CLAUDE.md: scaffold, don't invent).

/** A routed full-screen status (404 / forbidden / offline). Scaffold — pending design review. */
function StatusScreen({ code, title, body, actions }: {
  code: string; title: string; body: string; actions?: ReactNode
}) {
  return (
    <div className="status-screen">
      {/* the Mark is the smallest data model — a calm, monochrome 'empty board' backdrop (law 1/6) */}
      <span className="status-bg-mark" aria-hidden="true"><Mark /></span>
      <Link to="/" className="status-brand" aria-label="Home"><Mark /><Wordmark /></Link>
      <div className="status-card">
        <span className="status-code">{code}</span>
        <h1>{title}</h1>
        <p className="muted">{body}</p>
        {actions ?? <Link to="/" className="btn primary">Back to your boards</Link>}
      </div>
    </div>
  )
}

export const NotFound = () => (
  <StatusScreen code="404" title="Not found" body="That board or page doesn’t exist — it may have been deleted or the link is wrong." />
)
export const Forbidden = () => (
  <StatusScreen
    code="403"
    title="No access"
    body="This board is private, or it’s shared with a different account than the one you’re signed into."
    actions={
      <>
        <SignedOut>
          <Link to="/sign-in" className="btn primary">Sign in</Link>
        </SignedOut>
        <SignedIn>
          <Link to="/" className="btn primary">Back to your boards</Link>
          <SwitchAccount />
        </SignedIn>
      </>
    }
  />
)

/** Quiet escape hatch on a 403: sign out so the user can come back as a different account. */
function SwitchAccount() {
  const clerk = useClerk()
  return <button className="linklike" onClick={() => clerk.signOut()}>Switch account</button>
}

// NOTE: the live, routed Home is src/screens/Home.tsx (a real board index). No placeholder Home here.
export const Settings = () => (
  <ScaffoldScreen title="Settings">
    <p className="muted">Account, theme, and preferences. Pending design review.</p>
  </ScaffoldScreen>
)
export const Billing = () => (
  <ScaffoldScreen title="Billing">
    <p className="muted">Plan and usage (Phase 4). Pending design review.</p>
  </ScaffoldScreen>
)
export const Marketing = () => (
  <ScaffoldScreen title="JotModel">
    <p className="muted">Type it. Drag it. It’s a model. Landing page — pending design review.</p>
  </ScaffoldScreen>
)
export const LoadingState = () => (
  <div className="scaffold-screen"><p className="muted">Loading…</p></div>
)
export const EmptyState = ({ what = 'Nothing here yet' }: { what?: string }) => (
  <div className="scaffold-screen"><p className="muted">{what}</p></div>
)
export const ErrorState = ({ message = 'Something went wrong' }: { message?: string }) => (
  <ScaffoldScreen title="Error"><p className="muted">{message}</p></ScaffoldScreen>
)
