'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
const CONV_STORAGE_KEY = 'propieya.conversational.v1'
const CONV_TTL_MS = 45 * 60 * 1000

/**
 * Memoria de sesión: banner «Seguimos desde…», chips y `previousContext` al intérprete.
 * Por defecto activo; desactivar con `NEXT_PUBLIC_ENABLE_CONVERSATIONAL_SESSION_CONTEXT=0` (apps/web).
 */
const ENABLE_CONVERSATIONAL_SESSION_CONTEXT =
  process.env.NEXT_PUBLIC_ENABLE_CONVERSATIONAL_SESSION_CONTEXT !== '0'

type StoredConv = {
  userMessage: string
  filters: ExplainMatchFilters
  t: number
}

function readConvStorage(): StoredConv | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CONV_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as StoredConv
    if (!p?.t || !p.filters || typeof p.userMessage !== 'string') return null
    if (Date.now() - p.t > CONV_TTL_MS) {
      sessionStorage.removeItem(CONV_STORAGE_KEY)
      return null
    }
    return p
  } catch {
    return null
  }
}

function writeConvStorage(payload: {
  userMessage: string
  filters: ExplainMatchFilters
}): void {
  try {
    sessionStorage.setItem(
      CONV_STORAGE_KEY,
      JSON.stringify({ ...payload, t: Date.now() })
    )
  } catch {
    /* ignore quota / private mode */
  }
}

