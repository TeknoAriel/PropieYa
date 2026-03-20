'use client'

import { Button, Input, Card } from '@propieya/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { setTokens } from '@/lib/auth-store'
import { safeInternalPath } from '@/lib/safe-redirect'
import { trpc } from '@/lib/trpc'

export default function LoginPage() {
  const router = useRouter()
  const [redirectTo, setRedirectTo] = useState('/dashboard')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
      </Card>
    </div>
  )
}
