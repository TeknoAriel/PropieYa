'use client'

import { Button, Input, Card } from '@propieya/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { setTokens } from '@/lib/auth-store'
import { safeInternalPath } from '@/lib/safe-redirect'
import { trpc } from '@/lib/trpc'

const MAGIC_LINK_UI =
  process.env.NEXT_PUBLIC_MAGIC_LINK_TEST_MODE === '1'

export default function LoginPage() {
  const router = useRouter()
  const [redirectTo, setRedirectTo] = useState('/dashboard')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [magicEmail, setMagicEmail] = useState('')
  const [magicName, setMagicName] = useState('')
  const [magicLinkUrl, setMagicLinkUrl] = useState('')
  const [magicError, setMagicError] = useState('')

  useEffect(() => {
    const redirect = new URLSearchParams(window.location.search).get('redirect')
    if (redirect) {
      setRedirectTo(safeInternalPath(redirect))
    }
  }, [])

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (result) => {
      setTokens(result.accessToken, result.refreshToken)
      router.push(redirectTo)
    },
    onError: (err) => {
      setError(err.message ?? 'Error al iniciar sesión')
    },
  })

  const magicMutation = trpc.auth.generateTestMagicLink.useMutation({
    onSuccess: (data) => {
      setMagicLinkUrl(data.url)
      setMagicError('')
    },
    onError: (err) => {
      setMagicError(err.message ?? 'No se pudo generar el enlace')
      setMagicLinkUrl('')
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-primary">Propieya</h1>
          <p className="mt-2 text-text-secondary">Panel de Gestión</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-semantic-error/10 text-semantic-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-primary mb-1.5"
            >
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-text-secondary">Recordarme</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-brand-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-text-secondary">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-brand-primary hover:underline">
            Registrate en el portal
          </Link>
        </div>

        {MAGIC_LINK_UI ? (
          <div className="mt-8 border-t border-border pt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Modo prueba — magic link
            </p>
            <p className="text-xs text-text-secondary">
              Generá un enlace de un solo uso (15 min). Requiere{' '}
              <code className="rounded bg-surface-secondary px-1">MAGIC_LINK_TEST_MODE=1</code>{' '}
              en el proyecto <strong>web</strong> (Vercel).
            </p>
            <Input
              type="email"
              placeholder="Email (se crea usuario si no existe)"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Nombre (opcional, si es usuario nuevo)"
              value={magicName}
              onChange={(e) => setMagicName(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={magicMutation.isPending || !magicEmail.trim()}
              onClick={() => {
                setMagicLinkUrl('')
                magicMutation.mutate({
                  email: magicEmail.trim(),
                  name: magicName.trim() || undefined,
                  createIfMissing: true,
                })
              }}
            >
              {magicMutation.isPending ? 'Generando…' : 'Generar enlace de acceso'}
            </Button>
            {magicError ? (
              <p className="text-xs text-semantic-error">{magicError}</p>
            ) : null}
            {magicLinkUrl ? (
              <div className="rounded-lg bg-surface-secondary p-3 text-left">
                <p className="text-xs text-text-secondary mb-1">
                  Abrí o copiá este enlace:
                </p>
                <a
                  href={magicLinkUrl}
                  className="text-xs break-all text-brand-primary hover:underline"
                >
                  {magicLinkUrl}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  )
}
