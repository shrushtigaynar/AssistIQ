import React, { useState, useEffect } from 'react'
import { PortalSwitcher } from './components/PortalSwitcher'
import { PortalSignIn } from './components/PortalSignIn'
import { AssistantDashboard } from './portals/assistant/AssistantDashboard'
import { ClientShell } from './portals/client/ClientShell'
import { AssistantWorkspace } from './portals/assistant/AssistantWorkspace'
import { AssistantWorkspaceNav } from './portals/assistant/components/AssistantWorkspaceNav'
import { TooltipProvider } from './components/ui/Tooltip'
import { clearPortalToken, createPortalSession, getStoredPortalToken, storePortalToken } from './services/api'

export function App() {
  const [activePortal, setActivePortal] = useState('assistant')
  const [assistantSection, setAssistantSection] = useState('inbox')
  const [workspaceRequest, setWorkspaceRequest] = useState(null)
  const [openThreadRequest, setOpenThreadRequest] = useState(null)
  const role = activePortal === 'client' ? 'CLIENT' : 'ASSISTANT'
  const [access, setAccess] = useState({ role, loading: true, session: null, error: '' })

  // Global key listener to quickly toggle portal with 'p' or 'P' key when not typing in inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target?.closest?.('input, textarea, select, button, a, [role="button"], [contenteditable="true"]')) {
        return
      }

      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setActivePortal(prev => prev === 'assistant' ? 'client' : 'assistant')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    let active = true
    const token = getStoredPortalToken(activePortal)
    setAccess({ role, loading: true, session: null, error: '' })
    if (!token) {
      setAccess({ role, loading: false, session: null, error: '' })
      return () => { active = false }
    }
    createPortalSession(token)
      .then((session) => {
        if (session?.role !== role) throw new Error(`Stored token does not grant ${role.toLowerCase()} portal access.`)
        if (active) setAccess({ role, loading: false, session, error: '' })
      })
      .catch((error) => {
        clearPortalToken(activePortal)
        if (active) setAccess({ role, loading: false, session: null, error: error.message })
      })
    return () => { active = false }
  }, [activePortal, role])

  const handleAuthenticated = (token, session) => {
    storePortalToken(activePortal, token)
    setAccess({ role, loading: false, session, error: '' })
  }

  const handleSignOut = () => {
    clearPortalToken(activePortal)
    setAccess({ role, loading: false, session: null, error: '' })
  }

  const navigateWorkspace = (section, filter = null) => {
    setAssistantSection(section)
    setWorkspaceRequest({ section, filter, nonce: Date.now() })
  }

  const openConversation = (threadId) => {
    setAssistantSection('inbox')
    setOpenThreadRequest({ threadId, nonce: Date.now() })
  }

  const updateSessionProfile = (profile) => {
    setAccess((current) => ({
      ...current,
      session: current.session
        ? { ...current.session, user: { ...current.session.user, name: profile.name, preferences: profile.preferences } }
        : current.session,
    }))
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-brand-500/20 selection:text-brand-300">
        {/* Persistent Portal Switcher Header */}
        <PortalSwitcher
          activePortal={activePortal}
          onSwitchPortal={setActivePortal}
          currentUser={access.role === role ? access.session?.user : null}
          onSignOut={access.session ? handleSignOut : undefined}
        />

        {/* Dynamic Portal Shell */}
        <div className="flex-1">
          {access.loading || access.role !== role ? (
            <div className="flex h-full min-h-64 items-center justify-center text-xs text-zinc-400">Verifying portal access…</div>
          ) : !access.session ? (
            <PortalSignIn role={role} initialError={access.error} onAuthenticated={handleAuthenticated} />
          ) : activePortal === 'assistant' ? (
            <div>
              <div className="bg-zinc-950 px-3 pt-3 sm:px-6">
                <AssistantWorkspaceNav activeView={assistantSection} onNavigate={navigateWorkspace} />
              </div>
              {assistantSection === 'inbox' ? (
                <AssistantDashboard
                  onNavigateWorkspace={navigateWorkspace}
                  openThreadRequest={openThreadRequest}
                  onThreadRequestHandled={() => setOpenThreadRequest(null)}
                  initialInboxSegment={access.session.user.preferences?.defaultInboxSegment}
                />
              ) : (
                <AssistantWorkspace
                  section={assistantSection}
                  workspaceRequest={workspaceRequest}
                  onOpenConversation={openConversation}
                  onProfileUpdated={updateSessionProfile}
                />
              )}
            </div>
          ) : (
            <ClientShell profile={access.session.user} />
          )}
        </div>

        {/* Global Minimal Status Bar */}
        <footer className="h-7 border-t border-zinc-800/80 bg-zinc-950 px-4 flex items-center justify-between text-[11px] font-mono text-zinc-500 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Shared Assistant and Client Workspace</span>
            </span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline">Theme: Slate-Dark</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1 py-0.2 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[10px]">P</kbd>
              <span>Toggle Portal</span>
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-brand-400 font-medium">AssistIQ Prototype</span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}

export default App
