import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { BoardRoute } from './BoardRoute'
import { Home } from '../screens/Home'
import { SignInScreen } from '../screens/AuthGate'
import { NotFound, Forbidden } from '../screens/Placeholders'

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

/** Root layout: Clerk's session context wraps every route. */
function Root() {
  return (
    <ClerkProvider publishableKey={KEY} afterSignOutUrl="/">
      <Outlet />
    </ClerkProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/b/:boardId', element: <BoardRoute /> },
      // Clerk's <SignIn> uses hash routing internally, so a single splat route hosts it.
      { path: '/sign-in/*', element: <SignInScreen /> },
      { path: '/forbidden', element: <Forbidden /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

/** Phase-2+ entry: routed, account-aware app (loaded only when a Clerk key is configured). */
export function AppRouter() {
  return <RouterProvider router={router} />
}
