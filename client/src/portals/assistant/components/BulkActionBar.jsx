import React, { useState } from 'react'
import {
  CheckCircle2,
  Mail,
  MailOpen,
  Star,
  X,
  MoreHorizontal,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  Archive,
  RotateCcw
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'

export const BulkActionBar = ({
  selectedCount,
  isArchivedView,
  onMarkRead,
  onMarkUnread,
  onMarkImportant,
  onArchiveHandled,
  onRestore,
  onReclassify,
  onClearSelection,
}) => {
  const [showReclassifyMenu, setShowReclassifyMenu] = useState(false)

  const categories = [
    { key: 'ASSISTANT_REPLY', label: 'Assistant to Reply', icon: ShieldCheck },
    { key: 'CLIENT_REPLY', label: 'Client to Reply', icon: UserCheck },
    { key: 'NEEDS_REVIEW', label: 'Needs Review', icon: HelpCircle },
    { key: 'NO_REPLY_NEEDED', label: 'No Reply Needed', icon: Archive },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900 border border-brand-500/30 text-xs shadow-elevated animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
          {selectedCount} selected
        </span>
        <span className="text-zinc-400 hidden sm:inline text-2xs">
          Apply bulk action:
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          variant="secondary"
          size="xs"
          onClick={onMarkRead}
          className="text-zinc-300 hover:text-white"
        >
          <MailOpen className="h-3 w-3 mr-1 text-zinc-400" />
          <span>Mark Read</span>
        </Button>

        <Button
          variant="secondary"
          size="xs"
          onClick={onMarkUnread}
          className="text-zinc-300 hover:text-white"
        >
          <Mail className="h-3 w-3 mr-1 text-zinc-400" />
          <span>Mark Unread</span>
        </Button>

        <Button
          variant="secondary"
          size="xs"
          onClick={onMarkImportant}
          className="text-amber-300 hover:text-amber-200"
        >
          <Star className="h-3 w-3 mr-1 fill-current" />
          <span>Important</span>
        </Button>

        {isArchivedView ? (
          <Button
            variant="secondary"
            size="xs"
            onClick={onRestore}
            className="text-emerald-300 hover:text-emerald-200"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            <span>Restore</span>
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="xs"
            onClick={onArchiveHandled}
            className="text-emerald-300 hover:text-emerald-200"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            <span>Archive</span>
          </Button>
        )}

        {/* Reclassify Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowReclassifyMenu(!showReclassifyMenu)}
            className="text-zinc-300 hover:text-white"
          >
            <ShieldCheck className="h-3 w-3 mr-1 text-indigo-400" />
            <span>Reclassify</span>
          </Button>

          {showReclassifyMenu && (
            <div className="absolute right-0 top-7 z-40 w-44 rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-elevated">
              <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase">
                Move to:
              </div>
              {categories.map((c) => {
                const Icon = c.icon
                return (
                  <button
                    key={c.key}
                    onClick={() => {
                      onReclassify(c.key)
                      setShowReclassifyMenu(false)
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-left text-zinc-200 hover:bg-zinc-800"
                  >
                    <Icon className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{c.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          onClick={onClearSelection}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 ml-1"
          title="Clear Selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
