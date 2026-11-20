import React from 'react'
import { cn } from '../../utils/cn'
import { Badge } from '../ui/Badge'
import { classificationConfig, formatDateTime } from '../../constants/classifications'

export const EmailListItem = ({ thread, isSelected, onSelect }) => {
  const config = classificationConfig(thread.classification)
  const unread = !thread.isRead

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.id)}
      className={cn(
        'flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors',
        isSelected ? 'bg-brand-50/50' : 'hover:bg-zinc-50'
      )}
      aria-current={isSelected ? 'true' : undefined}
    >
      {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-[13px]', unread ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700')}>
            {thread.sender?.name || thread.sender?.email || 'Unknown sender'}
            <span className="ml-1.5 hidden font-normal text-zinc-400 sm:inline">&lt;{thread.sender?.email}&gt;</span>
          </span>
          <span className="shrink-0 font-mono text-[10px] text-zinc-400">{formatDateTime(thread.timestamp)}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-[13px]', unread ? 'font-semibold text-zinc-800' : 'text-zinc-700')}>
            {thread.subject}
          </span>
          <Badge variant={config.badgeVariant} size="sm" className="shrink-0">{config.label}</Badge>
        </div>
        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-zinc-500">
          {thread.preview || thread.body?.slice(0, 160) || ''}
        </p>
      </div>
    </button>
  )
}

export default EmailListItem
