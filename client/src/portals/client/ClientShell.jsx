import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CornerUpLeft,
  FileText,
  Inbox,
  LoaderCircle,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  Settings2,
  ShieldAlert,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import {
  decideClientDraft,
  delegateClientConversation,
  fetchClientConversation,
  fetchClientDrafts,
  fetchClientInbox,
  fetchClientProfile,
  markClientConversationHandled,
  submitClientResponse,
  updateClientPreferences,
} from '../../services/api'
import { safeHttpUrl } from '../../utils/urls'

const dateLabel = (value) => {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

const getMessageRecipients = (message) => [
  ...(message.recipients || []),
  ...(message.cc || []).map((address) => `CC ${address}`),
].join(', ') || 'No recipients listed'

export const ClientShell = ({ profile: sessionProfile }) => {
  const [profile, setProfile] = useState(sessionProfile)
  const [preferences, setPreferences] = useState(sessionProfile?.preferences || {})
  const [threads, setThreads] = useState([])
  const [drafts, setDrafts] = useState([])
  const [includeHandled, setIncludeHandled] = useState(false)
  const [selectedThread, setSelectedThread] = useState(null)
  const [delegationTarget, setDelegationTarget] = useState(null)
  const [delegationInstruction, setDelegationInstruction] = useState('')
  const [responseBody, setResponseBody] = useState('')
  const [confirmResponse, setConfirmResponse] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showPreferences, setShowPreferences] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const conversationDialogRef = useRef(null)
  const lastOpenedConversationId = useRef('')

  const refreshData = useCallback(async (showInitialLoading = false) => {
    if (showInitialLoading) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      const [nextProfile, nextThreads, nextDrafts] = await Promise.all([
        fetchClientProfile(),
        fetchClientInbox(includeHandled),
        fetchClientDrafts(),
      ])
      setProfile(nextProfile)
      setPreferences(nextProfile?.preferences || {})
      setThreads(nextThreads)
      setDrafts(nextDrafts)
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your conversations.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [includeHandled])

  useEffect(() => {
    refreshData(true)
    const interval = window.setInterval(() => refreshData(false), 20000)
    return () => window.clearInterval(interval)
  }, [refreshData])

  useEffect(() => {
    if (!selectedThread?.id) return undefined
    const interval = window.setInterval(async () => {
      try {
        const latest = await fetchClientConversation(selectedThread.id)
        setSelectedThread(latest)
      } catch (requestError) {
        if (requestError.message === 'Conversation not found') {
          setSelectedThread(null)
          setError('This conversation is no longer available in your client portal.')
        } else {
          setError(requestError.message || 'Unable to refresh this conversation.')
        }
      }
    }, 20000)
    return () => window.clearInterval(interval)
  }, [selectedThread?.id])

  useEffect(() => {
    if (!selectedThread?.id) return undefined
    const previousFocus = document.activeElement
    const dialog = conversationDialogRef.current
    const getFocusable = (container) => [...(container?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])') || [])]
    getFocusable(dialog)[0]?.focus()

    const handleDialogKeys = (event) => {
      if (event.key === 'Escape') {
        if (event.target?.closest?.('[data-nested-dialog]')) return
        event.preventDefault()
        closeConversation()
        return
      }
      if (event.key !== 'Tab') return

      const scope = dialog?.querySelector('[data-nested-dialog]') || dialog
      const focusable = getFocusable(scope)
      if (!focusable.length) {
        event.preventDefault()
        dialog?.focus()
      } else if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault()
        focusable[focusable.length - 1].focus()
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault()
        focusable[0].focus()
      }
    }

    window.addEventListener('keydown', handleDialogKeys)
    return () => {
      window.removeEventListener('keydown', handleDialogKeys)
      previousFocus?.focus?.()
    }
  }, [selectedThread?.id])

  useEffect(() => {
    if (!delegationTarget && !confirmResponse) return undefined
    const dialog = document.querySelector('[data-nested-dialog]')
    const previousFocus = document.activeElement
    dialog?.querySelector('button:not([disabled]), textarea:not([disabled])')?.focus()
    return () => previousFocus?.focus?.()
  }, [delegationTarget, confirmResponse])

  const showActionError = (requestError, fallback) => {
    setSuccess('')
    setError(requestError.message || fallback)
  }

  const handleOpenConversation = async (threadId) => {
    lastOpenedConversationId.current = threadId
    setBusyAction(`open-${threadId}`)
    setError('')
    try {
      const conversation = await fetchClientConversation(threadId)
      setSelectedThread(conversation)
      setResponseBody('')
    } catch (requestError) {
      showActionError(requestError, 'Unable to open this conversation.')
    } finally {
      setBusyAction('')
    }
  }

  const closeConversation = () => {
    setSelectedThread(null)
    const threadId = lastOpenedConversationId.current
    if (!threadId) return
    window.requestAnimationFrame(() => {
      const trigger = [...document.querySelectorAll('[data-client-thread-open]')]
        .find((element) => element.getAttribute('data-client-thread-open') === threadId)
      trigger?.focus()
    })
  }

  const handleMarkHandled = async (threadId, handled = true) => {
    setBusyAction(`handled-${threadId}`)
    setError('')
    try {
      await markClientConversationHandled(threadId, handled)
      setSuccess(handled ? 'Conversation marked handled.' : 'Conversation reopened in your attention inbox.')
      setSelectedThread(null)
      await refreshData(false)
    } catch (requestError) {
      showActionError(requestError, 'Unable to update this conversation.')
    } finally {
      setBusyAction('')
    }
  }

  const handleDelegate = async () => {
    if (!delegationTarget) return
    const threadId = delegationTarget.id
    setBusyAction(`delegate-${threadId}`)
    setError('')
    try {
      await delegateClientConversation(threadId, delegationInstruction.trim())
      setSuccess('Delegated to your assistant.')
      setDelegationTarget(null)
      setSelectedThread(null)
      setDelegationInstruction('')
      await refreshData(false)
    } catch (requestError) {
      showActionError(requestError, 'Unable to delegate this conversation.')
    } finally {
      setBusyAction('')
    }
  }

  const handleConfirmResponse = async () => {
    if (!selectedThread || !responseBody.trim()) return
    setBusyAction(`response-${selectedThread.id}`)
    setError('')
    try {
      await submitClientResponse(selectedThread.id, responseBody.trim())
      setSuccess('Your response was recorded as a simulated send. No email was sent externally.')
      setConfirmResponse(false)
      setSelectedThread(null)
      setResponseBody('')
      await refreshData(false)
    } catch (requestError) {
      showActionError(requestError, 'Unable to record your response.')
    } finally {
      setBusyAction('')
    }
  }

  const handleDraftDecision = async (threadId, decision) => {
    setBusyAction(`draft-${threadId}`)
    setError('')
    try {
      await decideClientDraft(threadId, decision, decision === 'REJECTED' ? rejectionReason.trim() : '')
      setSuccess(decision === 'APPROVED'
        ? 'Draft approved. Your assistant must still confirm the simulated send.'
        : 'Draft rejected and returned to your assistant for revision.')
      setRejectionReason('')
      await refreshData(false)
      if (selectedThread?.id === threadId) {
        const updated = await fetchClientConversation(threadId).catch(() => null)
        setSelectedThread(updated)
      }
    } catch (requestError) {
      showActionError(requestError, 'Unable to save the draft decision.')
    } finally {
      setBusyAction('')
    }
  }

  const handleSavePreferences = async () => {
    setBusyAction('preferences')
    setError('')
    try {
      const updated = await updateClientPreferences(preferences)
      setProfile(updated)
      setPreferences(updated.preferences)
      setSuccess('Preferences saved.')
    } catch (requestError) {
      showActionError(requestError, 'Unable to save preferences.')
    } finally {
      setBusyAction('')
    }
  }

  const pendingCount = threads.length

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-zinc-950 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-500/30 bg-brand-600/15 font-mono text-xs font-bold text-brand-300">AI</span>
              <span className="text-sm font-semibold tracking-tight text-zinc-100">AssistIQ</span>
              <Badge variant="client" size="sm">CLIENT PORTAL</Badge>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
              Good day, {profile?.name?.split(/\s+/)[0] || 'there'}.
            </h1>
            <p className="max-w-xl text-xs leading-relaxed text-zinc-400">
              Your focused inbox shows only conversations that require your decision or approval.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500">
              <UserRound className="h-3.5 w-3.5" />
              <span>{profile?.email || sessionProfile?.email}</span>
              {profile?.organization && <span>· {profile.organization}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={includeHandled ? 'neutral' : 'client'} size="md">
              {pendingCount} {includeHandled ? 'Handled' : 'Needs attention'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refreshData(false)} disabled={isRefreshing}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="iconSm" aria-label="Profile preferences" onClick={() => setShowPreferences((value) => !value)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {success && (
          <div role="status" className="flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="flex-1">{success}</span>
            <button type="button" aria-label="Dismiss success message" onClick={() => setSuccess('')}><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" className="underline" onClick={() => refreshData(false)}>Retry</button>
          </div>
        )}

        {showPreferences && (
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Profile preferences</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2 text-xs text-zinc-300">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={preferences.conciseSummaries ?? true} onChange={(event) => setPreferences((current) => ({ ...current, conciseSummaries: event.target.checked }))} />
                  Prefer concise conversation summaries
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={preferences.deadlineReminders ?? true} onChange={(event) => setPreferences((current) => ({ ...current, deadlineReminders: event.target.checked }))} />
                  Highlight deadlines in my inbox
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  Default reply tone
                  <select value={preferences.defaultReplyTone || 'professional'} onChange={(event) => setPreferences((current) => ({ ...current, defaultReplyTone: event.target.value }))} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs">
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="concise">Concise</option>
                  </select>
                </label>
              </div>
              <Button variant="outline" size="sm" onClick={handleSavePreferences} disabled={busyAction === 'preferences'}>
                {busyAction === 'preferences' && <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save preferences
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-amber-300" />
              <h2 className="text-sm font-semibold text-zinc-100">Your attention inbox</h2>
              <span className="text-[11px] font-mono text-zinc-500">{threads.length} conversations</span>
            </div>
            <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
              <button type="button" onClick={() => setIncludeHandled(false)} className={`rounded px-2.5 py-1 text-[11px] ${!includeHandled ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>Needs attention</button>
              <button type="button" onClick={() => setIncludeHandled(true)} className={`rounded px-2.5 py-1 text-[11px] ${includeHandled ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>Handled</button>
            </div>
          </div>

          {isLoading ? (
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardContent className="flex items-center justify-center gap-2 py-12 text-xs text-zinc-400">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your conversations…
              </CardContent>
            </Card>
          ) : threads.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900/30">
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <p className="text-sm font-medium text-zinc-200">{includeHandled ? 'No handled conversations yet' : 'You’re all caught up'}</p>
                <p className="max-w-sm text-xs text-zinc-500">{includeHandled ? 'Conversations you handle will be available here.' : 'Only conversations assigned to your account and requiring your response appear here.'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <Card key={thread.id} className="border-zinc-800 bg-zinc-900/40 transition-colors hover:border-zinc-700">
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                          <span className="font-medium text-zinc-200">{thread.sender?.name || 'Unknown sender'}</span>
                          {thread.sender?.company && <span>· {thread.sender.company}</span>}
                          <span>· {dateLabel(thread.timestamp)}</span>
                          <Badge variant={thread.priority === 'urgent' || thread.priority === 'high' ? 'needsReview' : 'neutral'} size="sm">
                            {thread.priority || 'normal'} priority
                          </Badge>
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-100">{thread.subject}</h3>
                        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">{thread.preview}</p>
                      </div>
                      <Button data-client-thread-open={thread.id} variant="outline" size="sm" className="self-start shrink-0" onClick={() => handleOpenConversation(thread.id)} disabled={busyAction === `open-${thread.id}`}>
                        {busyAction === `open-${thread.id}` ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1.5 h-3.5 w-3.5" />}
                        Open conversation
                      </Button>
                    </div>
                    {thread.summary && (
                      <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-brand-300">
                          <Sparkles className="h-3 w-3" /> Conversation summary
                          <span className="normal-case tracking-normal text-zinc-500">· {thread.aiSource || 'Analysis source unavailable'}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-zinc-300">{thread.summary}</p>
                        <p className="mt-1 border-t border-zinc-800 pt-1 text-[11px] text-zinc-500">{thread.classificationReason}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 pt-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        {thread.actionItems?.some((item) => item.deadline && !item.completed) && (
                          <span className="flex items-center gap-1 text-amber-300">
                            <Clock3 className="h-3 w-3" />
                            Due {thread.actionItems.find((item) => item.deadline && !item.completed)?.deadline}
                          </span>
                        )}
                        {thread.meeting?.hasMeeting && (
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{thread.meeting.date || 'Meeting details available'}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {includeHandled ? (
                          <Button variant="outline" size="sm" onClick={() => handleMarkHandled(thread.id, false)} disabled={busyAction === `handled-${thread.id}`}>
                            <RefreshCw className="mr-1 h-3 w-3" /> Reopen
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleMarkHandled(thread.id)} disabled={busyAction === `handled-${thread.id}`}>
                              <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Mark handled
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setDelegationTarget(thread); setDelegationInstruction('') }}>
                              <CornerUpLeft className="mr-1 h-3.5 w-3.5 text-amber-300" /> Delegate
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {drafts.length > 0 && !includeHandled && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-300" />
              <h2 className="text-sm font-semibold text-zinc-100">Drafts awaiting your approval</h2>
              <Badge variant="client" size="sm">{drafts.length}</Badge>
            </div>
            {drafts.map((thread) => (
              <Card key={`draft-${thread.id}`} className="border-brand-500/20 bg-zinc-900/40">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-100">{thread.subject}</h3>
                      <p className="text-[11px] text-zinc-500">Prepared by your assistant · review before deciding</p>
                    </div>
                    <Button data-client-thread-open={thread.id} variant="ghost" size="sm" onClick={() => handleOpenConversation(thread.id)}>Open conversation</Button>
                  </div>
                  <div className="whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">
                    {thread.suggestedDraft?.body}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={500} placeholder="Optional note if rejecting" className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDraftDecision(thread.id, 'REJECTED')} disabled={busyAction === `draft-${thread.id}`}>Reject</Button>
                      <Button variant="primary" size="sm" onClick={() => handleDraftDecision(thread.id, 'APPROVED')} disabled={busyAction === `draft-${thread.id}`}>
                        {busyAction === `draft-${thread.id}` && <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />}
                        Approve draft
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-300">Approval does not send the message. Your assistant must still confirm a simulated send.</p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <div className="flex items-start gap-2 rounded-md border border-zinc-800/70 bg-zinc-900/20 p-3 text-[11px] leading-relaxed text-zinc-500">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p>Only your associated conversations are available here. AI summaries are estimates; review the original messages before deciding. Replies are simulated and are never sent to an external email service.</p>
        </div>
      </div>

      {selectedThread && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 p-0 sm:p-4">
          <section ref={conversationDialogRef} role="dialog" aria-modal="true" aria-labelledby="client-conversation-title" tabIndex="-1" className="flex h-full w-full max-w-3xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-lg sm:border">
            <header className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <button type="button" onClick={closeConversation} className="mb-2 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200">
                  <ArrowLeft className="h-3 w-3" /> Back to inbox
                </button>
                <h2 id="client-conversation-title" className="text-base font-semibold text-zinc-100">{selectedThread.subject}</h2>
                <p className="mt-1 text-[11px] text-zinc-500">{selectedThread.sender?.name} · {selectedThread.sender?.email} · {dateLabel(selectedThread.timestamp)}</p>
              </div>
              <button type="button" aria-label="Close conversation" onClick={closeConversation} className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><X className="h-4 w-4" /></button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              <Card className="border-brand-500/20 bg-zinc-900/40">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-brand-300"><Sparkles className="h-3 w-3" /> Executive summary · {selectedThread.aiSource || 'Source unavailable'}</div>
                  <p className="text-xs leading-relaxed text-zinc-200">{selectedThread.summary || 'No summary is available.'}</p>
                  <p className="border-t border-zinc-800 pt-2 text-[11px] leading-relaxed text-zinc-400">{selectedThread.classificationReason}</p>
                  {selectedThread.suggestedAction && <p className="text-[11px] text-brand-300">Suggested next step: {selectedThread.suggestedAction}</p>}
                </CardContent>
              </Card>

              {selectedThread.delegationNote && (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">
                  <span className="font-medium">Your delegation instruction:</span> {selectedThread.delegationNote}
                </div>
              )}

              {selectedThread.actionItems?.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">Relevant action items</h3>
                  {selectedThread.actionItems.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-2 rounded border border-zinc-800 bg-zinc-900/30 p-2 text-xs">
                      <span className={item.completed ? 'flex-1 text-zinc-500 line-through' : 'flex-1 text-zinc-200'}>{item.task}</span>
                      <span className="text-[10px] text-zinc-500">{item.assignedTo || 'Owner unclear'}</span>
                      {item.deadline && <Badge variant="needsReview" size="sm">{item.deadline}</Badge>}
                    </div>
                  ))}
                </section>
              )}

              {selectedThread.meeting?.hasMeeting && (
                <section className="rounded border border-zinc-800 bg-zinc-900/30 p-3">
                  <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-mono uppercase text-zinc-400"><CalendarDays className="h-3.5 w-3.5" /> Meeting details</h3>
                  <p className="text-xs font-medium text-zinc-200">{selectedThread.meeting.title}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">{[selectedThread.meeting.date, selectedThread.meeting.time, selectedThread.meeting.timezone, selectedThread.meeting.location].filter(Boolean).join(' · ') || 'Date and time not stated'}</p>
                  {selectedThread.meeting.attendees?.length > 0 && <p className="mt-1 text-[10px] text-zinc-500">Participants: {selectedThread.meeting.attendees.join(', ')}</p>}
                  {safeHttpUrl(selectedThread.meeting.meetingLink) && <a className="mt-1 inline-block text-[11px] text-brand-300 underline" href={safeHttpUrl(selectedThread.meeting.meetingLink)} target="_blank" rel="noreferrer">Meeting link</a>}
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-zinc-500">
                  <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Complete conversation</span>
                  <span>{selectedThread.messages?.length || 0} messages</span>
                </div>
                {(selectedThread.messages || []).map((message, index) => (
                  <article key={message.id || index} className={`rounded-lg border p-3 ${message.sender?.isMe ? 'ml-3 border-brand-500/20 bg-brand-500/5 sm:ml-8' : 'border-zinc-800 bg-zinc-900/40'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-medium text-zinc-200">{message.sender?.name || 'Unknown sender'} <span className="font-normal text-zinc-500">· {message.sender?.email}</span></div>
                      <time className="text-[10px] text-zinc-500">{dateLabel(message.timestamp)}</time>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">To: {getMessageRecipients(message)}</p>
                    <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-zinc-200">{message.body}</p>
                  </article>
                ))}
              </section>

              {selectedThread.draftApprovalStatus === 'PENDING' && selectedThread.suggestedDraft && (
                <Card className="border-brand-500/20 bg-zinc-900/40">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-brand-300" /> Assistant draft for review</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-200">{selectedThread.suggestedDraft.body}</div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDraftDecision(selectedThread.id, 'REJECTED')}>Reject draft</Button>
                      <Button variant="primary" size="sm" onClick={() => handleDraftDecision(selectedThread.id, 'APPROVED')}>Approve draft</Button>
                    </div>
                    <p className="text-[10px] text-amber-300">Approval records your decision only. It will not send this message.</p>
                  </CardContent>
                </Card>
              )}

              {!includeHandled && selectedThread.classification === 'CLIENT_REPLY' && selectedThread.clientStatus !== 'DELEGATED_TO_ASSISTANT' && (
                <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                  <label htmlFor="client-response" className="text-xs font-medium text-zinc-200">Write a response</label>
                  <textarea id="client-response" value={responseBody} onChange={(event) => setResponseBody(event.target.value)} rows={5} maxLength={20000} placeholder="Your reply will be recorded as a simulated send for your assistant to review." className="w-full resize-y rounded border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-100 outline-none focus:border-zinc-600" />
                  <div className="flex flex-wrap justify-between gap-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setDelegationTarget(selectedThread); setDelegationInstruction('') }}><CornerUpLeft className="mr-1 h-3.5 w-3.5" /> Delegate instead</Button>
                      {!selectedThread.isHandled && <Button variant="ghost" size="sm" onClick={() => handleMarkHandled(selectedThread.id)}><Check className="mr-1 h-3.5 w-3.5" /> Mark handled</Button>}
                      {selectedThread.isHandled && <Button variant="ghost" size="sm" onClick={() => handleMarkHandled(selectedThread.id, false)}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Reopen</Button>}
                    </div>
                    {!selectedThread.isHandled && (
                      <Button variant="primary" size="sm" disabled={!responseBody.trim()} onClick={() => setConfirmResponse(true)}>
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Review simulated response
                      </Button>
                    )}
                  </div>
                </section>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-zinc-800 px-4 py-2.5 text-[10px] text-zinc-500 sm:px-6">
              <span>Assistant-only notes and activity are not shown.</span>
              {selectedThread.isHandled && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Handled · {dateLabel(selectedThread.handledAt)}</span>}
            </footer>
          </section>
        </div>
      )}

      {delegationTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="delegation-dialog-title"
            data-nested-dialog
            className="w-full max-w-md border-zinc-700 bg-zinc-900"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setDelegationTarget(null)
              }
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span id="delegation-dialog-title">Delegate to your assistant</span>
                <button type="button" aria-label="Close delegation" onClick={() => setDelegationTarget(null)}><X className="h-4 w-4 text-zinc-500" /></button>
              </CardTitle>
              <p className="text-xs text-zinc-400">{delegationTarget.subject}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="delegation-instruction" className="text-xs text-zinc-300">Optional instruction</label>
              <textarea id="delegation-instruction" value={delegationInstruction} onChange={(event) => setDelegationInstruction(event.target.value)} maxLength={500} rows={3} placeholder="Add a short note for your assistant." className="w-full rounded border border-zinc-700 bg-zinc-950 p-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-500" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDelegationTarget(null)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleDelegate} disabled={busyAction === `delegate-${delegationTarget.id}`}>
                  {busyAction === `delegate-${delegationTarget.id}` && <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  Delegate conversation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {confirmResponse && selectedThread && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="response-confirm-title"
            data-nested-dialog
            className="w-full max-w-md border-zinc-700 bg-zinc-900"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setConfirmResponse(false)
              }
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle id="response-confirm-title" className="text-sm">Confirm simulated response</CardTitle>
              <p className="text-xs text-zinc-400">This requires your confirmation and will only append a message to AssistIQ. No external email will be sent.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">{responseBody}</div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmResponse(false)}>Back to edit</Button>
                <Button variant="primary" size="sm" onClick={handleConfirmResponse} disabled={busyAction === `response-${selectedThread.id}`}>
                  {busyAction === `response-${selectedThread.id}` && <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />}
                  Confirm simulated send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
