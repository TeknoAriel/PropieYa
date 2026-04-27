'use client'

import { useMemo, useState } from 'react'

import {
  formatTrpcUserMessage,
  portalUpgradeStatusLabel,
  PORTAL_UPGRADE_CHANNELS,
  PORTAL_UPGRADE_STATUSES,
} from '@propieya/shared'
import type { PortalUpgradeStatus } from '@propieya/shared'
import { Badge, Button, Card, Input } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

function statusBadgeVariant(status: PortalUpgradeStatus): 'default' | 'secondary' | 'error' {
  if (status === 'active') return 'default'
  if (status === 'expired' || status === 'cancelled') return 'error'
  return 'secondary'
}

export default function UpgradesPage() {
  const [listingId, setListingId] = useState('')
  const [packageId, setPackageId] = useState('destacado_simple')
  const [durationDays, setDurationDays] = useState('15')
  const [listingChannel, setListingChannel] = useState<(typeof PORTAL_UPGRADE_CHANNELS)[number]>('on_demand')
  const [listingStatus, setListingStatus] = useState<(typeof PORTAL_UPGRADE_STATUSES)[number]>('pending_activation')
  const [listingStartsAt, setListingStartsAt] = useState('')
  const [listingNotes, setListingNotes] = useState('')
  const [packageCode, setPackageCode] = useState<'pack_5' | 'pack_10' | 'pack_25'>('pack_5')
  const [packageName, setPackageName] = useState('Pack visibilidad')
  const [packageCredits, setPackageCredits] = useState('5')
  const [packageChannel, setPackageChannel] = useState<(typeof PORTAL_UPGRADE_CHANNELS)[number]>('on_demand')
  const [packageStatus, setPackageStatus] = useState<(typeof PORTAL_UPGRADE_STATUSES)[number]>('pending_activation')
  const [packageError, setPackageError] = useState('')

  const utils = trpc.useUtils()
  const overview = trpc.listing.upgradesOverview.useQuery()

  const listingUpgradeMutation = trpc.listing.createListingUpgrade.useMutation({
    onSuccess: () => {
      setPackageError('')
      void utils.listing.upgradesOverview.invalidate()
    },
    onError: (err) => setPackageError(formatTrpcUserMessage(err) || 'No se pudo crear el upgrade por aviso.'),
  })
  const packagePurchaseMutation = trpc.listing.createPackageUpgradePurchase.useMutation({
    onSuccess: () => {
      setPackageError('')
      void utils.listing.upgradesOverview.invalidate()
    },
    onError: (err) => setPackageError(formatTrpcUserMessage(err) || 'No se pudo registrar el paquete.'),
  })

  const listingsById = useMemo(
    () => new Map((overview.data?.eligibleListings ?? []).map((l) => [l.id, l])),
    [overview.data?.eligibleListings]
  )

  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Upgrades comerciales</h1>
        <p className="text-text-secondary">Cargando información operativa…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Upgrades comerciales</h1>
        <p className="text-text-secondary">
          Comprá por aviso o por paquete. Podés operar online o en modo on demand sin activar
          pasarela compleja.
        </p>
      </div>

      {!overview.data?.canPurchase ? (
        <Card className="p-6">
          <p className="text-text-secondary">
            {overview.data?.reason ?? 'Esta cuenta todavía no está habilitada para upgrades.'}
          </p>
        </Card>
      ) : null}

      {packageError ? (
        <Card className="border-semantic-error/30 bg-semantic-error/10 p-4 text-sm text-semantic-error">
          {packageError}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-text-primary">Compra por aviso</h2>
          <p className="text-sm text-text-secondary">
            Mejorá la visibilidad de un aviso puntual con activación inmediata, programada o manual.
          </p>
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
              {(overview.data?.availableCommercialPackages ?? [])
                .filter((p) => p.id !== 'none')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.commercialName}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Duración (días)</label>
              <Input
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Canal</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={listingChannel}
                onChange={(e) =>
                  setListingChannel(e.target.value as (typeof PORTAL_UPGRADE_CHANNELS)[number])
                }
              >
                <option value="online">Online</option>
                <option value="on_demand">On demand / comercial</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Estado inicial</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={listingStatus}
                onChange={(e) =>
                  setListingStatus(e.target.value as (typeof PORTAL_UPGRADE_STATUSES)[number])
                }
              >
                <option value="initiated">Iniciado</option>
                <option value="pending_payment">Pendiente de pago</option>
                <option value="pending_activation">Pendiente de activación</option>
                <option value="active">Activo</option>
                <option value="scheduled">Programado</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Inicio (opcional)</label>
              <Input
                type="datetime-local"
                value={listingStartsAt}
                onChange={(e) => setListingStartsAt(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Nota interna</label>
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={listingNotes}
              onChange={(e) => setListingNotes(e.target.value)}
              placeholder="Ej: cierre telefónico, referencia comercial, observación interna."
            />
          </div>
          <Button
            disabled={listingUpgradeMutation.isPending || !listingId}
            onClick={() =>
              listingUpgradeMutation.mutate({
                listingId,
                packageId: packageId as
                  | 'destacado_simple'
                  | 'impulso'
                  | 'ficha_premium'
                  | 'prioridad_zona'
                  | 'combo_impulso_zona'
                  | 'combo_premium_zona',
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
          <h2 className="text-lg font-semibold text-text-primary">Compra por paquete</h2>
          <p className="text-sm text-text-secondary">
            Registrá packs de activaciones o créditos mensuales para consumir en avisos.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Código</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={packageCode}
                onChange={(e) => setPackageCode(e.target.value as 'pack_5' | 'pack_10' | 'pack_25')}
              >
                <option value="pack_5">Pack 5</option>
                <option value="pack_10">Pack 10</option>
                <option value="pack_25">Pack 25</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Créditos</label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={packageCredits}
                onChange={(e) => setPackageCredits(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Nombre comercial</label>
            <Input value={packageName} onChange={(e) => setPackageName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Canal</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={packageChannel}
                onChange={(e) =>
                  setPackageChannel(e.target.value as (typeof PORTAL_UPGRADE_CHANNELS)[number])
                }
              >
                <option value="online">Online</option>
                <option value="on_demand">On demand / comercial</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Estado</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={packageStatus}
                onChange={(e) =>
                  setPackageStatus(e.target.value as (typeof PORTAL_UPGRADE_STATUSES)[number])
                }
              >
                <option value="initiated">Iniciado</option>
                <option value="pending_payment">Pendiente de pago</option>
                <option value="pending_activation">Pendiente de activación</option>
                <option value="active">Activo</option>
              </select>
            </div>
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary">Upgrades por aviso</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Historial operativo de mejoras de visibilidad por aviso.
        </p>
        <div className="mt-4 space-y-2">
          {(overview.data?.listingUpgrades ?? []).length === 0 ? (
            <p className="text-sm text-text-secondary">Todavía no hay upgrades por aviso.</p>
          ) : (
            overview.data?.listingUpgrades.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-text-primary">
                    {listingsById.get(u.listingId ?? '')?.title ?? 'Aviso'}
                  </p>
                  <p className="text-text-secondary">
                    {u.packageId} · {u.channel === 'online' ? 'Online' : 'On demand'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadgeVariant(u.status)}>{portalUpgradeStatusLabel(u.status)}</Badge>
                  <span className="text-xs text-text-tertiary">
                    {u.endsAt ? `Vence ${new Date(u.endsAt).toLocaleDateString('es-AR')}` : 'Sin fin'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary">Paquetes de créditos</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Compras de paquete para consumo futuro en upgrades por aviso.
        </p>
        <div className="mt-4 space-y-2">
          {(overview.data?.packagePurchases ?? []).length === 0 ? (
            <p className="text-sm text-text-secondary">Todavía no hay paquetes registrados.</p>
          ) : (
            overview.data?.packagePurchases.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-text-primary">{p.packageName}</p>
                  <p className="text-text-secondary">
                    {p.channel === 'online' ? 'Online' : 'On demand'} · {p.creditsRemaining}/
                    {p.creditsTotal} créditos
                  </p>
                </div>
                <Badge variant={statusBadgeVariant(p.status)}>{portalUpgradeStatusLabel(p.status)}</Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
