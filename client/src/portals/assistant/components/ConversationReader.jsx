import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  CheckCircle2,
  Star,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  Archive,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Paperclip,
  Download,
  Calendar,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Share2
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Tooltip } from '../../../components/ui/Tooltip'
import { ReplyComposer } from './ReplyComposer'
import { InternalNotesSection } from './InternalNotesSection'
import { safeHttpUrl } from '../../../utils/urls'

export const ConversationReader = ({
  thread,
  isOpen,
  onClose,
  onPrevThread,
  onNextThread,
  hasPrev,
  hasNext,
  onMarkHandled,
  onRestore,
  onToggleStar,
  onToggleRead,
  onOverrideClassification,
  onToggleActionItem,
  onAddNote,
  onSendReply,
  onSaveDraft,
  onAnalyzeConversation,
  onGenerateReplyDraft,
  onRequestClientApproval,
  onAskConversationQuestion,
}) => {
  const [showAIInsights, setShowAIInsights] = useState(true)
  const [showReclassifyDropdown, setShowReclassifyDropdown] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [isAsking, setIsAsking] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAiError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    setQuestion('')
    setAnswer(null)
    setAiError('')
  }, [thread?.id])

  const handleAskQuestion = async (event) => {
    event.preventDefault()
    if (!question.trim()) return
    setIsAsking(true)
    setAiError('')
    try {
      const result = await onAskConversationQuestion(thread.id, question.trim())
      setAnswer(result)
    } catch (error) {
      setAiError(error.message || 'Unable to answer this question.')
    } finally {
      setIsAsking(false)
    }
  }

  const handleReanalyze = async () => {
    setIsAnalyzing(true)
    setAiError('')
    try {
      await onAnalyzeConversation(thread.id)
    } catch (error) {
      setAiError(error.message || 'Unable to analyze this conversation.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Keyboard navigation listener (Esc to close, j/k for next/prev)
  useEffect(() => {
    if (!isOpen || !thread) return undefined
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const focusable = () => [...(dialog?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])') || [])]
    focusable()[0]?.focus()

    const trapTab = (event) => {
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) {
        event.preventDefault()
        dialog?.focus()
        return
      }
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault()
        elements[elements.length - 1].focus()
      } else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) {
        event.preventDefault()
        elements[0].focus()
      }
    }

    window.addEventListener('keydown', trapTab)
    return () => {
      window.removeEventListener('keydown', trapTab)
      previousFocus?.focus?.()
    }
  }, [isOpen, thread?.id])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (e.target?.closest?.('[data-nested-dialog], input, textarea, select, [contenteditable="true"]')) return
        e.preventDefault()
        onClose()
        return
      }

      if (e.target?.closest?.('input, textarea, select, button, a, [role="button"], [contenteditable="true"]')) {
        return
      }

      if (e.key === 'j' && hasNext) onNextThread()
      if (e.key === 'k' && hasPrev) onPrevThread()
    }

    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasNext, hasPrev, onClose, onNextThread, onPrevThread])

  if (!isOpen || !thread) return null

  const classificationConfig = {
    ASSISTANT_REPLY: { label: 'Assistant to Reply', variant: 'assistant', icon: ShieldCheck },
    CLIENT_REPLY: { label: 'Client to Reply', variant: 'client', icon: UserCheck },
    NEEDS_REVIEW: { label: 'Needs Review', variant: 'needsReview', icon: HelpCircle },
    WAITING_FOR: { label: 'Waiting For', variant: 'waiting', icon: Clock },
    NO_REPLY_NEEDED: { label: 'No Reply Needed', variant: 'noReply', icon: Archive },
  }

  const currentConf = classificationConfig[thread.classification] || classificationConfig.NEEDS_REVIEW

  const categories = [
    { key: 'ASSISTANT_REPLY', label: 'Assistant to Reply', icon: ShieldCheck },
    { key: 'CLIENT_REPLY', label: 'Client to Reply', icon: UserCheck },
    { key: 'NEEDS_REVIEW', label: 'Needs Review', icon: HelpCircle },
    { key: 'NO_REPLY_NEEDED', label: 'No Reply Needed', icon: Archive },
  ]

  // Default to message history if available, else construct single message
  const messages = thread.messages && thread.messages.length > 0
    ? thread.messages
    : [
        {
          id: 'default-msg',
          sender: thread.sender,
          recipients: thread.recipients,
          cc: thread.cc,
          timestamp: thread.timestamp,
          dateStr: thread.dateStr,
          body: thread.body,
        }
      ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-reader-title"
        ref={dialogRef}
        tabIndex="-1"
        className="relative w-full max-w-4xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Navigation & Action Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-800/80 px-4 sm:px-6 py-3 bg-zinc-900/60 gap-3">
          {/* Left: Mobile Back Button & Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close conversation"
              className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors mr-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sm:hidden font-sans font-medium">Back</span>
              <span className="hidden sm:inline">Close</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

            <div className="flex items-center gap-1">
              <Tooltip content="Previous conversation (k)">
                <button
                  type="button"
                  onClick={onPrevThread}
                  disabled={!hasPrev}
                  aria-label="Previous conversation"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </Tooltip>

              <Tooltip content="Next conversation (j)">
                <button
                  type="button"
                  onClick={onNextThread}
                  disabled={!hasNext}
                  aria-label="Next conversation"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Right: Quick Triage Action Icons */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Read / Unread toggle */}
            <Tooltip content={thread.isRead ? 'Mark as Unread' : 'Mark as Read'}>
              <Button
                variant="outline"
                size="iconSm"
                onClick={() => onToggleRead(thread.id)}
                aria-label={thread.isRead ? 'Mark conversation unread' : 'Mark conversation read'}
                className="text-zinc-400 hover:text-zinc-100"
              >
                {thread.isRead ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5 text-brand-400" />}
              </Button>
            </Tooltip>

            {/* Star toggle */}
            <Tooltip content={thread.isStarred ? 'Unstar' : 'Mark Important'}>
              <Button
                variant="outline"
                size="iconSm"
                onClick={() => onToggleStar(thread.id)}
                aria-label={thread.isStarred ? 'Remove conversation from Important' : 'Mark conversation Important'}
                className={thread.isStarred ? 'text-amber-400 border-amber-500/30' : 'text-zinc-400'}
              >
                <Star className="h-3.5 w-3.5 fill-current" />
              </Button>
            </Tooltip>

            {/* Reclassify Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReclassifyDropdown(!showReclassifyDropdown)}
                aria-label="Override responsibility classification"
                aria-expanded={showReclassifyDropdown}
                className="text-xs font-mono text-zinc-300 hover:text-white"
              >
                <Badge variant={currentConf.variant} size="sm" dot className="mr-1.5">
                  {currentConf.label}
                </Badge>
                <ChevronDown className="h-3 w-3 text-zinc-500" />
              </Button>

              {showReclassifyDropdown && (
                <div className="absolute right-0 top-8 z-50 w-52 rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-elevated">
                  <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase">
                    Override Responsibility:
                  </div>
                  {categories.map((c) => {
                    const CatIcon = c.icon
                    const isCurrent = thread.classification === c.key
                    return (
                      <button
                        type="button"
                        key={c.key}
                        onClick={() => {
                          onOverrideClassification(thread.id, c.key)
                          setShowReclassifyDropdown(false)
                        }}
                        className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-left transition-colors ${
                          isCurrent
                            ? 'bg-zinc-800 text-zinc-100 font-medium'
                            : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                        }`}
                      >
                        <CatIcon className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Archive / Restore Button */}
            {thread.isHandled ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onRestore(thread.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Restore to Inbox</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (await onMarkHandled(thread.id)) onClose()
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                <span>Mark Handled</span>
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close conversation"
              className="p-1 rounded text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 ml-1 hidden sm:block"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Thread Subject Title & Metadata Header */}
          <div className="space-y-2 border-b border-zinc-800/80 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="conversation-reader-title" className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
                {thread.subject}
              </h2>

              <div className="flex items-center gap-2">
                {thread.priority === 'urgent' && (
                  <Badge variant="needsReview" size="sm">
                    Urgent
                  </Badge>
                )}
                {thread.isWaiting && (
                  <Badge variant="waiting" size="sm">
                    Waiting for Reply
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
              <span>{thread.sender.company || thread.sender.name}</span>
              <span>·</span>
              <span>{thread.dateStr}</span>
              <span>·</span>
              <span>{messages.length} message{messages.length === 1 ? '' : 's'} in thread</span>
            </div>
          </div>

          {/* Contextual AI Insights Panel (Collapsible) */}
          <div className="rounded-lg border border-brand-500/30 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-500/20 text-brand-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    CONTEXTUAL AI INSIGHTS
                  </span>
                  <span className="ml-2 text-[10px] font-mono text-zinc-500">
                    {thread.aiSource || 'Rule-Based Demo Processing'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xs font-mono text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  {Math.round((thread.aiConfidence ?? 0) * 100)}% est. confidence
                </span>

                <button
                  onClick={() => setShowAIInsights(!showAIInsights)}
                  aria-expanded={showAIInsights}
                  aria-label={showAIInsights ? 'Collapse AI insights' : 'Expand AI insights'}
                  className="text-zinc-400 hover:text-zinc-200 p-1"
                >
                  {showAIInsights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showAIInsights && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                {thread.clientStatus === 'DELEGATED_TO_ASSISTANT' && (
                  <div className="rounded border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-100">
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-amber-300">Client delegated this conversation</div>
                    <p>{thread.delegationNote || 'No additional instruction was provided.'}</p>
                  </div>
                )}
                {thread.draftApprovalStatus && thread.draftApprovalStatus !== 'NOT_REQUIRED' && (
                  <div className="rounded border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-300">
                    Client draft decision: <span className="font-mono text-brand-300">{thread.draftApprovalStatus.replace(/_/g, ' ')}</span>
                    {thread.draftRejectionReason && <span className="ml-1 text-zinc-500">· {thread.draftRejectionReason}</span>}
                    {thread.draftApprovalStatus === 'APPROVED' && <span className="ml-1 text-amber-300">· explicit simulated-send confirmation is still required</span>}
                  </div>
                )}
                {/* Reasoning & Category Explanation */}
                <div className="rounded bg-zinc-950/80 border border-zinc-800 p-3 space-y-1.5">
                  <div className="text-[11px] font-mono text-zinc-400">
                    <span className="text-zinc-500">Classification:</span>{' '}
                    <span className="font-semibold text-zinc-200">{currentConf.label}</span>
                    {thread.classificationManual && (
                      <span className="ml-2 text-amber-300">Manual override</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {thread.classificationReason || thread.aiReasoning || 'No classification reason is available.'}
                  </p>
                  {thread.suggestedAction && (
                    <div className="text-xs text-brand-300 font-medium pt-1 border-t border-zinc-800/80">
                      Suggested Action: {thread.suggestedAction}
                    </div>
                  )}
                </div>

                <div className="rounded bg-zinc-950/80 border border-zinc-800 p-3 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Conversation summary</div>
                  <p className="text-xs leading-relaxed text-zinc-200">
                    {thread.summary || 'Run analysis to create a conversation summary.'}
                  </p>
                  {thread.aiSuggestedClassification && thread.aiSuggestedClassification !== thread.classification && (
                    <p className="text-[10px] text-zinc-500">
                      Latest AI suggestion: {thread.aiSuggestedClassification.replace(/_/g, ' ')}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReanalyze}
                    disabled={isAnalyzing}
                    className="mt-1 text-[11px]"
                  >
                    <RotateCcw className={`mr-1 h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyzing…' : 'Analyze / Retry'}
                  </Button>
                </div>

                {/* Extracted Action Items */}
                {thread.actionItems && thread.actionItems.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-zinc-400">
                      EXTRACTED ACTION ITEMS ({thread.actionItems.filter(a => a.completed).length}/{thread.actionItems.length} Done):
                    </span>
                    <div className="space-y-1">
                      {thread.actionItems.map((act) => (
                        <div
                          key={act.id}
                          onClick={() => onToggleActionItem(thread.id, act.id)}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-800/60 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={act.completed}
                            onChange={() => {}}
                            className="rounded border-zinc-700 bg-zinc-800 text-brand-500 focus:ring-0"
                          />
                          <span className={`flex-1 ${act.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                            {act.task}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase">
                            [{act.assignedTo || 'review responsibility'}]
                          </span>
                          {act.deadline && (
                            <span className="text-[10px] font-mono text-amber-400/90">
                              {act.deadline}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meeting Details if detected */}
                {thread.meeting && thread.meeting.hasMeeting && (
                  <div className="rounded border border-emerald-500/25 bg-emerald-500/5 p-3 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-semibold font-mono text-2xs">
                        <Calendar className="h-3 w-3" />
                        <span>DETECTED CALENDAR EVENT</span>
                      </div>
                      <div className="font-semibold text-zinc-100">{thread.meeting.title}</div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        {[thread.meeting.date, thread.meeting.time, thread.meeting.timezone, thread.meeting.location].filter(Boolean).join(' · ') || 'Date and time not stated'}
                      </div>
                      {thread.meeting.attendees?.length > 0 && (
                        <div className="text-[10px] text-zinc-500">Participants: {thread.meeting.attendees.join(', ')}</div>
                      )}
                      {safeHttpUrl(thread.meeting.meetingLink) && (
                        <a href={safeHttpUrl(thread.meeting.meetingLink)} target="_blank" rel="noreferrer" className="text-[10px] text-brand-300 underline">Meeting link</a>
                      )}
                    </div>
                    <Badge variant="waiting" size="sm">Meeting details</Badge>
                  </div>
                )}

                <form onSubmit={handleAskQuestion} className="space-y-2 rounded bg-zinc-950/80 border border-zinc-800 p-3">
                  <label htmlFor="conversation-ai-question" className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">
                    Ask about this conversation
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="conversation-ai-question"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      maxLength={1000}
                      placeholder="What is still pending?"
                      className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
                    />
                    <Button type="submit" variant="outline" size="sm" disabled={isAsking || !question.trim()}>
                      {isAsking ? 'Asking…' : 'Ask'}
                    </Button>
                  </div>
                  {answer && (
                    <div className="space-y-1 border-t border-zinc-800 pt-2">
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-200">{answer.answer}</p>
                      <p className={`text-[10px] font-mono ${answer.aiSource === 'Gemini' ? 'text-brand-300' : 'text-amber-300'}`}>
                        {answer.aiSource}
                      </p>
                    </div>
                  )}
                  {aiError && <p role="alert" className="text-xs text-red-300">{aiError}</p>}
                </form>
              </div>
            )}
          </div>

          {/* Chronological Message History Stream */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 px-1">
              <span>CONVERSATION HISTORY</span>
              <span>CHRONOLOGICAL ORDER</span>
            </div>

            {messages.map((msg, index) => {
              const isLast = index === messages.length - 1
              return (
                <div
                  key={msg.id || index}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    msg.sender.isMe
                      ? 'border-brand-500/20 bg-brand-500/5 ml-4 sm:ml-8'
                      : isLast
                      ? 'border-zinc-700/80 bg-zinc-900/60'
                      : 'border-zinc-800/80 bg-zinc-900/30'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono font-bold border ${
                        msg.sender.isMe
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      }`}>
                        {msg.sender.avatar || msg.sender.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-200">
                            {msg.sender.name}
                          </span>
                          {msg.sender.isVIP && (
                            <Badge variant="client" size="sm">VIP</Badge>
                          )}
                          {msg.sender.isMe && (
                            <span className="text-[10px] font-mono text-brand-300 bg-brand-500/10 px-1 rounded">
                              Outbound
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          {msg.sender.email}
                        </div>
                      </div>
                    </div>

                    <span className="text-2xs font-mono text-zinc-500 shrink-0">
                      {msg.dateStr}
                    </span>
                  </div>

                  {/* Recipients info */}
                  <div className="text-[11px] font-mono text-zinc-500 border-t border-zinc-800/50 pt-1.5 flex flex-wrap gap-x-4">
                    <div>To: {msg.recipients.join(', ')}</div>
                    {msg.cc && msg.cc.length > 0 && <div>CC: {msg.cc.join(', ')}</div>}
                  </div>

                  {/* Body Content */}
                  <div className="text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap pt-1">
                    {msg.body}
                  </div>

                  {/* Attachments for this message if any */}
                  {isLast && thread.attachments && thread.attachments.length > 0 && (
                    <div className="border-t border-zinc-800/60 pt-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-2xs font-mono text-zinc-400">
                        <Paperclip className="h-3 w-3" />
                        <span>ATTACHMENTS ({thread.attachments.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {thread.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono hover:border-zinc-700 transition-colors"
                          >
                            <span className="text-zinc-200 truncate max-w-[220px]">
                              {att.name}
                            </span>
                            <span className="text-zinc-500 text-[10px]">
                              ({att.size})
                            </span>
                            <Tooltip content="Simulated download">
                              <button
                                onClick={() => alert(`Simulated Download: ${att.name}`)}
                                className="text-zinc-400 hover:text-white p-0.5"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Internal Notes Section */}
          <InternalNotesSection
            threadId={thread.id}
            notes={thread.internalNotes}
            onAddNote={onAddNote}
          />

          {/* Reply Composer Interface */}
          <ReplyComposer
            thread={thread}
            onSendReply={onSendReply}
            onSaveDraft={onSaveDraft}
            onGenerateDraft={onGenerateReplyDraft}
            onRequestClientApproval={onRequestClientApproval}
          />
        </div>
      </div>
    </div>
  )
}
