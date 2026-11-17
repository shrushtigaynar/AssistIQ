import React from 'react'
import { Inbox, ShieldCheck, UserCheck, HelpCircle, Clock, Archive } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'

export const TriageMetricsBar = ({
  counts,
  activeCategory,
  onSelectCategory,
}) => {
  const metrics = [
    {
      id: 'ALL',
      label: 'All Inbox',
      shortLabel: 'All',
      icon: Inbox,
      count: counts.all,
      badgeVariant: 'neutral',
      activeColor: 'border-zinc-500 bg-zinc-800/80 text-zinc-100',
    },
    {
      id: 'ASSISTANT_REPLY',
      label: 'Assistant to Reply',
      shortLabel: 'PA Reply',
      icon: ShieldCheck,
      count: counts.assistant,
      badgeVariant: 'assistant',
      activeColor: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-200',
    },
    {
      id: 'CLIENT_REPLY',
      label: 'Client to Reply',
      shortLabel: 'Client Reply',
      icon: UserCheck,
      count: counts.client,
      badgeVariant: 'client',
      activeColor: 'border-amber-500/60 bg-amber-500/10 text-amber-200',
    },
    {
      id: 'NEEDS_REVIEW',
      label: 'Needs Review',
      shortLabel: 'Review',
      icon: HelpCircle,
      count: counts.needsReview,
      badgeVariant: 'needsReview',
      activeColor: 'border-rose-500/60 bg-rose-500/10 text-rose-200',
    },
    {
      id: 'WAITING_FOR',
      label: 'Waiting For',
      shortLabel: 'Waiting',
      icon: Clock,
      count: counts.waiting,
      badgeVariant: 'waiting',
      activeColor: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
    },
    {
      id: 'NO_REPLY_NEEDED',
      label: 'No Reply Needed',
      shortLabel: 'No Reply',
      icon: Archive,
      count: counts.noReply,
      badgeVariant: 'noReply',
      activeColor: 'border-zinc-600 bg-zinc-800/50 text-zinc-300',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {metrics.map((m) => {
        const Icon = m.icon
        const isActive = activeCategory === m.id

        return (
          <button
            key={m.id}
            onClick={() => onSelectCategory(m.id)}
            className={`group flex items-center justify-between p-2 sm:p-2.5 rounded-lg border text-left transition-all ${
              isActive
                ? `${m.activeColor} shadow-sm ring-1 ring-white/10`
                : 'border-zinc-800/70 bg-zinc-900/40 hover:border-zinc-700/80 hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-current' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              <span className="text-xs font-medium truncate sm:hidden">{m.shortLabel}</span>
              <span className="text-xs font-medium truncate hidden sm:inline">{m.label}</span>
            </div>
            <Badge variant={m.badgeVariant} size="sm" className="ml-1 sm:ml-2 shrink-0">
              {m.count}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
