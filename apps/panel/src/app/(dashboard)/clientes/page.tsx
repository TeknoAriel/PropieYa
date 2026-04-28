'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Badge, Button, Card, Input } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

type PublisherTypeFilter = 'all' | 'owner' | 'agent' | 'agency'
type StatusFilter = 'all' | 'active' | 'pending' | 'suspended' | 'inactive'
type UpgradeFilter = 'all' | 'with_active' | 'without_active'

function publisherTypeLabel(value: 'owner' | 'agent' | 'agency') {
  if (value === 'owner') return 'Dueño directo'
  if (value === 'agent') return 'Agente'
  return 'Inmobiliaria'
}

function channelLabel(value: string) {
  if (value === 'online') return 'Online'
  if (value === 'on_demand') return 'On demand'
  if (value === 'mixto') return 'Mixto'
  return 'Sin actividad'
}

export default function ClientesPage() {
  const [publisherType, setPublisherType] = useState<PublisherTypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [upgradeFilter, setUpgradeFilter] = useState<UpgradeFilter>('all')
  const [nearLimitOnly, setNearLimitOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedMembershipId, setSelectedMembershipId] = useState<string>('')

  const overview = trpc.listing.commercialPublishersOverview.useQuery({
    publisherType,
    status,
    upgrades: upgradeFilter,
    nearLimitOnly,
    q: query.trim() || undefined,
  })

  const selectedRow = useMemo(
    () => (overview.data?.rows ?? []).find((row) => row.membershipId === selectedMembershipId),
    [overview.data?.rows, selectedMembershipId]
  )

  const detail = trpc.listing.commercialPublisherDetail.useQuery(
    { membershipId: selectedMembershipId },
    { enabled: Boolean(selectedMembershipId) }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Publicadores y clientes</h1>
        <p className="text-text-secondary">
          Operación comercial por perfil publicador: capacidad, uso, upgrades y alertas.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">Filtros</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Input
            placeholder="Buscar por nombre, email u organización"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={publisherType}
            onChange={(e) => setPublisherType(e.target.value as PublisherTypeFilter)}
          >
            <option value="all">Tipo: todos</option>
            <option value="owner">Dueño directo</option>
            <option value="agent">Agente</option>
            <option value="agency">Inmobiliaria</option>
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">Estado: todos</option>
            <option value="active">Activo</option>
            <option value="pending">Pendiente</option>
            <option value="suspended">Suspendido</option>
            <option value="inactive">Inactivo</option>
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={upgradeFilter}
            onChange={(e) => setUpgradeFilter(e.target.value as UpgradeFilter)}
          >
            <option value="all">Upgrades: todos</option>
            <option value="with_active">Con upgrades activos</option>
            <option value="without_active">Sin upgrades activos</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={nearLimitOnly}
              onChange={(e) => setNearLimitOnly(e.target.checked)}
            />
            Cerca del límite
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Listado operativo</h2>
          <span className="text-sm text-text-tertiary">{overview.data?.rows.length ?? 0} registros</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                <th className="px-2 py-2">Cliente</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Organización</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2">Avisos</th>
                <th className="px-2 py-2">Cupo</th>
                <th className="px-2 py-2">Upgrades activos</th>
                <th className="px-2 py-2">Comportamiento comercial</th>
                <th className="px-2 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {overview.isLoading ? (
                <tr>
                  <td className="px-2 py-4 text-text-secondary" colSpan={9}>
                    Cargando publicadores…
                  </td>
                </tr>
              ) : (overview.data?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-text-secondary" colSpan={9}>
                    No hay publicadores para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                overview.data?.rows.map((row) => (
                  <tr
                    key={row.membershipId}
                    className={`border-b border-border/60 ${selectedMembershipId === row.membershipId ? 'bg-muted/40' : ''}`}
                  >
                    <td className="px-2 py-3">
                      <p className="font-medium text-text-primary">{row.name}</p>
                      <p className="text-xs text-text-tertiary">{row.email}</p>
                    </td>
                    <td className="px-2 py-3 text-text-secondary">
                      {publisherTypeLabel(row.publisherType)}
                    </td>
                    <td className="px-2 py-3 text-text-secondary">{row.organizationName}</td>
                    <td className="px-2 py-3">
                      <Badge
                        variant={
                          row.status === 'active'
                            ? 'default'
                            : row.status === 'suspended'
                              ? 'error'
                              : 'secondary'
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-text-secondary">{row.activeListings}/{row.listingCount}</td>
                    <td className="px-2 py-3 text-text-secondary">
                      {row.listingLimit == null ? 'Sin límite' : `${row.listingCount}/${row.listingLimit}`}
                    </td>
                    <td className="px-2 py-3 text-text-secondary">{row.activeUpgrades}</td>
                    <td className="px-2 py-3 text-text-secondary">
                      {channelLabel(row.preferredCommercialChannel)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMembershipId(row.membershipId)}
                        >
                          Ver detalle
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link href="/upgrades">Ir a upgrades</Link>
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

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">Detalle operativo</h2>
        {!selectedMembershipId ? (
          <p className="mt-3 text-sm text-text-secondary">
            Seleccioná un publicador en la tabla para ver su ficha operativa.
          </p>
        ) : detail.isLoading ? (
          <p className="mt-3 text-sm text-text-secondary">Cargando detalle…</p>
        ) : detail.data ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Perfil</p>
                <p className="mt-1 text-sm font-medium text-text-primary">
                  {publisherTypeLabel(detail.data.publisherType)}
                </p>
                <p className="text-xs text-text-tertiary">Rol: {detail.data.role}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Estado cuenta</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{detail.data.organization?.status}</p>
                <p className="text-xs text-text-tertiary">{detail.data.organization?.name}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Avisos activos</p>
                <p className="mt-1 text-sm font-medium text-text-primary">
                  {detail.data.listingSummary.active}/{detail.data.listingSummary.total}
                </p>
                <p className="text-xs text-text-tertiary">
                  Límite: {detail.data.listingSummary.listingLimit ?? 'Sin límite'}
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Upgrades</p>
                <p className="mt-1 text-sm font-medium text-text-primary">
                  {detail.data.upgradesSummary.activeListingUpgrades} activos
                </p>
                <p className="text-xs text-text-tertiary">
                  {detail.data.upgradesSummary.expiredListingUpgrades} vencidos ·{' '}
                  {detail.data.upgradesSummary.activePackagePurchases} paquetes activos
                </p>
              </div>
            </div>

            <div className="rounded-md border border-border p-4">
              <p className="text-sm font-medium text-text-primary">Alertas operativas</p>
              <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                {detail.data.alerts.suspended ? <li>Cuenta suspendida: requiere revisión comercial.</li> : null}
                {detail.data.alerts.pending ? <li>Cuenta pendiente de activación.</li> : null}
                {detail.data.alerts.atLimit ? <li>Cupo alcanzado: no puede publicar nuevos avisos.</li> : null}
                {detail.data.alerts.nearLimit && !detail.data.alerts.atLimit ? (
                  <li>Cerca del límite de publicación.</li>
                ) : null}
                {detail.data.alerts.noActiveUpgrades ? (
                  <li>Sin upgrades activos: oportunidad comercial abierta.</li>
                ) : null}
                {!detail.data.alerts.suspended &&
                !detail.data.alerts.pending &&
                !detail.data.alerts.atLimit &&
                !detail.data.alerts.nearLimit &&
                !detail.data.alerts.noActiveUpgrades ? (
                  <li>Sin alertas críticas.</li>
                ) : null}
              </ul>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-md border border-border p-4">
                <p className="text-sm font-medium text-text-primary">Avisos recientes</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {detail.data.recentListings.length === 0 ? (
                    <li className="text-text-secondary">Sin avisos recientes.</li>
                  ) : (
                    detail.data.recentListings.map((listing) => (
                      <li key={listing.id} className="flex items-center justify-between gap-2">
                        <span className="text-text-primary">{listing.title}</span>
                        <Badge variant="secondary">{listing.status}</Badge>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-sm font-medium text-text-primary">Upgrades recientes</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {detail.data.recentListingUpgrades.length === 0 ? (
                    <li className="text-text-secondary">Sin upgrades por aviso.</li>
                  ) : (
                    detail.data.recentListingUpgrades.map((upgrade) => (
                      <li key={upgrade.id} className="flex items-center justify-between gap-2">
                        <span className="text-text-primary">{upgrade.packageId}</span>
                        <Badge variant="secondary">{upgrade.status}</Badge>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/propiedades">Ver avisos del publicador</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/upgrades">Ver upgrades y compras</Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-semantic-error">
            No pudimos cargar el detalle operativo del publicador seleccionado.
          </p>
        )}
      </Card>

      {selectedRow ? (
        <p className="text-xs text-text-tertiary">
          Seleccionado: {selectedRow.name} · {selectedRow.organizationName}
        </p>
      ) : null}
    </div>
  )
}
