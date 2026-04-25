'use client'

import {
  formatPrice,
  portalVisibilityPanelStatusShort,
  type Currency,
  type PortalVisibilityTier,
} from '@propieya/shared'
import { Badge, Button, Card, Plus, Search, Filter } from '@propieya/ui'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { trpc } from '@/lib/trpc'

export default function CamposPage() {
  const [search, setSearch] = useState('')

  const { data: listings = [], isLoading, refetch } =
    trpc.listing.listMine.useQuery({
      search: search || undefined,
      limit: 50,
    })

  const publishMutation = trpc.listing.publish.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const filtered = useMemo(
    () =>
      listings.filter((l) => {
        return l.propertyType === 'land'
      }),
    [listings]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Campos</h1>
          <p className="text-text-secondary">Gestioná tus publicaciones rurales</p>
        </div>

        <Button asChild>
          <Link href="/campos/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo campo
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            className="w-full rounded-md border border-border bg-surface-primary py-2 pl-10 pr-3 text-sm"
            placeholder="Buscar campos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Campo
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Estado
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Visibilidad
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
                    Cargando campos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-4 text-text-secondary" colSpan={7}>
                    Aún no tenés campos. Creá el primero desde &quot;Nuevo campo&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((listing) => {
                  const portalTier = (
                    listing.features as
                      | { portalVisibility?: { tier?: string } }
                      | null
                      | undefined
                  )?.portalVisibility?.tier as PortalVisibilityTier | undefined
                  const visibilityShort =
                    portalVisibilityPanelStatusShort(portalTier)
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
                        variant={listing.status === 'active' ? 'default' : 'secondary'}
                      >
                        {listing.status === 'active' ? 'Activa' : listing.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {visibilityShort}
                    </td>
                    <td className="p-4 text-text-primary">
                    {formatPrice(
                      listing.priceAmount,
                      listing.priceCurrency as Currency
                    )}
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
                            {publishMutation.isPending
                              ? 'Publicando...'
                              : 'Publicar'}
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

