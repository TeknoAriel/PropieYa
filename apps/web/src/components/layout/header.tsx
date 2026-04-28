'use client'

import Link from 'next/link'
import { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Menu,
  Moon,
  Separator,
  Sun,
} from '@propieya/ui'
import { useTheme } from '@/lib/theme-provider'
import { getPortalPack } from '@/lib/portal-copy'
import { PORTAL_PRIMARY_NAV } from '@/lib/portal-nav'
import { BrandLogo } from './brand-logo'
import { HeaderAuthControls } from './header-auth-controls'

const mobileNavClass =
  'rounded-md px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary'

function NavLink({
  href,
  label,
  onNavigate,
  prominence = 'secondary',
}: {
  href: string
  label: string
  onNavigate?: () => void
  prominence?: 'primary' | 'secondary'
}) {
  const cls =
    prominence === 'primary'
      ? 'whitespace-nowrap text-[13px] font-semibold text-text-primary transition-colors hover:text-brand-primary lg:text-sm'
      : 'whitespace-nowrap text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary lg:text-sm'
  return (
    <Link href={href} className={cls} onClick={onNavigate}>
      {label}
    </Link>
  )
}

export function Header() {
  const pack = getPortalPack()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-[rgba(250,250,248,0.78)] shadow-sm backdrop-blur-md dark:bg-[rgba(30,30,32,0.78)]">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-3 md:h-16 md:gap-4">
          <Link href="/" className="shrink-0" aria-label="Ir al inicio">
            <BrandLogo />
          </Link>

          <nav
            className="hidden min-w-0 flex-1 justify-center overflow-x-auto px-2 md:flex md:px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            aria-label="Principal"
          >
            <div className="flex items-center gap-x-4 gap-y-1 lg:gap-x-5">
              {PORTAL_PRIMARY_NAV.map((item, i) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  prominence={i === 0 ? 'primary' : 'secondary'}
                />
              ))}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              className="hidden sm:inline-flex"
            >
              {resolvedTheme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            <HeaderAuthControls
              variant="toolbar"
              mobileNavClass={mobileNavClass}
              closeMobile={closeMobile}
            />

            <Button size="sm" className="hidden sm:inline-flex md:px-4" asChild>
              <Link href="/publicar">{pack.cta.publish}</Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Abrir menú"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Menú</DialogTitle>
          </DialogHeader>
          <nav className="flex max-h-[min(70vh,520px)] flex-col gap-1 overflow-y-auto pr-1" aria-label="Navegación principal">
            {PORTAL_PRIMARY_NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  i === 0
                    ? `${mobileNavClass} font-semibold text-text-primary`
                    : mobileNavClass
                }
                onClick={closeMobile}
              >
                {item.label}
              </Link>
            ))}
            <Separator className="my-2" />
            <HeaderAuthControls
              variant="drawer"
              mobileNavClass={mobileNavClass}
              closeMobile={closeMobile}
            />
            <Link href="/nosotros" className={mobileNavClass} onClick={closeMobile}>
              Sobre nosotros
            </Link>
            <Link href="/contacto" className={mobileNavClass} onClick={closeMobile}>
              Contacto
            </Link>
            <Separator className="my-2" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" type="button" onClick={toggleTheme}>
                Tema
              </Button>
            </div>
            <Button asChild className="mt-2 w-full">
              <Link href="/publicar" onClick={closeMobile}>
                {pack.cta.publish}
              </Link>
            </Button>
          </nav>
        </DialogContent>
      </Dialog>
    </header>
  )
}
