'use client'

import React from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  height?: number | string
  width?: number | string
  radius?: 'sm' | 'md' | 'lg' | 'full'
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    className = '',
    height = 16,
    width = '100%',
    radius = 'md',
    ...props
  }, ref) => {
    // Radius classes
    const radiusClasses = {
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full'
    }[radius]

    return (
      <div
        ref={ref}
        className={`animate-pulse bg-zinc-900/20 ${radiusClasses} ${className}`}
        style={{ height, width }}
        {...props}
      >
      </div>
    )
  }
)

Skeleton.displayName = 'Skeleton'