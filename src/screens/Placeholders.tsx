import { ScaffoldScreen } from './Scaffold'

// Phase 2+ screens — scaffolded from tokens + primitives and flagged for design review.
// Not routed in Phase 1; kept as honest starting points (CLAUDE.md: scaffold, don't invent).

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
