import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-brand-primary text-text-inverse',
        secondary:
          'border-transparent bg-surface-secondary text-text-primary',
        outline: 'border-border-default text-text-primary',
        success:
          'border-transparent bg-semantic-success text-text-inverse',
        warning:
          'border-transparent bg-semantic-warning text-text-primary',
        error:
          'border-transparent bg-semantic-error text-text-inverse',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