function clearConvStorage(): void {
  try {
    sessionStorage.removeItem(CONV_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

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
    /** Mensajes del motor relajado (misma tubería que `listing.search`). */
    messages?: string[]
    primaryTotal?: number
  }) => void
  className?: string
  /** Menos padding tipográfico y campo más bajo (p. ej. /buscar en un solo card). */
  compact?: boolean
  /**
   * Solo en `/buscar`: si la URL incluye `q`, copia su valor al campo al cambiar la query (chips, etc.).
   * No pisa el texto si `q` no está en la URL (p. ej. solo cambió `op` o filtros clásicos).
   */
  buscarSearchParamsKey?: string
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
  compact = false,
  buscarSearchParamsKey,
}: ConversationalSearchBlockProps) {
  const router = useRouter()
  const pack = getPortalPack()
  const [query, setQuery] = useState('')
  const [exampleIdx, setExampleIdx] = useState(0)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const lastSubmittedRef = useRef('')
  /** Evita que la sync URL→campo pise el vaciado tras submit conversacional. */
  const skipNextUrlQSyncRef = useRef(false)
  const queryBeforeVoiceRef = useRef('')
  const queryRef = useRef(query)
  queryRef.current = query
  const [sessionPrior, setSessionPrior] = useState<{
    userMessage: string
    filters: ExplainMatchFilters
  } | null>(null)

  const examples = pack.heroExamples
  const hasExamples = examples.length > 0

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() != null)
  }, [])

  useEffect(() => {
    if (!ENABLE_CONVERSATIONAL_SESSION_CONTEXT) {
      clearConvStorage()
    }
  }, [])

  useEffect(() => {
    if (buscarSearchParamsKey === undefined) return
    if (skipNextUrlQSyncRef.current) {
      skipNextUrlQSyncRef.current = false
      return
    }
    const sp = new URLSearchParams(buscarSearchParamsKey)
    if (!sp.has('q')) return
    setQuery(sp.get('q') ?? '')
  }, [buscarSearchParamsKey])

  useEffect(() => {
    if (!ENABLE_CONVERSATIONAL_SESSION_CONTEXT) {
      setSessionPrior(null)
      return
    }
    const s = readConvStorage()
    if (!s) {
      setSessionPrior(null)
      return
    }
    if (
      forcedOperation &&
      s.filters.operationType &&
      s.filters.operationType !== forcedOperation
    ) {
      clearConvStorage()
      setSessionPrior(null)
      return
    }
    setSessionPrior({ userMessage: s.userMessage, filters: s.filters })
  }, [forcedOperation])

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
      /** Intención del mensaje por encima del contexto de página (venta/alquiler). */
      const mergedOp = data.filters.operationType ?? forcedOperation
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
      const submitted = lastSubmittedRef.current.trim()
      if (ENABLE_CONVERSATIONAL_SESSION_CONTEXT) {
        writeConvStorage({
          userMessage: submitted || summarizeSearchFilters(explain).slice(0, 200),
          filters: explain,
        })
        setSessionPrior({
          userMessage: submitted || summarizeSearchFilters(explain).slice(0, 200),
          filters: explain,
        })
      }
      skipNextUrlQSyncRef.current = true
      setQuery('')
      onAfterNavigate?.({
        summary: summarizeSearchFilters(explain),
        total: data.total,
        filters: explain,
        messages: data.searchUX?.messages,
        primaryTotal: data.searchUX?.primaryTotal,
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
    queryBeforeVoiceRef.current = queryRef.current.trimEnd()
    const rec = new Ctor()
    rec.lang = 'es-AR'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev: Event) => {
      const e = ev as unknown as {
        results: Array<{ 0: { transcript: string }; isFinal: boolean }>
      }
      let piece = ''
      for (let i = 0; i < e.results.length; i++) {
        piece += e.results[i]?.[0]?.transcript ?? ''
      }
      const spoken = piece.replace(/\s+/g, ' ').trim()
      const prefix = queryBeforeVoiceRef.current
      const combined =
        prefix && spoken
          ? `${prefix} ${spoken}`.trim()
          : spoken || prefix
      setQuery(combined)
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

  const previousContextForMutation = useMemo(() => {
    if (!ENABLE_CONVERSATIONAL_SESSION_CONTEXT || !sessionPrior) return undefined
    return {
      userMessage: sessionPrior.userMessage,
      filters: {
        q: sessionPrior.filters.q,
        operationType: (():
          | 'sale'
          | 'rent'
          | 'temporary_rent'
          | undefined => {
          const op = sessionPrior.filters.operationType
          if (op === 'sale' || op === 'rent' || op === 'temporary_rent') return op
          return undefined
        })(),
        propertyType: sessionPrior.filters.propertyType,
        city: sessionPrior.filters.city,
        neighborhood: sessionPrior.filters.neighborhood,
        minPrice: sessionPrior.filters.minPrice,
        maxPrice: sessionPrior.filters.maxPrice,
        minBedrooms: sessionPrior.filters.minBedrooms,
        minSurface: sessionPrior.filters.minSurface,
        amenities: sessionPrior.filters.amenities,
      },
    }
  }, [sessionPrior])

  const submitConversationalMessage = useCallback(
    (rawText: string) => {
      const text = rawText.trim()
      if (!text || searchConversational.isPending) return
      lastSubmittedRef.current = text
      searchConversational.mutate(
        previousContextForMutation
          ? { message: text, previousContext: previousContextForMutation }
          : { message: text }
      )
    },
    [previousContextForMutation, searchConversational]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitConversationalMessage(query)
  }

  const clearConversationContext = () => {
    clearConvStorage()
    setSessionPrior(null)
  }

  const followUpChips = [
    S.conversationalChipCheaper,
    S.conversationalChipOtherArea,
    S.conversationalChipParking,
    S.conversationalChipMoreBedrooms,
  ] as const

  const isHero = variant === 'hero'
  const inputClass = isHero
    ? compact
      ? 'h-12 pl-4 pr-[5rem] text-sm md:text-base rounded-xl border-2 border-border bg-surface-primary/90 shadow-sm placeholder:text-text-secondary placeholder:text-[13px] focus-visible:ring-brand-primary'
      : 'h-14 pl-5 pr-[5.5rem] text-base md:text-lg rounded-2xl border-2 border-border bg-surface-primary/90 shadow-md placeholder:text-text-secondary placeholder:text-[13px] md:placeholder:text-sm focus-visible:ring-brand-primary'
    : compact
      ? 'h-12 pl-4 pr-[5rem] text-sm md:text-base rounded-xl border-2 border-brand-primary/20 bg-surface-elevated/95 shadow-sm placeholder:text-text-secondary focus-visible:border-brand-primary/40 focus-visible:ring-brand-primary'
      : 'h-14 pl-5 pr-[5.5rem] text-base rounded-2xl border-2 border-border-default bg-surface-elevated shadow-sm placeholder:text-text-secondary focus-visible:ring-border-focus'

  const subtitleBuscar = compact
    ? S.conversationalBlockSubtitleCompact
    : S.conversationalBlockSubtitle

  return (
    <div className={className}>
      {variant === 'buscar' ? (
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <h2
            className={
              compact
                ? 'text-lg font-semibold tracking-tight text-text-primary md:text-xl'
                : 'text-xl font-bold text-text-primary md:text-2xl'
            }
          >
            {S.conversationalBlockTitle}
          </h2>
          <p
            className={
              compact
                ? 'mt-1 max-w-xl text-xs text-text-secondary md:text-sm leading-snug'
                : 'mt-2 text-sm text-text-secondary md:text-base leading-relaxed'
            }
          >
            {subtitleBuscar}
          </p>
        </div>
      ) : null}

      {variant === 'buscar' &&
      ENABLE_CONVERSATIONAL_SESSION_CONTEXT &&
      sessionPrior ? (
        <div
          className={
            compact
              ? 'mb-2 rounded-lg border border-brand-primary/15 bg-brand-primary/5 px-2.5 py-2'
              : 'mb-3 rounded-lg border border-brand-primary/15 bg-brand-primary/5 px-3 py-2.5'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-text-primary">
                {S.conversationalContextBanner}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {S.conversationalContextShortHint}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={clearConversationContext}
            >
              {S.conversationalClearContext}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {followUpChips.map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-2.5 text-xs"
                disabled={searchConversational.isPending}
                onClick={() => submitConversationalMessage(label)}
              >
                {label}
              </Button>
            ))}
          </div>
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
              className={
                compact
                  ? 'h-9 w-9 shrink-0 rounded-lg'
                  : 'h-10 w-10 shrink-0 rounded-xl'
              }
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
              className={
                compact
                  ? 'h-9 w-9 shrink-0 rounded-lg'
                  : 'h-10 w-10 shrink-0 rounded-xl'
              }
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
          <p
            className={
              compact
                ? 'mt-1 text-xs font-medium text-brand-primary'
                : 'mt-2 text-xs font-medium text-brand-primary'
            }
          >
            {S.conversationalVoiceListening}
          </p>
        ) : !voiceSupported && variant === 'buscar' && !compact ? (
          <p className="mt-2 text-xs text-text-secondary">
            {S.conversationalVoiceUnsupported}
          </p>
        ) : null}
        {searchConversational.isError ? (
          <p
            className={
              compact ? 'mt-1 text-sm text-semantic-error' : 'mt-2 text-sm text-semantic-error'
            }
            role="alert"
          >
            {(searchConversational.error as { data?: { code?: string } } | null)?.data?.code ===
            'TOO_MANY_REQUESTS'
              ? S.conversationalRateLimitSoft
              : searchConversational.error?.message?.trim() ||
                S.conversationalAssistantDegraded}
          </p>
        ) : null}
      </form>
    </div>
  )
}
