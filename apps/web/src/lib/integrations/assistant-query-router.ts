/**
 * Enrutamiento liviano: KiteProp propiedades / leads / buscador portal.
 */

export type AssistantQueryFlags = {
  useKitepropProperties: boolean
  useKitepropLeads: boolean
  usePortalSearch: boolean
}

export function classifyAssistantPrompt(prompt: string): AssistantQueryFlags {
  const s = prompt.toLowerCase()

  const leadHints =
    /\blead|\bleads\b|\bmensaje|\bmensajes\b|\bconsultas?\b|\binbox\b|\bcrm\b|\bkiteprop\b.*(lead|mensaje)|\bactivos\b|\bpendientes\b/.test(
      s
    )

  const propHints =
    /\bcasa|\bcasas\b|\bdepa|\bdepto\b|\bpropiedad|\bventa\b|\balquiler\b|\bdorm|\bambiente|\bpileta|\bpiscina|\blote\b|\busd|\bu\$s|\$\s*\d|\bprecio\b|\bm2\b|\bmetros\b|\bfunes\b|\brosario\b|\bbarrio\b|\bzona\b|\bmostrame\b|\bbusc(a|á)\b/.test(
      s
    )

  const generic = /\bbuscar\b|\bencontr(a|á)\b|\bver\b|\blist(a|á)\b/.test(s)

  return {
    useKitepropLeads: leadHints,
    useKitepropProperties: propHints || (!leadHints && (generic || !propHints)),
    usePortalSearch:
      !leadHints || propHints || generic || /\bportal\b|\bpropieya\b/.test(s),
  }
}
