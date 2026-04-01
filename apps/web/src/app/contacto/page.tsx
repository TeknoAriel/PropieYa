import type { Metadata } from 'next'

import { ContactoForm } from '@/components/marketing/contacto-form'
import { MarketingShell } from '@/components/marketing/marketing-shell'

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escribinos para consultas sobre Propieya, publicadores o alianzas.',
}

export default function ContactoPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()

  return (
    <MarketingShell>
      <article className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-bold text-text-primary">Contacto</h1>
        <p className="leading-relaxed text-text-secondary">
          Consultas sobre el producto, alianzas o reportes: completá el formulario y abrí tu correo,
          o copiá el texto si preferís otro canal.
        </p>
        {email ? (
          <p className="text-sm text-text-secondary">
            Destino:{' '}
            <a className="font-medium text-brand-primary underline" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
        ) : (
          <p className="text-sm text-text-tertiary">
            Configurá <code className="rounded bg-surface-secondary px-1">NEXT_PUBLIC_CONTACT_EMAIL</code>{' '}
            en Vercel para habilitar el enlace mailto automático. Igual podés usar copiar y pegar.
          </p>
        )}
        <ContactoForm contactEmail={email} />
      </article>
    </MarketingShell>
  )
}
