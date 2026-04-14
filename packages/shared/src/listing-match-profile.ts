/**
 * Perfil de matching en búsqueda pública (portal).
 * - `catalog`: filtros numéricos y localidad como restricciones duras (AND).
 * - `intent`: operación/tipo duros; precio, ubicación y mayoría de numéricos como preferencias (score ES), alineado a búsqueda guiada.
 */

export type ListingMatchProfile = 'catalog' | 'intent'

export function inferListingMatchProfile(params: {
  q?: string | null | undefined
  explicit?: ListingMatchProfile | null | undefined
}): ListingMatchProfile {
  if (params.explicit === 'catalog' || params.explicit === 'intent') {
    return params.explicit
  }
  return params.q?.trim() ? 'intent' : 'catalog'
}
