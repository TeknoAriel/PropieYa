'use client'

import Link from 'next/link'
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
    <section className="border-b border-border/20 bg-surface-primary pb-4 pt-4 md:pb-5 md:pt-5">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[1.55rem] font-semibold leading-tight tracking-tight text-text-primary md:text-[1.7rem] md:leading-snug">
            {pack.hero.line1}{' '}
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-[0.9rem] leading-snug text-text-secondary md:mt-2.5 md:max-w-xl md:text-[0.9375rem] md:leading-relaxed">
            {pack.hero.subtitle}
          </p>
        </div>

        <div className="mx-auto mt-3 max-w-xl md:mt-4">
          <div className="rounded-xl border border-border/40 bg-surface-secondary/35 p-3 shadow-none md:p-3.5">
            <HeroSearchBar
              value={query}
              onValueChange={setQuery}
              onSubmit={handleSubmit}
              className=""
            />
            <div className="mt-2 flex justify-center border-t border-border/25 pt-2">
              <Link
                href="/buscar"
                className="text-xs font-medium text-brand-primary underline-offset-4 transition-colors hover:text-brand-primary/90 hover:underline md:text-[0.8125rem]"
              >
                {pack.hero.filterLink}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
