import type {
  ListingPublishabilityIssue,
  ListingStatus,
} from '@propieya/shared'

export function publicationIssueMessage(issue: ListingPublishabilityIssue): string {
  switch (issue.code) {
    case 'MIN_IMAGES_NOT_MET': {
      const minImages = Number(issue.details?.minImages ?? 1)
      const mediaCount = Number(issue.details?.mediaCount ?? 0)
      return `Faltan imágenes para publicarlo (${mediaCount}/${minImages}).`
    }
    case 'UNSUPPORTED_PRICE':
      return 'El precio no es válido para publicar este aviso.'
    case 'MISSING_REQUIRED_FIELDS':
      return 'Completá título, descripción y datos obligatorios para poder publicarlo.'
    case 'INVALID_LOCATION':
      return 'Completá ubicación (ciudad, provincia y barrio) para poder publicarlo.'
    case 'INVALID_PROPERTY_TYPE':
      return 'El tipo de propiedad no está soportado para publicar este aviso.'
    case 'STALE_CONTENT_EXPIRED':
      return 'Actualizá el contenido del aviso para volver a publicarlo.'
    case 'LISTING_VALIDITY_EXPIRED':
      return 'La vigencia venció. Renová el aviso para mantenerlo publicado.'
    default:
      return issue.message
  }
}

export function publicationChecklist(
  issues: ListingPublishabilityIssue[]
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const issue of issues) {
    const m = publicationIssueMessage(issue)
    if (!seen.has(m)) {
      seen.add(m)
      out.push(m)
    }
  }
  return out
}

export function statusOperationalCopy(
  status: ListingStatus,
  canPublish: boolean
): { label: string; help: string } {
  if (status === 'draft' && canPublish) {
    return {
      label: 'Listo para publicar',
      help: 'Este aviso cumple los requisitos y podés publicarlo cuando quieras.',
    }
  }
  if (status === 'draft') {
    return {
      label: 'Borrador',
      help: 'Este aviso todavía no cumple todo lo necesario para publicar.',
    }
  }
  if (status === 'active') {
    return {
      label: 'Publicado',
      help: 'El aviso está publicado y visible en el portal.',
    }
  }
  if (status === 'rejected') {
    return {
      label: 'No publicable',
      help: 'Este aviso fue rechazado y necesita correcciones para publicarse.',
    }
  }
  if (status === 'expired') {
    return {
      label: 'Vencido',
      help: 'El aviso salió de publicación por falta de actualización de contenido.',
    }
  }
  if (status === 'expiring_soon') {
    return {
      label: 'Por vencer',
      help: 'Renová este aviso para evitar que deje de publicarse.',
    }
  }
  if (status === 'suspended') {
    return {
      label: 'Suspendido',
      help: 'Renová este aviso para volver a tenerlo publicado.',
    }
  }
  return {
    label: status,
    help: 'Revisá el estado del aviso y completá los datos necesarios.',
  }
}
