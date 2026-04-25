'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import {
  formatTrpcUserMessage,
  PORTAL_SEARCH_UX_COPY,
  PORTAL_VOICE_CTA,
} from '@propieya/shared'
import { Button, Card, Input } from '@propieya/ui'

import { setAccessToken } from '@/lib/auth-storage'
import { portalRegistroHref } from '@/lib/portal-auth-return'
import { trpc } from '@/lib/trpc'

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/'
  }
  return raw
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const nextParam = searchParams.get('next')
  const registeredJustNow = searchParams.get('registered') === '1'

  const registroDest =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/buscar'
  const [registroPath, ...registroQsParts] = registroDest.split('?')
  const registroHref = portalRegistroHref(registroPath || '/buscar', registroQsParts.join('?'))

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      router.push(safeNext(nextParam))
    },
    onError: (err) => {
      setError(formatTrpcUserMessage(err) || 'No pudimos iniciar sesión.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {PORTAL_VOICE_CTA.login}
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Accedé a tu cuenta de Propieya.
        </p>

        {registeredJustNow ? (
          <div className="mb-4 rounded-md border border-semantic-success/25 bg-semantic-success/10 px-3 py-2 text-sm text-text-primary">
            {PORTAL_SEARCH_UX_COPY.loginAfterRegisterBanner}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending
              ? PORTAL_VOICE_CTA.loginSubmitPending
              : PORTAL_VOICE_CTA.loginSubmit}
          </Button>
        </form>

        <p className="mt-6 text-sm text-text-secondary">
          ¿No tenés cuenta?{' '}
          <Link href={registroHref} className="text-brand-primary hover:underline">
            Crear cuenta
          </Link>
        </p>
      </Card>
    </div>
  )
}
