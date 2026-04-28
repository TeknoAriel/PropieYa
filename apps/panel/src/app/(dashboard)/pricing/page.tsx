'use client'

import { useEffect, useMemo, useState } from 'react'

import { formatTrpcUserMessage, type PortalCommercialPromotionDiscountType } from '@propieya/shared'
import { Badge, Button, Card, Input } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

type DiscountType = PortalCommercialPromotionDiscountType

export default function PricingPage() {
  const utils = trpc.useUtils()
  const overview = trpc.listing.upgradesOverview.useQuery()

  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [duration, setDuration] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [channels, setChannels] = useState<Array<'online' | 'on_demand'>>(['online', 'on_demand'])
  const [ownerPrice, setOwnerPrice] = useState('')
  const [agentPrice, setAgentPrice] = useState('')
  const [agencyPrice, setAgencyPrice] = useState('')
  const [priceBand, setPriceBand] = useState('')
  const [promoName, setPromoName] = useState('')
  const [promoDiscountType, setPromoDiscountType] = useState<DiscountType>('percent')
  const [promoDiscountValue, setPromoDiscountValue] = useState('')
  const [promoStartsAt, setPromoStartsAt] = useState('')
  const [promoEndsAt, setPromoEndsAt] = useState('')
  const [promoActive, setPromoActive] = useState(true)
  const [error, setError] = useState('')

  const upsertCatalogMutation = trpc.listing.upsertCommercialCatalogItem.useMutation({
    onSuccess: () => {
      setError('')
      void utils.listing.upgradesOverview.invalidate()
    },
    onError: (err) => setError(formatTrpcUserMessage(err) || 'No se pudo guardar el pricing.'),
  })

  const catalog = useMemo(() => overview.data?.commercialCatalog ?? [], [overview.data?.commercialCatalog])

  useEffect(() => {
    if (!selectedId && catalog.length > 0) setSelectedId(catalog[0]!.id)
  }, [selectedId, catalog])

  const selected = useMemo(() => catalog.find((item) => item.id === selectedId) ?? null, [catalog, selectedId])

  useEffect(() => {
    if (!selected) return
    setName(selected.commercialName)
    setBasePrice(selected.basePriceAmount != null ? String(selected.basePriceAmount) : '')
    setCurrency(selected.currency)
    setDuration(selected.suggestedDurationDays != null ? String(selected.suggestedDurationDays) : '')
    setIsActive(selected.isActive)
    setChannels(selected.enabledChannels)
    setOwnerPrice(selected.profilePrices.owner != null ? String(selected.profilePrices.owner) : '')
    setAgentPrice(selected.profilePrices.agent != null ? String(selected.profilePrices.agent) : '')
    setAgencyPrice(selected.profilePrices.agency != null ? String(selected.profilePrices.agency) : '')
    setPriceBand(selected.priceBand ?? '')
    const promo = selected.promotions[0]
    setPromoName(promo?.name ?? '')
    setPromoDiscountType(promo?.discountType ?? 'percent')
    setPromoDiscountValue(promo ? String(promo.discountValue) : '')
    setPromoStartsAt(promo?.startsAt ? promo.startsAt.slice(0, 16) : '')
    setPromoEndsAt(promo?.endsAt ? promo.endsAt.slice(0, 16) : '')
    setPromoActive(promo?.isActive ?? true)
  }, [selected])

  if (overview.isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">Pricing y promociones</h1>
        <p className="text-text-secondary">Cargando catálogo comercial…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Pricing y promociones</h1>
        <p className="text-text-secondary">
          Administrá precios base, descuentos, vigencias y reglas por perfil/canal.
        </p>
      </div>

      {error ? (
        <Card className="border-semantic-error/30 bg-semantic-error/10 p-4 text-sm text-semantic-error">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-text-primary">Catálogo con pricing</h2>
          <div className="mt-3 space-y-2">
            {catalog.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`w-full rounded-md border px-3 py-2 text-left ${selectedId === item.id ? 'border-brand-primary bg-brand-primary/5' : 'border-border'}`}
                onClick={() => setSelectedId(item.id)}
              >
                <p className="font-medium text-text-primary">{item.commercialName}</p>
                <p className="text-xs text-text-tertiary">
                  {item.currency} {item.basePriceAmount ?? 'sin precio'} · {item.type}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="text-lg font-semibold text-text-primary">Reglas comerciales</h2>
          {!selected ? (
            <p className="text-sm text-text-secondary">Seleccioná un producto para editar pricing.</p>
          ) : (
            <>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre comercial" />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="Precio base"
                />
                <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="Moneda" />
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Duración"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  min={0}
                  value={ownerPrice}
                  onChange={(e) => setOwnerPrice(e.target.value)}
                  placeholder="Precio owner"
                />
                <Input
                  type="number"
                  min={0}
                  value={agentPrice}
                  onChange={(e) => setAgentPrice(e.target.value)}
                  placeholder="Precio agent"
                />
                <Input
                  type="number"
                  min={0}
                  value={agencyPrice}
                  onChange={(e) => setAgencyPrice(e.target.value)}
                  placeholder="Precio agency"
                />
              </div>

              <Input value={priceBand} onChange={(e) => setPriceBand(e.target.value)} placeholder="Banda/comentario de precio" />

              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channels.includes('online')}
                    onChange={(e) =>
                      setChannels((current) =>
                        e.target.checked
                          ? Array.from(new Set([...current, 'online']))
                          : current.filter((c) => c !== 'online')
                      )
                    }
                  />
                  Canal online
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channels.includes('on_demand')}
                    onChange={(e) =>
                      setChannels((current) =>
                        e.target.checked
                          ? Array.from(new Set([...current, 'on_demand']))
                          : current.filter((c) => c !== 'on_demand')
                      )
                    }
                  />
                  Canal on demand
                </label>
                <label className="ml-auto flex items-center gap-2">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Oferta activa
                </label>
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="text-sm font-medium text-text-primary">Promoción principal</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Input value={promoName} onChange={(e) => setPromoName(e.target.value)} placeholder="Nombre promo" />
                  <select
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={promoDiscountType}
                    onChange={(e) => setPromoDiscountType(e.target.value as DiscountType)}
                  >
                    <option value="percent">Descuento %</option>
                    <option value="fixed">Descuento fijo</option>
                  </select>
                  <Input
                    type="number"
                    min={0}
                    value={promoDiscountValue}
                    onChange={(e) => setPromoDiscountValue(e.target.value)}
                    placeholder={promoDiscountType === 'percent' ? 'Ej: 60 (= paga 40%)' : 'Monto descuento'}
                  />
                  <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <input type="checkbox" checked={promoActive} onChange={(e) => setPromoActive(e.target.checked)} />
                    Promo activa
                  </label>
                  <Input type="datetime-local" value={promoStartsAt} onChange={(e) => setPromoStartsAt(e.target.value)} />
                  <Input type="datetime-local" value={promoEndsAt} onChange={(e) => setPromoEndsAt(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? 'Producto activo' : 'Producto inactivo'}
                </Badge>
                {promoName && promoDiscountValue ? (
                  <Badge variant={promoActive ? 'default' : 'secondary'}>
                    Promo {promoDiscountType === 'percent' ? `${promoDiscountValue}%` : `${currency} ${promoDiscountValue}`}
                  </Badge>
                ) : null}
              </div>

              <Button
                disabled={upsertCatalogMutation.isPending || !selectedId || !name.trim()}
                onClick={() =>
                  upsertCatalogMutation.mutate({
                    ...selected,
                    id: selectedId,
                    commercialName: name.trim(),
                    suggestedDurationDays: duration ? Number(duration) : null,
                    priceBand: priceBand.trim() || null,
                    basePriceAmount: basePrice ? Number(basePrice) : null,
                    currency: currency.trim() || 'USD',
                    profilePrices: {
                      owner: ownerPrice ? Number(ownerPrice) : null,
                      agent: agentPrice ? Number(agentPrice) : null,
                      agency: agencyPrice ? Number(agencyPrice) : null,
                    },
                    enabledChannels: channels.length > 0 ? channels : ['on_demand'],
                    isActive,
                    promotions:
                      promoName.trim() && promoDiscountValue
                        ? [
                            {
                              id: `${selectedId}_promo`,
                              name: promoName.trim(),
                              discountType: promoDiscountType,
                              discountValue: Number(promoDiscountValue),
                              isActive: promoActive,
                              startsAt: promoStartsAt ? new Date(promoStartsAt).toISOString() : null,
                              endsAt: promoEndsAt ? new Date(promoEndsAt).toISOString() : null,
                              enabledProfiles: selected.enabledProfiles,
                              enabledChannels: channels.length > 0 ? channels : ['on_demand'],
                              notes: null,
                            },
                          ]
                        : [],
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                {upsertCatalogMutation.isPending ? 'Guardando pricing…' : 'Guardar pricing y promoción'}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
