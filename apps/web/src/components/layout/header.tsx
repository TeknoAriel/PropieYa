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

const mobileNavClass =
  'rounded-md px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface-secondary'

export function Header() {
  const pack = getPortalPack()
  const { resolvedTheme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface-primary/95 backdrop-blur supports-[backdrop-filter]:bg-surface-primary/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-brand-primary">Propieya</span>
        </Link>

        {/* Nav - Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/buscar"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {pack.nav.buscar}
          </Link>
          <Link
            href="/venta"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {pack.nav.venta}
          </Link>
          <Link
            href="/alquiler"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {pack.nav.alquiler}
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
          >
            {resolvedTheme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          {/* Auth buttons - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">{pack.cta.login}</Link>
            </Button>
            <Button asChild>
              <Link href="/publicar">{pack.cta.publish}</Link>
            </Button>
          </div>

          {/* Mobile menu (Sprint 28) */}
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

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Menú</DialogTitle>
          </DialogHeader>
          <nav className="flex flex-col gap-1" aria-label="Navegación principal">
            <Link
              href="/buscar"
              className={mobileNavClass}
              onClick={() => setMobileOpen(false)}
            >
              {pack.nav.buscar}
            </Link>
            <Link
              href="/venta"
              className={mobileNavClass}
              onClick={() => setMobileOpen(false)}
            >
              {pack.nav.venta}
            </Link>
            <Link
              href="/alquiler"
              className={mobileNavClass}
              onClick={() => setMobileOpen(false)}
            >
              {pack.nav.alquiler}
            </Link>
            <Link
              href="/nosotros"
              className={mobileNavClass}
              onClick={() => setMobileOpen(false)}
            >
              Sobre nosotros
            </Link>
            <Link
              href="/contacto"
              className={mobileNavClass}
              onClick={() => setMobileOpen(false)}
            >
              Contacto
            </Link>
            <Separator className="my-2" />
            <Link
              href="/login"
              className={mobileNavClass}
              onClick={() => setMobileOpen(false)}
            >
              {pack.cta.login}
            </Link>
            <Button asChild className="mt-1 w-full">
              <Link href="/publicar" onClick={() => setMobileOpen(false)}>
                {pack.cta.publish}
              </Link>
            </Button>
          </nav>
        </DialogContent>
      </Dialog>
    </header>
  )
}
