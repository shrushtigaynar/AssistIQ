import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  RotateCcw,
  Plus,
  Inbox,
  Filter,
  ArrowUpDown,
  Mail,
  MailOpen,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Star,
  CheckCircle2,
  FolderArchive
} from 'lucide-react'
import {
  fetchThreads,
  getThreadById,
  fetchWorkspaceOverview,
  updateThreadStatus,
  updateThreadClassification,
  addThreadNote,
  saveThreadDraft,
  sendThreadReply,
  toggleThreadAction,
  bulkThreadUpdate,
  injectThread,
  resetThreadData,
  fetchCounts,
  analyzeConversationById,
  fetchWorkspaceMeetings,
  generateConversationReplyDraft,
  askConversationQuestion,
  requestClientDraftApproval,
} from '../../services/api'
import { UnifiedInboxNav } from './components/UnifiedInboxNav'
import { BulkActionBar } from './components/BulkActionBar'
import { ThreadListItem } from './components/ThreadListItem'
import { ContextualInsightsCard } from './components/ContextualInsightsCard'
import { UpcomingMeetingsCard } from './components/UpcomingMeetingsCard'
import { RecentActivityCard } from './components/RecentActivityCard'
import { ConversationReader } from './components/ConversationReader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Toast } from '../../components/ui/Toast'

