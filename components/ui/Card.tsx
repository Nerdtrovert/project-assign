'use client'

import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-[#131316] border border-zinc-800 rounded-lg p-5 transition-all duration-200 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
) as any

Card.displayName = 'Card'

Card.Header = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`mb-3 ${className}`}>{children}</div>
)
Card.Header.displayName = 'CardHeader'

Card.Footer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`mt-4 pt-3 border-t border-zinc-800 ${className}`}>{children}</div>
)
Card.Footer.displayName = 'CardFooter'

Card.Title = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-sm font-semibold text-zinc-100 ${className}`}>{children}</h3>
)
Card.Title.displayName = 'CardTitle'

Card.Description = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-zinc-400 text-xs ${className}`}>{children}</p>
)
Card.Description.displayName = 'CardDescription'

Card.Content = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
)
Card.Content.displayName = 'CardContent'