'use client'

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
  const p = pack.hero.placeholder.trim()
  if (p.length > 0) {
    return p.length > 72 ? `${p.slice(0, 69)}…` : p
  }
  const ex = pack.heroExamples[0]?.trim()
  return ex && ex.length > 0
    ? ex.length > 72
      ? `${ex.slice(0, 69)}…`
      : `Ej.: ${ex}`
    : 'Zona, ambientes, presupuesto…'
}

export type HeroSearchBarProps = {
  value: string
  onValueChange: (next: string) => void
  onSubmit: (trimmed: string) => void
  /** Para accesibilidad y tests */
  inputId?: string
  formAriaLabel?: string
  className?: string
}

/**
 * Campo de texto + dictado + botón Buscar, mismo patrón visual que el hero de la home.
 * Controlado desde el padre para poder enlazar URL (`q`) en /buscar.
 */
export function HeroSearchBar({
  value,
  onValueChange,
  onSubmit,
  inputId,
  formAriaLabel = 'Buscar propiedades',
  className = '',
}: HeroSearchBarProps) {
  const pack = getPortalPack()
  const placeholder = buildSearchPlaceholder(pack)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)
  const queryBeforeVoiceRef = useRef('')
  const valueRef = useRef(value)
  valueRef.current = value

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
    queryBeforeVoiceRef.current = valueRef.current.trimEnd()
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
      onValueChange(combined)
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
  }, [listening, onValueChange, stopListening])

  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(value.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      aria-label={formAriaLabel}
    >
      <div className="relative">
        <Input
          id={inputId}
          className="h-12 rounded-lg border-border/45 bg-surface-primary pl-4 pr-[5.75rem] text-[15px] shadow-none md:h-12 md:pr-[6rem] md:text-base"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
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
  )
}
