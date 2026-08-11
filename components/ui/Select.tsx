'use client'

import React from 'react'

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  variant?: 'default' | 'outline' | 'filled'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({
    variant = 'default',
    size = 'md',
    className = '',
    ...props
  }, ref) => {
    // Base classes
    const baseClasses = 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 focus-visible:border-zinc-700 disabled:pointer-events-none disabled:opacity-50'

    // Variant classes
    const variantClasses = {
      default: 'bg-[#0e0e11] border border-zinc-800',
      outline: 'border border-zinc-800 bg-transparent',
      filled: 'bg-[#0e0e11]/50 border-transparent'
    }[variant]

    // Size classes
    const sizeClasses = {
      sm: 'text-xs py-1.5 px-3',
      md: 'text-xs py-2 px-4',
      lg: 'text-sm py-2.5 px-5'
    }[size]

    return (
      <select
        ref={ref}
        className={`w-full rounded-md ${baseClasses} ${variantClasses} ${sizeClasses} text-zinc-100 ${className}`}
        {...props}
      >
      </select>
    )
  }
)

Select.displayName = 'Select'