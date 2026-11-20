import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Inbox, Loader2, Mail, RefreshCw, Search, X } from 'lucide-react'
import {
  fetchThreads,
  getThread,
  updateThreadClassification,
  updateThreadStatus,
  analyzeThread,
  generateThreadDraft,
  saveThreadDraft,
  sendThreadReply,
  fetchEmailAccounts,
  syncEmailAccount,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/inbox/Sidebar'
import EmailListItem from '../components/inbox/EmailListItem'
import EmailReader from '../components/inbox/EmailReader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Toast } from '../components/ui/Toast'
import { cn } from '../utils/cn'
import { CATEGORY_KEYS, classificationConfig } from '../constants/classifications'

export const InboxPage = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [category, setCategory] = useState('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [threads, setThreads] = useState([])
  const [counts, setCounts] = useState({})
  const [selectedThreadId, setSelectedThreadId] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const searchTimer = useRef(null)

  const connectedAccount = accounts.find((account) => account.connectionStatus === 'CONNECTED') || null

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  const refreshThreads = useCallback(async (options = {}) => {
    if (!options.quiet) setIsLoading(true)
    try {
      const result = await fetchThreads({ category, search: debouncedSearch })
      setThreads(result.threads)
      setCounts(result.counts)
      setError('')
    } catch (requestError) {
      setThreads([])
      setError(requestError.message || 'Unable to load your inbox.')
    } finally {
      if (!options.quiet) setIsLoading(false)
    }
  }, [category, debouncedSearch])

  const refreshAccounts = useCallback(async () => {
    try {
      setAccounts(await fetchEmailAccounts())
    } catch {
      setAccounts([])
    }
  }, [])

  useEffect(() => { refreshThreads() }, [refreshThreads])
  useEffect(() => { refreshAccounts() }, [refreshAccounts])

  // After returning from a successful Gmail connection, sync immediately.
  const connectedParam = searchParams.get('connected')
  useEffect(() => {
    if (!connectedParam) return undefined
    setSearchParams({}, { replace: true })
    refreshAccounts()
    setToast({ message: 'Gmail connected. Syncing your inbox…', type: 'success' })
    return undefined
  }, [connectedParam])

  useEffect(() => {
    if (connectedParam) syncNow(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedParam])

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  )

  const handleSelect = async (threadId) => {
    setSelectedThreadId(threadId)
    const thread = threads.find((item) => item.id === threadId)
    if (thread && !thread.isRead) {
      try {
        await updateThreadStatus(threadId, { isRead: true })
        setThreads((current) => current.map((item) => (item.id === threadId ? { ...item, isRead: true } : item)))
        setCounts((current) => ({ ...current }))
      } catch {
        // Non-blocking.
      }
    }
  }

  const handleReclassify = async (threadId, classification) => {
    try {
      await updateThreadClassification(threadId, classification)
      const updated = await getThread(threadId)
      setThreads((current) => current.map((item) => (item.id === threadId ? { ...updated, id: updated.threadId } : item)))
      const result = await fetchThreads({ category, search: debouncedSearch })
      setThreads(result.threads)
      setCounts(result.counts)
      setToast({ message: `Classification changed to ${classificationConfig(classification).label}`, type: 'info' })
    } catch (requestError) {
      setToast({ message: requestError.message || 'Unable to change classification.', type: 'error' })
    }
  }

  const handleAnalyze = async (threadId) => {
    const updated = await analyzeThread(threadId)
    setThreads((current) => current.map((item) => (item.id === threadId ? { ...updated, id: updated.threadId } : item)))
    return updated
  }

  const handleGenerateDraft = async (threadId, tone) => {
    const result = await generateThreadDraft(threadId, tone)
    setThreads((current) => current.map((item) => (item.id === threadId ? { ...result.thread, id: result.thread.threadId } : item)))
    return result
  }

  const handleSaveDraft = async (threadId, draft) => {
    await saveThreadDraft(threadId, draft)
  }

  const handleSend = async (threadId, draft) => {
    await sendThreadReply(threadId, draft)
    setToast({ message: 'Reply sent via Gmail.', type: 'success' })
    await refreshThreads({ quiet: true })
  }

  async function syncNow(showToast = false) {
    setIsSyncing(true)
    try {
      const result = await syncEmailAccount(60)
      await Promise.all([refreshThreads({ quiet: true }), refreshAccounts()])
      if (showToast) {
        setToast({ message: `Synced ${result.conversationsSynced} conversation(s).`, type: 'success' })
      }
    } catch (requestError) {
      if (showToast) setToast({ message: requestError.message || 'Sync failed.', type: 'error' })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        counts={counts}
        category={category}
        onCategory={(next) => { setCategory(next); setSelectedThreadId(null) }}
        connectedAccount={connectedAccount}
        user={user}
        onSignOut={async () => { await signOut(); navigate('/', { replace: true }) }}
        onSync={() => syncNow(false)}
        isSyncing={isSyncing}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Page header */}
        <div className="border-b border-zinc-200 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-900">Inbox</h1>
              <p className="text-xs text-zinc-500">
                {connectedAccount
                  ? <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-emerald-600" /> {connectedAccount.providerEmail}</span>
                  : <Link to="/settings" className="text-brand-600 hover:text-brand-700">Connect your email account to get started</Link>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => syncNow(true)} loading={isSyncing} disabled={!connectedAccount}>
                <RefreshCw className={cn('mr-1.5 h-3 w-3', isSyncing && 'animate-spin')} /> Sync
              </Button>
            </div>
          </div>

          {/* Search + category filters */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search emails…"
                aria-label="Search emails"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50/60 py-1.5 pl-8 pr-8 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    category === key
                      ? 'border-zinc-300 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  )}
                >
                  {key === 'ALL' ? 'All' : classificationConfig(key).label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Email list */}
        <div className="min-h-0 flex-1 overflow-y-auto" role="list" aria-label="Email list">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-20 text-xs text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
              Loading your inbox…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <p className="max-w-sm text-sm text-zinc-600">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => refreshThreads()}>Retry</Button>
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100">
                <Inbox className="h-5 w-5 text-zinc-400" />
              </span>
              <p className="text-sm font-medium text-zinc-700">
                {debouncedSearch ? 'No emails match your search.' : 'No emails found.'}
              </p>
              <p className="max-w-sm text-xs text-zinc-500">
                {debouncedSearch
                  ? 'Try a different search term or clear the search.'
                  : 'Connect your email account to get started.'}
              </p>
              {!debouncedSearch && (
                <Link to="/settings">
                  <Button variant="brand" size="sm">Connect Email Account</Button>
                </Link>
              )}
            </div>
          ) : (
            threads.map((thread) => (
              <EmailListItem
                key={thread.id}
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </main>

      {/* Reader panel */}
      {selectedThread && (
        <div className="fixed inset-0 z-40 flex justify-end bg-zinc-900/25 lg:static lg:col-span-1 lg:block lg:w-[480px] lg:bg-transparent xl:w-[560px]">
          <EmailReader
            thread={selectedThread}
            isGmailConnected={Boolean(connectedAccount)}
            onClose={() => setSelectedThreadId(null)}
            onReclassify={handleReclassify}
            onAnalyze={handleAnalyze}
            onGenerateDraft={handleGenerateDraft}
            onSaveDraft={handleSaveDraft}
            onSend={handleSend}
          />
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  )
}

export default InboxPage
