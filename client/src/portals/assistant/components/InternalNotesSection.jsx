import React, { useState } from 'react'
import { MessageSquare, Plus, Send, User, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../../../components/ui/Button'

export const InternalNotesSection = ({
  threadId,
  notes = [],
  onAddNote,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [noteText, setNoteText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!noteText.trim()) return
    onAddNote(threadId, noteText.trim())
    setNoteText('')
  }

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300 hover:text-white"
        >
          <MessageSquare className="h-3.5 w-3.5 text-brand-400" />
          <span>INTERNAL PA & CLIENT NOTES ({notes.length})</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </button>

        <span className="text-[10px] font-mono text-zinc-500">
          Visible to PA & Client
        </span>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1">
          {/* Notes Feed */}
          {notes.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-1">
              No internal notes yet. Add background guidance or briefing context below.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-md border border-zinc-800 bg-zinc-900/90 p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="font-semibold text-brand-300 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {n.author}
                    </span>
                    <span className="text-zinc-500">{n.timestamp}</span>
                  </div>
                  <p className="text-zinc-200 leading-relaxed font-sans">
                    {n.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add Note Form */}
          <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Add internal note for David or yourself..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!noteText.trim()}
              className="text-xs font-mono shrink-0"
            >
              <Send className="h-3 w-3 mr-1 text-brand-400" />
              Save Note
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
