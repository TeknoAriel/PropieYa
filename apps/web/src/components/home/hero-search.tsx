'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button, Input, ArrowRight, Filter, Sparkles } from '@propieya/ui'

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

type AssistantPublicConfig = {
  openAiConfigured: boolean
  model: string
}

export function HeroSearch() {
  const pack = getPortalPack()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [assistantCfg, setAssistantCfg] = useState<AssistantPublicConfig | null>(
    null
  )

  useEffect(() => {
    let cancelled = false
    void fetch('/api/assistant-config')
      .then((r) => r.json())
      .then((data: { openAiConfigured?: boolean; model?: string }) => {
        if (cancelled) return
        if (typeof data.openAiConfigured === 'boolean') {
          setAssistantCfg({
            openAiConfigured: data.openAiConfigured,
            model: typeof data.model === 'string' ? data.model : 'gpt-4o-mini',
          })
        } else {
          setAssistantCfg({ openAiConfigured: false, model: 'gpt-4o-mini' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssistantCfg({ openAiConfigured: false, model: 'gpt-4o-mini' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  const runSearch = (text: string) => {
    const t = text.trim()
    if (!t) return
    setQuery(t)
    searchConversational.mutate({ message: t })
  }

  const handleExampleClick = (example: string) => {
    runSearch(example)
  }

  const showAssistantStrip =
    pack.hero.assistantBadge != null ||
    pack.hero.assistantPitch != null ||
    assistantCfg != null

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-secondary to-surface-primary py-10 pb-12 md:py-12 md:pb-14 lg:py-14 lg:pb-16">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-secondary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-primary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Headline */}
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-[1.75rem] md:text-4xl lg:text-[2.35rem] lg:leading-tight">
            {pack.hero.line1}
            <br />
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <p className="mt-4 text-base leading-relaxed text-text-secondary md:mt-5 md:text-lg">
            {pack.hero.subtitle}
          </p>

          {showAssistantStrip ? (
            <div className="mt-5 flex flex-col items-center gap-2.5 md:mt-6">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(pack.hero.assistantBadge != null ||
                  pack.hero.assistantPitch != null) && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/8 px-4 py-1.5 text-sm font-semibold text-brand-primary shadow-sm">
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                    {pack.hero.assistantBadge ?? 'Asistente Propieya'}
                  </span>
                )}
                {assistantCfg ? (
                  <span
                    className={
                      assistantCfg.openAiConfigured
                        ? 'rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-800'
                        : 'rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-900'
                    }
                    title={
                      assistantCfg.openAiConfigured
                        ? `Modelo: ${assistantCfg.model}`
                        : 'Sin OPENAI_API_KEY en el servidor: extracción con reglas locales (mismo destino /buscar).'
                    }
                  >
                    {assistantCfg.openAiConfigured
                      ? `IA conectada · ${assistantCfg.model}`
                      : 'Modo reglas locales · sin API key'}
                  </span>
                ) : null}
              </div>
              {pack.hero.assistantPitch ? (
                <p className="max-w-xl text-center text-sm leading-relaxed text-text-secondary">
                  {pack.hero.assistantPitch}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Search input — bloque con presencia de “producto distinto” */}
          <div
            className={
              showAssistantStrip
                ? 'mt-8 rounded-3xl border-2 border-brand-primary/20 bg-surface-primary/90 p-2 shadow-xl ring-1 ring-black/[0.04] backdrop-blur-sm md:mt-10 md:p-3'
                : 'mt-10'
            }
          >
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={pack.hero.placeholder}
                  disabled={searchConversational.isPending}
                  className="h-14 pl-5 pr-14 text-base md:text-lg rounded-2xl border-2 border-border focus-visible:ring-brand-primary shadow-md"
                  aria-label={pack.hero.placeholder}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={searchConversational.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
                  aria-label="Buscar con el asistente"
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

          {/* Example chips */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 md:mt-5">
            {pack.heroExamples.map((example) => (
              <button
                key={example}
                type="button"
                disabled={searchConversational.isPending}
                onClick={() => handleExampleClick(example)}
                className="rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Traditional search link */}
          <div className="mt-5 md:mt-6">
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
