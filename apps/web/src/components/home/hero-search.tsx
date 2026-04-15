'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import { Button, Input, Mic } from '@propieya/ui'

import { getPortalPack } from '@/lib/portal-copy'

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

function buildSearchPlaceholder(pack: ReturnType<typeof getPortalPack>): string {
  const ex = pack.heroExamples.slice(0, 3).filter(Boolean)
  if (ex.length === 0) return pack.hero.placeholder
  const joined = ex.join(' · ')
  return joined.length > 120 ? `${joined.slice(0, 117)}…` : `Ej.: ${joined}`
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

  const placeholder = buildSearchPlaceholder(pack)

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
    <section className="border-b border-border/40 bg-surface-primary py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            {pack.hero.line1}{' '}
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-8 max-w-xl"
            aria-label="Buscar propiedades"
          >
            <div className="relative">
              <Input
                className="h-12 border-border/70 bg-surface-primary pl-4 pr-[6.25rem] text-base md:h-14 md:pr-[6.75rem] md:text-lg"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={placeholder}
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {voiceSupported ? (
                  <Button
                    type="button"
                    size="icon"
                    variant={listening ? 'default' : 'outline'}
                    className="h-9 w-9 shrink-0 rounded-md md:h-10 md:w-10"
                    onClick={() => (listening ? stopListening() : startListening())}
                    aria-label={listening ? 'Detener dictado' : 'Dictar'}
                    title={listening ? 'Detener' : 'Dictar'}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  className="h-9 shrink-0 rounded-md px-5 text-sm md:h-10"
                >
                  Buscar
                </Button>
              </div>
            </div>
            {listening ? (
              <p className="mt-2 text-center text-xs text-text-secondary">Escuchando…</p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  )
}
