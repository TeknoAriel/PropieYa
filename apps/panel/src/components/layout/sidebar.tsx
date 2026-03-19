'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  cn,
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  Settings,
  LogOut,
} from '@propieya/ui'

import { trpc } from '@/lib/trpc'
import { getRefreshToken, clearTokens } from '@/lib/auth-store'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/propiedades', label: 'Propiedades', icon: Building2 },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/mensajes', label: 'Mensajes', icon: MessageSquare },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      clearTokens()
      router.push('/login')
    },
  })

  const handleLogout = () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      logoutMutation.mutate({ refreshToken })
    } else {
      clearTokens()
      router.push('/login')
    }
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-surface-primary px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-bold text-brand-primary">
                Propieya
              </span>
              <span className="text-xs text-text-tertiary">Panel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-primary/10 text-brand-primary'
                          : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* User section */}
            <div className="mt-auto pt-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-brand-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-brand-primary">
                    IN
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    Inmobiliaria Norte
                  </p>
                  <p className="text-xs text-text-tertiary truncate">
                    admin@inmobiliarianorte.com
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-semantic-error rounded-lg hover:bg-surface-secondary transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {logoutMutation.isPending ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
          </nav>
        </div>
      </aside>
    </>
  )
}
