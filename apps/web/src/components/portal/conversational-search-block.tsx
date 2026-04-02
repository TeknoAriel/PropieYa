'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  buildPortalSearchPath,
  PORTAL_SEARCH_UX_COPY as S,
  summarizeSearchFilters,
  type ExplainMatchFilters,
  type PortalSearchPage,
} from '@propieya/shared'
import { Button, Input, Mic, ArrowRight } from '@propieya/ui'

import { getPortalPack } from '@/lib/portal-copy'
import { trpc } from '@/lib/trpc'

const PLACEHOLDER_ROTATE_MS = 5500

type ConversationalSearchBlockProps = {
  variant: 'hero' | 'buscar'
  /** En /venta o /alquiler la URL debe quedar en esa ruta. */
  searchPathPage?: PortalSearchPage
  /** Bloquea operación distinta (páginas venta/alquiler). */
  forcedOperation?: 'sale' | 'rent'
  /** `push` en home; `replace` en /buscar para no apilar historial. */
  routerMode: 'push' | 'replace'
  /** Tras navegar: resumen para UI (buscar). */
  onAfterNavigate?: (payload: {
    summary: string
    total: number
    filters: ExplainMatchFilters
  }) => void
  className?: string
}

function getSpeechRecognitionCtor(): (new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((ev: Event) => void) | null
  onerror: ((ev: Event) => void) | null
  onend: (() => void) | null
}) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => never
    webkitSpeechRecognition?: new () => never
  }
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as never
}

export function ConversationalSearchBlock({
  variant,
  searchPathPage = 'buscar',
  forcedOperation,
  routerMode,
  onAfterNavigate,
  className = '',
}: ConversationalSearchBlockProps) {
  const router = useRouter()
  const pack = getPortalPack()
  const [query, setQuery] = useState('')
  const [exampleIdx, setExampleIdx] = useState(0)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  const examples = pack.heroExamples
  const hasExamples = examples.length > 0

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() != null)
  }, [])

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
      const mergedOp = forcedOperation ?? data.filters.operationType
      const urlFilters = {
        q: data.filters.q,
        operationType: mergedOp,
        propertyType: data.filters.propertyType,
        city: data.filters.city,
        neighborhood: data.filters.neighborhood,
        minPrice: data.filters.minPrice,
        maxPrice: data.filters.maxPrice,
        minBedrooms: data.filters.minBedrooms,
        minSurface: data.filters.minSurface,
      }
      const path = buildPortalSearchPath(urlFilters, searchPathPage)
      const explain: ExplainMatchFilters = {
        q: data.filters.q,
        operationType: mergedOp,
        propertyType: data.filters.propertyType,
        city: data.filters.city,
        neighborhood: data.filters.neighborhood,
        minPrice: data.filters.minPrice,
        maxPrice: data.filters.maxPrice,
        minBedrooms: data.filters.minBedrooms,
        minSurface: data.filters.minSurface,
        amenities: data.filters.amenities,
      }
      onAfterNavigate?.({
        summary: summarizeSearchFilters(explain),
        total: data.total,
        filters: explain,
      })
      if (routerMode === 'replace') {
        router.replace(path)
      } else {
        router.push(path)
      }
    },
  })

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor || listening) return
    const rec = new Ctor()
    rec.lang = 'es-AR'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (ev: Event) => {
      const e = ev as unknown as {
        resultIndex: number
        results: Array<{ 0: { transcript: string }; isFinal: boolean }>
      }
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i]?.[0]?.transcript ?? ''
      }
      const t = text.trim()
      if (t) setQuery((prev) => (prev ? `${prev} ${t}` : t).trim())
    }
    rec.onerror = () => {
      stopListening()
    }
    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
      recognitionRef.current = null
    }
  }, [listening, stopListening])

  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    searchConversational.mutate({ message: query.trim() })
  }

  const isHero = variant === 'hero'
  const inputClass = isHero
    ? 'h-14 pl-5 pr-[5.5rem] text-base md:text-lg rounded-2xl border-2 border-border bg-surface-primary/90 shadow-md placeholder:text-text-secondary placeholder:text-[13px] md:placeholder:text-sm focus-visible:ring-brand-primary'
    : 'h-14 pl-5 pr-[5.5rem] text-base rounded-2xl border-2 border-border-default bg-surface-elevated shadow-sm placeholder:text-text-secondary focus-visible:ring-border-focus'

  return (
    <div className={className}>
      {variant === 'buscar' ? (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-text-primary md:text-2xl">
            {S.conversationalBlockTitle}
          </h2>
          <p className="mt-2 text-sm text-text-secondary md:text-base leading-relaxed">
            {S.conversationalBlockSubtitle}
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={searchConversational.isPending}
            className={inputClass}
            aria-label={pack.hero.placeholder}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {voiceSupported ? (
              <Button
                type="button"
                size="icon"
                variant={listening ? 'default' : 'outline'}
                className="h-10 w-10 shrink-0 rounded-xl"
                disabled={searchConversational.isPending}
                onClick={() => (listening ? stopListening() : startListening())}
                aria-label={
                  listening ? S.conversationalVoiceStop : S.conversationalVoiceStart
                }
                title={
                  listening ? S.conversationalVoiceStop : S.conversationalVoiceStart
                }
              >
                <Mic className="h-5 w-5" />
              </Button>
            ) : null}
            <Button
              type="submit"
              size="icon"
              disabled={searchConversational.isPending}
              className="h-10 w-10 shrink-0 rounded-xl"
              aria-label="Buscar"
            >
              {searchConversational.isPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        {listening ? (
          <p className="mt-2 text-xs font-medium text-brand-primary">
            {S.conversationalVoiceListening}
          </p>
        ) : !voiceSupported && variant === 'buscar' ? (
          <p className="mt-2 text-xs text-text-secondary">
            {S.conversationalVoiceUnsupported}
          </p>
        ) : null}
        {searchConversational.isError ? (
          <p className="mt-2 text-sm text-semantic-error">
            {searchConversational.error.message}
          </p>
        ) : null}
      </form>
    </div>
  )
}
