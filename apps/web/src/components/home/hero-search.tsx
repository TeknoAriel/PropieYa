'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button, Input, ArrowRight, Filter } from '@propieya/ui'
import { buildPortalBuscarUrl } from '@propieya/shared'

import { getPortalPack } from '@/lib/portal-copy'
import { trpc } from '@/lib/trpc'

const PLACEHOLDER_ROTATE_MS = 5500

export function HeroSearch() {
  const pack = getPortalPack()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [exampleIdx, setExampleIdx] = useState(0)

  const examples = pack.heroExamples
  const hasExamples = examples.length > 0

  useEffect(() => {
    if (examples.length <= 1) return
    const id = window.setInterval(() => {
      setExampleIdx((i) => (i + 1) % examples.length)
    }, PLACEHOLDER_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [examples.length])

  const placeholder = hasExamples
    ? `Ej: ${examples[exampleIdx] ?? ''}`
    : pack.hero.placeholder

  const searchConversational = trpc.listing.searchConversational.useMutation({
    onSuccess: (data) => {
      const url = buildPortalBuscarUrl(data.filters)
      router.push(url)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    searchConversational.mutate({ message: query.trim() })
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-secondary to-surface-primary pb-0 pt-6 md:pt-8 md:pb-0">
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

          <p className="mt-2 text-sm leading-snug text-text-secondary md:mt-3 md:text-base md:leading-relaxed">
            {pack.hero.subtitle}
          </p>

          <div className="mt-3 md:mt-4">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  disabled={searchConversational.isPending}
                  className="h-14 pl-5 pr-14 text-base md:text-lg rounded-2xl border-2 border-border bg-surface-primary/90 shadow-md placeholder:text-text-secondary placeholder:text-[13px] md:placeholder:text-sm focus-visible:ring-brand-primary"
                  aria-label={pack.hero.placeholder}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={searchConversational.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
                  aria-label="Buscar"
                >
                  {searchConversational.isPending ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {searchConversational.isError ? (
                <p className="mt-2 text-sm text-red-600">
                  {searchConversational.error.message}
                </p>
              ) : null}
            </form>
          </div>

          {/* En desktop el nav ya enlaza a /buscar; en móvil el menú aún no despliega enlaces. */}
          <div className="mt-2 md:hidden">
            <Link
              href="/buscar"
              className="inline-flex items-center gap-1.5 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
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
