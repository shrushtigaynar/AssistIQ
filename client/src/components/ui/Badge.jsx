import React from 'react'
import { cn } from '../../utils/cn'

export const Badge = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variants = {
    neutral: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/50',
    assistant: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
    client: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    noReply: 'bg-zinc-800/40 text-zinc-400 border-zinc-700/30',
    needsReview: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    waiting: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    brand: 'bg-brand-500/10 text-brand-300 border-brand-500/25',
  }

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 leading-none rounded',
    md: 'text-xs px-2 py-0.5 leading-tight rounded-md',
  }

  const dotColors = {
    neutral: 'bg-zinc-400',
    assistant: 'bg-indigo-400',
    client: 'bg-amber-400',
    noReply: 'bg-zinc-500',
    needsReview: 'bg-rose-400',
    waiting: 'bg-emerald-400',
    brand: 'bg-brand-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border font-mono select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  )
}
