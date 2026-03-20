'use client'

import Link from 'next/link'

import { Button, Menu, Moon, Sun } from '@propieya/ui'
import { useTheme } from '@/lib/theme-provider'

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()

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
            Buscar
          </Link>
          <Link
            href="/venta"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Venta
          </Link>
          <Link
            href="/alquiler"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Alquiler
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
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/publicar">Publicar</Link>
            </Button>
          </div>

          {/* Mobile menu */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
