'use client'

import Link from 'next/link'

import { Filter } from '@propieya/ui'

import { ConversationalSearchBlock } from '@/components/portal/conversational-search-block'
import { InductiveSearchChips } from '@/components/portal/inductive-search-chips'
import { getPortalPack } from '@/lib/portal-copy'

export function HeroSearch() {
  const pack = getPortalPack()

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-secondary/90 via-surface-primary to-surface-primary pb-8 pt-6 md:pb-12 md:pt-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-brand-secondary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-brand-primary/8 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-[1.75rem] md:text-4xl lg:text-[2.35rem] lg:leading-tight">
            {pack.hero.line1}
            <br />
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <p className="mt-2 max-w-2xl mx-auto text-sm leading-relaxed text-text-secondary md:mt-3 md:text-base">
            {pack.hero.subtitle}
          </p>

          <div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-border/50 bg-surface-primary/90 p-4 shadow-md shadow-black/5 backdrop-blur-sm md:mt-6 md:p-5">
            <ConversationalSearchBlock
              variant="hero"
              routerMode="push"
              searchPathPage="buscar"
              compact={false}
              className="w-full"
            />
            <div className="mt-3 border-t border-border/35 pt-3">
              <InductiveSearchChips
                variant="embedded"
                chipJustify="center"
                showSubtitle={false}
              />
            </div>
          </div>

          <div className="mt-2 md:hidden">
            <Link
              href="/buscar"
              className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              <Filter className="h-3.5 w-3.5 shrink-0" />
              {pack.hero.filterLink}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
