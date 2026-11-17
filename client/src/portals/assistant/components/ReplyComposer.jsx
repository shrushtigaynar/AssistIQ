import React, { useEffect, useState } from 'react'
import {
  Sparkles,
  Send,
  Trash2,
  Save,
  RotateCcw,
  ShieldAlert,
  CornerUpLeft,
  UserRound,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'

export const ReplyComposer = ({
  thread,
  onSendReply,
  onSaveDraft,
  onGenerateDraft,
  onRequestClientApproval,
}) => {
  const [replyMode, setReplyMode] = useState('reply') // 'reply' or 'replyAll'
  const [showHeaders, setShowHeaders] = useState(false)
  const [selectedTone, setSelectedTone] = useState(thread.suggestedDraft?.tone || 'professional')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [draftSource, setDraftSource] = useState(thread.suggestedDraft?.aiSource || '')
  const [approvalError, setApprovalError] = useState('')
  const [isRequestingApproval, setIsRequestingApproval] = useState(false)

  // Recipients calculation
  const defaultTo = thread.sender.email
  const defaultCC = replyMode === 'replyAll' && thread.cc ? thread.cc.join(', ') : ''
  const defaultSubject = thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`

  const [to, setTo] = useState(thread.suggestedDraft?.to || defaultTo)
  const [cc, setCC] = useState(thread.suggestedDraft?.cc || defaultCC)
  const [subject, setSubject] = useState(thread.suggestedDraft?.subject || defaultSubject)
  const [body, setBody] = useState(thread.suggestedDraft?.body || '')

  useEffect(() => {
    const draft = thread.suggestedDraft || {}
    setSelectedTone(draft.tone || 'professional')
    setTo(draft.to || thread.sender.email || '')
    setCC(draft.cc || '')
    setSubject(draft.subject || (thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`))
    setBody(draft.body || '')
    setGenerationError('')
    setApprovalError('')
    setDraftSource(draft.aiSource || '')
  }, [thread.id])

  const handleApplyAIDraft = async (tone) => {
    setSelectedTone(tone)
    setIsGenerating(true)
    setGenerationError('')
    try {
      const draft = await onGenerateDraft(thread.id, tone)
      setTo(draft.to || thread.sender.email || '')
      setCC(draft.cc || '')
      setSubject(draft.subject || (thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`))
      setBody(draft.body || '')
      setSelectedTone(draft.tone || tone)
      setDraftSource(draft.aiSource || 'Rule-Based Demo Processing')
    } catch (error) {
      setGenerationError(error.message || 'Unable to generate a draft. Retry or write a reply manually.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleModeChange = (mode) => {
    setReplyMode(mode)
    if (mode === 'replyAll') {
      setCC(thread.cc ? thread.cc.join(', ') : '')
    } else {
      setCC('')
    }
  }

  const handleRequestClientApproval = async () => {
    setIsRequestingApproval(true)
    setApprovalError('')
    try {
      await onRequestClientApproval(thread.id, { to, cc, subject, body, tone: selectedTone, aiSource: draftSource })
    } catch (error) {
      setApprovalError(error.message || 'Unable to request client approval.')
    } finally {
      setIsRequestingApproval(false)
    }
  }

  const handleConfirmSend = async () => {
    setIsSending(true)
    try {
      const sent = await onSendReply({
        to,
        cc,
        subject,
        body,
        tone: selectedTone,
      })
      if (sent !== false) setShowApprovalModal(false)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800/90 bg-zinc-900/60 p-4 space-y-4">
      {/* Composer Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-1.5">
            <CornerUpLeft className="h-3.5 w-3.5 text-brand-400" />
            REPLY COMPOSER
          </span>

          <div className="flex items-center rounded-md bg-zinc-800/80 p-0.5 border border-zinc-700/60 text-xs">
            <button
              type="button"
              onClick={() => handleModeChange('reply')}
              className={`px-2.5 py-0.5 rounded text-2xs font-mono transition-colors ${
                replyMode === 'reply' ? 'bg-zinc-700 text-white font-medium shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('replyAll')}
              className={`px-2.5 py-0.5 rounded text-2xs font-mono transition-colors ${
                replyMode === 'replyAll' ? 'bg-zinc-700 text-white font-medium shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Reply All
            </button>
          </div>
        </div>

        {/* AI Tone Generator Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-brand-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI DRAFT:
          </span>
          {['professional', 'friendly', 'concise'].map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => handleApplyAIDraft(tone)}
              disabled={isGenerating}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                selectedTone === tone && body
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 font-medium'
                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {tone[0].toUpperCase() + tone.slice(1)}
            </button>
          ))}
          {isGenerating && <span className="text-[10px] text-zinc-400">Generating…</span>}
        </div>
      </div>

      {draftSource && (
        <p className="text-[10px] font-mono text-zinc-400">
          Draft source: <span className={draftSource === 'Gemini' ? 'text-brand-300' : 'text-amber-300'}>{draftSource}</span>
        </p>
      )}
      {thread.draftApprovalStatus && thread.draftApprovalStatus !== 'NOT_REQUIRED' && (
        <p className="text-[10px] font-mono text-zinc-400">
          Client draft status: <span className={thread.draftApprovalStatus === 'APPROVED' ? 'text-emerald-300' : thread.draftApprovalStatus === 'REJECTED' ? 'text-amber-300' : 'text-brand-300'}>{thread.draftApprovalStatus.replace(/_/g, ' ')}</span>
          {thread.draftRejectionReason && <span className="ml-1 text-zinc-500">· {thread.draftRejectionReason}</span>}
        </p>
      )}
      {generationError && (
        <div className="flex items-center justify-between gap-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-300">
          <span>{generationError}</span>
          <button type="button" className="underline" onClick={() => handleApplyAIDraft(selectedTone)}>Retry</button>
        </div>
      )}
      {approvalError && <p role="alert" className="text-xs text-red-300">{approvalError}</p>}
      {/* Recipient & Subject Header Fields (Expandable) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2 truncate">
            <span className="text-zinc-500">To:</span>
            <span className="text-zinc-200 font-medium truncate">{to}</span>
            {cc && <span className="text-zinc-400 truncate">· CC: {cc}</span>}
          </div>
          <button
            type="button"
            onClick={() => setShowHeaders(!showHeaders)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 shrink-0"
          >
            <span>{showHeaders ? 'Hide Fields' : 'Edit Recipients & Subject'}</span>
            {showHeaders ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {showHeaders && (
          <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950/80 p-3 text-xs animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="w-12 text-zinc-500 font-mono text-right shrink-0">To:</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-zinc-500 font-mono text-right shrink-0">CC:</span>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCC(e.target.value)}
                placeholder="Optional email addresses separated by comma"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-zinc-500 font-mono text-right shrink-0">Subject:</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Message Body Textarea */}
      <div>
        <textarea
          rows={6}
          placeholder="Compose your reply or generate an AI draft using the tone buttons above..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 font-sans leading-relaxed resize-y"
        />
      </div>

      {/* Footer Controls & Human Approval Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBody('')}
            disabled={!body}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSaveDraft({ to, cc, subject, body, tone: selectedTone, aiSource: draftSource })}
            disabled={!body}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save Draft
          </Button>
          {thread.classification === 'CLIENT_REPLY' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRequestClientApproval}
              disabled={!body.trim() || isRequestingApproval || thread.draftApprovalStatus === 'PENDING'}
              className="text-amber-300 hover:text-amber-200"
            >
              {isRequestingApproval ? <RotateCcw className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserRound className="mr-1 h-3.5 w-3.5" />}
              {thread.draftApprovalStatus === 'PENDING' ? 'Awaiting client approval' : 'Request client approval'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
            Explicit human approval required
          </span>

          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={!body.trim()}
            onClick={() => setShowApprovalModal(true)}
            className="shadow-sm"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Approve & Send (Simulated)
          </Button>
        </div>
      </div>

      {/* Explicit Human Approval Confirmation Modal */}
      {showApprovalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-100"
          onClick={() => setShowApprovalModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="simulated-send-title"
            data-nested-dialog
            className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !isSending) {
                event.stopPropagation()
                setShowApprovalModal(false)
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 id="simulated-send-title" className="text-sm font-semibold text-zinc-100">
                  Explicit Human Approval: Send Simulated Reply
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Per system safety rules, AssistIQ never auto-sends emails without manual human sign-off.
                </p>
              </div>
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs space-y-1.5 font-mono">
              <div className="text-zinc-400">
                <span className="text-zinc-500">To:</span> {to}
              </div>
              <div className="text-zinc-400 truncate">
                <span className="text-zinc-500">Subject:</span> {subject}
              </div>
              <div className="text-brand-300 text-[11px]">
                Mode: Simulated Transmission (Local Prototype)
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-normal">
              Notice: This simulated email will be appended to the conversation history and the thread will be marked handled. No live external SMTP transmission will occur.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowApprovalModal(false)}
                disabled={isSending}
              >
                Cancel & Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="bg-brand-600 hover:bg-brand-500 text-white font-medium"
              >
                {isSending ? 'Sending…' : 'Confirm Simulated Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
