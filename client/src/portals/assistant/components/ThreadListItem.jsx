import React, { useState } from 'react'
import {
  CheckCircle2,
  Star,
  MoreVertical,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  Archive,
  Clock,
  Sparkles,
  Paperclip,
  Square,
  CheckSquare,
  RotateCcw
} from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Tooltip } from '../../../components/ui/Tooltip'

export const ThreadListItem = ({
  thread,
  isSelected,
  isChecked,
  onToggleCheck,
  onSelect,
  onMarkHandled,
  onRestore,
  onToggleStar,
  onToggleRead,
  onOverrideClassification,
}) => {
  const [showOverrideMenu, setShowOverrideMenu] = useState(false)

  const classificationConfig = {
    ASSISTANT_REPLY: { label: 'Assistant to Reply', shortLabel: 'PA Reply', variant: 'assistant', icon: ShieldCheck },
    CLIENT_REPLY: { label: 'Client to Reply', shortLabel: 'Client Reply', variant: 'client', icon: UserCheck },
    NEEDS_REVIEW: { label: 'Needs Review', shortLabel: 'Review', variant: 'needsReview', icon: HelpCircle },
    WAITING_FOR: { label: 'Waiting For', shortLabel: 'Waiting', variant: 'waiting', icon: Clock },
    NO_REPLY_NEEDED: { label: 'No Reply Needed', shortLabel: 'No Reply', variant: 'noReply', icon: Archive },
  }

  const currentConfig = classificationConfig[thread.classification] || classificationConfig.NEEDS_REVIEW

  const categories = [
    { key: 'ASSISTANT_REPLY', label: 'Assistant to Reply', icon: ShieldCheck },
    { key: 'CLIENT_REPLY', label: 'Client to Reply', icon: UserCheck },
    { key: 'NEEDS_REVIEW', label: 'Needs Review', icon: HelpCircle },
    { key: 'NO_REPLY_NEEDED', label: 'No Reply Needed', icon: Archive },
  ]

  return (
    <div
      className={`group relative flex items-start gap-2.5 p-3 sm:p-3.5 border-b border-zinc-800/60 transition-colors ${
        isSelected
          ? 'bg-zinc-800/40 border-l-2 border-l-brand-500'
          : 'hover:bg-zinc-900/60 bg-transparent'
      } ${!thread.isRead ? 'bg-zinc-900/25' : ''}`}
    >
      {/* Multi-Select Checkbox & Unread Dot */}
      <div
        className="flex items-center gap-1.5 pt-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onToggleCheck(thread.id)}
          className="text-zinc-500 hover:text-zinc-200 transition-colors p-0.5"
          aria-label={`Select ${thread.subject}`}
          aria-pressed={isChecked}
        >
          {isChecked ? (
            <CheckSquare className="h-4 w-4 text-brand-400" />
          ) : (
            <Square className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400" />
          )}
        </button>

        {/* Unread indicator */}
        <span
          className={`h-2 w-2 rounded-full transition-opacity ${
            !thread.isRead ? 'bg-brand-400 opacity-100' : 'opacity-0'
          }`}
          title={!thread.isRead ? 'Unread message' : 'Read'}
        />
      </div>

      {/* Main Content Column */}
      <button
        type="button"
        data-assistant-thread-open={thread.id}
        onClick={() => onSelect(thread.id)}
        aria-label={`Open conversation: ${thread.subject} from ${thread.sender.name}`}
        className="flex-1 min-w-0 space-y-1 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand-400"
      >
        {/* Top Row: Sender, VIP tag, Classification Badge, Priority, Timestamp */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate max-w-[55%] sm:max-w-none">
            {/* Avatar / Initials */}
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-mono font-medium text-zinc-300 border border-zinc-700/50">
              {thread.sender.avatar}
            </div>

            <span className={`text-xs truncate ${!thread.isRead ? 'font-bold text-zinc-100' : 'font-semibold text-zinc-300'}`}>
              {thread.sender.name}
            </span>

            {thread.sender.company && (
              <span className="hidden md:inline text-2xs text-zinc-500 font-mono truncate">
                · {thread.sender.company}
              </span>
            )}

            {thread.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-mono uppercase font-semibold text-rose-400 bg-rose-500/10 px-1 sm:px-1.5 py-0.2 rounded border border-rose-500/20 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                Urgent
              </span>
            )}

            {thread.isWaiting && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20 shrink-0">
                <Clock className="h-2.5 w-2.5" />
                Waiting
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge variant={currentConfig.variant} size="sm" dot>
              <span className="hidden sm:inline">{currentConfig.label}</span>
              <span className="sm:hidden">{currentConfig.shortLabel}</span>
            </Badge>

            <span className="text-2xs font-mono text-zinc-400 shrink-0">
              {thread.dateStr}
            </span>
          </div>
        </div>

        {/* Middle Row: Subject Line & Indicators */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <h4 className={`text-xs truncate ${!thread.isRead ? 'font-semibold text-white' : 'font-medium text-zinc-200'}`}>
              {thread.subject}
            </h4>

            {thread.messages && thread.messages.length > 1 && (
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700/60 shrink-0">
                {thread.messages.length} msgs
              </span>
            )}

            {thread.attachments && thread.attachments.length > 0 && (
              <span className="flex items-center text-zinc-500 shrink-0" title={`${thread.attachments.length} attachment(s)`}>
                <Paperclip className="h-3 w-3" />
              </span>
            )}
          </div>

          {/* Confidence score estimate */}
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 shrink-0">
            <Sparkles className="h-2.5 w-2.5 text-zinc-400" />
            {Math.round(thread.aiConfidence * 100)}% est.
          </span>
        </div>

        {/* Bottom Row: Preview Snippet */}
        <div>
          <p className="text-xs text-zinc-400 line-clamp-1 leading-relaxed">
            {thread.preview}
          </p>
        </div>
      </button>

      <div
        className={`relative flex items-center gap-1 self-end shrink-0 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        } transition-opacity`}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip content={thread.isStarred ? 'Remove from Important' : 'Mark as Important'}>
          <button
            type="button"
            onClick={() => onToggleStar(thread.id)}
            aria-label={thread.isStarred ? 'Remove from Important' : 'Mark as Important'}
            aria-pressed={Boolean(thread.isStarred)}
            className={`p-1 rounded hover:bg-zinc-800 text-zinc-400 transition-colors ${
              thread.isStarred ? 'text-amber-400' : 'hover:text-zinc-200'
            }`}
          >
            <Star className="h-3.5 w-3.5 fill-current" />
          </button>
        </Tooltip>

        {thread.isHandled ? (
          <Tooltip content="Restore to Inbox">
            <button type="button" onClick={() => onRestore(thread.id)} aria-label="Restore to Inbox" className="p-1 rounded hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ) : (
          <Tooltip content="Mark Handled (Archive)">
            <button type="button" onClick={() => onMarkHandled(thread.id)} aria-label="Mark Handled (Archive)" className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}

        <div className="relative">
          <Tooltip content="Override Responsibility">
            <button
              type="button"
              onClick={() => setShowOverrideMenu(!showOverrideMenu)}
              aria-label="Override Responsibility"
              aria-expanded={showOverrideMenu}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </Tooltip>

          {showOverrideMenu && (
            <div className="absolute right-0 top-6 z-30 w-48 rounded-md border border-zinc-700/80 bg-zinc-900 p-1 shadow-elevated text-xs">
              <div className="px-2 py-1 text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
                Reclassify Responsibility:
              </div>
              {categories.map((cat) => {
                const CatIcon = cat.icon
                const isCurrent = thread.classification === cat.key

                return (
                  <button
                    type="button"
                    key={cat.key}
                    onClick={() => {
                      onOverrideClassification(thread.id, cat.key)
                      setShowOverrideMenu(false)
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition-colors ${
                      isCurrent
                        ? 'bg-zinc-800 text-zinc-100 font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                    }`}
                  >
                    <CatIcon className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
