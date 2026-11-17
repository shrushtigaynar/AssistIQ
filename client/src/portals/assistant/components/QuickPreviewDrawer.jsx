import React, { useEffect } from 'react'
import {
  X,
  CheckCircle2,
  Star,
  CornerUpLeft,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  Archive,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

export const QuickPreviewDrawer = ({
  thread,
  isOpen,
  onClose,
  onMarkHandled,
  onToggleStar,
  onOverrideClassification,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !thread) return null

  const classificationConfig = {
    ASSISTANT_REPLY: { label: 'Assistant to Reply', variant: 'assistant' },
    CLIENT_REPLY: { label: 'Client to Reply', variant: 'client' },
    NEEDS_REVIEW: { label: 'Needs Review', variant: 'needsReview' },
    WAITING_FOR: { label: 'Waiting For', variant: 'waiting' },
    NO_REPLY_NEEDED: { label: 'No Reply Needed', variant: 'noReply' },
  }

  const currentConf = classificationConfig[thread.classification] || classificationConfig.NEEDS_REVIEW

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Badge variant={currentConf.variant} size="md" dot>
              {currentConf.label}
            </Badge>
            <span className="text-2xs font-mono text-zinc-500">
              {Math.round((thread.aiConfidence || 0.8) * 100)}% est. confidence · {thread.aiSource || 'Rule-Based Demo Processing'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStar(thread.id)}
              className={thread.isStarred ? 'text-amber-400' : 'text-zinc-400'}
            >
              <Star className="h-3.5 w-3.5 fill-current mr-1" />
              <span>{thread.isStarred ? 'Starred' : 'Star'}</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onMarkHandled(thread.id)
                onClose()
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
              <span>Mark Handled</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Subject */}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-100">
              {thread.subject}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mt-1">
              <span>{thread.dateStr}</span>
              <span>·</span>
              <span className="capitalize">{thread.priority} priority</span>
            </div>
          </div>

          {/* Sender & Recipient Metadata */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-mono font-bold text-zinc-200 border border-zinc-700">
                  {thread.sender.avatar}
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {thread.sender.name}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    {thread.sender.email} {thread.sender.company ? `(${thread.sender.company})` : ''}
                  </div>
                </div>
              </div>

              {thread.sender.isVIP && (
                <Badge variant="client" size="sm">
                  VIP Contact
                </Badge>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
              <div><span className="text-zinc-500">To:</span> {thread.recipients.join(', ')}</div>
              {thread.cc && thread.cc.length > 0 && (
                <div><span className="text-zinc-500">CC:</span> {thread.cc.join(', ')}</div>
              )}
            </div>
          </div>

          {/* AI Intelligence Briefing Pill */}
          <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Classification Reasoning</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {thread.aiReasoning}
            </p>
            {thread.suggestedAction && (
              <div className="text-xs text-brand-300 pt-1 font-medium">
                Action suggestion: {thread.suggestedAction}
              </div>
            )}
          </div>

          {/* Email Body */}
          <div className="prose prose-invert max-w-none text-zinc-200 text-xs leading-relaxed font-sans whitespace-pre-wrap border-t border-zinc-800/80 pt-4">
            {thread.body}
          </div>
        </div>

        {/* Drawer Bottom Bar: Reclassification Controls */}
        <div className="border-t border-zinc-800/80 px-6 py-3 bg-zinc-900/60 flex items-center justify-between">
          <span className="text-2xs font-mono text-zinc-400">Override Category:</span>
          <div className="flex items-center gap-1.5">
            {[
              { key: 'ASSISTANT_REPLY', label: 'PA Reply', variant: 'assistant' },
              { key: 'CLIENT_REPLY', label: 'Client Reply', variant: 'client' },
              { key: 'NEEDS_REVIEW', label: 'Needs Review', variant: 'needsReview' },
              { key: 'NO_REPLY_NEEDED', label: 'No Reply', variant: 'noReply' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => onOverrideClassification(thread.id, opt.key)}
                className={`px-2 py-1 rounded text-2xs font-mono transition-colors ${
                  thread.classification === opt.key
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
