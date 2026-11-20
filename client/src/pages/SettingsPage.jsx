import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, LogOut, Mail, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import {
  disconnectEmailAccount,
  fetchEmailAccounts,
  getGmailConnectUrl,
  syncEmailAccount,
} from '../services/api'
import { formatFullDateTime } from '../constants/classifications'

export const SettingsPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [busyAccount, setBusyAccount] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const connectError = searchParams.get('connectError') || ''

  const refreshAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      setAccounts(await fetchEmailAccounts())
    } catch (error) {
      setToast({ message: error.message || 'Unable to load email accounts.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { refreshAccounts() }, [refreshAccounts])

  const gmailAccount = accounts.find((account) => account.provider === 'GMAIL') || null
  const isConfigured = gmailAccount ? gmailAccount.configured : accounts.length ? accounts[0].configured : true

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const url = await getGmailConnectUrl()
      if (url) {
        window.location.assign(url)
        return
      }
      throw new Error('No connection URL was returned.')
    } catch (error) {
      setToast({ message: error.message || 'Unable to start the Gmail connection.', type: 'error' })
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncEmailAccount(60)
      setToast({ message: `Synced ${result.conversationsSynced} conversation(s).`, type: 'success' })
      refreshAccounts()
    } catch (error) {
      setToast({ message: error.message || 'Sync failed.', type: 'error' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!gmailAccount) return
    setBusyAccount(gmailAccount.id)
    try {
      await disconnectEmailAccount(gmailAccount.id)
      setToast({ message: 'Gmail account disconnected.', type: 'info' })
      refreshAccounts()
    } catch (error) {
      setToast({ message: error.message || 'Unable to disconnect the account.', type: 'error' })
    } finally {
      setBusyAccount('')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to="/inbox" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
          </Link>
          <span className="ml-auto text-sm font-semibold tracking-tight text-zinc-900">Settings</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {connectError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{connectError}</span>
          </div>
        )}

        {/* Account */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Account</h2>
          <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
            <p><span className="text-zinc-400">Name:</span> <span className="font-medium text-zinc-800">{user?.name}</span></p>
            <p><span className="text-zinc-400">Email:</span> <span className="font-medium text-zinc-800">{user?.email}</span></p>
          </div>
          <Button variant="danger" size="sm" className="mt-4" onClick={handleSignOut}>
            <LogOut className="mr-1.5 h-3 w-3" /> Sign Out
          </Button>
        </section>

        {/* Email connection */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Connected Email Account</h2>

          {!isConfigured ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-medium text-amber-800">Gmail integration is not configured on the server.</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700">
                To enable real Gmail connections, the server administrator must create a Google Cloud OAuth 2.0 client
                (Web application), add the redirect URI <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">{'{server origin}'}/api/email-accounts/google/callback</code>,
                and set <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">GOOGLE_CLIENT_ID</code>,{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">GOOGLE_CLIENT_SECRET</code> and{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">GOOGLE_REDIRECT_URI</code> in the server environment.
                No email account is connected right now.
              </p>
            </div>
          ) : isLoading ? (
            <div className="mt-3 flex items-center gap-2 py-6 text-xs text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading connected accounts…
            </div>
          ) : gmailAccount && gmailAccount.connectionStatus === 'CONNECTED' ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-800">{gmailAccount.providerEmail}</p>
                  <p className="text-[11px] text-zinc-500">
                    Connected · {gmailAccount.lastSynchronizationTime
                      ? `Last synced ${formatFullDateTime(gmailAccount.lastSynchronizationTime)}`
                      : 'Never synced'}
                  </p>
                </div>
              </div>
              {gmailAccount.lastError && (
                <p className="mt-2 text-[11px] text-rose-600">{gmailAccount.lastError}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleSync} loading={isSyncing}>
                  <RefreshCw className="mr-1.5 h-3 w-3" /> Sync Now
                </Button>
                <Button variant="danger" size="sm" onClick={handleDisconnect} loading={busyAccount === gmailAccount.id}>
                  <Trash2 className="mr-1.5 h-3 w-3" /> Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white border border-zinc-200">
                <Mail className="h-4.5 w-4.5 h-5 w-5 text-zinc-400" />
              </span>
              <p className="mt-3 text-xs font-medium text-zinc-700">No email account connected</p>
              <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-zinc-500">
                Connect your Gmail account to import your inbox. AssistIQ requests read access to analyze your emails
                and send access for the replies you explicitly approve.
              </p>
              <Button variant="brand" size="sm" className="mt-4" onClick={handleConnect} loading={isConnecting}>
                Connect Gmail
              </Button>
            </div>
          )}
        </section>

        <p className="text-center text-[11px] text-zinc-400">
          Replies are never sent without your explicit approval. Disconnecting revokes all Gmail permissions.
        </p>
      </main>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  )
}

export default SettingsPage
