'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button, Card, Input } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      router.push('/login')
    },
    onError: (err) => {
      setError(err.message || 'No se pudo crear la cuenta')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    registerMutation.mutate({ name, email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Crear cuenta</h1>
        <p className="text-sm text-text-secondary mb-6">
          Empezá a usar Propieya en minutos.
        </p>

        {error ? (
          <div className="mb-4 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Nombre y apellido"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-text-secondary">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-brand-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}
