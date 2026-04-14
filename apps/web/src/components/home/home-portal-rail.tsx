'use client'

import Link from 'next/link'

import { ArrowRight, Building2, Button, Card, MapPin as MapPinIcon, Sparkles } from '@propieya/ui'

const EXPLORE_TYPES: { href: string; label: string; hint: string }[] = [
  {
    href: '/buscar?tipo=apartment',
    label: 'Departamentos',
    hint: 'Pisos, PH y monoambientes',
  },
  {
    href: '/buscar?tipo=house',
    label: 'Casas',
    hint: 'Chalets y viviendas',
  },
  {
    href: '/buscar?tipo=land',
    label: 'Terrenos',
    hint: 'Lotes y campos',
  },
  {
    href: '/buscar?tipo=commercial',
    label: 'Locales',
    hint: 'Comercial y oficinas',
  },
]

const POPULAR_ZONES: { href: string; label: string }[] = [
  { href: '/buscar?barrio=Palermo', label: 'Palermo' },
  { href: '/buscar?barrio=Belgrano', label: 'Belgrano' },
  { href: '/buscar?barrio=Núñez', label: 'Núñez' },
  { href: '/buscar?ciudad=Rosario', label: 'Rosario' },
  { href: '/buscar?ciudad=Córdoba', label: 'Córdoba' },
  { href: '/buscar?ciudad=Mendoza', label: 'Mendoza' },
]

export function HomePortalRail() {
  return (
    <section className="border-y border-border/60 bg-surface-secondary/40 py-10 md:py-14">
      <div className="container mx-auto space-y-12 px-4">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col justify-between rounded-xl border border-border/80 p-6 shadow-sm transition-shadow hover:shadow-md">
            <div>
              <div className="flex items-center gap-2 text-brand-primary">
                <Building2 className="h-5 w-5" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Emprendimientos
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-text-primary md:text-2xl">
                Desarrollos y lanzamientos
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Cuando el inventario esté integrado con la misma ficha clara que el resto del
                portal, vas a ver emprendimientos acá. Mientras tanto, explorá propiedades en
                venta o alquiler.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
              <Link href="/emprendimientos">
                Ir a emprendimientos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>

          <Card className="flex flex-col justify-between rounded-xl border border-border/80 p-6 shadow-sm transition-shadow hover:shadow-md">
            <div>
              <div className="flex items-center gap-2 text-brand-primary">
                <Sparkles className="h-5 w-5" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Oportunidades
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-text-primary md:text-2xl">
                Ofertas y demanda activa
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Buscá alquileres recientes, temporarios o propiedades en venta con el mismo motor
                de filtros y mapa. Te guiamos para no perderte en opciones irrelevantes.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/alquiler">Ver alquiler</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/oportunidades">Más sobre oportunidades</Link>
              </Button>
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-bold text-text-primary md:text-xl">
            Explorar por tipo
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Atajos al listado con el tipo ya elegido; podés afinar ciudad, precio y mapa después.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {EXPLORE_TYPES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group rounded-xl border border-border/80 bg-surface-primary p-4 shadow-sm transition-all hover:border-brand-primary/30 hover:shadow-md"
              >
                <p className="font-semibold text-text-primary group-hover:text-brand-primary">
                  {t.label}
                </p>
                <p className="mt-1 text-xs text-text-tertiary">{t.hint}</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-text-primary md:text-xl">Buscar por zona</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Un toque y abrís el buscador con la zona precargada.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {POPULAR_ZONES.map((z) => (
              <Button key={z.href} variant="secondary" size="sm" asChild className="rounded-full">
                <Link href={z.href} className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  {z.label}
                </Link>
              </Button>
            ))}
            <Button variant="outline" size="sm" asChild className="rounded-full">
              <Link href="/buscar">Todas las zonas</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
