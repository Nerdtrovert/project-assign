'use client'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  isLoading?: boolean
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    block = false,
    isLoading = false,
    asChild = false,
    className = '',
    children,
    ...props
  }, ref) => {
    // Base classes
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e11] disabled:pointer-events-none disabled:opacity-50'

    // Variant classes
    const variantClasses = {
      primary: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950 shadow-sm font-semibold',
      secondary: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 shadow-sm',
      ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm border border-red-700'
    }[variant]

    // Size classes
    const sizeClasses = {
      sm: 'text-xs py-1.5 px-3 rounded-md',
      md: 'text-xs py-2 px-4 rounded-md',
      lg: 'text-sm py-2.5 px-5 rounded-md'
    }[size]

    // Block class
    const blockClass = block ? 'w-full' : ''

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${blockClass} ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'