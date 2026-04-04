# Anexo al masterplan — Mejoras de valor integrables sin contaminar el core

**Tipo:** entregable operativo derivado de **`docs/42-DIRECTIVA-OPERATIVA-PROPIEYA.md`**.  
**Complementa:** `docs/00`, `docs/38`, `docs/41`.  
**Objetivo:** una sola vista de **matriz + clasificación + recomendaciones + backlog** sin duplicar la narrativa larga de 42.

---

## 1. Resumen ejecutivo

Propieya debe crecer **reforzando** descubrimiento, decisión, confianza y calidad de inventario, usando **la misma tubería** (datos, `listing.search`, asistente, alertas, panel). Las filas de la matriz siguiente son **épicos**; la ejecución sigue **`docs/24-sprints-y-hitos.md`** (p. ej. Sprint 26 para facets/ES/dedup).

**Clasificación usada**

| Etiqueta | Significado |
|----------|-------------|
| **Core** | Va al portal/panel principal; sin esto el diferencial se debilita. |
| **Extensión nativa** | Producto Propieya, pero módulo acotado y ordenado (ej. un solo “centro de decisión”). |
| **Add-on B2B** | Monetizable; no debe competir con la búsqueda del buscador. |
| **Fase futura** | Válido pero no ahora; riesgo de Frankenstein o dependencias fuertes. |

---

## 2. Matriz (mejora → valor → técnico → prioridad → clasificación)

Prioridad **P1** = alineada a doc 42 §12 primer bloque; **P4** = explícitamente posterior.

| Mejora | Valor usuario / negocio | Impacto técnico | Prio. | Clasificación |
|--------|-------------------------|-----------------|-------|---------------|
| Catálogo de facets + mapeo desde feeds (Yumblin/Zonaprop) | Filtros y asistente cubren atributos reales; MLS-ready | Alto — schema, import, contrato search | P1 | Core |
| `listing.search` + ES + SQL unificados para facets dinámicos | Misma verdad en UI, IA, alertas | Alto | P1 | Core |
| Elasticsearch: mapping + campos materializados + reindex seguro | Performance y filtros profundos en producción | Alto | P1 | Core |
| Capa semántica (alias/sinónimos) en shared + extractor | Menos frustración; mejor conversación y `q` | Medio | P1 | Core |
| Sugerencias inductivas (home/buscar) reutilizando facets y contexto | Descubrimiento; permanencia | Medio | P1 | Core |
| “Mejores coincidencias” + motivo (extender explain/match existente) | Decisión informada sin nuevo motor | Medio | P1 | Core |
| UI filtros capa 4 (contextuales por tipo/op) | Profundidad sin pantalla fija monstruo | Medio | P2 | Core |
| Mapa: lista sincronizada + refinamiento viewport (donde aplique) | Geografía como eje central | Alto | P2 | Core |
| Polígono + radio + bbox + clusters (cerrar gaps vs doc 38) | Paridad con directiva mapa | Medio (gran parte hecho) | P2 | Core |
| Alertas y búsquedas guardadas con criterios geo avanzados | Retención; mismo contrato API | Medio | P2 | Core |
| Score vigencia / freshness **visible** en ficha y listado | Confianza; menos leads basura | Medio | P1 | Core |
| Score completitud de ficha | Confianza; incentiva calidad B2B | Medio | P1 | Core |
| Trazabilidad de origen (fuente/feed) visible al usuario | Anti confusión MLS; confianza | Bajo–medio | P1 | Core |
| Dedup MLS-ready (grupo/marca, sin borrar datos) | Inventario creíble | Alto | P1 | Core |
| Historial de cambios de aviso (auditoría) | MLS y disputas | Alto | P2 | Extensión nativa |
| Verificación perfil profesional / org (fases) | Confianza B2B2C | Alto | P2 | Extensión nativa |
| Señales “publicación confiable” / antiestafa (reglas + UX) | Diferencial C | Medio | P2 | Extensión nativa |
| **Un** “Centro de decisión” (hub) con simulador/comparador | Decisión; monetización fase 2 | Alto | P2 | Extensión nativa |
| Comparador liviano 2–3 avisos (reutiliza ficha) | Decisión sin nuevo dominio | Medio | P3 | Extensión nativa |
| Simulador hipotecario / compra vs alquiler | Valor claro; riesgo de scope | Medio | P3 | Extensión nativa |
| Búsquedas relacionadas / “ampliar zona” | Descubrimiento | Medio | P2 | Core |
| UI búsquedas recientes (`searchHistory.listMine`) | Continuidad | Bajo | P2 | Core |
| Potenciador IA: descripción automática | Eficiencia publicador | Medio | P3 | Add-on B2B |
| Potenciador IA: mejora visual / ambientación | Monetización; no distraer buscador | Alto | P4 | Add-on B2B |
| White-label / multi-marca completo | Escala institucional | Muy alto | P4 | Fase futura |
| Marketplace paralelo de servicios third-party | Riesgo Frankenstein | Muy alto | — | Fase futura / no core |

