'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  buildPortalCompareUrl,
  PORTAL_COMPARE_COPY as C,
  formatPrice,
  formatSurface,
  OPERATION_TYPE_LABELS,
} from '@propieya/shared'
import type { Currency, OperationType, PropertyType } from '@propieya/shared'
import { Button, Card, Skeleton } from '@propieya/ui'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import {
  readCompareIds,
  removeCompareId,
  writeCompareIds,
} from '@/lib/compare-listings-storage'
import { trpc } from '@/lib/trpc'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseIdsParam(raw: string | null): string[] {
  if (!raw || !raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 3)
}

function pricePerSquareMeter(
  priceAmount: number | null,
  surfaceTotal: number | null
): number | null {
  if (
    priceAmount == null ||
    surfaceTotal == null ||
    !Number.isFinite(priceAmount) ||
    !Number.isFinite(surfaceTotal) ||
    surfaceTotal <= 0
  ) {
    return null
  }
  return priceAmount / surfaceTotal
}

function CompararContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ids, setIds] = useState<string[]>([])
  const viewLoggedRef = useRef<string>('')
  const { mutate: mutateCompareView } = trpc.listing.recordCompareView.useMutation()

  useEffect(() => {
    const fromUrl = parseIdsParam(searchParams.get('ids'))
    if (fromUrl.length >= 2) {
      writeCompareIds(fromUrl)
      setIds(fromUrl)
      return
    }
    setIds(readCompareIds())
  }, [searchParams])

  useEffect(() => {
    if (ids.length < 2) return
    const slice = ids.slice(0, 3)
    const key = [...slice].sort().join(',')
    if (viewLoggedRef.current === key) return
    viewLoggedRef.current = key
    mutateCompareView(
      { listingIds: slice },
      {
        onError: () => {
          /* telemetría best-effort */
        },
      }
    )
  }, [ids, mutateCompareView])

  const enabled = ids.length >= 2
  const { data = [], isLoading, isError } = trpc.listing.getComparePublic.useQuery(
    { ids: ids.slice(0, 3) },
    { enabled }
  )

  const rows = useMemo(() => data, [data])

  const dropFromCompare = (id: string) => {
    removeCompareId(id)
    const next = ids.filter((x) => x !== id)
    setIds(next)
    if (next.length >= 2) {
      router.replace(buildPortalCompareUrl(next))
    } else {
      router.replace('/comparar')
    }
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
          {C.pageTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary md:text-base">
          {C.pageSubtitle}
        </p>
      </div>

      {!enabled ? (
        <Card className="p-6">
          <p className="text-sm text-text-secondary">{C.compareNeedTwo}</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/buscar">Ir al buscador</Link>
          </Button>
        </Card>
      ) : isLoading ? (
        <Card className="overflow-x-auto p-4">
          <Skeleton className="h-64 w-full min-w-[600px]" />
        </Card>
      ) : isError ? (
        <Card className="p-6">
          <p className="text-sm text-text-secondary">No pudimos cargar la comparación.</p>
        </Card>
      ) : rows.length < 2 ? (
        <Card className="p-6 space-y-3">
          <p className="text-sm text-text-secondary">{C.compareTooFewLoaded}</p>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/buscar">Ir al buscador</Link>
          </Button>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/40 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-3">{C.tableProperty}</th>
                <th className="px-4 py-3">{C.tablePrice}</th>
                <th className="px-4 py-3">{C.tablePricePerM2}</th>
                <th className="px-4 py-3">{C.tableSurface}</th>
                <th className="px-4 py-3">{C.tableRooms}</th>
                <th className="px-4 py-3">{C.tableBaths}</th>
                <th className="px-4 py-3">{C.tableGarages}</th>
                <th className="px-4 py-3">{C.tableExpenses}</th>
                <th className="px-4 py-3">{C.tableZone}</th>
                <th className="px-4 py-3">{C.tableAction}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const op = row.operationType as OperationType
                const addr = row.address as { neighborhood?: string; city?: string } | null
                const neighborhood = addr?.neighborhood ?? '—'
                const city = addr?.city ?? '—'
                const img =
                  row.primaryImageUrl ||
                  'https://placehold.co/120x80/e0ddd8/666660?text=+'
                const ppm2 = pricePerSquareMeter(
                  row.priceAmount,
                  row.surfaceTotal
                )
                const expCur = (row.expensesCurrency as Currency | null) ?? 'ARS'
                const expensesLabel =
                  row.expenses != null
                    ? formatPrice(row.expenses, expCur, { compact: true })
                    : '—'
                return (
                  <tr key={row.id} className="border-b border-border/80 align-top">
                    <td className="px-4 py-4">
                      <div className="flex max-w-[220px] gap-3">
                        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
                          <Image
                            src={img}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="96px"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary line-clamp-2">
                            {row.title}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {OPERATION_TYPE_LABELS[op] ?? op} ·{' '}
                            {(row.propertyType as PropertyType) ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-brand-primary whitespace-nowrap">
                      {formatPrice(row.priceAmount, row.priceCurrency as Currency)}
                    </td>
                    <td className="px-4 py-4 text-text-secondary whitespace-nowrap text-xs">
                      {ppm2 != null
                        ? formatPrice(ppm2, row.priceCurrency as Currency, {
                            compact: true,
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                      {formatSurface(row.surfaceTotal)}
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {row.bedrooms ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {row.bathrooms ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {row.garages ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-text-secondary whitespace-nowrap text-xs">
                      {expensesLabel}
                    </td>
                    <td className="px-4 py-4 text-text-secondary">
                      {neighborhood}, {city}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link href={`/propiedad/${row.id}`}>
                            {C.viewListing}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-text-secondary"
                          onClick={() => dropFromCompare(row.id)}
                        >
                          {C.removeFromCompare}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

export default function CompararPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="container mx-auto px-4 py-10">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="mt-4 h-48 w-full" />
            </div>
          }
        >
          <CompararContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
