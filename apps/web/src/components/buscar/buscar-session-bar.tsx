'use client'

import { forwardRef, useState } from 'react'

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Card,
  Search,
} from '@propieya/ui'
import {
  formatPrice,
  OPERATION_TYPE_LABELS,
  PORTAL_SEARCH_UX_COPY as S,
  PROPERTY_TYPE_LABELS,
  type OperationType,
  type PropertyType,
} from '@propieya/shared'

export type BuscarSessionBarProps = {
  opLocked: boolean
  forcedOperation?: 'sale' | 'rent'
  operationType: OperationType | ''
  city: string
  neighborhood: string
  propertyType: PropertyType | ''
  propertyOptions: { value: PropertyType; label: string }[]
  minPrice: string
  maxPrice: string
  minBedrooms: string
  /** Solo muta URL; el efecto de /buscar sincroniza el estado. */
  applyUrlParams: (mutate: (p: URLSearchParams) => void) => void
  onOpenLocalityModal: () => void
  onClearSearch: () => void
}

const OPS: OperationType[] = ['sale', 'rent', 'temporary_rent']

function opLabel(
  opLocked: boolean,
  forced: 'sale' | 'rent' | undefined,
  operationType: OperationType | ''
) {
  if (opLocked && forced) return OPERATION_TYPE_LABELS[forced]
  const op = operationType
  if (!op) return S.searchV2ChipAny
  return OPERATION_TYPE_LABELS[op] ?? op
}

function locationLabel(city: string, neighborhood: string) {
  const c = city.trim()
  const n = neighborhood.trim()
  if (n && c) return `${n}, ${c}`
  if (n) return n
  if (c) return c
  return S.searchV2ChipAny
}

function priceLabel(minPrice: string, maxPrice: string) {
  const nMin = Number(minPrice)
  const nMax = Number(maxPrice)
  const hasMin = minPrice !== '' && Number.isFinite(nMin)
  const hasMax = maxPrice !== '' && Number.isFinite(nMax)
  if (!hasMin && !hasMax) return S.searchV2ChipAny
  if (hasMin && hasMax)
    return `${formatPrice(nMin, 'ARS')} — ${formatPrice(nMax, 'ARS')}`
  if (hasMax) return `≤ ${formatPrice(nMax, 'ARS')}`
  return `≥ ${formatPrice(nMin, 'ARS')}`
}

function tipoLabel(propertyType: PropertyType | '') {
  if (!propertyType) return S.searchV2ChipAny
  return PROPERTY_TYPE_LABELS[propertyType] ?? propertyType
}

function dormLabel(minBedrooms: string) {
  if (!minBedrooms.trim()) return S.searchV2ChipAny
  const n = Number(minBedrooms)
  if (!Number.isFinite(n)) return S.searchV2ChipAny
  if (n >= 4) return '4+ dorm.'
  return `${Math.floor(n)}+ dorm.`
}

const DORM_OPTS: { value: string; label: string }[] = [
  { value: '', label: S.searchV2ChipAny },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
]

const ChipTrigger = forwardRef<
  HTMLButtonElement,
  { kicker: string; value: string }
>(function ChipTrigger({ kicker, value }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      className="h-auto max-w-[min(100%,14rem)] flex-col items-start gap-0 rounded-full border-border/50 px-2.5 py-1 text-left transition-transform active:scale-[0.98]"
    >
      <span className="text-[9px] font-medium uppercase tracking-wide text-text-tertiary">
        {kicker}
      </span>
      <span className="w-full truncate text-xs font-medium text-text-primary">
        {value}
      </span>
    </Button>
  )
})

