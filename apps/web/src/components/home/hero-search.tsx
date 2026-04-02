'use client'

import Link from 'next/link'

import { Filter } from '@propieya/ui'

import { ConversationalSearchBlock } from '@/components/portal/conversational-search-block'
import { InductiveSearchChips } from '@/components/portal/inductive-search-chips'
import { getPortalPack } from '@/lib/portal-copy'

export function HeroSearch() {
  const pack = getPortalPack()

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-secondary to-surface-primary pb-6 pt-5 md:pb-8 md:pt-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-brand-secondary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-brand-primary/10 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-[1.75rem] md:text-4xl lg:text-[2.35rem] lg:leading-tight">
            {pack.hero.line1}
            <br />
            <span className="text-brand-primary">{pack.hero.line2Accent}</span>
          </h1>

          <p className="mt-1.5 text-sm leading-snug text-text-secondary md:mt-2 md:text-base md:leading-relaxed">
            {pack.hero.subtitle}
          </p>

          <div className="mx-auto mt-3 max-w-3xl rounded-2xl border border-border/35 bg-surface-primary/40 p-3 shadow-sm backdrop-blur-sm md:mt-4 md:p-4">
            <ConversationalSearchBlock
              variant="hero"
              routerMode="push"
              searchPathPage="buscar"
              compact
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
