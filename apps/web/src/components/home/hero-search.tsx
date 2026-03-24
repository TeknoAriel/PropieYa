'use client'

import { useState } from 'react'
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

export function HeroSearch() {
  const pack = getPortalPack()
  const router = useRouter()
  const [query, setQuery] = useState('')

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

  const handleExampleClick = (example: string) => {
    setQuery(example)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-secondary to-surface-primary py-20 md:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-secondary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-primary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl">
            {pack.hero.line1}
            <br />
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <p className="mt-6 text-lg text-text-secondary md:text-xl">
            {pack.hero.subtitle}
          </p>

          {/* Search input */}
          <form onSubmit={handleSubmit} className="mt-10">
            <div className="relative">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={pack.hero.placeholder}
                disabled={searchConversational.isPending}
                className="h-14 pl-5 pr-14 text-base md:text-lg rounded-2xl border-2 border-border focus-visible:ring-brand-primary shadow-lg"
              />
              <Button
                type="submit"
                size="icon"
                disabled={searchConversational.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
              >
                {searchConversational.isPending ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </Button>
            </div>
            {searchConversational.isError && (
              <p className="mt-2 text-sm text-red-600">
                {searchConversational.error.message}
              </p>
            )}
          </form>

          {/* Example chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {pack.heroExamples.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="rounded-full bg-surface-elevated px-4 py-2 text-sm text-text-secondary border border-border hover:border-brand-primary hover:text-brand-primary transition-colors"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Traditional search link */}
          <div className="mt-8">
            <Link
              href="/buscar"
              className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
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
