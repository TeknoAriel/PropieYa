import type { Metadata } from 'next'
import Link from 'next/link'

import { Button, Mail, Users } from '@propieya/ui'

import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Inmobiliarias y agentes',
  description:
    'Red de inmobiliarias en Propieya: estamos preparando el directorio con el mismo estándar de claridad del portal.',
}

export default function AgentesPage() {
  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <div className="flex items-center gap-3 text-brand-primary">
          <Users className="h-8 w-8 shrink-0" aria-hidden />
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Inmobiliarias y agentes
          </h1>
        </div>
        <p className="leading-relaxed text-text-secondary">
          Estamos armando un espacio para que estudios y publicadores tengan presencia clara,
          sin saturar al usuario. Si representás una inmobiliaria, escribinos y te contamos el
          roadmap.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/contacto">
            <Mail className="h-4 w-4" aria-hidden />
            Contacto comercial
          </Link>
        </Button>
      </article>
    </MarketingShell>
  )
}
