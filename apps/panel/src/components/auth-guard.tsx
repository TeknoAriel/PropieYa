'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { trpc } from '@/lib/trpc'
import { getAccessToken } from '@/lib/auth-store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  const hasToken = mounted && !!getAccessToken()

  const { data, isLoading, isError } = trpc.auth.me.useQuery(undefined, {
    enabled: hasToken,
    retry: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!getAccessToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    if (!hasToken) return
    if (!isLoading && (isError || !data)) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [mounted, hasToken, isLoading, isError, data, router, pathname])

  if (!mounted || !hasToken || isLoading || isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="animate-pulse text-text-secondary">Cargando...</div>
      </div>
    )
  }

  return <>{children}</>
}
