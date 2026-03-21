'use client'

import {
  formatPrice,
  LISTING_STATUS_LABELS,
  type Currency,
  type ListingStatus,
} from '@propieya/shared'
import { Button, Input, Card, Badge, Plus, Search, Filter } from '@propieya/ui'
import Link from 'next/link'
import { useState } from 'react'

import { trpc } from '@/lib/trpc'

export default function PropiedadesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const { data: listings = [], isLoading, refetch } =
    trpc.listing.listMine.useQuery({
      search: search || undefined,
      status: statusFilter || undefined,
      limit: 50,
    })

  const publishMutation = trpc.listing.publish.useMutation({
    onSuccess: () => refetch(),
  })
  const renewMutation = trpc.listing.renew.useMutation({
    onSuccess: () => refetch(),
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
        <Button asChild>
          <Link href="/propiedades/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva propiedad
          </Link>
        </Button>
      </div>

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
                  <td className="p-4 text-text-secondary" colSpan={6}>
                    Cargando propiedades...
                  </td>
                </tr>
              ) : listings.length === 0 ? (
                <tr>
                  <td className="p-4 text-text-secondary" colSpan={6}>
                    Aún no tenés propiedades. Creá la primera desde "Nueva propiedad".
                  </td>
                </tr>
              ) : (
                listings.map((listing) => (
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
                        listing.status === 'active'
                          ? 'default'
                          : listing.status === 'expiring_soon'
                            ? 'secondary'
                            : listing.status === 'suspended'
                              ? 'destructive'
                              : 'secondary'
                      }
                    >
                      {LISTING_STATUS_LABELS[listing.status as ListingStatus] ??
                        listing.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-text-primary">
                    {formatPrice(listing.priceAmount, listing.priceCurrency as Currency)}
                  </td>
                  <td className="p-4 text-text-secondary">{listing.viewCount}</td>
                  <td className="p-4 text-text-secondary">{listing.contactCount}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {listing.status === 'draft' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            publishMutation.mutate({ id: listing.id })
                          }
                          disabled={publishMutation.isPending}
                        >
                          {publishMutation.isPending ? 'Publicando...' : 'Publicar'}
                        </Button>
                      ) : null}
                      {(listing.status === 'expiring_soon' ||
                        listing.status === 'suspended') ? (
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
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
