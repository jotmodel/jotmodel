import { Board } from './app/Board'

/** Phase-1 local-only entry: a single board in the browser, no accounts, no relay.
 *  The routed, account-aware app lives in app/AppRouter (loaded when a Clerk key is set). */
export default function App() {
  return <Board />
}
