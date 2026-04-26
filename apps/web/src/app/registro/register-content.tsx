'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button, Card, Input } from '@propieya/ui'
import {
  ACCOUNT_INTENT_LABELS,
  ACCOUNT_INTENT_VALUES,
  formatTrpcUserMessage,
  PORTAL_VOICE_CTA,
  type AccountIntent,
} from '@propieya/shared'

import { portalLoginHref } from '@/lib/portal-auth-return'
import { trpc } from '@/lib/trpc'

function intentFromQuery(raw: string | null): AccountIntent {
  if (
    raw &&
    (ACCOUNT_INTENT_VALUES as readonly string[]).includes(raw)
  ) {
    return raw as AccountIntent
  }
  return 'seeker'
}

export function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<1 | 2>(1)
  const [accountIntent, setAccountIntent] = useState<AccountIntent>('seeker')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const q = searchParams.get('intent')
    setAccountIntent(intentFromQuery(q))
  }, [searchParams])

  const nextAfterRegister = searchParams.get('next')
  const loginDest =
    nextAfterRegister && nextAfterRegister.startsWith('/') && !nextAfterRegister.startsWith('//')
      ? nextAfterRegister
      : '/buscar'
  const [loginPath, ...loginQsParts] = loginDest.split('?')
  const loginHref = portalLoginHref(loginPath || '/buscar', loginQsParts.join('?'))

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      const base = '/login?registered=1'
      const url =
        nextAfterRegister && nextAfterRegister.startsWith('/') && !nextAfterRegister.startsWith('//')
          ? `${base}&next=${encodeURIComponent(nextAfterRegister)}`
          : base
      router.push(url)
    },
    onError: (err) => {
      setError(formatTrpcUserMessage(err) || 'No se pudo crear la cuenta')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    registerMutation.mutate({
      name,
      email,
      password,
      accountIntent,
      organizationName:
        accountIntent === 'agency_publisher'
          ? organizationName.trim()
          : undefined,
    })
  }

  const goStep2 = () => {
    setError('')
    setStep(2)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Crear cuenta
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Elegí cómo vas a usar Propieya. Podés cambiar el enfoque más adelante
          con soporte; lo importante es empezar con el flujo correcto.
        </p>

        {error ? (
          <div className="mb-4 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Paso 1 — Tu perfil
            </p>
            {(ACCOUNT_INTENT_VALUES as readonly AccountIntent[]).map((key) => {
              const cfg = ACCOUNT_INTENT_LABELS[key]
              const selected = accountIntent === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccountIntent(key)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selected
                      ? 'border-brand-primary bg-brand-primary/5'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  <span className="font-semibold text-text-primary">
                    {cfg.title}
                  </span>
                  <p className="mt-1 text-sm text-text-secondary">
                    {cfg.description}
                  </p>
                </button>
              )
            })}
            <Button type="button" className="w-full mt-4" onClick={goStep2}>
              Continuar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Paso 2 — Datos
            </p>
            <p className="text-sm text-text-secondary rounded-md bg-surface-secondary px-3 py-2">
              <strong className="text-text-primary">
                {ACCOUNT_INTENT_LABELS[accountIntent].title}
              </strong>
            </p>
            <Input
              type="text"
              placeholder="Nombre y apellido"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {accountIntent === 'agency_publisher' ? (
              <Input
                type="text"
                placeholder="Nombre de la inmobiliaria"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            ) : null}
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-text-tertiary">
                Mínimo 8 caracteres, al menos una mayúscula y un número.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Atrás
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creando…' : 'Crear cuenta'}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-sm text-text-secondary">
          ¿Ya tenés cuenta?{' '}
          <Link href={loginHref} className="text-brand-primary hover:underline">
            {PORTAL_VOICE_CTA.login}
          </Link>
        </p>
        <p className="mt-3 text-xs text-text-tertiary">
          <strong>Publicadores</strong> (dueño o inmobiliaria): después entrá al{' '}
          <Link
            href="/publicar"
            className="text-brand-primary hover:underline"
          >
            flujo para publicar
          </Link>{' '}
          para abrir el panel.
        </p>
      </Card>
    </div>
  )
}
