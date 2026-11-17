import React from 'react'
import { Sparkles, CheckSquare, Square, Info, ArrowRight, CornerDownRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'

export const ContextualInsightsCard = ({
  selectedThread,
  onToggleActionItem,
  onOpenQuickPreview,
}) => {
  if (!selectedThread) {
    return (
      <Card className="border-zinc-800/80 bg-zinc-900/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-brand-400">
            <Sparkles className="h-4 w-4" />
            <CardTitle>AI Triage Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs leading-relaxed text-zinc-400">
            Select a conversation to view its saved summary, responsibility estimate, action items, and draft status.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-800/80 bg-zinc-900/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-brand-400">
            <Sparkles className="h-3.5 w-3.5" />
            <CardTitle className="text-xs uppercase tracking-wider font-mono">
              AI Contextual Insights
            </CardTitle>
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-400">
            Est. Conf: {Math.round((selectedThread.aiConfidence ?? 0) * 100)}% · {selectedThread.aiSource || 'Rule-Based Demo Processing'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        {/* Classification Reasoning */}
        <div className="rounded-md border border-zinc-800/80 bg-zinc-900/80 p-2.5 space-y-1.5">
          {selectedThread.summary && (
            <p className="text-xs text-zinc-200 leading-relaxed border-b border-zinc-800/60 pb-2">
              {selectedThread.summary}
            </p>
          )}
          <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-zinc-300">
            <Info className="h-3 w-3 text-zinc-400" />
            <span>AI Reasoning</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {selectedThread.classificationReason || selectedThread.aiReasoning || 'No classification reason is available.'}
          </p>
          {selectedThread.suggestedAction && (
            <div className="text-[11px] text-brand-300 font-medium flex items-start gap-1 pt-1 border-t border-zinc-800/60">
              <CornerDownRight className="h-3 w-3 shrink-0 mt-0.5" />
              <span>Suggested: {selectedThread.suggestedAction}</span>
            </div>
          )}
        </div>

        {/* Action Items Checklist */}
        {selectedThread.actionItems && selectedThread.actionItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>EXTRACTED ACTION ITEMS</span>
              <span className="text-zinc-500">
                {selectedThread.actionItems.filter(a => a.completed).length}/{selectedThread.actionItems.length} Done
              </span>
            </div>

            <div className="space-y-1">
              {selectedThread.actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onToggleActionItem(selectedThread.id, item.id)}
                  className="flex w-full items-start gap-2 rounded p-1.5 text-left text-xs hover:bg-zinc-800/60 transition-colors group"
                >
                  {item.completed ? (
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs block leading-tight ${item.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                      {item.task}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        [{item.assignedTo}]
                      </span>
                      {item.deadline && (
                        <span className="text-[10px] font-mono text-amber-400/80">
                          Due {item.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenQuickPreview(selectedThread.id)}
          className="w-full text-xs font-mono justify-between text-zinc-300 hover:text-white"
        >
          <span>Read Full Conversation</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  )
}
