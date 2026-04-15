'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import { Button, Input, Mic } from '@propieya/ui'
import { PORTAL_HERO_BUSCAR_QUICK_LINKS } from '@propieya/shared'

import { getPortalPack } from '@/lib/portal-copy'

import { HOME_EXPLORE_TYPES, HOME_POPULAR_ZONES } from './home-explore-links'

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

export function HeroSearch() {
  const pack = getPortalPack()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const queryBeforeVoiceRef = useRef('')
  const queryRef = useRef(query)
  queryRef.current = query

  useEffect(() => {
    setVoiceSupported(getSpeechRecognitionCtor() != null)
  }, [])

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

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      router.push('/buscar')
      return
    }
    router.push(`/buscar?q=${encodeURIComponent(q)}`)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-secondary/80 via-surface-primary to-surface-primary pb-10 pt-8 md:pb-14 md:pt-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 h-64 w-64 rounded-full bg-brand-secondary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brand-primary/6 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl md:text-[2.25rem] md:leading-tight">
            {pack.hero.line1}
            <span className="block text-brand-primary sm:mt-1">{pack.hero.line2Accent}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-secondary md:mt-4 md:text-base">
            {pack.hero.subtitle}
          </p>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-8 max-w-2xl"
            aria-label="Buscar propiedades"
          >
            <div className="relative">
              <Input
                className="h-12 rounded-xl border-border/80 bg-surface-primary pl-4 pr-[6.25rem] text-base shadow-sm md:h-14 md:pr-[6.75rem] md:text-lg"
                placeholder={pack.hero.placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={pack.hero.placeholder}
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {voiceSupported ? (
                  <Button
                    type="button"
                    size="icon"
                    variant={listening ? 'default' : 'outline'}
                    className="h-9 w-9 shrink-0 rounded-lg md:h-10 md:w-10"
                    onClick={() => (listening ? stopListening() : startListening())}
                    aria-label={listening ? 'Detener dictado' : 'Dictar búsqueda'}
                    title={listening ? 'Detener' : 'Dictar'}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className="h-9 shrink-0 rounded-lg px-4 text-sm md:h-10 md:px-5"
                >
                  Buscar
                </Button>
              </div>
            </div>
            {listening ? (
              <p className="mt-2 text-center text-xs font-medium text-brand-primary">
                Escuchando…
              </p>
            ) : null}
          </form>

          <p className="mx-auto mt-6 max-w-xl text-center text-xs text-text-tertiary">
            Ejemplos: tres ambientes en Palermo · casa con jardín zona norte · local a la calle
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {PORTAL_HERO_BUSCAR_QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-border/60 bg-surface-primary/90 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-brand-primary/35 hover:text-brand-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-10 border-t border-border/40 pt-8 text-left">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Explorar por tipo
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {HOME_EXPLORE_TYPES.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="rounded-full border border-border/50 px-3 py-1.5 text-sm text-text-primary transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 text-left">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Zonas populares
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {HOME_POPULAR_ZONES.map((z) => (
                <Link
                  key={z.href}
                  href={z.href}
                  className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-brand-primary hover:underline"
                >
                  {z.label}
                </Link>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center">
            <Link
              href="/buscar"
              className="text-xs text-text-tertiary transition-colors hover:text-text-primary"
            >
              {pack.hero.filterLink}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
