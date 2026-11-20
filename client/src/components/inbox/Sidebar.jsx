import React from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  HelpCircle,
  Inbox,
  LogOut,
  Mail,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'

const navItems = [
  { key: 'ALL', label: 'All Emails', icon: Inbox },
  { key: 'ASSISTANT_REPLY', label: 'Assistant to Reply', icon: ShieldCheck },
  { key: 'CLIENT_REPLY', label: 'Client to Reply', icon: UserCheck },
  { key: 'NO_REPLY_NEEDED', label: 'No Reply Needed', icon: Archive },
  { key: 'NEEDS_REVIEW', label: 'Needs Review', icon: HelpCircle },
]

export const Sidebar = ({ counts = {}, category, onCategory, connectedAccount, user, onSignOut, onSync, isSyncing }) => (
  <aside className="flex h-full w-16 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/60 md:w-60">
    <nav className="flex-1 overflow-y-auto p-2" aria-label="Inbox categories">
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const count = counts[item.key === 'ALL' ? 'all' : item.key === 'ASSISTANT_REPLY' ? 'assistant'
            : item.key === 'CLIENT_REPLY' ? 'client'
            : item.key === 'NO_REPLY_NEEDED' ? 'noReply'
            : 'needsReview'] ?? 0
          const isActive = category === item.key
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onCategory(item.key)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                  isActive ? 'bg-white text-zinc-900 border border-zinc-200 shadow-xs' : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900'
                )}
              >
                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-600' : 'text-zinc-400')} />
                <span className="hidden min-w-0 flex-1 truncate md:block">{item.label}</span>
                {count > 0 && (
                  <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-zinc-400 md:block">{count}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>

    <div className="border-t border-zinc-200 p-2.5">
      {connectedAccount ? (
        <div className="mb-2.5 hidden rounded-md border border-zinc-200 bg-white p-2.5 md:block">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <Mail className="h-3.5 w-3.5 text-emerald-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-zinc-800">{connectedAccount.providerEmail || 'Gmail account'}</p>
              <p className="text-[10px] text-emerald-600">Connected</p>
            </div>
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              title="Sync now"
              aria-label="Sync now"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            </button>
          </div>
        </div>
      ) : (
        <Link
          to="/settings"
          className="mb-2.5 hidden items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-white/60 px-2.5 py-2 text-[11px] text-zinc-500 hover:border-brand-300 hover:text-brand-700 md:flex"
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="truncate">Connect your email account</span>
        </Link>
      )}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 hidden md:block">
          <p className="truncate text-[11px] font-medium text-zinc-800">{user?.name || 'Account'}</p>
          <p className="truncate text-[10px] text-zinc-400">{user?.email}</p>
        </div>
        <Link to="/settings" title="Settings" aria-label="Settings"
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
          <Settings className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>
)

export default Sidebar