export function BuscarSessionBar({
  opLocked,
  forcedOperation,
  operationType,
  city,
  neighborhood,
  propertyType,
  propertyOptions,
  minPrice,
  maxPrice,
  minBedrooms,
  applyUrlParams,
  onOpenLocalityModal,
  onClearSearch,
}: BuscarSessionBarProps) {
  const [draftCity, setDraftCity] = useState(city)
  const [draftNb, setDraftNb] = useState(neighborhood)
  const [draftMin, setDraftMin] = useState(minPrice)
  const [draftMax, setDraftMax] = useState(maxPrice)

  return (
    <Card className="border-border/30 bg-transparent p-2.5 shadow-none sm:p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-text-tertiary">
            <Search className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
            {S.searchV2SessionBarTitle}
          </p>
          <p className="text-[11px] leading-snug text-text-tertiary">{S.searchV2SessionBarHint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 self-start px-2 text-[11px] transition-transform active:scale-[0.98] sm:self-center"
          onClick={onClearSearch}
        >
          {S.buscarClearSearch}
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {opLocked ? (
          <Badge variant="secondary" className="h-auto rounded-full px-2.5 py-1 text-xs font-normal">
            <span className="mr-1 text-[9px] uppercase text-text-tertiary">
              {S.searchV2ChipOperation}
            </span>
            {opLabel(true, forcedOperation, operationType)}
          </Badge>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ChipTrigger
                kicker={S.searchV2ChipOperation}
                value={opLabel(false, forcedOperation, operationType)}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>{S.searchV2ChipOperation}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  applyUrlParams((p) => {
                    p.delete('op')
                  })
                }
              >
                {S.searchV2ChipAny}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {OPS.map((op) => (
                <DropdownMenuItem
                  key={op}
                  onClick={() =>
                    applyUrlParams((p) => {
                      p.set('op', op)
                    })
                  }
                >
                  {OPERATION_TYPE_LABELS[op]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              setDraftCity(city)
              setDraftNb(neighborhood)
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <ChipTrigger
              kicker={S.searchV2ChipLocation}
              value={locationLabel(city, neighborhood)}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 p-3">
            <DropdownMenuLabel className="px-0">
              {S.searchV2ChipLocation}
            </DropdownMenuLabel>
            <div className="mt-2 space-y-2">
              <Input
                placeholder="Ciudad"
                value={draftCity}
                onChange={(e) => setDraftCity(e.target.value)}
              />
              <Input
                placeholder="Barrio"
                value={draftNb}
                onChange={(e) => setDraftNb(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="transition-transform active:scale-[0.98]"
                  onClick={() =>
                    applyUrlParams((p) => {
                      const c = draftCity.trim()
                      const n = draftNb.trim()
                      if (c) p.set('ciudad', c)
                      else p.delete('ciudad')
                      if (n) p.set('barrio', n)
                      else p.delete('barrio')
                    })
                  }
                >
                  {S.searchV2ChipApply}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="transition-transform active:scale-[0.98]"
                  onClick={onOpenLocalityModal}
                >
                  {S.searchV2ChipCatalog}
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ChipTrigger kicker={S.searchV2ChipType} value={tipoLabel(propertyType)} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{S.searchV2ChipType}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                applyUrlParams((p) => {
                  p.delete('tipo')
                })
              }
            >
              {S.searchV2ChipAny}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {propertyOptions.map((o) => (
              <DropdownMenuItem
                key={o.value}
                onClick={() =>
                  applyUrlParams((p) => {
                    p.set('tipo', o.value)
                  })
                }
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              setDraftMin(minPrice)
              setDraftMax(maxPrice)
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <ChipTrigger kicker={S.searchV2ChipPrice} value={priceLabel(minPrice, maxPrice)} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 p-3">
            <DropdownMenuLabel className="px-0">{S.searchV2ChipPrice}</DropdownMenuLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={0}
                placeholder="Mín"
                value={draftMin}
                onChange={(e) => setDraftMin(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                placeholder="Máx"
                value={draftMax}
                onChange={(e) => setDraftMax(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full transition-transform active:scale-[0.98]"
              onClick={() =>
                applyUrlParams((p) => {
                  const a = draftMin.trim()
                  const b = draftMax.trim()
                  if (a) p.set('min', a)
                  else p.delete('min')
                  if (b) p.set('max', b)
                  else p.delete('max')
                })
              }
            >
              {S.searchV2ChipApply}
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ChipTrigger
              kicker={S.searchV2ChipBedrooms}
              value={dormLabel(minBedrooms)}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>{S.searchV2ChipBedrooms}</DropdownMenuLabel>
            {DORM_OPTS.map((o) => (
              <DropdownMenuItem
                key={o.value || 'any'}
                onClick={() =>
                  applyUrlParams((p) => {
                    if (o.value) p.set('dorm', o.value)
                    else p.delete('dorm')
                  })
                }
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
