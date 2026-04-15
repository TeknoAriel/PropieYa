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
    <section className="border-b border-border/35 bg-surface-primary pb-6 pt-7 md:pb-7 md:pt-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[1.65rem] font-semibold leading-snug tracking-tight text-text-primary md:text-3xl md:leading-tight">
            {pack.hero.line1}{' '}
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <form
            onSubmit={onSubmit}
            className="mx-auto mt-5 max-w-xl md:mt-6"
            aria-label="Buscar propiedades"
          >
            <div className="relative">
              <Input
                className="h-11 border-border/60 bg-surface-primary pl-3.5 pr-[5.75rem] text-[15px] md:h-11 md:pr-[6rem] md:text-base"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={placeholder}
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {voiceSupported ? (
                  <Button
                    type="button"
                    size="icon"
                    variant={listening ? 'default' : 'outline'}
                    className="h-8 w-8 shrink-0 rounded-md"
                    onClick={() => (listening ? stopListening() : startListening())}
                    aria-label={listening ? 'Detener dictado' : 'Dictar'}
                    title={listening ? 'Detener' : 'Dictar'}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button type="submit" className="h-8 shrink-0 rounded-md px-4 text-sm">
                  Buscar
                </Button>
              </div>
            </div>
            {listening ? (
              <p className="mt-1.5 text-center text-xs text-text-tertiary">Escuchando…</p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  )
}
