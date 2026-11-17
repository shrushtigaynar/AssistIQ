import React from 'react'
import {
  Inbox,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  Clock,
  Archive,
  Star,
  Layers,
  CheckCircle2,
  FolderArchive
} from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'

export const UnifiedInboxNav = ({
  activeSegment,
  onSelectSegment,
  counts,
}) => {
  const segments = [
    {
      id: 'PRIMARY_INBOX',
      label: 'Primary Inbox',
      icon: Inbox,
      count: counts.primary,
      badgeVariant: 'neutral',
      color: 'text-zinc-300',
    },
    {
      id: 'ASSISTANT_REPLY',
      label: 'Assistant to Reply',
      icon: ShieldCheck,
      count: counts.assistant,
      badgeVariant: 'assistant',
      color: 'text-indigo-400',
    },
    {
      id: 'CLIENT_REPLY',
      label: 'Client to Reply',
      icon: UserCheck,
      count: counts.client,
      badgeVariant: 'client',
      color: 'text-amber-400',
    },
    {
      id: 'NEEDS_REVIEW',
      label: 'Needs Review',
      icon: HelpCircle,
      count: counts.needsReview,
      badgeVariant: 'needsReview',
      color: 'text-rose-400',
    },
    {
      id: 'WAITING_FOR',
      label: 'Waiting For',
      icon: Clock,
      count: counts.waiting,
      badgeVariant: 'waiting',
      color: 'text-emerald-400',
    },
    {
      id: 'NO_REPLY_NEEDED',
      label: 'No Reply Needed',
      icon: Archive,
      count: counts.noReply,
      badgeVariant: 'noReply',
      color: 'text-zinc-500',
    },
    {
      id: 'IMPORTANT',
      label: 'Important',
      icon: Star,
      count: counts.important,
      badgeVariant: 'client',
      color: 'text-amber-300',
    },
    {
      id: 'GENERAL',
      label: 'General',
      icon: Layers,
      count: counts.general,
      badgeVariant: 'neutral',
      color: 'text-zinc-400',
    },
    {
      id: 'ARCHIVED',
      label: 'Archived / Handled',
      icon: FolderArchive,
      count: counts.archived,
      badgeVariant: 'neutral',
      color: 'text-zinc-500',
    },
  ]

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-zinc-800/80">
      {segments.map((seg) => {
        const Icon = seg.icon
        const isActive = activeSegment === seg.id

        return (
          <button
            key={seg.id}
            onClick={() => onSelectSegment(seg.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              isActive
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-zinc-100' : seg.color}`} />
            <span>{seg.label}</span>
            <Badge
              variant={seg.badgeVariant}
              size="sm"
              className={`ml-1 text-[10px] ${isActive ? 'ring-1 ring-white/10' : ''}`}
            >
              {seg.count}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
