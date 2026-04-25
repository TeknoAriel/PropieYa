'use client'

import { resolvePortalVisibilityForPublicUi } from '@propieya/shared'

/**
 * Tira sobria bajo título de ficha: visibilidad comercial (sin cobro activo hasta etapa 2).
 * Datos: `features.portalVisibility` (JSONB).
 */
export function ListingVisibilityStrip({ features }: { features: unknown }) {
  const v = resolvePortalVisibilityForPublicUi(features)
  if (!v.showStrip) return null
  return (
    <p className="text-xs leading-relaxed text-text-tertiary border-l-2 border-brand-primary/20 pl-2.5">
      <span className="font-medium text-text-secondary/95">{v.stripLabel}</span>
      {v.stripSub ? (
        <span className="text-text-tertiary/95"> — {v.stripSub}</span>
      ) : null}
    </p>
  )
}
