'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { getPortalPack } from '@/lib/portal-copy'
import { Button } from '@propieya/ui'

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
    <section className="border-b border-border/20 bg-surface-primary pb-2.5 pt-2.5 md:pb-3 md:pt-3">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-text-primary md:text-[1.5rem] md:leading-snug">
            {pack.hero.line1}{' '}
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>
          <p className="mx-auto mt-1.5 max-w-lg text-[0.87rem] leading-snug text-text-secondary md:mt-2 md:max-w-xl md:text-[0.9rem] md:leading-relaxed">
            {pack.hero.subtitle}
          </p>
        </div>

        <div className="mx-auto mt-2.5 max-w-2xl md:mt-3">
          <div className="rounded-xl border border-brand-accent/20 bg-surface-secondary/35 p-2.5 shadow-none md:p-3">
            <HeroSearchBar
              value={query}
              onValueChange={setQuery}
              onSubmit={handleSubmit}
              className=""
            />
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 border-t border-brand-accent/20 pt-2.5">
              <Button variant="outline" size="sm" asChild className="h-8 border-border/50 text-xs">
                <Link href="/buscar">{pack.hero.filterLink}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
