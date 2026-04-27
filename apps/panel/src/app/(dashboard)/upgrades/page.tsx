'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import {
  PORTAL_COMMERCIAL_PROFILE_KEYS,
  formatTrpcUserMessage,
  portalUpgradeStatusLabel,
  PORTAL_UPGRADE_STATUSES,
  type PortalUpgradeChannel,
  type PortalUpgradeStatus,
} from '@propieya/shared'
import { Badge, Button, Card, Input } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

type PurchaseType = 'listing' | 'package'
type VigenciaFilter = 'all' | 'active' | 'pending' | 'scheduled' | 'expired'

function statusBadgeVariant(status: PortalUpgradeStatus): 'default' | 'secondary' | 'error' {
  if (status === 'active') return 'default'
  if (status === 'expired' || status === 'cancelled') return 'error'
  return 'secondary'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-AR')
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export default function UpgradesPage() {
  const [listingId, setListingId] = useState('')
  const [packageId, setPackageId] = useState('destacado_simple')
  const [durationDays, setDurationDays] = useState('15')
  const [listingChannel, setListingChannel] = useState<PortalUpgradeChannel>('on_demand')
  const [listingStatus, setListingStatus] = useState<(typeof PORTAL_UPGRADE_STATUSES)[number]>('pending_activation')
  const [listingStartsAt, setListingStartsAt] = useState('')
  const [listingNotes, setListingNotes] = useState('')
  const [packageCode, setPackageCode] = useState('pack_5')
  const [packageName, setPackageName] = useState('Pack visibilidad')
  const [packageCredits, setPackageCredits] = useState('5')
  const [packageChannel, setPackageChannel] = useState<PortalUpgradeChannel>('on_demand')
  const [packageStatus, setPackageStatus] = useState<(typeof PORTAL_UPGRADE_STATUSES)[number]>('pending_activation')
  const [globalError, setGlobalError] = useState('')
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [catalogName, setCatalogName] = useState('')
  const [catalogType, setCatalogType] = useState<'listing' | 'package'>('listing')
  const [catalogTier, setCatalogTier] = useState<'standard' | 'highlight' | 'boost' | 'premium_ficha'>(
    'highlight'
  )
  const [catalogProducts, setCatalogProducts] = useState('')
  const [catalogDuration, setCatalogDuration] = useState('')
  const [catalogPriceBand, setCatalogPriceBand] = useState('')
  const [catalogEnabledProfiles, setCatalogEnabledProfiles] = useState<string[]>([
    'owner',
    'agent',
    'agency',
  ])
  const [catalogShortCopy, setCatalogShortCopy] = useState('')
  const [catalogSurfaces, setCatalogSurfaces] = useState('')
  const [catalogIsActive, setCatalogIsActive] = useState(true)

  const [statusFilter, setStatusFilter] = useState<'all' | PortalUpgradeStatus>('all')
  const [channelFilter, setChannelFilter] = useState<'all' | PortalUpgradeChannel>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | PurchaseType>('all')
  const [productFilter, setProductFilter] = useState<'all' | string>('all')
  const [vigenciaFilter, setVigenciaFilter] = useState<VigenciaFilter>('all')
  const [queryFilter, setQueryFilter] = useState('')

  const utils = trpc.useUtils()
  const overview = trpc.listing.upgradesOverview.useQuery()

  const listingUpgradeMutation = trpc.listing.createListingUpgrade.useMutation({
    onSuccess: () => {
      setGlobalError('')
      void utils.listing.upgradesOverview.invalidate()
    },
    onError: (err) =>
      setGlobalError(formatTrpcUserMessage(err) || 'No se pudo crear el upgrade por aviso.'),
  })

  const packagePurchaseMutation = trpc.listing.createPackageUpgradePurchase.useMutation({
    onSuccess: () => {
      setGlobalError('')
      void utils.listing.upgradesOverview.invalidate()
    },
    onError: (err) =>
      setGlobalError(formatTrpcUserMessage(err) || 'No se pudo registrar el paquete.'),
  })
  const upsertCatalogMutation = trpc.listing.upsertCommercialCatalogItem.useMutation({
    onSuccess: () => {
      setGlobalError('')
      void utils.listing.upgradesOverview.invalidate()
    },
    onError: (err) =>
      setGlobalError(formatTrpcUserMessage(err) || 'No se pudo guardar el producto comercial.'),
  })

  const listingsById = useMemo(
    () => new Map((overview.data?.eligibleListings ?? []).map((l) => [l.id, l])),
    [overview.data?.eligibleListings]
  )
  const metricsByListing = useMemo(
    () => new Map((overview.data?.metricsByListing ?? []).map((m) => [m.listingId, m])),
    [overview.data?.metricsByListing]
  )

  const rows = useMemo(() => {
    const catalogById = new Map((overview.data?.commercialCatalog ?? []).map((i) => [i.id, i]))
    const listingRows = (overview.data?.listingUpgrades ?? []).map((u) => {
      const listing = listingsById.get(u.listingId ?? '')
      const metric = u.listingId ? metricsByListing.get(u.listingId) : undefined
      return {
        id: u.id,
        reference: listing?.title ?? 'Aviso',
        customer: overview.data?.organizationName ?? 'Publicador',
        product: catalogById.get(u.packageId)?.commercialName ?? u.packageId,
        channel: u.channel,
        status: u.status,
        startsAt: u.startsAt ?? null,
        endsAt: u.endsAt ?? null,
        purchaseType: 'listing' as const,
        listingId: u.listingId ?? null,
        metrics: metric ?? { impressions: 0, clicks: 0, ctr: 0 },
      }
    })
    const packageRows = (overview.data?.packagePurchases ?? []).map((p) => ({
      id: p.id,
      reference: p.packageName,
      customer: overview.data?.organizationName ?? 'Publicador',
      product: catalogById.get(p.packageCode)?.commercialName ?? p.packageName ?? p.packageCode,
      channel: p.channel,
      status: p.status,
      startsAt: p.startsAt ?? null,
      endsAt: p.endsAt ?? null,
      purchaseType: 'package' as const,
      listingId: null as string | null,
      metrics: { impressions: 0, clicks: 0, ctr: 0 },
    }))
    return [...listingRows, ...packageRows]
  }, [overview.data, listingsById, metricsByListing])

  const catalogItems = useMemo(() => overview.data?.commercialCatalog ?? [], [overview.data?.commercialCatalog])
  const listingCatalog = useMemo(
    () => catalogItems.filter((item) => item.type === 'listing' && item.id !== 'none'),
    [catalogItems]
  )
  const packageCatalog = useMemo(
    () => catalogItems.filter((item) => item.type === 'package'),
    [catalogItems]
  )

  useEffect(() => {
    if (!selectedCatalogId && catalogItems.length > 0) {
      setSelectedCatalogId(catalogItems[0]!.id)
    }
  }, [selectedCatalogId, catalogItems])

  useEffect(() => {
    const item = catalogItems.find((i) => i.id === selectedCatalogId)
    if (!item) return
    setCatalogName(item.commercialName)
    setCatalogType(item.type)
    setCatalogTier(item.tier)
    setCatalogProducts(item.technicalProducts.join(', '))
    setCatalogDuration(item.suggestedDurationDays ? String(item.suggestedDurationDays) : '')
    setCatalogPriceBand(item.priceBand ?? '')
    setCatalogEnabledProfiles(item.enabledProfiles)
    setCatalogShortCopy(item.shortCopy)
    setCatalogSurfaces(item.surfaces.join(', '))
    setCatalogIsActive(item.isActive)
  }, [selectedCatalogId, catalogItems])

  useEffect(() => {
    if (listingCatalog.length > 0 && !listingCatalog.some((item) => item.id === packageId)) {
      setPackageId(listingCatalog[0]!.id)
    }
  }, [listingCatalog, packageId])

  useEffect(() => {
    if (!packageCode && packageCatalog.length > 0) setPackageCode(packageCatalog[0]!.id)
  }, [packageCode, packageCatalog])

  useEffect(() => {
    const selected = packageCatalog.find((item) => item.id === packageCode)
    if (selected && !packageName.trim()) setPackageName(selected.commercialName)
  }, [packageCode, packageCatalog, packageName])

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (channelFilter !== 'all' && r.channel !== channelFilter) return false
      if (typeFilter !== 'all' && r.purchaseType !== typeFilter) return false
      if (productFilter !== 'all' && r.product !== productFilter) return false
      if (vigenciaFilter !== 'all') {
        if (vigenciaFilter === 'active' && r.status !== 'active') return false
        if (
          vigenciaFilter === 'pending' &&
          r.status !== 'pending_activation' &&
          r.status !== 'pending_payment'
        )
          return false
        if (vigenciaFilter === 'scheduled' && r.status !== 'scheduled') return false
        if (vigenciaFilter === 'expired' && r.status !== 'expired') return false
      }
      if (queryFilter.trim()) {
        const q = queryFilter.trim().toLowerCase()
        const haystack = `${r.reference} ${r.customer} ${r.product}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [rows, statusFilter, channelFilter, typeFilter, productFilter, vigenciaFilter, queryFilter])

  const kpis = useMemo(() => {
    const count = (status: PortalUpgradeStatus) => rows.filter((r) => r.status === status).length
    return {
      active: count('active'),
      pendingActivation: count('pending_activation'),
      pendingPayment: count('pending_payment'),
      scheduled: count('scheduled'),
      expired: count('expired'),
      listingPurchases: rows.filter((r) => r.purchaseType === 'listing').length,
      packagePurchases: rows.filter((r) => r.purchaseType === 'package').length,
    }
  }, [rows])

  const alerts = useMemo(() => {
    const now = Date.now()
    const byExpiring = rows.filter((r) => {
      if (!r.endsAt || r.status !== 'active') return false
      const end = new Date(r.endsAt).getTime()
      const diff = end - now
      return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
    })
    return {
      expiringSoon: byExpiring,
      pendingActivation: rows.filter((r) => r.status === 'pending_activation'),
      pendingPayment: rows.filter((r) => r.status === 'pending_payment'),
      expired: rows.filter((r) => r.status === 'expired'),
    }
  }, [rows])

  const productsForFilter = useMemo(
    () => Array.from(new Set(rows.map((r) => r.product))).sort(),
    [rows]
  )

  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Backoffice comercial</h1>
        <p className="text-text-secondary">Cargando panel de upgrades…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Backoffice comercial</h1>
        <p className="text-text-secondary">
          Operá upgrades por aviso y por paquete, revisá qué requiere acción y seguí rendimiento
          básico sin pasarela automática.
        </p>
      </div>

      {!overview.data?.canPurchase ? (
        <Card className="p-6">
          <p className="text-text-secondary">
            {overview.data?.reason ?? 'Esta cuenta todavía no está habilitada para upgrades.'}
          </p>
        </Card>
      ) : null}

      {globalError ? (
        <Card className="border-semantic-error/30 bg-semantic-error/10 p-4 text-sm text-semantic-error">
          {globalError}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Activos</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{kpis.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Pending activation</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{kpis.pendingActivation}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Pending payment</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{kpis.pendingPayment}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Scheduled</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{kpis.scheduled}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Expired</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{kpis.expired}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Compras por aviso</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{kpis.listingPurchases}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Compras por paquete</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{kpis.packagePurchases}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">CTR comercial (30d)</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">
            {formatPercent(overview.data?.metricsSummary?.ctr ?? 0)}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            {(overview.data?.metricsSummary?.clicks ?? 0)} clicks /{' '}
            {(overview.data?.metricsSummary?.impressions ?? 0)} impresiones
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">Filtros operativos</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input
            placeholder="Buscar referencia o producto"
            value={queryFilter}
            onChange={(e) => setQueryFilter(e.target.value)}
          />
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | PortalUpgradeStatus)}
          >
            <option value="all">Estado: todos</option>
            {PORTAL_UPGRADE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {portalUpgradeStatusLabel(s)}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={channelFilter}
            onChange={(e) =>
              setChannelFilter(e.target.value as 'all' | PortalUpgradeChannel)
            }
          >
            <option value="all">Canal: todos</option>
            <option value="online">Online</option>
            <option value="on_demand">On demand</option>
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | PurchaseType)}
          >
            <option value="all">Tipo: todos</option>
            <option value="listing">Por aviso</option>
            <option value="package">Por paquete</option>
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          >
            <option value="all">Producto: todos</option>
            {productsForFilter.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={vigenciaFilter}
            onChange={(e) => setVigenciaFilter(e.target.value as VigenciaFilter)}
          >
            <option value="all">Vigencia: todas</option>
            <option value="active">Activos</option>
            <option value="pending">Pendientes</option>
            <option value="scheduled">Programados</option>
            <option value="expired">Vencidos</option>
          </select>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Catálogo comercial editable</h2>
          <span className="text-sm text-text-tertiary">{catalogItems.length} productos</span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Definí qué se vende, a quién aplica, duración sugerida, banda de precio y mapeo técnico sin
          tocar código.
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {catalogItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer border-b border-border/60 ${selectedCatalogId === item.id ? 'bg-muted/40' : ''}`}
                    onClick={() => setSelectedCatalogId(item.id)}
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium text-text-primary">{item.commercialName}</p>
                      <p className="text-xs text-text-tertiary">{item.id}</p>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {item.type === 'listing' ? 'Por aviso' : 'Por paquete'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 rounded-md border border-border p-4">
            <p className="text-sm font-medium text-text-primary">Editar producto seleccionado</p>
            <Input value={catalogName} onChange={(e) => setCatalogName(e.target.value)} placeholder="Nombre comercial" />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={catalogType}
                onChange={(e) => setCatalogType(e.target.value as 'listing' | 'package')}
              >
                <option value="listing">Tipo: por aviso</option>
                <option value="package">Tipo: por paquete</option>
              </select>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={catalogTier}
                onChange={(e) =>
                  setCatalogTier(e.target.value as 'standard' | 'highlight' | 'boost' | 'premium_ficha')
                }
              >
                <option value="standard">Tier: estándar</option>
                <option value="highlight">Tier: destacado</option>
                <option value="boost">Tier: impulso</option>
                <option value="premium_ficha">Tier: ficha premium</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={1}
                max={365}
                value={catalogDuration}
                onChange={(e) => setCatalogDuration(e.target.value)}
                placeholder="Duración sugerida (días)"
              />
              <Input
                value={catalogPriceBand}
                onChange={(e) => setCatalogPriceBand(e.target.value)}
                placeholder="Precio base o banda"
              />
            </div>
            <Input
              value={catalogProducts}
              onChange={(e) => setCatalogProducts(e.target.value)}
              placeholder="Productos técnicos (coma)"
            />
            <Input
              value={catalogSurfaces}
              onChange={(e) => setCatalogSurfaces(e.target.value)}
              placeholder="Superficies (coma)"
            />
            <Input
              value={catalogShortCopy}
              onChange={(e) => setCatalogShortCopy(e.target.value)}
              placeholder="Copy corto operativo"
            />
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              {PORTAL_COMMERCIAL_PROFILE_KEYS.map((profile) => (
                <label key={profile} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={catalogEnabledProfiles.includes(profile)}
                    onChange={(e) =>
                      setCatalogEnabledProfiles((current) =>
                        e.target.checked
                          ? Array.from(new Set([...current, profile]))
                          : current.filter((p) => p !== profile)
                      )
                    }
                  />
                  {profile === 'owner' ? 'Dueño' : profile === 'agent' ? 'Agente' : 'Inmobiliaria'}
                </label>
              ))}
              <label className="ml-auto flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={catalogIsActive}
                  onChange={(e) => setCatalogIsActive(e.target.checked)}
                />
                Activo
              </label>
            </div>
            <Button
              disabled={upsertCatalogMutation.isPending || !selectedCatalogId || !catalogName.trim()}
              onClick={() =>
                upsertCatalogMutation.mutate({
                  id: selectedCatalogId,
                  commercialName: catalogName.trim(),
                  type: catalogType,
                  tier: catalogTier,
                  technicalProducts: catalogProducts
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                  suggestedDurationDays: catalogDuration ? Number(catalogDuration) : null,
                  priceBand: catalogPriceBand.trim() || null,
                  isActive: catalogIsActive,
                  enabledProfiles: (catalogEnabledProfiles.length > 0
                    ? catalogEnabledProfiles
                    : ['owner']) as Array<'owner' | 'agent' | 'agency'>,
                  shortCopy: catalogShortCopy.trim(),
                  surfaces: catalogSurfaces
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                  updatedAt: new Date().toISOString(),
                })
              }
            >
              {upsertCatalogMutation.isPending ? 'Guardando catálogo…' : 'Guardar producto'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-text-primary">Alertas operativas</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Por vencer (72h)</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{alerts.expiringSoon.length}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Pending activation</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{alerts.pendingActivation.length}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Pending payment</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{alerts.pendingPayment.length}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Vencidos</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{alerts.expired.length}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Tabla operativa de upgrades</h2>
          <span className="text-sm text-text-tertiary">{filteredRows.length} registros</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-tertiary">
                <th className="px-2 py-2">Referencia</th>
                <th className="px-2 py-2">Cliente</th>
                <th className="px-2 py-2">Producto</th>
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Canal</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2">Inicio</th>
                <th className="px-2 py-2">Fin</th>
                <th className="px-2 py-2">Vigencia</th>
                <th className="px-2 py-2">Performance</th>
                <th className="px-2 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="px-2 py-4 text-text-secondary" colSpan={11}>
                    No hay resultados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={`${row.purchaseType}-${row.id}`} className="border-b border-border/60">
                    <td className="px-2 py-3">
                      <p className="font-medium text-text-primary">{row.reference}</p>
                    </td>
                    <td className="px-2 py-3 text-text-secondary">{row.customer}</td>
                    <td className="px-2 py-3 text-text-secondary">{row.product}</td>
                    <td className="px-2 py-3 text-text-secondary">
                      {row.purchaseType === 'listing' ? 'Por aviso' : 'Por paquete'}
                    </td>
                    <td className="px-2 py-3 text-text-secondary">
                      {row.channel === 'online' ? 'Online' : 'On demand'}
                    </td>
                    <td className="px-2 py-3">
                      <Badge variant={statusBadgeVariant(row.status)}>
                        {portalUpgradeStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-text-secondary">{formatDateTime(row.startsAt)}</td>
                    <td className="px-2 py-3 text-text-secondary">{formatDateTime(row.endsAt)}</td>
                    <td className="px-2 py-3 text-text-secondary">
                      {row.status === 'active'
                        ? 'Activa'
                        : row.status === 'scheduled'
                          ? 'Programada'
                          : row.status === 'expired'
                            ? 'Vencida'
                            : 'En gestión'}
                    </td>
                    <td className="px-2 py-3 text-text-secondary">
                      {row.purchaseType === 'listing'
                        ? `${row.metrics.clicks}/${row.metrics.impressions} · ${formatPercent(
                            row.metrics.ctr
                          )}`
                        : '—'}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-2">
                        {row.purchaseType === 'listing' && row.listingId ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/propiedades/${row.listingId}`}>Ver detalle</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            Ver detalle
                          </Button>
                        )}
                        {(row.status === 'pending_activation' || row.status === 'pending_payment') ? (
                          <Button size="sm" variant="secondary">
                            Revisar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost">
                            Editar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h3 className="text-lg font-semibold text-text-primary">Registrar compra por aviso</h3>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Aviso</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
            >
              <option value="">Elegí un aviso</option>
              {(overview.data?.eligibleListings ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Producto</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
            >
              {listingCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.commercialName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="number"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="Duración (días)"
            />
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={listingChannel}
              onChange={(e) => setListingChannel(e.target.value as PortalUpgradeChannel)}
            >
              <option value="online">Online</option>
              <option value="on_demand">On demand</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={listingStatus}
              onChange={(e) => setListingStatus(e.target.value as (typeof PORTAL_UPGRADE_STATUSES)[number])}
            >
              <option value="initiated">Iniciado</option>
              <option value="pending_payment">Pendiente de pago</option>
              <option value="pending_activation">Pendiente de activación</option>
              <option value="active">Activo</option>
              <option value="scheduled">Programado</option>
            </select>
            <Input
              type="datetime-local"
              value={listingStartsAt}
              onChange={(e) => setListingStartsAt(e.target.value)}
            />
          </div>
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={listingNotes}
            onChange={(e) => setListingNotes(e.target.value)}
            placeholder="Nota interna opcional"
          />
          <Button
            disabled={listingUpgradeMutation.isPending || !listingId}
            onClick={() =>
              listingUpgradeMutation.mutate({
                listingId,
                packageId,
                durationDays: Number(durationDays || '0'),
                channel: listingChannel,
                status: listingStatus,
                startsAt: listingStartsAt ? new Date(listingStartsAt).toISOString() : undefined,
                notes: listingNotes.trim() || undefined,
              })
            }
          >
            {listingUpgradeMutation.isPending ? 'Guardando…' : 'Registrar upgrade por aviso'}
          </Button>
        </Card>

        <Card className="space-y-4 p-6">
          <h3 className="text-lg font-semibold text-text-primary">Registrar compra por paquete</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={packageCode}
              onChange={(e) => {
                setPackageCode(e.target.value)
                const selected = packageCatalog.find((item) => item.id === e.target.value)
                if (selected) setPackageName(selected.commercialName)
              }}
            >
              {packageCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.commercialName}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              max={1000}
              value={packageCredits}
              onChange={(e) => setPackageCredits(e.target.value)}
              placeholder="Créditos"
            />
          </div>
          <Input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Nombre comercial" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={packageChannel}
              onChange={(e) => setPackageChannel(e.target.value as PortalUpgradeChannel)}
            >
              <option value="online">Online</option>
              <option value="on_demand">On demand</option>
            </select>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={packageStatus}
              onChange={(e) => setPackageStatus(e.target.value as (typeof PORTAL_UPGRADE_STATUSES)[number])}
            >
              <option value="initiated">Iniciado</option>
              <option value="pending_payment">Pendiente de pago</option>
              <option value="pending_activation">Pendiente de activación</option>
              <option value="active">Activo</option>
            </select>
          </div>
          <Button
            disabled={packagePurchaseMutation.isPending}
            onClick={() =>
              packagePurchaseMutation.mutate({
                packageCode,
                packageName,
                creditsTotal: Number(packageCredits || '0'),
                channel: packageChannel,
                status: packageStatus,
              })
            }
          >
            {packagePurchaseMutation.isPending ? 'Guardando…' : 'Registrar paquete'}
          </Button>
        </Card>
      </div>
    </div>
  )
}
