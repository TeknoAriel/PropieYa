'use client'

import Link from 'next/link'

import type { inferRouterOutputs } from '@trpc/server'

import { Badge, Button, Card } from '@propieya/ui'

import type { AppRouter } from '@/server/routers/_app'

export type FeedItem = inferRouterOutputs<AppRouter>['searchAlert']['getMyFeed'][number]

function formatShort(d: Date) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'numeric',
  })
}

function formatLong(d: Date) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

type Props = {
  item: FeedItem
  onToggleAlert?: (id: string, isActive: boolean) => void
  onDeleteAlert?: (id: string) => void
  actionsDisabled?: boolean
}

/**
 * Misma estructura para avisos de propiedad y búsquedas guardadas:
 * cabecera (badge + fecha + estado), título, subtítulo, fila de dos botones compactos.
 */
export function AlertFeedCard({
  item,
  onToggleAlert,
  onDeleteAlert,
  actionsDisabled,
}: Props) {
  if (item.kind === 'saved_search') {
    return (
      <Card className="overflow-hidden p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary" className="shrink-0 text-xs font-normal">
            {item.badgeLabel}
          </Badge>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-text-tertiary">
              {formatShort(item.lastActivityAt)}
            </span>
            <span
              className={
                item.isActive
                  ? 'rounded-full bg-semantic-success/15 px-2 py-0.5 text-xs font-medium text-semantic-success'
                  : 'rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary'
              }
            >
              {item.isActive ? 'Activa' : 'Pausada'}
            </span>
          </div>
        </div>

        <h3 className="mt-3 text-base font-semibold text-text-primary">
          Búsqueda guardada
        </h3>
        <p className="mt-1 text-sm text-brand-primary">
          Última: {formatLong(item.lastActivityAt)}
        </p>
        <p className="mt-2 line-clamp-3 text-sm text-text-secondary">
          {item.filtersSummary}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={item.isActive ? 'outline' : 'default'}
            disabled={actionsDisabled}
            onClick={() => onToggleAlert?.(item.id, !item.isActive)}
            className="w-full"
          >
            {item.isActive ? 'Pausar' : 'Activar'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionsDisabled}
            onClick={() => onDeleteAlert?.(item.id)}
            className="w-full border-semantic-error/40 text-semantic-error hover:bg-semantic-error/5"
          >
            Eliminar
          </Button>
        </div>
      </Card>
    )
  }

  const hrefFicha = item.listingId
    ? `/propiedad/${item.listingId}`
    : '/buscar'

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="secondary" className="shrink-0 text-xs font-normal">
          {item.badgeLabel}
        </Badge>
        <span className="text-xs text-text-tertiary">
          {formatShort(item.createdAt)}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-text-primary line-clamp-2">
        {item.title}
      </h3>
      {item.priceLabel ? (
        <p className="mt-1 text-sm font-medium text-brand-primary">
          {item.priceLabel}
        </p>
      ) : (
        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
          {item.body}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="sm" className="w-full" asChild>
          <Link href={hrefFicha}>Ver ficha</Link>
        </Button>
        <Button size="sm" variant="outline" className="w-full" asChild>
          <Link href="/buscar">Mis match</Link>
        </Button>
      </div>
    </Card>
  )
}
