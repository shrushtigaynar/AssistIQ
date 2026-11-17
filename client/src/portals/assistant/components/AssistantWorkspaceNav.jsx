import React from 'react'
import { CalendarDays, CheckSquare, Clock3, Inbox, Settings2 } from 'lucide-react'

const items = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'actions', label: 'Action Center', icon: CheckSquare },
  { id: 'follow-ups', label: 'Follow-ups', icon: Clock3 },
  { id: 'meetings', label: 'Meetings', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

export const AssistantWorkspaceNav = ({ activeView, onNavigate }) => (
  <nav aria-label="Assistant workspace" className="flex gap-1 overflow-x-auto border-b border-zinc-800/80 pb-2 scrollbar-none">
    {items.map(({ id, label, icon: Icon }) => {
      const active = activeView === id
      return (
        <button
          key={id}
          type="button"
          onClick={() => onNavigate(id)}
          aria-current={active ? 'page' : undefined}
          className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            active
              ? 'border-zinc-700 bg-zinc-800 text-zinc-100'
              : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      )
    })}
  </nav>
)
