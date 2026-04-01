import Link from 'next/link'

import { PORTAL_BRAND_FOOTER_TAGLINE } from '@propieya/shared'

import { getPanelPublicUrl } from '@/lib/panel-public-url'

export function Footer() {
  const panelHref = getPanelPublicUrl()
  return (
    <footer className="border-t border-border bg-surface-secondary">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <span className="text-xl font-bold text-brand-primary">Propieya</span>
            <p className="text-sm text-text-secondary">
              {PORTAL_BRAND_FOOTER_TAGLINE}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-text-primary mb-4">Buscar</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/venta" className="hover:text-text-primary transition-colors">
                  Propiedades en venta
                </Link>
              </li>
              <li>
                <Link href="/alquiler" className="hover:text-text-primary transition-colors">
                  Propiedades en alquiler
                </Link>
              </li>
              <li>
                <Link href="/emprendimientos" className="hover:text-text-primary transition-colors">
                  Emprendimientos
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-text-primary mb-4">Inmobiliarias</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/publicar" className="hover:text-text-primary transition-colors">
                  Publicá tu aviso
                </Link>
              </li>
              <li>
                <a
                  href={panelHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors"
                >
                  Panel de gestión
                </a>
              </li>
              <li>
                <Link href="/planes" className="hover:text-text-primary transition-colors">
                  Planes y precios
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-text-primary mb-4">Propieya</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/nosotros" className="hover:text-text-primary transition-colors">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-text-primary transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-text-primary transition-colors">
                  Términos y condiciones
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-tertiary">
            © {new Date().getFullYear()} Propieya. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 text-sm text-text-tertiary">
            <Link href="/privacidad" className="hover:text-text-primary transition-colors">
              Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-text-primary transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
