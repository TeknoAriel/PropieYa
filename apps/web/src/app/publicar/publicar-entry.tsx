'use client'

import Link from 'next/link'

import { Button, Card } from '@propieya/ui'
import {
  DEFAULT_INDIVIDUAL_OWNER_LISTING_CAP,
  PUBLISHER_UX_COPY,
  publisherProfileLabel,
} from '@propieya/shared'

import { getAccessToken } from '@/lib/auth-storage'
import { trpc } from '@/lib/trpc'

const PANEL_URL =
  process.env.NEXT_PUBLIC_PANEL_URL ?? 'https://propieya-panel.vercel.app'

const LOGIN_WITH_RETURN = '/login?next=%2Fpublicar'
const REGISTER_OWNER_WITH_RETURN = '/registro?intent=owner_publisher&next=%2Fpublicar'
const REGISTER_AGENCY_WITH_RETURN = '/registro?intent=agency_publisher&next=%2Fpublicar'

export function PublicarEntry() {
  const hasToken = Boolean(getAccessToken())
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: hasToken,
    retry: false,
    /** Tras login con `next=/publicar`, no usar caché vieja del perfil/cupo. */
    staleTime: 0,
    refetchOnMount: true,
  })

  const me = meQuery.data
  const hasPublisherOrg = Boolean(me?.organizationId)
  const pub = me?.publisher
  const profileLabel = me
    ? publisherProfileLabel({
        orgType: pub?.organizationType ?? 'seeker',
        accountIntent: me.accountIntent ?? 'seeker',
      })
    : 'publicador'
  const quality = me?.qualityRules

  if (meQuery.isLoading) {
    return (
      <Card className="w-full max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-bold text-text-primary">Publicar propiedad</h1>
        <p className="text-sm text-text-secondary">Revisando tu perfil y cupos…</p>
      </Card>
    )
  }

  if (hasToken && hasPublisherOrg && !pub) {
    return (
      <Card className="w-full max-w-3xl space-y-4 p-8">
        <h1 className="text-2xl font-bold text-text-primary">No pudimos cargar tu perfil</h1>
        <p className="text-text-secondary">
          Volvé a iniciar sesión. Si el problema continúa, contactá soporte con tu email.
        </p>
        <Button asChild variant="outline">
          <Link href="/login?next=%2Fpublicar">Volver a iniciar sesión</Link>
        </Button>
      </Card>
    )
  }

  if (hasToken && hasPublisherOrg && pub) {
    if (pub.isSuspended) {
      return (
        <Card className="w-full max-w-3xl space-y-6 p-8">
          <h1 className="text-2xl font-bold text-text-primary">Cuenta publicadora suspendida</h1>
          <p className="text-text-secondary">{PUBLISHER_UX_COPY.orgSuspended}</p>
          <Button asChild variant="outline">
            <Link href="/contacto">Contacto</Link>
          </Button>
        </Card>
      )
    }

    if (pub.isPending) {
      return (
        <Card className="w-full max-w-3xl space-y-6 p-8">
          <h1 className="text-2xl font-bold text-text-primary">Cuenta en revisión</h1>
          <p className="text-text-secondary">{PUBLISHER_UX_COPY.orgPending}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={`${PANEL_URL}/propiedades`}>Ir al panel</a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/contacto">Necesito ayuda</Link>
            </Button>
          </div>
        </Card>
      )
    }

    if (pub.atLimit) {
      return (
        <Card className="w-full max-w-3xl space-y-6 p-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {PUBLISHER_UX_COPY.atLimitTitle}
          </h1>
          <p className="text-text-secondary">
            {pub.effectiveListingLimit != null
              ? PUBLISHER_UX_COPY.quotaLine(
                  pub.listingCount,
                  pub.effectiveListingLimit
                )
              : null}{' '}
            {PUBLISHER_UX_COPY.atLimitBody}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={`${PANEL_URL}/propiedades`}>Gestionar avisos en el panel</a>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/contacto">Ampliar cupo / consultar</Link>
            </Button>
          </div>
        </Card>
      )
    }

    return (
      <Card className="w-full max-w-3xl space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Publicar en Propieya</h1>
          <p className="mt-2 text-text-secondary">
            Publicás como <span className="font-medium text-text-primary">{profileLabel}</span>
            {pub.organizationName ? (
              <> · {pub.organizationName}</>
            ) : null}
            {pub.verifiedAt ? (
              <span className="block text-xs text-text-tertiary">
                Cuenta verificada en el sistema.
              </span>
            ) : null}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Cupo de avisos</p>
          {pub.effectiveListingLimit == null ? (
            <p className="mt-1">{PUBLISHER_UX_COPY.quotaUnlimited}</p>
          ) : (
            <p className="mt-1">
              {PUBLISHER_UX_COPY.quotaLine(
                pub.listingCount,
                pub.effectiveListingLimit
              )}
            </p>
          )}
          {pub.nearLimit ? (
            <p className="mt-2 text-amber-800 dark:text-amber-200/90">
              {PUBLISHER_UX_COPY.nearLimit}
            </p>
          ) : null}
        </div>

        {quality ? (
          <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
            <p className="font-semibold text-text-primary">
              {PUBLISHER_UX_COPY.qualityBoxTitle}
            </p>
            <p className="mt-2">
              {PUBLISHER_UX_COPY.qualityLine({
                minPhotos: quality.minPhotos,
                minTitle: quality.minTitleLength,
                minDesc: quality.minDescriptionLength,
                staleDays: quality.staleContentDays,
              })}
            </p>
            <p className="mt-2 text-xs text-text-tertiary">
              Si un aviso queda rechazado o vence por desactualización, en el panel vas a ver
              el motivo y qué ajustar para volver a publicar.
            </p>
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Flujo</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>En el panel, creá un aviso o seguí un borrador.</li>
            <li>Completá datos, fotos y ubicación.</li>
            <li>Publicá y controlá el estado (activo, por vencer, etc.).</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {pub.canCreateListing ? (
            <Button asChild className="w-full sm:w-auto">
              <a href={`${PANEL_URL}/propiedades/nueva`}>Crear nuevo aviso</a>
            </Button>
          ) : (
            <Button asChild className="w-full sm:w-auto" variant="secondary">
              <a href={`${PANEL_URL}/propiedades`}>Abrir el panel</a>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href={`${PANEL_URL}/propiedades`}>Ver mis avisos</a>
          </Button>
        </div>
      </Card>
    )
  }

  if (hasToken && !hasPublisherOrg) {
    return (
      <Card className="w-full max-w-3xl space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Falta un perfil publicador</h1>
          <p className="mt-2 text-text-secondary">
            {me?.accountIntent === 'seeker'
              ? PUBLISHER_UX_COPY.accountSeekerNoOrg
              : 'Para publicar hace falta una inmobiliaria o cuenta de dueño directo. Podés registrar una ahora o usar otro mail si ya tenés una.'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Cómo seguir</p>
          <p className="mt-1">
            Elegí inmobiliaria o dueño directo. Luego ingresá al panel con el mismo usuario.
          </p>
        </div>
        {quality ? (
          <p className="text-xs text-text-tertiary">
            {PUBLISHER_UX_COPY.qualityLine({
              minPhotos: quality.minPhotos,
              minTitle: quality.minTitleLength,
              minDesc: quality.minDescriptionLength,
              staleDays: quality.staleContentDays,
            })}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href={REGISTER_OWNER_WITH_RETURN}>Crear cuenta de dueño directo</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={REGISTER_AGENCY_WITH_RETURN}>Crear cuenta de inmobiliaria</Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Publicar propiedades en Propieya
        </h1>
        <p className="mt-2 text-text-secondary">
          Elegí el tipo de cuenta y usá el panel para crear y publicar avisos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Inmobiliaria</p>
          <p className="mt-1">Equipos o marcas; cupo operativo según plan (por defecto sin tope fijo en la base).</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Registro con nombre de inmobiliaria.</li>
            <li>Panel: avisos y calidad de publicación.</li>
            <li>Revisá cupo en /publicar al iniciar sesión.</li>
          </ol>
          <Button asChild className="mt-4 w-full" size="sm">
            <Link href={REGISTER_AGENCY_WITH_RETURN}>Empezar como inmobiliaria</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-surface-secondary/50 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Dueño directo</p>
          <p className="mt-1">
            Particulares: cupo inicial orientativo de {DEFAULT_INDIVIDUAL_OWNER_LISTING_CAP} avisos
            (borradores y publicados; configurable en la organización).
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Registro de dueño directo.</li>
            <li>Panel: carga y publicación.</li>
            <li>Requisitos mínimos de fotos y texto al publicar.</li>
          </ol>
          <Button asChild className="mt-4 w-full" size="sm">
            <Link href={REGISTER_OWNER_WITH_RETURN}>Empezar como dueño directo</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={LOGIN_WITH_RETURN}>Ya tengo cuenta</Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/buscar">Solo quiero buscar propiedades</Link>
        </Button>
      </div>
    </Card>
  )
}
