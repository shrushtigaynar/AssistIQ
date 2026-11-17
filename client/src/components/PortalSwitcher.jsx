import React from 'react'
import { LogOut, ShieldCheck, UserCheck, ArrowRightLeft } from 'lucide-react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Tooltip } from './ui/Tooltip'

export const PortalSwitcher = ({ activePortal, onSwitchPortal, currentUser, onSignOut }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="flex h-12 items-center justify-between px-3 sm:px-6 gap-2">
        {/* Brand & Context */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600/15 text-brand-400 border border-brand-500/30 font-mono font-bold text-xs tracking-wider">
              AI
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">AssistIQ</span>
              <span className="hidden md:inline text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-wider">v0.1 Prototype</span>
            </div>
          </div>

          <div className="hidden lg:flex h-4 w-[1px] bg-zinc-800" />

          {/* Sync Simulator Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-2xs text-zinc-400">SYNC:</span>
            <span className="text-zinc-300 font-medium text-2xs">Shared backend</span>
          </div>
        </div>

        {/* Center: Polished Responsive Dual-Portal Switcher Segment */}
        <div className="flex items-center p-0.5 sm:p-1 rounded-lg bg-zinc-900 border border-zinc-800/80 shadow-inner">
          <button
            onClick={() => onSwitchPortal('assistant')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activePortal === 'assistant'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${activePortal === 'assistant' ? 'text-brand-400' : 'text-zinc-500'}`} />
            <span className="hidden sm:inline">Assistant Portal</span>
            <span className="sm:hidden text-xs">Assistant</span>
            <span className="hidden md:inline ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-700/60 text-zinc-300">
              PA View
            </span>
          </button>

          <button
            onClick={() => onSwitchPortal('client')}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activePortal === 'client'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserCheck className={`h-3.5 w-3.5 shrink-0 ${activePortal === 'client' ? 'text-amber-400' : 'text-zinc-500'}`} />
            <span className="hidden sm:inline">Client Portal</span>
            <span className="sm:hidden text-xs">Client</span>
            <span className="hidden md:inline ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Executive
            </span>
          </button>
        </div>

        {/* Right: Persona & Active Account Simulation */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-medium text-zinc-200 leading-none">
              {currentUser?.name || (activePortal === 'assistant' ? 'Elena Rostova (Lead PA)' : 'David Vance (Managing Partner)')}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 leading-tight mt-0.5">
              {currentUser?.email || (activePortal === 'assistant' ? 'Command Center Mode' : 'Executive Focus Stream')}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip content={`Switch to ${activePortal === 'assistant' ? 'Client' : 'Assistant'} view (P)`}>
              <Button
                variant="outline"
                size="iconSm"
                onClick={() => onSwitchPortal(activePortal === 'assistant' ? 'client' : 'assistant')}
                className="text-zinc-400 hover:text-zinc-100 border-zinc-800 hover:border-zinc-700"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
            {onSignOut && (
              <Tooltip content="Sign out of this portal">
                <Button variant="ghost" size="iconSm" onClick={onSignOut} aria-label="Sign out">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
