'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button, Input, ArrowRight, Filter } from '@propieya/ui'

import { getPortalPack } from '@/lib/portal-copy'
import { trpc } from '@/lib/trpc'

function buildBuscarUrl(filters: {
  q?: string
  operationType?: string
  propertyType?: string
  city?: string
  neighborhood?: string
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  minSurface?: number
}): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.operationType) params.set('op', filters.operationType)
  if (filters.propertyType) params.set('tipo', filters.propertyType)
  if (filters.city) params.set('ciudad', filters.city)
  if (filters.neighborhood) params.set('barrio', filters.neighborhood)
  if (filters.minPrice != null) params.set('min', String(filters.minPrice))
  if (filters.maxPrice != null) params.set('max', String(filters.maxPrice))
  if (filters.minBedrooms != null) params.set('dorm', String(filters.minBedrooms))
  if (filters.minSurface != null) params.set('sup', String(filters.minSurface))
  return `/buscar?${params.toString()}`
}

const PLACEHOLDER_ROTATE_MS = 5500

export function HeroSearch() {
  const pack = getPortalPack()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [exampleIdx, setExampleIdx] = useState(0)

  const examples = pack.heroExamples
  const hasExamples = examples.length > 0

  useEffect(() => {
    if (examples.length <= 1) return
    const id = window.setInterval(() => {
      setExampleIdx((i) => (i + 1) % examples.length)
    }, PLACEHOLDER_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [examples.length])

  const placeholder = hasExamples
    ? `Ej: ${examples[exampleIdx] ?? ''}`
    : pack.hero.placeholder

  const searchConversational = trpc.listing.searchConversational.useMutation({
    onSuccess: (data) => {
      const url = buildBuscarUrl(data.filters)
      router.push(url)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    searchConversational.mutate({ message: query.trim() })
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-secondary to-surface-primary py-10 pb-10 md:py-11 md:pb-11 lg:py-12 lg:pb-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-secondary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-primary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-[1.75rem] md:text-4xl lg:text-[2.35rem] lg:leading-tight">
            {pack.hero.line1}
            <br />
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <p className="mt-3 text-base leading-relaxed text-text-secondary md:mt-4 md:text-lg">
            {pack.hero.subtitle}
          </p>

          <div className="mt-5 md:mt-6">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  disabled={searchConversational.isPending}
                  className="h-14 pl-5 pr-14 text-base md:text-lg rounded-2xl border-2 border-border bg-surface-primary/90 shadow-md placeholder:text-text-tertiary placeholder:text-[13px] md:placeholder:text-sm focus-visible:ring-brand-primary"
                  aria-label={pack.hero.placeholder}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={searchConversational.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
                  aria-label="Buscar"
                >
                  {searchConversational.isPending ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {searchConversational.isError ? (
                <p className="mt-2 text-sm text-red-600">
                  {searchConversational.error.message}
                </p>
              ) : null}
            </form>
          </div>

          <div className="mt-4 md:mt-5">
            <Link
              href="/buscar"
              className="inline-flex items-center gap-2 text-sm text-text-tertiary transition-colors hover:text-text-secondary"
            >
              <Filter className="h-4 w-4" />
              {pack.hero.filterLink}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
