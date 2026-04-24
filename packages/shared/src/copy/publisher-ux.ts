/**
 * Copy operativo: publicar / panel / cupos (es-AR).
 */

export const PUBLISHER_UX_COPY = {
  profileAgency: 'Inmobiliaria',
  profileOwner: 'Dueño directo',
  profileGeneric: 'Cuenta publicadora',

  quotaUnlimited: 'Publicaciones: sin tope fijo en tu plan actual.',
  quotaLine: (used: number, cap: number) =>
    `Publicaciones: ${used} de ${cap} en uso (incluye borradores y avisos publicados, excepto archivados o dados de baja).`,

  nearLimit:
    'Estás cerca del límite de avisos. Revisá borradores o avisos viejos y archivá o dá de baja lo que no uses.',

  atLimitTitle: 'Límite de avisos alcanzado',
  atLimitBody:
    'Para crear un aviso nuevo, archivá o dá de baja uno existente, o contactanos si necesitás ampliar el cupo (inmobiliarias).',

  orgSuspended:
    'Tu cuenta publicadora está suspendida. No podés crear avisos nuevos hasta regularizar el estado. Contactá soporte si no sabés el motivo.',

  orgPending:
    'Tu organización figura en revisión. Si hace mucho que no avanzás, contactanos con tu email de registro.',

  accountSeekerNoOrg:
    'Tenés una cuenta de buscador. Para publicar, creá una cuenta de inmobiliaria o de dueño directo (abajo) o, si ya empezaste otro registro, usá el mail correcto.',

  qualityBoxTitle: 'Requisitos para publicar en el portal',
  qualityLine: (p: {
    minPhotos: number
    minTitle: number
    minDesc: number
    staleDays: number
  }) =>
    `Fotos mínimas: ${p.minPhotos}. Título: al menos ${p.minTitle} caracteres. Descripción: al menos ${p.minDesc}. La vigencia se renueva mientras el contenido no quede desactualizado (revisión cada ${p.staleDays} días aprox.).`,

  validationRejected:
    'Este aviso no cumple las reglas de calidad o integración. Revisá el detalle en la ficha, corregí y volvé a publicar.',

  validationExpired:
    'El aviso venció por contenido desactualizado. Editá y guardá, o renová la vigencia desde el panel para volver a publicar.',
} as const
