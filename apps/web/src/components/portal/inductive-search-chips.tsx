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
}

export function InductiveSearchChips({
  className = '',
  showHeading = true,
  headingClassName = 'text-lg font-semibold text-text-primary',
}: InductiveSearchChipsProps) {
  return (
    <div className={className}>
      {showHeading ? (
        <div className="mb-3 text-center md:text-left">
          <h2 className={headingClassName}>
            {S.inductiveExploreTitle}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {S.inductiveExploreSubtitle}
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2 md:justify-start">
        {PORTAL_INDUCTIVE_CHIPS.map((chip) => (
          <Button
            key={chip.label}
            asChild
            variant="outline"
            size="sm"
            className="rounded-full"
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
