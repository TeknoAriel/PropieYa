'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

import { PORTAL_SEARCH_UX_COPY as S } from '@propieya/shared'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@propieya/ui'

import { clearAccessToken, getAccessToken } from '@/lib/auth-storage'
import { portalLoginHref } from '@/lib/portal-auth-return'
import { PORTAL_ACCOUNT } from '@/lib/portal-nav'
import { trpc } from '@/lib/trpc'

function HeaderAuthInner({
  variant,
  mobileNavClass,
  closeMobile,
}: {
  variant: 'toolbar' | 'drawer'
  mobileNavClass: string
  closeMobile: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const qs = searchParams.toString()
  const loginHref = portalLoginHref(pathname, qs)

  const [canAuth, setCanAuth] = useState(false)
  useEffect(() => {
    setCanAuth(!!getAccessToken())
  }, [])

  const utils = trpc.useUtils()
  const { data: me } = trpc.auth.me.useQuery(undefined, {
    enabled: canAuth,
    retry: false,
  })

  const onLogout = () => {
    clearAccessToken()
    setCanAuth(false)
    void utils.auth.me.invalidate()
    closeMobile()
  }

  if (variant === 'toolbar') {
    if (me) {
      return (
        <div className="hidden items-center gap-0.5 lg:flex">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs font-normal text-text-tertiary hover:text-text-secondary"
          >
            <Link href={PORTAL_ACCOUNT.compare.href}>{PORTAL_ACCOUNT.compare.label}</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs font-normal text-text-tertiary hover:text-text-secondary"
          >
            <Link href={PORTAL_ACCOUNT.alerts.href}>{PORTAL_ACCOUNT.alerts.label}</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                {S.accountMenuTrigger}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="truncate text-xs font-normal text-text-tertiary">
                {me.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil-demanda">{S.accountMenuProfile}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/mis-alertas">{S.accountMenuAlerts}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>{S.accountMenuLogout}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }

    return (
      <div className="hidden items-center gap-0.5 lg:flex">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-xs font-normal text-text-tertiary hover:text-text-secondary"
        >
          <Link href={PORTAL_ACCOUNT.compare.href}>{PORTAL_ACCOUNT.compare.label}</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-xs font-normal text-text-tertiary hover:text-text-secondary"
        >
          <Link href={PORTAL_ACCOUNT.alerts.href}>{PORTAL_ACCOUNT.alerts.label}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="text-sm font-medium">
          <Link href={loginHref}>{PORTAL_ACCOUNT.login.label}</Link>
        </Button>
      </div>
    )
  }

  /* drawer */
  if (me) {
    return (
      <>
        <Link href={PORTAL_ACCOUNT.compare.href} className={mobileNavClass} onClick={closeMobile}>
          {PORTAL_ACCOUNT.compare.label}
        </Link>
        <Link href={PORTAL_ACCOUNT.alerts.href} className={mobileNavClass} onClick={closeMobile}>
          {PORTAL_ACCOUNT.alerts.label}
        </Link>
        <Link href="/perfil-demanda" className={mobileNavClass} onClick={closeMobile}>
          {S.accountMenuProfile}
        </Link>
        <button type="button" className={`${mobileNavClass} text-left`} onClick={onLogout}>
          {S.accountMenuLogout}
        </button>
      </>
    )
  }

  return (
    <>
      <Link href={PORTAL_ACCOUNT.compare.href} className={mobileNavClass} onClick={closeMobile}>
        {PORTAL_ACCOUNT.compare.label}
      </Link>
      <Link href={PORTAL_ACCOUNT.alerts.href} className={mobileNavClass} onClick={closeMobile}>
        {PORTAL_ACCOUNT.alerts.label}
      </Link>
      <Link href={loginHref} className={mobileNavClass} onClick={closeMobile}>
        {PORTAL_ACCOUNT.login.label}
      </Link>
    </>
  )
}

export function HeaderAuthControls({
  variant,
  mobileNavClass,
  closeMobile,
}: {
  variant: 'toolbar' | 'drawer'
  mobileNavClass: string
  closeMobile: () => void
}) {
  return (
    <Suspense
      fallback={
        variant === 'toolbar' ? (
          <div className="hidden items-center gap-0.5 lg:flex">
            <Button variant="ghost" size="sm" asChild className="text-sm font-medium">
              <Link href="/login">{PORTAL_ACCOUNT.login.label}</Link>
            </Button>
          </div>
        ) : (
          <Link href="/login" className={mobileNavClass} onClick={closeMobile}>
            {PORTAL_ACCOUNT.login.label}
          </Link>
        )
      }
    >
      <HeaderAuthInner
        variant={variant}
        mobileNavClass={mobileNavClass}
        closeMobile={closeMobile}
      />
    </Suspense>
  )
}
