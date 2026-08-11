'use client'

import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({
    variant = 'default',
    size = 'md',
    className = '',
    children,
    ...props
  }, ref) => {
    // Base classes
    const baseClasses = 'font-bold uppercase tracking-wider px-2 py-0.5 rounded'

    // Variant classes
    const variantClasses = {
      default: 'text-[9px] bg-zinc-900/20 border border-zinc-800/20 text-zinc-400',
      secondary: 'text-[9px] bg-zinc-800/20 border border-zinc-700/20 text-zinc-300',
      success: 'text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
      warning: 'text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400',
      error: 'text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400'
    }[variant]

    // Size classes
    const sizeClasses = {
      sm: 'text-[8px] px-1.5 py-0.5',
      md: 'text-[9px] px-2 py-0.5',
      lg: 'text-[10px] px-2.5 py-1'
    }[size]

    return (
      <span
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'