import type { Metadata } from 'next'

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
          Si querés hablar de producto, publicar como inmobiliaria o reportar un problema, dejamos
          acá el canal público cuando esté definido.
        </p>
        {email ? (
          <p className="text-text-primary">
            Escribinos a{' '}
            <a className="font-medium text-brand-primary underline" href={`mailto:${email}`}>
              {email}
            </a>
            .
          </p>
        ) : (
          <p className="text-sm text-text-tertiary">
            Pronto publicamos un correo o formulario de contacto. Mientras tanto podés explorar el
            portal y el panel de publicadores.
          </p>
        )}
      </article>
    </MarketingShell>
  )
}
