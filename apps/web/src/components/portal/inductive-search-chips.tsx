'use client'

import Link from 'next/link'

import { Button } from '@propieya/ui'
import {
  PORTAL_SEARCH_UX_COPY as S,
  buildPortalBuscarUrl,
  PORTAL_INDUCTIVE_CHIPS,
} from '@propieya/shared'

type InductiveSearchChipsProps = {
  className?: string
  showHeading?: boolean
  /** Sobrescribe clases del título (p. ej. jerarquía más suave en /buscar). */
  headingClassName?: string
  /**
   * `embedded`: debajo del input conversacional, mismo contenedor visual (compacto).
   * `default`: sección aparte con más aire.
   */
  variant?: 'default' | 'embedded'
  /** Alineación de la fila de chips. */
  chipJustify?: 'responsive' | 'center' | 'start'
  /** En `embedded` suele ocultarse el subtítulo para ganar altura. */
  showSubtitle?: boolean
}

export function InductiveSearchChips({
  className = '',
  showHeading = true,
  headingClassName = 'text-lg font-semibold text-text-primary',
  variant = 'default',
  chipJustify = 'responsive',
  showSubtitle = true,
}: InductiveSearchChipsProps) {
  const justifyClass =
    chipJustify === 'center'
      ? 'justify-center'
      : chipJustify === 'start'
        ? 'justify-start'
        : 'justify-center md:justify-start'

  const isEmbedded = variant === 'embedded'

  return (
    <div className={className}>
      {showHeading ? (
        <div
          className={
            isEmbedded
              ? 'mb-2 text-left sm:text-center'
              : 'mb-3 text-center md:text-left'
          }
        >
          <h2
            className={
              isEmbedded
                ? 'text-xs font-semibold uppercase tracking-wide text-text-secondary'
                : headingClassName
            }
          >
            {S.inductiveExploreTitle}
          </h2>
          {showSubtitle && !isEmbedded ? (
            <p className="mt-1 text-sm text-text-secondary">
              {S.inductiveExploreSubtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className={`flex flex-wrap gap-1.5 ${justifyClass}`}>
        {PORTAL_INDUCTIVE_CHIPS.map((chip) => (
          <Button
            key={chip.label}
            asChild
            variant="outline"
            size="sm"
            className={
              isEmbedded
                ? 'h-7 rounded-full border-border/50 bg-surface-primary/80 px-2.5 text-xs shadow-none hover:bg-surface-primary'
                : 'rounded-full'
            }
          >
            <Link href={buildPortalBuscarUrl({ ...chip.filters })}>
              {chip.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
