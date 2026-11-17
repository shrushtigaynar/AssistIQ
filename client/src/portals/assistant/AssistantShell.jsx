import React from 'react'
import {
  Inbox,
  UserCheck,
  ShieldCheck,
  Clock,
  HelpCircle,
  Archive,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Bot
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export const AssistantShell = () => {
  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden bg-zinc-950">
      {/* Foundational Navigation Sidebar Stub */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-900/30 p-3 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="px-2 py-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
              Triage Queues
            </h2>
          </div>

          <nav className="space-y-1">
            <button className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm">
              <span className="flex items-center gap-2.5">
                <Inbox className="h-4 w-4 text-zinc-300" />
                <span>Primary Inbox</span>
              </span>
              <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300">
                14
              </span>
            </button>

            <button className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span>Assistant to Reply</span>
              </span>
              <Badge variant="assistant" size="sm">5</Badge>
            </button>

            <button className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
              <span className="flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 text-amber-400" />
                <span>Client to Reply</span>
              </span>
              <Badge variant="client" size="sm">3</Badge>
            </button>

            <button className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
              <span className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4 text-rose-400" />
                <span>Needs Review</span>
              </span>
              <Badge variant="needsReview" size="sm">2</Badge>
            </button>

            <button className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
              <span className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>Waiting For</span>
              </span>
              <Badge variant="waiting" size="sm">4</Badge>
            </button>

            <button className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
              <span className="flex items-center gap-2.5">
                <Archive className="h-4 w-4 text-zinc-500" />
                <span>No Reply Needed</span>
              </span>
              <Badge variant="noReply" size="sm">8</Badge>
            </button>
          </nav>
        </div>

        {/* AI & System Invariant Status Note */}
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-2xs font-mono font-medium text-brand-400">
              <Bot className="h-3.5 w-3.5" />
              AI STATUS
            </span>
            <Badge variant="neutral" size="sm">Simulated Ready</Badge>
          </div>
          <p className="text-[11px] text-zinc-400 leading-normal">
            Autonomous sending disabled. Human-in-the-loop review required for all drafts.
          </p>
        </div>
      </aside>

      {/* Main Content Placeholder for Phase 1 */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">Assistant Command Center</h1>
              <Badge variant="brand" size="sm" dot>Phase 1 Foundation</Badge>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Superhuman-inspired adaptive layout and typography system initialized. Ready for Phase 2 data integration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              Filter Rules
            </Button>
            <Button variant="primary" size="sm">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-brand-600" />
              Simulate Ingestion
            </Button>
          </div>
        </div>

        {/* Design System Inspection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Typography & Hierarchy</CardTitle>
                <span className="text-2xs font-mono text-zinc-500">Inter / JetBrains Mono</span>
              </div>
              <CardDescription>
                Razor-sharp contrast, restrained slate/zinc canvas, and mono metadata tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <div className="text-xs text-zinc-300 font-sans">Sans body copy: 13px / 1.5 leading for maximum reading speed.</div>
              <div className="text-2xs text-zinc-400 font-mono">Mono timestamp: 2026-11-16 22:30:00 · 94% CONF</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Safety & Invariants</CardTitle>
                <Badge variant="needsReview" size="sm">Strict Human-in-Loop</Badge>
              </div>
              <CardDescription>
                Explicit approval required before sending. No Reply Needed items permanently accessible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-2">
              <div className="flex items-center gap-2">
                <Badge variant="client" size="sm">Client to Reply</Badge>
                <span className="text-2xs text-zinc-400">Routes to Executive Portal</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="assistant" size="sm">Assistant to Reply</Badge>
                <span className="text-2xs text-zinc-400">Stays in PA Queue</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Adaptive Architecture</CardTitle>
                <Badge variant="neutral" size="sm">No Rigid 3-Pane</Badge>
              </div>
              <CardDescription>
                Contextual drawer and adaptive width for responsive desktop, tablet, and mobile viewing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <div className="text-xs text-zinc-400">
                Phase 2 will populate live interactive triage tabs with realistic multi-turn conversations.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
