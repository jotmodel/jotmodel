import { Component, type ReactNode } from 'react'
import '../styles/tokens.css'
import '../styles/app.css'

/** Last-resort guard: a render crash shows a calm, on-token recovery screen instead of a blank
 *  page. The board is local-first, so a reload restores it. Flagged for design review. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('JotModel crashed:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="status-screen">
        <div className="status-card">
          <span className="status-code">error</span>
          <h1>Something broke</h1>
          <p className="muted">An unexpected error occurred. Reloading usually fixes it — your board is saved locally.</p>
          <button className="btn btn-primary" onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}
