import React from 'react'
import { cn } from '../../utils/cn'

export const Button = React.forwardRef(({
  className,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none'

  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm',
    brand: 'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm',
    secondary: 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-300 shadow-xs',
    outline: 'border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 text-zinc-600',
    ghost: 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  }

  const sizes = {
    xs: 'h-6 px-2 text-xs rounded',
    sm: 'h-8 px-3 text-xs rounded-md',
    md: 'h-9 px-3.5 text-sm rounded-md',
    lg: 'h-10 px-5 text-sm rounded-md',
    icon: 'h-9 w-9 rounded-md p-0',
    iconSm: 'h-7 w-7 rounded-md p-0',
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
})

Button.displayName = 'Button'
