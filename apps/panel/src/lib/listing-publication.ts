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

export function statusActionCopy(
  status: ListingStatus,
  canPublish: boolean,
  canRenew: boolean
): { title: string; description: string; nextAction: string } {
  if (status === 'draft' && canPublish) {
    return {
      title: 'Este aviso está listo para publicar',
      description: 'Ya cumple los requisitos de publicación.',
      nextAction: 'Próxima acción: publicalo cuando quieras.',
    }
  }
  if (status === 'draft') {
    return {
      title: 'Este aviso está en borrador',
      description: 'Todavía no cumple todo lo necesario para publicarse.',
      nextAction: 'Próxima acción: completá los faltantes y guardá cambios.',
    }
  }
  if (status === 'active') {
    return {
      title: 'Este aviso ya está publicado',
      description: 'Está visible para los usuarios del portal.',
      nextAction: 'Próxima acción: mantené el contenido actualizado.',
    }
  }
  if (status === 'rejected' && canPublish) {
    return {
      title: 'Este aviso estaba bloqueado y ya puede publicarse',
      description: 'Las correcciones necesarias ya están completas.',
      nextAction: 'Próxima acción: reintentá la publicación.',
    }
  }
  if (status === 'rejected') {
    return {
      title: 'Este aviso no puede publicarse todavía',
      description: 'Quedó rechazado por validación de contenido.',
      nextAction: 'Próxima acción: corregí los faltantes y reintentá publicar.',
    }
  }
  if (status === 'expired') {
    return {
      title: 'Este aviso está vencido',
      description: 'Se dio de baja por falta de actualización de contenido.',
      nextAction: canRenew
        ? 'Próxima acción: actualizá el contenido y renová la vigencia.'
        : 'Próxima acción: corregí los requisitos de publicación y luego renová.',
    }
  }
  if (status === 'expiring_soon') {
    return {
      title: 'Este aviso está por vencer',
      description: 'Su vigencia está cerca de finalizar.',
      nextAction: canRenew
        ? 'Próxima acción: renovalo para mantenerlo publicado.'
        : 'Próxima acción: revisá el aviso antes de renovar.',
    }
  }
  if (status === 'suspended') {
    return {
      title: 'Este aviso está suspendido',
      description: 'No está visible hasta regularizar su estado.',
      nextAction: canRenew
        ? 'Próxima acción: renová el aviso para volver a publicarlo.'
        : 'Próxima acción: corregí datos y reintentá la publicación.',
    }
  }
  return {
    title: 'Estado del aviso',
    description: 'Revisá el estado y los requisitos para seguir.',
    nextAction: 'Próxima acción: corregí los datos pendientes.',
  }
}
