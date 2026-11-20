import React from 'react'
import { cn } from '../../utils/cn'

export const Badge = ({ className, variant = 'neutral', size = 'md', dot = false, children, ...props }) => {
  const variants = {
    neutral: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    assistant: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    client: 'bg-amber-50 text-amber-700 border-amber-200',
    noReply: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    needsReview: 'bg-rose-50 text-rose-700 border-rose-200',
    waiting: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
  }

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 leading-none rounded',
    md: 'text-xs px-2 py-0.5 leading-tight rounded-md',
  }

  const dotColors = {
    neutral: 'bg-zinc-400',
    assistant: 'bg-indigo-500',
    client: 'bg-amber-500',
    noReply: 'bg-zinc-400',
    needsReview: 'bg-rose-500',
    waiting: 'bg-emerald-500',
    brand: 'bg-brand-500',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border select-none',
        variants[variant] || variants.neutral,
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant] || dotColors.neutral)} />}
      {children}
    </span>
  )
}
