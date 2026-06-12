import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './app/ErrorBoundary'

const root = ReactDOM.createRoot(document.getElementById('root')!)
const render = (node: React.ReactNode) =>
  root.render(<React.StrictMode><ErrorBoundary>{node}</ErrorBoundary></React.StrictMode>)

// With a Clerk key (always set in production) load the full routed app — accounts, cloud
// boards, sharing, multiplayer. Without one, fall back to the Clerk-free local-only Phase-1
// board so the default dev bundle stays lean and works with zero backend.
if (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  import('./app/AppRouter').then(({ AppRouter }) => render(<AppRouter />))
} else {
  import('./App').then(({ default: App }) => render(<App />))
}
