import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root')!)
const render = (node: React.ReactNode) => root.render(<React.StrictMode>{node}</React.StrictMode>)

// Phase 1 is local-only. When a Clerk key is configured, lazy-load the auth shell
// (Phase 2) so the default bundle stays Clerk-free.
if (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  import('./screens/AuthGate').then(({ AuthApp }) => render(<AuthApp />))
} else {
  render(<App />)
}
