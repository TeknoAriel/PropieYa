'use client'

import { formatTrpcUserMessage } from '@propieya/shared'
import { Button, Card } from '@propieya/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'

import { setTokens } from '@/lib/auth-store'
import { safeInternalPath } from '@/lib/safe-redirect'
import { trpc } from '@/lib/trpc'

function MagicLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [error, setError] = useState('')
  const consumedRef = useRef(false)

  const consume = trpc.auth.consumeMagicLink.useMutation()

  useEffect(() => {
    const redirectParam = searchParams.get('redirect')
    const redirectTo = redirectParam
      ? safeInternalPath(redirectParam)
      : '/dashboard'

    if (!token) {
      setError('Falta el token en la URL.')
      return
    }
    if (consumedRef.current) return
    consumedRef.current = true

    consume.mutate(
      { token },
      {
        onSuccess: (result) => {
          setTokens(result.accessToken, result.refreshToken)
          router.push(redirectTo)
        },
        onError: (err) => {
          setError(formatTrpcUserMessage(err) || 'No se pudo validar el enlace')
        },
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-text-primary">
          Entrando con enlace de prueba…
        </h1>
        {error ? (
          <p className="mt-4 text-sm text-semantic-error">{error}</p>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">
            {consume.isPending ? 'Validando…' : 'Redirigiendo…'}
          </p>
        )}
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/login">Volver al login</Link>
        </Button>
      </Card>
    </div>
  )
}

export default function MagicLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-text-secondary">Cargando…</p>
        </div>
      }
    >
      <MagicLoginInner />
    </Suspense>
  )
}
