import { cn } from '@propieya/ui'

type BrandLogoProps = {
  className?: string
  compact?: boolean
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} aria-label="PropieYa">
      <svg
        viewBox="0 0 38 38"
        role="img"
        aria-hidden="true"
        className={cn('shrink-0', compact ? 'h-6 w-6' : 'h-7 w-7')}
      >
        <path
          d="M19 3.8 5.4 13.7v20.5l5-3.7V16.4L19 10l8.6 6.4v14.1l5 3.7V13.7L19 3.8Z"
          fill="currentColor"
          className="text-brand-primary"
        />
        <path
          d="m8.6 22.3 9.2 9.1h6.5l9.8-9.7-3.2-3.2-8.2 8.1h-3.1l-8-7.9-3 3.6Z"
          fill="currentColor"
          className="text-brand-primary"
        />
        <path d="m20.3 22.4 9.7-9.6h4.5L24 23.1h-3.7Z" fill="currentColor" className="text-brand-accent" />
      </svg>
      <span
        className={cn(
          'text-lg font-bold tracking-tight text-brand-primary md:text-xl',
          compact && 'text-base md:text-lg'
        )}
      >
        Propie<span className="text-brand-accent">Ya</span>
      </span>
    </span>
  )
}
