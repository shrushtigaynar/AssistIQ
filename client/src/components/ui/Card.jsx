import React from 'react'
import { cn } from '../../utils/cn'

export const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-4 text-zinc-100 shadow-subtle backdrop-blur-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CardHeader = ({ className, children, ...props }) => {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-3', className)} {...props}>
      {children}
    </div>
  )
}

export const CardTitle = ({ className, children, ...props }) => {
  return (
    <h3 className={cn('text-sm font-semibold tracking-tight text-zinc-100', className)} {...props}>
      {children}
    </h3>
  )
}

export const CardDescription = ({ className, children, ...props }) => {
  return (
    <p className={cn('text-xs text-zinc-400 leading-relaxed', className)} {...props}>
      {children}
    </p>
  )
}

export const CardContent = ({ className, children, ...props }) => {
  return (
    <div className={cn('pt-0', className)} {...props}>
      {children}
    </div>
  )
}
