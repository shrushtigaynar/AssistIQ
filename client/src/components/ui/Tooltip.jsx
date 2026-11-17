import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../../utils/cn'

export const TooltipProvider = TooltipPrimitive.Provider

export const Tooltip = ({ children, content, side = 'top', align = 'center', delayDuration = 300 }) => {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={4}
          className={cn(
            'z-50 overflow-hidden rounded bg-zinc-900 border border-zinc-700/60 px-2 py-1 text-[11px] font-mono text-zinc-200 shadow-md animate-in fade-in-0 zoom-in-95'
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-zinc-700/60" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
