'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { getPortalPack } from '@/lib/portal-copy'

import { HeroSearchBar } from '@/components/home/hero-search-bar'

export function HeroSearch() {
  const pack = getPortalPack()
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit(trimmed: string) {
    if (!trimmed) {
      router.push('/buscar')
      return
    }
    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <section className="border-b border-border/20 bg-surface-primary pb-10 pt-10 md:pb-12 md:pt-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[1.7rem] font-semibold leading-snug tracking-tight text-text-primary md:text-[1.875rem] md:leading-[1.2]">
            {pack.hero.line1}{' '}
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-text-secondary md:mt-5 md:max-w-xl md:text-base">
            {pack.hero.subtitle}
          </p>

          <HeroSearchBar
            value={query}
            onValueChange={setQuery}
            onSubmit={handleSubmit}
            className="mx-auto mt-7 max-w-xl md:mt-9"
          />
        </div>
      </div>
    </section>
  )
}
