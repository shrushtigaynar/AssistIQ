import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, Send, Sparkles, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { classificationConfig, formatFullDateTime, CLASSIFICATIONS } from '../../constants/classifications'

const TONES = ['professional', 'friendly', 'concise']

export const EmailReader = ({
  thread,
  isGmailConnected,
  onClose,
  onReclassify,
  onAnalyze,
  onGenerateDraft,
  onSaveDraft,
  onSend,
}) => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [busyTone, setBusyTone] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const storedDraft = thread?.suggestedDraft || {}
  const [draft, setDraft] = useState({ to: '', cc: '', subject: '', body: '' })

  useEffect(() => {
    setDraft({
      to: storedDraft.to || thread?.sender?.email || '',
      cc: storedDraft.cc || (thread?.cc || []).join(', '),
      subject: storedDraft.subject
        || (/^re:/i.test(thread?.subject || '') ? thread.subject : `Re: ${thread?.subject || ''}`),
      body: storedDraft.body || '',
    })
    setActionMessage('')
    setShowConfirm(false)
  }, [thread?.id])

  const config = useMemo(() => classificationConfig(thread?.classification), [thread?.classification])

  const messages = useMemo(() => {
    if (!thread) return []
    if (thread.messages?.length) return thread.messages
    return [{
      id: 'single',
      sender: thread.sender,
      recipients: thread.recipients,
      timestamp: thread.timestamp,
      body: thread.body,
    }]
  }, [thread])

  if (!thread) return null

  const handleGenerate = async (tone) => {
    setBusyTone(tone)
    setIsGenerating(true)
    setActionMessage('')
    try {
      const generated = await onGenerateDraft(thread.id, tone)
      if (generated?.draft) {
        setDraft((current) => ({
          to: generated.draft.to || current.to,
          cc: generated.draft.cc ?? current.cc,
          subject: generated.draft.subject || current.subject,
          body: generated.draft.body || current.body,
        }))
      }
    } catch (error) {
      setActionMessage(error.message || 'Unable to generate a reply draft.')
    } finally {
      setIsGenerating(false)
      setBusyTone('')
    }
  }

  const handleSave = async () => {
    try {
      await onSaveDraft(draft)
      setActionMessage('Draft saved.')
    } catch (error) {
      setActionMessage(error.message || 'Unable to save the draft.')
    }
  }

  const handleSend = async () => {
    setIsSending(true)
    try {
      await onSend(draft)
      setShowConfirm(false)
      onClose()
    } catch (error) {
      setActionMessage(error.message || 'Unable to send the reply.')
      setShowConfirm(false)
    } finally {
      setIsSending(false)
    }
  }

  const handleReanalyze = async () => {
    setIsAnalyzing(true)
    setActionMessage('')
    try {
      await onAnalyze(thread.id)
    } catch (error) {
      setActionMessage(error.message || 'Unable to re-analyze this email.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const isFallbackAi = thread.aiSource && thread.aiSource !== 'Gemini'

  return (
    <section className="relative flex h-full w-full flex-col border-l border-zinc-200 bg-white shadow-xl lg:shadow-none" role="dialog" aria-label="Email reader">
        {/* Header */}
        <header className="border-b border-zinc-200 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-zinc-900">{thread.subject}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">{thread.sender?.name}</span>
                {' '} &lt;{thread.sender?.email}&gt; → {(thread.recipients || []).join(', ') || 'you'}
                {' · '}<span className="font-mono">{formatFullDateTime(thread.timestamp)}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close email" className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => (
              <article key={message.id} className={cn('rounded-lg border p-4', message.sender?.isMe ? 'border-brand-200 bg-brand-50/40' : 'border-zinc-200 bg-white')}>
                <p className="mb-2 text-[11px] text-zinc-500">
                  <span className="font-semibold text-zinc-700">{message.sender?.isMe ? 'You' : message.sender?.name}</span>
                  {' · '}<span className="font-mono">{formatFullDateTime(message.timestamp)}</span>
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800">{message.body || '(empty message)'}</p>
              </article>
            ))}
          </div>

          {/* AI classification */}
          <section className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">AI Classification</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.badgeVariant}>{config.label}</Badge>
                {typeof thread.aiConfidence === 'number' && (
                  <span className="font-mono text-[10px] text-zinc-400">{Math.round(thread.aiConfidence * 100)}% est. confidence</span>
                )}
              </div>
            </div>
            {isFallbackAi && (
              <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
                {thread.aiSource} — the AI provider is unavailable, so a deterministic fallback classified this email.
              </p>
            )}
            {thread.classificationReason && (
              <p className="mt-2.5 text-xs leading-relaxed text-zinc-600">{thread.classificationReason}</p>
            )}
            {thread.suggestedAction && (
              <p className="mt-2 text-xs leading-relaxed text-zinc-700">
                <span className="font-semibold">Suggested next step:</span> {thread.suggestedAction}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReanalyze} loading={isAnalyzing}>
                <RefreshCw className="mr-1.5 h-3 w-3" /> Re-analyze
              </Button>
            </div>
          </section>

          {/* Manual reclassification */}
          <section className="mt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Change classification</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(CLASSIFICATIONS).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onReclassify(thread.id, option.value)}
                  className={cn(
                    'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    thread.classification === option.value
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {thread.classificationManual && (
              <p className="mt-2 text-[11px] text-zinc-400">Manually set — preserved during re-analysis.</p>
            )}
          </section>

          {/* Reply composer */}
          <section className="mt-5 rounded-lg border border-zinc-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Suggested Reply</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TONES.map((tone) => (
                <Button
                  key={tone}
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate(tone)}
                  loading={busyTone === tone}
                  disabled={isGenerating && busyTone !== tone}
                >
                  <Sparkles className="mr-1.5 h-3 w-3 text-brand-600" /> {tone}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <input
                value={draft.to}
                onChange={(event) => setDraft({ ...draft, to: event.target.value })}
                placeholder="To"
                aria-label="Reply recipient"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
              />
              <input
                value={draft.cc}
                onChange={(event) => setDraft({ ...draft, cc: event.target.value })}
                placeholder="Cc (comma separated)"
                aria-label="Reply CC"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
              />
              <input
                value={draft.subject}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                placeholder="Subject"
                aria-label="Reply subject"
                className="w-full rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs text-zinc-800 focus:border-brand-500 focus:outline-none"
              />
              <textarea
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                placeholder="Draft a reply, or generate one with the tone buttons above."
                aria-label="Reply body"
                rows={6}
                className="w-full resize-y rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs leading-relaxed text-zinc-800 focus:border-brand-500 focus:outline-none"
              />
            </div>
            {actionMessage && <p className="mt-2 text-[11px] text-zinc-500">{actionMessage}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleSave}>Save Draft</Button>
              <Button variant="brand" size="sm" onClick={() => setShowConfirm(true)} disabled={!draft.body.trim()}>
                <Send className="mr-1.5 h-3 w-3" /> Approve &amp; Send
              </Button>
            </div>
            {!isGmailConnected && (
              <p className="mt-3 flex items-start gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-500">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                Connect your Gmail account in Settings to send replies. Nothing is sent from this screen without an explicit confirmation.
              </p>
            )}
          </section>
        </div>

        {/* Send confirmation */}
        {showConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/30 p-4" role="alertdialog" aria-modal="true" aria-label="Confirm send">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-zinc-900">Send this reply?</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                The reply will be sent from your connected Gmail account to <span className="font-medium text-zinc-800">{draft.to}</span>. This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSend} loading={isSending}>Send Reply</Button>
              </div>
            </div>
          </div>
        )}
      </section>
  )
}

export default EmailReader
