'use client'

import {
  formatPrice,
  formatTrpcUserMessage,
  LISTING_STATUS_LABELS,
  PUBLISHER_UX_COPY,
  type Currency,
  type ListingStatus,
} from '@propieya/shared'
import { Button, Input, Card, Badge, Plus, Search } from '@propieya/ui'
import Link from 'next/link'
import { useState } from 'react'

import {
  publicationChecklist,
  statusActionCopy,
  statusOperationalCopy,
} from '@/lib/listing-publication'
import { formatListingVigencia } from '@/lib/vigencia'
import { trpc } from '@/lib/trpc'

export default function PropiedadesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [actionError, setActionError] = useState('')
  const { data: me } = trpc.auth.me.useQuery()
  const pub = me?.publisher
  const cannotNewListing = Boolean(
    pub && !pub.canCreateListing
  )

  const { data: listings = [], isLoading, refetch } =
    trpc.listing.listMine.useQuery({
      search: search || undefined,
      status: statusFilter || undefined,
      limit: 50,
    })

  const publishMutation = trpc.listing.publish.useMutation({
    onSuccess: () => {
      setActionError('')
      refetch()
    },
    onError: (err) => {
      setActionError(
        formatTrpcUserMessage(err) || 'No se pudo publicar este aviso todavía.'
      )
    },
  })
  const renewMutation = trpc.listing.renew.useMutation({
    onSuccess: () => {
      setActionError('')
      refetch()
    },
    onError: (err) => {
      setActionError(err.message || 'No se pudo renovar este aviso.')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Propiedades</h1>
          <p className="text-text-secondary">
            Gestioná tus publicaciones
          </p>
        </div>
        {cannotNewListing ? (
          <Button disabled title="No podés crear otro aviso ahora (cupo o cuenta)">
            <Plus className="h-4 w-4 mr-2" />
            Nueva propiedad
          </Button>
        ) : (
          <Button asChild>
            <Link href="/propiedades/nueva">
              <Plus className="h-4 w-4 mr-2" />
              Nueva propiedad
            </Link>
          </Button>
        )}
      </div>

      {pub?.nearLimit && !pub?.atLimit ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-text-secondary">
          {PUBLISHER_UX_COPY.nearLimit}
        </div>
      ) : null}
      {pub?.atLimit ? (
        <div className="rounded-md border border-semantic-warning/40 bg-semantic-warning/5 px-3 py-2 text-sm text-text-secondary">
          {PUBLISHER_UX_COPY.atLimitBody}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-md border border-semantic-error/30 bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">
          {actionError}
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Buscar propiedades..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border border-border bg-background px-3 py-2 text-sm min-w-[140px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="expiring_soon">Por vencer</option>
          <option value="suspended">Suspendido</option>
          <option value="draft">Borrador</option>
          <option value="archived">Archivado</option>
          <option value="pending_review">En revisión</option>
          <option value="sold">Vendido / alquilado</option>
          <option value="withdrawn">Dado de baja</option>
          <option value="rejected">Rechazado (validación)</option>
          <option value="expired">Vencido (sin actualizar contenido)</option>
        </select>
      </div>

      {/* Listings table/cards */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Propiedad
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Estado
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Vigencia
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Precio
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Visitas
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Leads
                </th>
                <th className="text-right p-4 text-sm font-medium text-text-secondary">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-4 text-text-secondary" colSpan={7}>
                    Cargando propiedades...
                  </td>
                </tr>
              ) : listings.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-text-secondary" colSpan={7}>
                    <p className="mb-4 max-w-md mx-auto">
                      Aún no tenés avisos. Creá el primero con datos básicos; después
                      podés cargar fotos, ajustar la dirección y publicar desde la
                      ficha.
                    </p>
                    <Button asChild>
                      <Link href="/propiedades/nueva">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva propiedad
                      </Link>
                    </Button>
                  </td>
                </tr>
              ) : (
                listings.map((listing) => {
                const operational = statusOperationalCopy(
                  listing.status as ListingStatus,
                  Boolean(listing.canPublish)
                )
                const actionCopy = statusActionCopy(
                  listing.status as ListingStatus,
                  Boolean(listing.canPublish),
                  Boolean(listing.canRenew)
                )
                const missingChecklist =
                  (listing.status === 'draft' || listing.status === 'rejected') &&
                  !listing.canPublish
                    ? publicationChecklist(listing.publishability?.issues ?? [])
                    : []
                const showPublish =
                  listing.status === 'draft' || listing.status === 'rejected'
                return (
                <tr
                  key={listing.id}
                  className="border-b border-border last:border-0 hover:bg-surface-secondary"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 rounded bg-surface-elevated" />
                      <div>
                        <p className="font-medium text-text-primary">
                          {listing.title}
                        </p>
                        <p className="text-sm text-text-tertiary">
                          {new Date(listing.createdAt).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        listing.canPublish
                          ? 'default'
                          : listing.status === 'active'
                          ? 'default'
                          : listing.status === 'expiring_soon'
                            ? 'secondary'
                            : listing.status === 'suspended'
                              ? 'error'
                              : 'secondary'
                      }
                    >
                      {listing.status === 'draft'
                        ? operational.label
                        : (LISTING_STATUS_LABELS[listing.status as ListingStatus] ??
                          listing.status)}
                    </Badge>
                    {missingChecklist.length > 0 ? (
                      <p className="mt-1 text-xs text-text-tertiary">
                        {missingChecklist[0]}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-text-tertiary">
                        {actionCopy.nextAction}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-text-secondary max-w-[10rem]">
                    <span
                      className={
                        formatListingVigencia(
                          listing.expiresAt,
                          listing.status
                        ) === 'Vencido'
                          ? 'text-semantic-error font-medium'
                          : ''
                      }
                    >
                      {formatListingVigencia(
                        listing.expiresAt,
                        listing.status
                      )}
                    </span>
                  </td>
                  <td className="p-4 text-text-primary">
                    {formatPrice(listing.priceAmount, listing.priceCurrency as Currency)}
                  </td>
                  <td className="p-4 text-text-secondary">{listing.viewCount}</td>
                  <td className="p-4 text-text-secondary">{listing.contactCount}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {showPublish ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            publishMutation.mutate({ id: listing.id })
                          }
                          disabled={publishMutation.isPending || !listing.canPublish}
                        >
                          {publishMutation.isPending
                            ? 'Publicando...'
                            : listing.canPublish
                              ? listing.status === 'rejected'
                                ? 'Reintentar'
                                : 'Publicar'
                              : 'Completá requisitos'}
                        </Button>
                      ) : null}
                      {(listing.status === 'expiring_soon' ||
                        listing.status === 'suspended' ||
                        listing.status === 'expired') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            renewMutation.mutate({ id: listing.id })
                          }
                          disabled={renewMutation.isPending}
                        >
                          {renewMutation.isPending ? 'Renovando...' : 'Renovar'}
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/propiedades/${listing.id}`}>Editar</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              )})
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
