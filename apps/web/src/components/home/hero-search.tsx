'use client'

import { useState } from 'react'
import Link from 'next/link'

import { Button, Input, ArrowRight, Filter } from '@propieya/ui'

const EXAMPLE_QUERIES = [
  '3 ambientes en Palermo con balcón',
  'Casa con jardín en zona norte',
  'Departamento luminoso hasta 200K USD',
  'Alquiler en Belgrano cerca del subte',
]

export function HeroSearch() {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    // TODO: Navigate to search with query
    window.location.href = `/buscar?q=${encodeURIComponent(query)}`
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
            Contale a Propieya
            <br />
            <span className="text-brand-primary">qué estás buscando</span>
          </h1>

          <p className="mt-6 text-lg text-text-secondary md:text-xl">
            Buscá propiedades hablando en lenguaje natural.
            <br className="hidden md:block" />
            Sin filtros complicados, sin formularios interminables.
          </p>

          {/* Search input */}
          <form onSubmit={handleSubmit} className="mt-10">
            <div className="relative">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej: Busco un 3 ambientes en Palermo, luminoso, hasta 200K dólares..."
                className="h-14 pl-5 pr-14 text-base md:text-lg rounded-2xl border-2 border-border focus-visible:ring-brand-primary shadow-lg"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Example chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {EXAMPLE_QUERIES.map((example) => (
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
              Prefiero buscar con filtros tradicionales
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
