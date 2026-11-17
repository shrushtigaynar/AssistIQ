import React from 'react'
import { cn } from '../../utils/cn'

export const Button = React.forwardRef(({
  className,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  children,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 select-none'

  const variants = {
    primary: 'bg-zinc-100 text-zinc-900 hover:bg-white active:bg-zinc-200 shadow-sm',
    brand: 'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm',
    secondary: 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/50',
    outline: 'border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-300',
    ghost: 'hover:bg-zinc-800/60 text-zinc-300 hover:text-zinc-100',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  }

  const sizes = {
    xs: 'h-6 px-2 text-xs rounded',
    sm: 'h-7 px-2.5 text-xs rounded-md',
    md: 'h-8 px-3 text-xs rounded-md',
    lg: 'h-9 px-4 text-sm rounded-md',
    icon: 'h-8 w-8 rounded-md p-0',
    iconSm: 'h-7 w-7 rounded-md p-0',
  }

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'
