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
    <section className="border-b border-border/35 bg-surface-primary pb-6 pt-7 md:pb-7 md:pt-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[1.65rem] font-semibold leading-snug tracking-tight text-text-primary md:text-3xl md:leading-tight">
            {pack.hero.line1}{' '}
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <HeroSearchBar
            value={query}
            onValueChange={setQuery}
            onSubmit={handleSubmit}
            className="mx-auto mt-5 max-w-xl md:mt-6"
          />
        </div>
      </div>
    </section>
  )
}
