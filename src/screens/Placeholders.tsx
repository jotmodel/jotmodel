import { Link } from 'react-router-dom'
import { ScaffoldScreen } from './Scaffold'
import { Mark, Wordmark } from '../ui/Brand'

// Phase 2+ screens — scaffolded from tokens + primitives and flagged for design review.
// Not routed in Phase 1; kept as honest starting points (CLAUDE.md: scaffold, don't invent).

/** A routed full-screen status (404 / forbidden / offline). Scaffold — pending design review. */
function StatusScreen({ code, title, body }: { code: string; title: string; body: string }) {
  return (
    <div className="status-screen">
      <Link to="/" className="status-brand" aria-label="Home"><Mark /><Wordmark /></Link>
      <div className="status-card">
        <span className="status-code">{code}</span>
        <h1>{title}</h1>
        <p className="muted">{body}</p>
        <Link to="/" className="btn primary">Back to your boards</Link>
      </div>
    </div>
  )
}

export const NotFound = () => (
  <StatusScreen code="404" title="Not found" body="That board or page doesn’t exist — it may have been deleted or the link is wrong." />
)
export const Forbidden = () => (
  <StatusScreen code="403" title="No access" body="You don’t have permission to open this board. Ask the owner for an invite or a share link." />
)

export const Home = () => (
  <ScaffoldScreen title="Your boards">
    <p className="muted">Board list, search, and “new board” (Phase 2). Pending design review.</p>
  </ScaffoldScreen>
)
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