export const AssistantDashboard = ({ onNavigateWorkspace, openThreadRequest, onThreadRequestHandled, initialInboxSegment }) => {
  const [threads, setThreads] = useState([])
  const [activeSegment, setActiveSegment] = useState(initialInboxSegment || 'PRIMARY_INBOX')
  const [selectedThreadId, setSelectedThreadId] = useState(null)
  const [isReaderOpen, setIsReaderOpen] = useState(false)
  const lastReaderTrigger = useRef(null)
  const shouldRestoreReaderFocus = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('newest') // 'newest' | 'oldest' | 'priority'
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)
  const [filterImportantOnly, setFilterImportantOnly] = useState(false)
  const [selectedThreadIds, setSelectedThreadIds] = useState([])
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [workspaceOverview, setWorkspaceOverview] = useState(null)
  const [workspaceMeetings, setWorkspaceMeetings] = useState([])
  const [counts, setCounts] = useState({
    primary: 0,
    assistant: 0,
    client: 0,
    needsReview: 0,
    waiting: 0,
    noReply: 0,
    important: 0,
    general: 0,
    archived: 0,
  })

  useEffect(() => {
    if (isReaderOpen || !shouldRestoreReaderFocus.current) return
    if (lastReaderTrigger.current?.isConnected) {
      lastReaderTrigger.current.focus()
      shouldRestoreReaderFocus.current = false
      return
    }
    const trigger = [...document.querySelectorAll('[data-assistant-thread-open]')]
      .find((element) => element.getAttribute('data-assistant-thread-open') === selectedThreadId)
    if (trigger) {
      trigger.focus()
      shouldRestoreReaderFocus.current = false
    }
  }, [isReaderOpen, selectedThreadId, threads, isLoading])

  const refreshWorkspaceOverview = async () => {
    try {
      const [overview, meetings] = await Promise.all([
        fetchWorkspaceOverview(),
        fetchWorkspaceMeetings('SCHEDULED'),
      ])
      setWorkspaceOverview(overview)
      setWorkspaceMeetings(meetings)
    } catch {
      setWorkspaceOverview(null)
      setWorkspaceMeetings([])
    }
  }

  const refreshThreads = async (segment = activeSegment, showLoading = true) => {
    if (showLoading) setIsLoading(true)
    try {
      const response = await fetchThreads({
        segment,
        sort: sortOrder,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        unreadOnly: filterUnreadOnly ? 'true' : undefined,
        importantOnly: filterImportantOnly ? 'true' : undefined,
        search: searchQuery || undefined,
      })

      if (!Array.isArray(response)) throw new Error('Backend returned an invalid conversations response')
      setThreads(response)
      setError('')
      try {
        setCounts(await fetchCounts())
      } catch (countsError) {
        setToast({ message: countsError.message || 'Unable to refresh inbox counts', type: 'error' })
      }
      refreshWorkspaceOverview()
      return response
    } catch (err) {
      setThreads([])
      setError(err.message || 'Unable to load backend data')
      return []
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshThreads(activeSegment)
  }, [activeSegment, sortOrder, priorityFilter, filterUnreadOnly, filterImportantOnly, searchQuery])

  useEffect(() => {
    const interval = window.setInterval(() => refreshThreads(activeSegment, false), 20000)
    return () => window.clearInterval(interval)
  }, [activeSegment, sortOrder, priorityFilter, filterUnreadOnly, filterImportantOnly, searchQuery])

  useEffect(() => {
    refreshWorkspaceOverview()
  }, [])

  useEffect(() => {
    if (initialInboxSegment) setActiveSegment(initialInboxSegment)
  }, [initialInboxSegment])

  useEffect(() => {
    if (!openThreadRequest?.threadId) return
    const openRequestedThread = async () => {
      setSelectedThreadId(openThreadRequest.threadId)
      setIsReaderOpen(true)
      onThreadRequestHandled?.()
      if (threads.some((thread) => thread.id === openThreadRequest.threadId)) return
      try {
        const thread = await getThreadById(openThreadRequest.threadId)
        if (thread) setThreads((current) => [thread, ...current.filter((item) => item.id !== thread.id)])
      } catch (requestError) {
        setToast({ message: requestError.message || 'Unable to open conversation', type: 'error' })
      }
    }
    openRequestedThread()
  }, [openThreadRequest?.nonce])

  useEffect(() => {
    if (!threads.length) {
      setSelectedThreadId(null)
      return
    }
    if (!selectedThreadId || !threads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(threads[0].id)
    }
  }, [threads, selectedThreadId])

  // Filtered & sorted threads
  const filteredThreads = useMemo(() => {
    let list = threads.filter(t => {
      // Segment routing
      if (activeSegment === 'ARCHIVED') {
        if (!t.isHandled) return false
      } else {
        if (t.isHandled) return false

        if (activeSegment === 'ASSISTANT_REPLY' && t.classification !== 'ASSISTANT_REPLY') return false
        if (activeSegment === 'CLIENT_REPLY' && t.classification !== 'CLIENT_REPLY') return false
        if (activeSegment === 'NEEDS_REVIEW' && t.classification !== 'NEEDS_REVIEW') return false
        if (activeSegment === 'NO_REPLY_NEEDED' && t.classification !== 'NO_REPLY_NEEDED') return false
        if (activeSegment === 'WAITING_FOR' && !t.isWaiting) return false
        if (activeSegment === 'IMPORTANT' && !(t.isImportant || t.isStarred)) return false
        if (activeSegment === 'GENERAL' && !(t.priority === 'normal' || t.priority === 'low')) return false
      }

      // Priority Filter
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
        return false
      }

      // Unread only toggle
      if (filterUnreadOnly && t.isRead) {
        return false
      }

      // Important only toggle
      if (filterImportantOnly && !(t.isImportant || t.isStarred)) {
        return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesSender = t.sender.name.toLowerCase().includes(q) || (t.sender.company && t.sender.company.toLowerCase().includes(q))
        const matchesSubject = t.subject.toLowerCase().includes(q)
        const matchesPreview = t.preview.toLowerCase().includes(q)
        const matchesBody = t.body ? t.body.toLowerCase().includes(q) : false
        return matchesSender || matchesSubject || matchesPreview || matchesBody
      }

      return true
    })

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.timestamp) - new Date(a.timestamp)
      }
      if (sortOrder === 'oldest') {
        return new Date(a.timestamp) - new Date(b.timestamp)
      }
      if (sortOrder === 'priority') {
        const priorityScore = { urgent: 4, high: 3, normal: 2, low: 1 }
        return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0)
      }
      return 0
    })

    return list
  }, [threads, activeSegment, priorityFilter, filterUnreadOnly, filterImportantOnly, searchQuery, sortOrder])

  // Active selected thread
  const selectedThread = useMemo(() => {
    return threads.find(t => t.id === selectedThreadId) || filteredThreads[0] || null
  }, [threads, selectedThreadId, filteredThreads])

  // Navigation indices
  const currentThreadIndex = useMemo(() => {
    return filteredThreads.findIndex(t => t.id === selectedThreadId)
  }, [filteredThreads, selectedThreadId])

  const hasPrev = currentThreadIndex > 0
  const hasNext = currentThreadIndex >= 0 && currentThreadIndex < filteredThreads.length - 1

  // Extracted meetings for right panel
  const upcomingMeetings = useMemo(
    () => workspaceMeetings.filter((meeting) => meeting.temporalStatus === 'UPCOMING'),
    [workspaceMeetings],
  )

  const activityLogs = useMemo(() => threads
    .flatMap((thread) => (thread.activityLog || []).map((log, index) => ({
      ...log,
      threadId: thread.id,
      sortTime: Number.isFinite(Date.parse(log.timestamp)) ? Date.parse(log.timestamp) : 0,
      sortIndex: index,
    })))
    .sort((a, b) => b.sortTime - a.sortTime || b.sortIndex - a.sortIndex)
    .slice(0, 5), [threads])

  // Handlers for individual thread actions
  const handleSelectThread = async (threadId) => {
    setSelectedThreadId(threadId)
    try {
      await updateThreadStatus(threadId, { isRead: true, user: 'Elena Rostova (PA)' })
      await refreshThreads(activeSegment)
    } catch (err) {
      setToast({ message: err.message || 'Failed to mark conversation as read', type: 'error' })
    }
  }

  const handleOpenReader = (threadId) => {
    lastReaderTrigger.current = document.activeElement?.tagName === 'BODY' ? null : document.activeElement
    void handleSelectThread(threadId)
    setIsReaderOpen(true)
  }

  const handleCloseReader = () => {
    shouldRestoreReaderFocus.current = true
    setIsReaderOpen(false)
  }

  const handlePrevThread = () => {
    if (hasPrev) {
      const prevId = filteredThreads[currentThreadIndex - 1].id
      handleSelectThread(prevId)
    }
  }

  const handleNextThread = () => {
    if (hasNext) {
      const nextId = filteredThreads[currentThreadIndex + 1].id
      handleSelectThread(nextId)
    }
  }

  const handleMarkHandled = async (threadId) => {
    try {
      await updateThreadStatus(threadId, { isHandled: true, user: 'Elena Rostova (PA)' })
      await refreshThreads(activeSegment)
      setToast({ message: 'Conversation marked handled and moved to archive', type: 'success' })
      return true
    } catch (err) {
      setToast({ message: err.message || 'Failed to archive conversation', type: 'error' })
      return false
    }
  }

  const handleRestore = async (threadId) => {
    try {
      await updateThreadStatus(threadId, { isHandled: false, user: 'Elena Rostova (PA)' })
      await refreshThreads(activeSegment)
      setToast({ message: 'Conversation restored to active inbox', type: 'success' })
      return true
    } catch (err) {
      setToast({ message: err.message || 'Failed to restore conversation', type: 'error' })
      return false
    }
  }

  const handleToggleStar = async (threadId) => {
    const currentThread = threads.find(t => t.id === threadId)
    const nextVal = !(currentThread?.isStarred ?? false)
    try {
      await updateThreadStatus(threadId, { isImportant: nextVal, isStarred: nextVal, user: 'Elena Rostova (PA)' })
      await refreshThreads(activeSegment)
    } catch (err) {
      setToast({ message: err.message || 'Failed to update importance', type: 'error' })
    }
  }

  const handleToggleRead = async (threadId) => {
    const currentThread = threads.find(t => t.id === threadId)
    const nextVal = !(currentThread?.isRead ?? false)
    try {
      await updateThreadStatus(threadId, { isRead: nextVal, user: 'Elena Rostova (PA)' })
      await refreshThreads(activeSegment)
    } catch (err) {
      setToast({ message: err.message || 'Failed to update read state', type: 'error' })
    }
  }

  const handleOverrideClassification = async (threadId, newCategory) => {
    const categoryLabels = {
      ASSISTANT_REPLY: 'Assistant to Reply',
      CLIENT_REPLY: 'Client to Reply',
      NEEDS_REVIEW: 'Needs Review',
      NO_REPLY_NEEDED: 'No Reply Needed',
    }

    try {
      await updateThreadClassification(threadId, newCategory, `Manual override by Elena Rostova (PA)`, 'Elena Rostova (PA)')
      await refreshThreads(activeSegment)
      setToast({
        message: `Classification updated to ${categoryLabels[newCategory]}`,
        type: 'info'
      })
    } catch (err) {
      setToast({ message: err.message || 'Failed to update classification', type: 'error' })
    }
  }

  const handleToggleActionItem = async (threadId, actionId) => {
    try {
      await toggleThreadAction(threadId, actionId)
      await refreshThreads(activeSegment)
    } catch (err) {
      setToast({ message: 'Failed to update action item', type: 'error' })
    }
  }

  const handleAddNote = async (threadId, noteText) => {
    try {
      await addThreadNote(threadId, { text: noteText, author: 'Elena Rostova (PA)' })
      await refreshThreads(activeSegment)
      setToast({ message: 'Internal note saved to conversation', type: 'success' })
    } catch (err) {
      setToast({ message: 'Failed to save note', type: 'error' })
    }
  }

  const handleSendReply = async (replyData) => {
    const threadId = selectedThreadId
    try {
      await sendThreadReply(threadId, {
        to: replyData.to,
        cc: replyData.cc,
        subject: replyData.subject,
        body: replyData.body,
        tone: replyData.tone,
        explicitApproval: true,
        resultingStatus: 'HANDLED',
        user: 'Elena Rostova (PA)',
      })
      await refreshThreads(activeSegment)
      setToast({ message: 'Simulated reply sent with explicit approval! Thread marked handled.', type: 'success' })
      setIsReaderOpen(false)
      return true
    } catch (err) {
      setToast({ message: err.message || 'Failed to send reply', type: 'error' })
      return false
    }
  }

  const handleSaveDraft = async (draftData) => {
    const threadId = selectedThreadId
    try {
      await saveThreadDraft(threadId, draftData)
      await refreshThreads(activeSegment)
      setToast({ message: 'Draft saved for conversation', type: 'info' })
    } catch (err) {
      setToast({ message: 'Failed to save draft', type: 'error' })
    }
  }

  const handleRequestClientApproval = async (threadId, draftData) => {
    try {
      await requestClientDraftApproval(threadId, draftData)
      await refreshThreads(activeSegment)
      setToast({ message: 'Draft sent to the client for approval. It will not be sent automatically.', type: 'success' })
    } catch (err) {
      setToast({ message: err.message || 'Failed to request client approval', type: 'error' })
      throw err
    }
  }

  const handleAnalyzeConversation = async (threadId) => {
    try {
      const result = await analyzeConversationById(threadId)
      await refreshThreads(activeSegment)
      return result
    } catch (err) {
      setToast({ message: err.message || 'Unable to analyze conversation', type: 'error' })
      throw err
    }
  }

  const handleGenerateReplyDraft = async (threadId, tone) => {
    try {
      const draft = await generateConversationReplyDraft(threadId, tone)
      await refreshThreads(activeSegment)
      return draft
    } catch (err) {
      setToast({ message: err.message || 'Unable to generate reply draft', type: 'error' })
      throw err
    }
  }

  const handleAskConversationQuestion = (threadId, question) =>
    askConversationQuestion(threadId, question)

  // Multi-select bulk handlers
  const handleToggleCheck = (threadId) => {
    setSelectedThreadIds(prev =>
      prev.includes(threadId)
        ? prev.filter(id => id !== threadId)
        : [...prev, threadId]
    )
  }

  const handleSelectAll = () => {
    if (selectedThreadIds.length === filteredThreads.length) {
      setSelectedThreadIds([])
    } else {
      setSelectedThreadIds(filteredThreads.map(t => t.id))
    }
  }

  const handleBulkMarkRead = async () => {
    try {
      await bulkThreadUpdate(selectedThreadIds, 'markRead', null, 'Elena Rostova (PA)')
      await refreshThreads(activeSegment)
      setToast({ message: `${selectedThreadIds.length} conversations marked as read`, type: 'info' })
      setSelectedThreadIds([])
    } catch (err) {
      setToast({ message: 'Failed to bulk update read status', type: 'error' })
    }
  }

  const handleBulkMarkUnread = async () => {
    try {
      await bulkThreadUpdate(selectedThreadIds, 'markUnread', null, 'Elena Rostova (PA)')
      await refreshThreads(activeSegment)
      setToast({ message: `${selectedThreadIds.length} conversations marked as unread`, type: 'info' })
      setSelectedThreadIds([])
    } catch (err) {
      setToast({ message: 'Failed to bulk update unread status', type: 'error' })
    }
  }

  const handleBulkMarkImportant = async () => {
    try {
      await bulkThreadUpdate(selectedThreadIds, 'markImportant', null, 'Elena Rostova (PA)')
      await refreshThreads(activeSegment)
      setToast({ message: `${selectedThreadIds.length} conversations marked as important`, type: 'info' })
      setSelectedThreadIds([])
    } catch (err) {
      setToast({ message: 'Failed to update important flags', type: 'error' })
    }
  }

  const handleBulkArchive = async () => {
    try {
      await bulkThreadUpdate(selectedThreadIds, 'archive', null, 'Elena Rostova (PA)')
      await refreshThreads(activeSegment)
      setToast({ message: `${selectedThreadIds.length} conversations archived`, type: 'success' })
      setSelectedThreadIds([])
    } catch (err) {
      setToast({ message: 'Failed to archive selected conversations', type: 'error' })
    }
  }

  const handleBulkRestore = async () => {
    try {
      await bulkThreadUpdate(selectedThreadIds, 'restore', null, 'Elena Rostova (PA)')
      await refreshThreads(activeSegment)
      setToast({ message: `${selectedThreadIds.length} conversations restored to inbox`, type: 'success' })
      setSelectedThreadIds([])
    } catch (err) {
      setToast({ message: 'Failed to restore selected conversations', type: 'error' })
    }
  }

  const handleBulkReclassify = async (newCategory) => {
    try {
      await bulkThreadUpdate(selectedThreadIds, 'reclassify', newCategory, 'Elena Rostova (PA)')
      await refreshThreads(activeSegment)
      setToast({ message: `${selectedThreadIds.length} conversations reclassified`, type: 'info' })
      setSelectedThreadIds([])
    } catch (err) {
      setToast({ message: 'Failed to reclassify selected conversations', type: 'error' })
    }
  }

  const handleResetData = async () => {
    if (!window.confirm('Resetting the demo dataset permanently replaces every conversation in the configured database. Continue only if this is a disposable development dataset.')) return
    try {
      await resetThreadData()
      await refreshThreads('PRIMARY_INBOX')
      setSelectedThreadId(null)
      setActiveSegment('PRIMARY_INBOX')
      setSearchQuery('')
      setPriorityFilter('ALL')
      setSortOrder('newest')
      setFilterUnreadOnly(false)
      setFilterImportantOnly(false)
      setSelectedThreadIds([])
      setToast({ message: 'Dataset reset to original 12 executive threads', type: 'info' })
    } catch (err) {
      setToast({ message: err.message || 'Reset failed; backend data was not changed', type: 'error' })
    }
  }

  const handleInjectNewEmail = async () => {
    try {
      const newThread = await injectThread({
        sender: {
          name: 'Victoria Vance (Family Office Trustee)',
          email: 'victoria@vanceholdings.ch',
          avatar: 'VV',
          company: 'Vance Family Trust Geneva',
          isVIP: true,
        },
        recipients: ['david.vance@vancecap.com'],
        cc: ['elena.rostova@vancecap.com'],
        subject: 'URGENT: Geneva real estate closing deed signature required',
        preview: 'David, the notary in Geneva needs your counter-signature on the Rue du Rhône property closing deed before 18:00 CET today...',
        body: `David,\n\nThe notary public in Geneva has finalized the conveyance deed for the Rue du Rhône acquisition.\n\nPlease authorize counter-signature via the attached Swiss notary protocol by 18:00 CET today to avoid closing delay penalties.\n\nWarm regards,\nVictoria`,
        classification: 'CLIENT_REPLY',
        priority: 'urgent',
      })

      await refreshThreads(activeSegment)
      if (newThread?.id) {
        setSelectedThreadId(newThread.id)
      }
      setToast({ message: 'New simulated executive email injected into inbox!', type: 'success' })
    } catch (err) {
      setToast({ message: err.message || 'Failed to inject new email', type: 'error' })
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-zinc-950 p-3 sm:p-6 space-y-4 sm:space-y-5">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Complete Conversation Reader Drawer */}
      <ConversationReader
        thread={selectedThread}
        isOpen={isReaderOpen}
        onClose={handleCloseReader}
        onPrevThread={handlePrevThread}
        onNextThread={handleNextThread}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onMarkHandled={handleMarkHandled}
        onRestore={handleRestore}
        onToggleStar={handleToggleStar}
        onToggleRead={handleToggleRead}
        onOverrideClassification={handleOverrideClassification}
        onToggleActionItem={handleToggleActionItem}
        onAddNote={handleAddNote}
        onSendReply={handleSendReply}
        onSaveDraft={handleSaveDraft}
        onRequestClientApproval={handleRequestClientApproval}
        onAnalyzeConversation={handleAnalyzeConversation}
        onGenerateReplyDraft={handleGenerateReplyDraft}
        onAskConversationQuestion={handleAskConversationQuestion}
      />

      {/* Top Welcome & Operations Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
              Assistant Command Center
            </h1>
            <Badge variant="brand" size="sm">Assistant workspace</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Managing <span className="text-zinc-200 font-semibold">David Vance's</span> inbox ·{' '}
            <span className="text-amber-300 font-mono font-medium">{counts.client} client responses</span> pending ·{' '}
            <span className="text-indigo-300 font-mono font-medium">{counts.assistant} assistant conversations</span> in queue
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
          {[
            { label: 'Pending action items', value: workspaceOverview?.actionItems?.pending, section: 'actions', filter: 'OPEN' },
            { label: 'Overdue tasks', value: workspaceOverview?.actionItems?.overdue, section: 'actions', filter: 'OVERDUE' },
            { label: 'Upcoming meetings', value: workspaceOverview?.meetings?.upcoming, section: 'meetings', filter: 'UPCOMING' },
            { label: 'Delegated tasks', value: workspaceOverview?.actionItems?.delegated, section: 'actions', filter: 'DELEGATED' },
            { label: 'Waiting for response', value: workspaceOverview?.followUps?.waiting, section: 'follow-ups', filter: 'WAITING' },
          ].map((metric) => (
            <button
              key={metric.label}
              type="button"
              onClick={() => onNavigateWorkspace?.(metric.section, metric.filter)}
              className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <span className="block text-[10px] uppercase tracking-wide text-zinc-500">{metric.label}</span>
              <span className="mt-1 block font-mono text-lg font-semibold text-zinc-100">{metric.value ?? '—'}</span>
            </button>
          ))}
        </div>

        {/* Global Action Simulation Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetData}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-zinc-500" />
            Reset Demo Data
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleInjectNewEmail}
          >
            <Plus className="h-3.5 w-3.5 mr-1 text-zinc-900" />
            Simulate Inbound Email
          </Button>
        </div>
      </div>

      {/* Unified Inbox Segments Navigation Bar */}
      <UnifiedInboxNav
        activeSegment={activeSegment}
        onSelectSegment={(seg) => {
          setActiveSegment(seg)
          setSelectedThreadIds([])
        }}
        counts={counts}
      />

      {/* Main Adaptive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Filter Bar + Conversation Stream (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Bulk Action Bar (Visible when >= 1 threads selected) */}
          {selectedThreadIds.length > 0 && (
            <BulkActionBar
              selectedCount={selectedThreadIds.length}
              isArchivedView={activeSegment === 'ARCHIVED'}
              onMarkRead={handleBulkMarkRead}
              onMarkUnread={handleBulkMarkUnread}
              onMarkImportant={handleBulkMarkImportant}
              onArchiveHandled={handleBulkArchive}
              onRestore={handleBulkRestore}
              onReclassify={handleBulkReclassify}
              onClearSelection={() => setSelectedThreadIds([])}
            />
          )}

          {/* Search, Sorting & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search sender, company, subject, message content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950/70 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-2xs font-mono text-zinc-500 hover:text-zinc-300"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sorting & Filter Controls */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Sorting */}
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-400">
                <ArrowUpDown className="h-3 w-3 text-zinc-500" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-transparent text-xs text-zinc-200 focus:outline-none font-mono"
                >
                  <option value="newest" className="bg-zinc-900">Newest</option>
                  <option value="oldest" className="bg-zinc-900">Oldest</option>
                  <option value="priority" className="bg-zinc-900">Priority</option>
                </select>
              </div>

              {/* Priority Selector */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none font-mono"
              >
                <option value="ALL" className="bg-zinc-900">All Priorities</option>
                <option value="urgent" className="bg-zinc-900">Urgent Only</option>
                <option value="high" className="bg-zinc-900">High</option>
                <option value="normal" className="bg-zinc-900">Normal</option>
                <option value="low" className="bg-zinc-900">Low</option>
              </select>

              {/* Unread Only Toggle */}
              <button
                onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
                className={`px-2 py-1 rounded-md border text-xs font-mono transition-colors ${
                  filterUnreadOnly
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300 font-medium'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Filter Unread Only"
              >
                Unread
              </button>

              {/* Important Only Toggle */}
              <button
                onClick={() => setFilterImportantOnly(!filterImportantOnly)}
                className={`p-1.5 rounded-md border text-xs transition-colors ${
                  filterImportantOnly
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Filter Important Only"
              >
                <Star className={`h-3.5 w-3.5 ${filterImportantOnly ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Active Filter Indicators & Select All Header */}
          <div className="flex items-center justify-between text-2xs font-mono text-zinc-400 px-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 mr-2"
                title="Select / Deselect all visible"
              >
                {filteredThreads.length > 0 && selectedThreadIds.length === filteredThreads.length ? (
                  <CheckSquare className="h-3.5 w-3.5 text-brand-400" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-zinc-600" />
                )}
                <span>Select All</span>
              </button>

              <span>VIEW:</span>
              <span className="text-zinc-200 font-semibold">
                {activeSegment.replace('_', ' ')}
              </span>
              {priorityFilter !== 'ALL' && <span className="text-amber-400">· {priorityFilter}</span>}
              {filterUnreadOnly && <span className="text-brand-300">· Unread</span>}
              {filterImportantOnly && <span className="text-amber-300">· Important</span>}
            </div>
            <span>{filteredThreads.length} conversation{filteredThreads.length === 1 ? '' : 's'}</span>
          </div>

          {/* Conversation Stream Container */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden shadow-subtle divide-y divide-zinc-800/50">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
                  <Sparkles className="h-3.5 w-3.5 text-brand-400 animate-pulse" />
                  Loading conversations…
                </div>
              </div>
            ) : error ? (
              <div className="p-12 text-center space-y-3">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
                  <Filter className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Backend unavailable</h4>
                  <p className="text-xs text-zinc-500 mt-1">{error}. No local demo data is shown.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refreshThreads(activeSegment)}>Retry connection</Button>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
                  <Inbox className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">No conversations in this segment</h4>
                  <p className="text-xs text-zinc-500 mt-1">
                    No conversations match the current segment, search query, or filters.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveSegment('PRIMARY_INBOX')
                    setSearchQuery('')
                    setPriorityFilter('ALL')
                    setFilterUnreadOnly(false)
                    setFilterImportantOnly(false)
                    setSelectedThreadIds([])
                  }}
                  className="mt-2 text-xs font-mono"
                >
                  Reset to Primary Inbox
                </Button>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isSelected={selectedThread?.id === thread.id}
                  isChecked={selectedThreadIds.includes(thread.id)}
                  onToggleCheck={handleToggleCheck}
                  onSelect={(id) => handleOpenReader(id)}
                  onMarkHandled={handleMarkHandled}
                  onRestore={handleRestore}
                  onToggleStar={handleToggleStar}
                  onToggleRead={handleToggleRead}
                  onOverrideClassification={handleOverrideClassification}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Contextual AI Insights + Meetings + Audit Activity (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Contextual AI Insights Card */}
          <ContextualInsightsCard
            selectedThread={selectedThread}
            onToggleActionItem={handleToggleActionItem}
            onOpenQuickPreview={(id) => handleOpenReader(id)}
          />

          {/* Upcoming Detected Meetings */}
          <UpcomingMeetingsCard
            meetings={upcomingMeetings}
            onManageMeetings={() => onNavigateWorkspace?.('meetings')}
          />

          {/* Live Recent Activity & Audit Trail */}
          <RecentActivityCard
            activityLogs={activityLogs}
          />
        </div>
      </div>
    </div>
  )
}