---

## 3. Clasificación agregada (por capa doc 42 §3)

| Capa | Épicos principalmente aquí (ver matriz) |
|------|----------------------------------------|
| **A Descubrimiento** | Facets, semántica, sugerencias, relacionadas, mapa, alertas, recientes |
| **B Decisión** | Centro de decisión único, comparadores, simuladores (P2–P3) |
| **C Confianza** | Vigencia, completitud, origen, verificación, antiestafa |
| **D Inventario B2B** | Dedup, normalización, potenciador IA (add-on) |

---

## 4. Recomendaciones concretas

### UX

- Mantener **4 capas** de complejidad (doc 42 §6); no aplanar todo en `/buscar`.  
- Cualquier herramienta de decisión nueva debe **colgar** del futuro **Centro de decisión**, no del header como ítem suelto infinito.  
- Copy y patrones ya unificados en `portal-packs` / `PORTAL_SEARCH_UX_COPY`; extender igual para fichas (Sprint 28.8).

### Búsqueda

- Un solo contrato: **`listing.search`** (+ ES) para web, asistente y alertas.  
- Priorizar **catálogo de facets** antes de seguir hardcodeando amenities sueltos.  
- Semántica y alias como **capa de shared** consumida por UI y por intención conversacional.

### Datos

- Reutilizar `features` JSONB + campos ES materializados; trazabilidad `source` / `externalId` / org ya en schema — **exponer** donde sume confianza.  
- Dedup como **marca/agrupación**, no pérdida de información.

### MLS

- Ejecutar backlog del **Sprint 26** como hilo principal MLS-ready (coherente con doc 38).  
- Historial de cambios y permisos finos: **después** de facets + dedup base.

### Monetización

- Alinear con **`docs/39-MONETIZACION-MERCADOPAGO.md`**: primero planes/cupo/visibilidad; **no** mezclar add-ons IA en el mismo flujo de checkout del core hasta Fase 3 (doc 42 §11).

---

## 5. Backlog priorizado (limpio, sin duplicar sprints)

**Orden sugerido para el agente en automata** (cada ítem debe pasar el test anti-Frankenstein del doc 42 §1):

1. **Sprint 26 — cerrar núcleo técnico:** 26.1–26.5 (catálogo facets, mapeo feeds, schema search, API unificada, ES mapping/reindex).  
2. **Sprint 26 — cierre:** 26.6 (UI progresiva capas 3–4 donde falte), 26.7 (paridad mapa vs doc 38 si queda gap), **26.8 dedup**, 26.9 verify+deploy.  
3. **Sprint 28 pendientes de producto:** 28.8 ficha + contacto (voseo + confianza), 28.9 recientes opcional, 28.10–28.12 alineados a 26.  
4. **P1 confianza visible:** scores vigencia/completitud + origen en ficha (iteración corta tras facets).  
5. **P2 descubrimiento:** sugerencias inductivas + búsquedas relacionadas (reutilizando mismos datos).  
6. **P2 extensión:** diseño único **Centro de decisión** + primer widget (ej. comparador simple).  
7. **P3+:** simuladores, verificación org profunda, potenciador IA B2B.

**Regla:** si un ítem nuevo no encaja en la matriz o viola §1 de doc 42 → **no** se agrega al sprint actual; va a “Fase futura” en esta misma tabla o a un doc de ideas, no al core.

---

## 6. Auditoría rápida: ya contemplado en repo / docs

| Tema | Dónde está |
|------|------------|
| MLS-ready datos base | Schema listings, org, import — ver doc 37, 38 |
| Búsqueda ES + SQL fallback | `listing.search`, paquete search |
| Mapa clusters, bbox, polígono, radio | `/buscar`, doc 38 AA |
| Matching explicado | `explain-match`, UI parcial |
| Alertas y perfil demanda | `searchAlert`, demand router |
| Historial búsqueda | `search_history`, `searchHistory.listMine` |
| Monetización MP stub | doc 39, webhooks |
| Norte “más que avisos” | doc 41 |
| Directiva evolutiva | **doc 42** |
| Esta matriz y backlog | **doc 43** |

---

*Versión 1.0 — 2026-04-01.*
