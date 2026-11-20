import React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import InboxPage from './pages/InboxPage'
import SettingsPage from './pages/SettingsPage'

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="flex items-center gap-3 text-xs text-zinc-400">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading AssistIQ…
    </div>
  </div>
)

const RequireAuth = ({ children }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullScreenLoader />
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  return children
}

const RedirectIfAuthenticated = ({ children }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return <FullScreenLoader />
  if (user) return <Navigate to="/inbox" replace />
  return children
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/signin" element={<RedirectIfAuthenticated><SignInPage /></RedirectIfAuthenticated>} />
    <Route path="/signup" element={<RedirectIfAuthenticated><SignUpPage /></RedirectIfAuthenticated>} />
    <Route path="/inbox" element={<RequireAuth><InboxPage /></RequireAuth>} />
    <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
