'use client'

import { useState } from 'react'

import { Button, Card, Input, Skeleton } from '@propieya/ui'

import { trpc } from '@/lib/trpc'

const ROLE_OPTIONS = [
  { value: 'agent', label: 'Agente' },
  { value: 'coordinator', label: 'Coordinador' },
  { value: 'org_admin', label: 'Admin de organización' },
] as const

export default function EquipoPage() {
  const utils = trpc.useUtils()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]['value']>('agent')
  const [copied, setCopied] = useState(false)

  const membersQuery = trpc.organization.listMembers.useQuery(undefined, {
    retry: false,
  })
  const invitesQuery = trpc.organization.listPendingInvites.useQuery(undefined, {
    retry: false,
  })

  const createInvite = trpc.organization.createInvite.useMutation({
    onSuccess: () => {
      setEmail('')
      void utils.organization.listPendingInvites.invalidate()
    },
  })

  const revokeInvite = trpc.organization.revokeInvite.useMutation({
    onSuccess: () => void utils.organization.listPendingInvites.invalidate(),
  })

  const orgError =
    membersQuery.isError &&
    (membersQuery.error.message?.includes('Organization') ||
      membersQuery.error.message?.includes('organización'))

  if (membersQuery.isLoading || invitesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (orgError || !membersQuery.data) {
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold text-text-primary">Equipo</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tu sesión no tiene una organización asociada. Iniciá sesión con una cuenta de
          inmobiliaria o aceptá una invitación desde el portal.
        </p>
      </Card>
    )
  }

  const lastLink = createInvite.data?.acceptUrl

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Equipo</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Miembros de tu organización e invitaciones pendientes.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Invitar</h2>
        <p className="text-sm text-text-secondary">
          El invitado debe registrarse o iniciar sesión en el portal con el mismo correo
          y abrir el enlace de aceptación.
        </p>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            if (!email.trim()) return
            createInvite.mutate({ email: email.trim(), role })
          }}
        >
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-text-secondary" htmlFor="invite-email">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colega@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="w-full space-y-1 sm:w-52">
            <label className="text-xs font-medium text-text-secondary" htmlFor="invite-role">
              Rol
            </label>
            <select
              id="invite-role"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as (typeof ROLE_OPTIONS)[number]['value'])
              }
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={createInvite.isPending}>
            {createInvite.isPending ? 'Creando…' : 'Generar invitación'}
          </Button>
        </form>
        {createInvite.isError ? (
          <p className="text-sm text-semantic-error">{createInvite.error.message}</p>
        ) : null}
        {lastLink ? (
          <div className="rounded-md border border-border bg-surface-secondary/60 p-3 text-sm">
            <p className="font-medium text-text-primary">Enlace de aceptación</p>
            <p className="mt-1 break-all text-text-secondary">{lastLink}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                void navigator.clipboard.writeText(lastLink)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold">Invitaciones pendientes</h2>
        {invitesQuery.data?.length === 0 ? (
          <p className="text-sm text-text-secondary">No hay invitaciones vigentes.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invitesQuery.data?.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-primary">{inv.email}</p>
                  <p className="text-text-tertiary">
                    Rol: {inv.role} · vence{' '}
                    {new Date(inv.expiresAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revokeInvite.isPending}
                  onClick={() => revokeInvite.mutate({ id: inv.id })}
                >
                  Revocar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold">Miembros</h2>
        <ul className="divide-y divide-border">
          {membersQuery.data.map((m) => (
            <li key={m.id} className="py-3 text-sm">
              <p className="font-medium text-text-primary">{m.name}</p>
              <p className="text-text-secondary">{m.email}</p>
              <p className="text-text-tertiary">Rol: {m.role}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
