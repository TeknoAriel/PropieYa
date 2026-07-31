'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

import { Button, Input, Label } from '@propieya/ui'
import {
  PORTAL_LANDING_QUICK_CITIES_ARGENTINA,
  PORTAL_SEARCH_UX_COPY,
} from '@propieya/shared'

export function DevelopmentFiltersBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const ciudad = searchParams.get('ciudad') ?? ''
  const operationType = searchParams.get('operacion') ?? ''
  const minPrice = searchParams.get('precioMin') ?? ''
  const maxPrice = searchParams.get('precioMax') ?? ''
  const minBedrooms = searchParams.get('ambientes') ?? ''
  const entrega = searchParams.get('entrega') ?? ''

  const apply = useCallback(
    (form: FormData) => {
      const params = new URLSearchParams()
      const c = String(form.get('ciudad') ?? '').trim()
      const op = String(form.get('operacion') ?? '').trim()
      const pMin = String(form.get('precioMin') ?? '').trim()
      const pMax = String(form.get('precioMax') ?? '').trim()
      const amb = String(form.get('ambientes') ?? '').trim()
      const ent = String(form.get('entrega') ?? '').trim()
      if (c) params.set('ciudad', c)
      if (op) params.set('operacion', op)
      if (pMin) params.set('precioMin', pMin)
      if (pMax) params.set('precioMax', pMax)
      if (amb) params.set('ambientes', amb)
      if (ent === 'pozo' || ent === 'proxima') params.set('entrega', ent)
      const qs = params.toString()
      startTransition(() => {
        router.push(qs ? `/emprendimientos?${qs}` : '/emprendimientos')
      })
    },
    [router]
  )

  const hasFilters = Boolean(
    ciudad || operationType || minPrice || maxPrice || minBedrooms || entrega
  )

  return (
    <div className="border-b border-border/20 bg-surface-secondary/40">
      <div className="container mx-auto space-y-4 px-4 py-4">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7 lg:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            apply(new FormData(e.currentTarget))
          }}
        >
          <div className="space-y-1 lg:col-span-2">
            <Label htmlFor="dev-ciudad">Ciudad</Label>
            <Input
              id="dev-ciudad"
              name="ciudad"
              defaultValue={ciudad}
              placeholder="Ej. Rosario"
              list="dev-ciudades"
            />
            <datalist id="dev-ciudades">
              {PORTAL_LANDING_QUICK_CITIES_ARGENTINA.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dev-operacion">Operación</Label>
            <select
              id="dev-operacion"
              name="operacion"
              defaultValue={operationType}
              className="flex h-10 w-full rounded-md border border-border/50 bg-surface-primary px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="sale">Venta</option>
              <option value="rent">Alquiler</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dev-entrega">Entrega</Label>
            <select
              id="dev-entrega"
              name="entrega"
              defaultValue={entrega}
              className="flex h-10 w-full rounded-md border border-border/50 bg-surface-primary px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="pozo">En pozo / obra</option>
              <option value="proxima">Entrega próxima</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dev-precioMin">Precio desde</Label>
            <Input
              id="dev-precioMin"
              name="precioMin"
              type="number"
              min={0}
              defaultValue={minPrice}
              placeholder="USD"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dev-precioMax">Precio hasta</Label>
            <Input
              id="dev-precioMax"
              name="precioMax"
              type="number"
              min={0}
              defaultValue={maxPrice}
              placeholder="USD"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dev-ambientes">Mín. ambientes</Label>
            <Input
              id="dev-ambientes"
              name="ambientes"
              type="number"
              min={0}
              defaultValue={minBedrooms}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-7">
            <Button type="submit" disabled={pending}>
              {pending ? 'Buscando…' : 'Filtrar'}
            </Button>
            {hasFilters ? (
              <Button type="button" variant="outline" asChild>
                <Link href="/emprendimientos">Limpiar</Link>
              </Button>
            ) : null}
          </div>
        </form>

        {!ciudad ? (
          <nav
            className="flex flex-wrap gap-2"
            aria-label={PORTAL_SEARCH_UX_COPY.landingQuickCitiesAriaLabel}
          >
            {PORTAL_LANDING_QUICK_CITIES_ARGENTINA.map((city) => (
              <Link
                key={city}
                href={`/emprendimientos?ciudad=${encodeURIComponent(city)}`}
                className="rounded-full border border-border/40 bg-surface-primary px-3 py-1 text-xs font-medium text-text-primary transition-colors hover:border-brand-primary/35"
              >
                {city}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  )
}
