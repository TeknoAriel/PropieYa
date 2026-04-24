# Política formal: fallback, relajación y alternativas (buscador, asistente, MCP)

**Estado:** análisis técnico + definición de producto. **No sustituye** `docs/50-BUSCADOR-PORTAL-ESTABILIDAD-Y-FALLBACK.md` (ES caído → SQL en `searchV2`) ni `docs/50-BUSQUEDA-NIVELES-Y-RELAX.md` (relajación legacy documentada en código); **complementa** y unifica criterios para evitar colisiones futuras.

**Auditoría basada en código** (abril 2026): `apps/web/src/lib/search/search-v2-executor.ts`, `apps/web/src/server/routers/listing.ts`, `apps/web/src/lib/search/search-layered.ts`, `apps/web/src/lib/search/search-relaxation.ts`, `apps/web/src/lib/search/search.ts`, `packages/shared/src/search-session-mvp.ts`, `packages/shared/src/listing-search-v2-es-unreachable.ts`, `apps/web/src/app/api/assistant/query/route.ts`, `apps/web/src/lib/integrations/kiteprop-mcp.ts`, `apps/web/src/lib/integrations/assistant-query-router.ts`, `apps/web/src/components/buscar/buscar-content.tsx`.

---

## 0. Principio arquitectónico: dos caminos de búsqueda en el portal

| Camino | Entrada típica | Procedimiento | Relajación |
|--------|----------------|---------------|------------|
| **A. Listado público** (`/buscar`, `/venta`, `/alquiler`) | Chips, mapa, filtros, `q` en URL | `trpc.listing.searchV2` → `runListingSearchV2` (+ `trySearchV2SqlFallback` si ES cae con 0 hits) | **Strong** siempre (exacto, paginado). **Near / widened** solo si el cliente pide `includeAlternativeBuckets` (segunda capa explícita). |
| **B. Asistente conversacional** (bloque “Contanos qué buscás”) | Texto libre + contexto previo | `trpc.listing.searchConversational` → `runConversationalSearchOrchestrator` → `searchListingsLayered` → SQL si hace falta | Secuencia `ZERO_RESULTS_RELAXATION_SEQUENCE` + pasos extra (amenities → operación) en `listing.ts` |

**El buscador principal (A) no usa MCP.** El asistente en UI (B) tampoco llama MCP: solo motor portal + ES/SQL.

**MCP** aparece en **`POST /api/assistant/query`** (integración KiteProp / panel u orquestador externo): combina slices opcionales (`queryPropertiesFromMCP`, `queryLeadsFromMCP`) con `runListingSearchV2` **solo** si el clasificador de prompt y `shouldRunPortalSearchWithPrompt` / `searchSessionHasAnchor` lo permiten. Eso **no** alimenta el listado de `/buscar` salvo que un cliente consuma esa API y fusione resultados en su propia UX.

---

## 1. TAREA 1 — Auditoría del fallback y la relajación **actuales**

### 1.A `listing.searchV2` (motor del listado público)

#### 1.A.1 Cuándo ES “no disponible” en la primera consulta (`searchListings` → `fromEs: false`)

- **Código:** `runListingSearchV2` tras `resStrong = await searchListings(...)`; si `!resStrong.fromEs`, devuelve buckets vacíos, `messages` con *“El buscador no está disponible…”* y `emptyExplanation` con *“No pudimos consultar el índice…”*.
- **UI:** `shortSearchUxMessages` muestra hasta **un** mensaje corto si el total de buckets es 0; además puede mostrarse `emptyExplanation` en tarjeta si `data.total === 0`.
- **Fallback SQL:** `trySearchV2SqlFallback` en `listing.ts` solo corre si `isSearchV2ElasticsearchUnreachable(out)` — unión de textos en `messages` **y** `emptyExplanation` que detecten frases clave del índice caído **y** totales 0. Entonces ejecuta búsqueda SQL con **`filtersStrong(session)`** (misma intención que “strong”), hasta `limitPerBucket` en strong; **near y widened quedan vacíos**. Mensaje opcional `searchSqlFallbackRowsNote` si hay filas.

#### 1.A.2 Mapa sin comprometer (`mapCommitted === false` pero hay bbox/polígono)

- **Código:** se agrega a `messages`: *“El mapa se muestra como referencia…”*; **geo no entra** en `filtersStrong/Near/Widened` (`geoSlice` devuelve `{}`).

#### 1.A.3 Mapa comprometido (`mapCommitted === true`)

- **Bbox:** filtros ES incluyen `bbox`; post-filtro `hitInsideCommittedBbox` excluye hits sin coords o fuera del rectángulo.
- **Polígono:** `polygon` en filtros; `mapPolygonActive` en explain; post-filtro acorde a bucket (misma lógica de geo en sesión).
- **Relajación v2:** **no** se elimina mapa en `filtersNear` / `filtersWidened` / `filtersWidenedDropFreeText` — el recorte geográfico se mantiene salvo acciones UI (`buildActions` puede proponer “Dejar de filtrar por el mapa”).

#### 1.A.4 Buckets y orden de relajación **solo en ES operativo**

| Etapa | Filtros respecto a sesión | Cuándo se ejecuta |
|-------|---------------------------|-------------------|
| **strong** | Todo lo normalizado: `q`, operación, tipo, ciudad, barrio, precio, dormis, superficie, amenities (`strict` vs `preferred`), geo si mapa comprometido | Siempre (primera query ES) |
| **near** | Igual strong pero **sin barrio**; `amenitiesMatchMode: 'preferred'` | Solo si `nearAddsValue`: hay ciudad **o** barrio **o** `strictAmenities`; y `filtersNear` ≠ `filtersStrong` |
| **widened (numérico)** | Base = near; **si** había min/max superficie → se quitan; **else si** `minBedrooms > 0` → `minBedrooms - 1`; **else si** hay precio y **`!fixedBudget`** → `min *= 0.9`, `max *= 1.1` (redondeo); si no aplica nada de lo anterior, widened numérico = near | Solo si `widenedAddsRelaxation` (había superficie, o dormis > 0, o precio no fijo) y filtros ≠ near |
| **widened (texto)** | Si tras lo anterior `wideHits.length < limit` **y** hay `q` trim: misma base near **sin** `q` en query ES; post-filtro con `skipFreeTextPostFilter: true` (sigue filtrado por ciudad, amenities, op, tipo, etc.) | Después del paso numérico |

**Post-filtros sobre hits ES** (`filterHitsSafety` / `takeFiltered`):

- Siempre: `passesOperationType`, `passesPriceSanity` (precio ≤ `2 * maxPrice` si max definido; precio ≥ `0.45 * minPrice` si min definido).
- Ciudad: `hitTouchesPlace` (título + ciudad + barrio del hit vs ciudad pedida).
- **strong** + barrio pedido: además el hit debe “tocar” el barrio (misma heurística).
- **Texto libre `q`**: si longitud ≥ **4**, exige al menos un token ≥3 caracteres en título/descripción/dirección (fold latin), salvo bucket widened con `skipFreeTextPostFilter`.

**Mensajes de transparencia** (`messages`):

- Si hay near: explica que “Muy parecidos” amplía a **toda la ciudad**, misma operación/tipo/números, barrio no obligatorio.
- Si hay widened: explica que “Opciones ampliadas” mantiene operación y tipo; relaja **un** criterio numérico o deja de exigir texto libre en índice.

**Cero resultados con ancla** (`searchSessionHasAnchor`): `emptyExplanation` fija + `actions` (hasta 5): quitar barrio, relajar amenities estrictos, soltar mapa, quitar precio, “permitir otros tipos” si `fixedPropertyType`.

**Sin ancla** (sin op explícita como ancla… ver `searchSessionHasAnchor` en shared): la función considera ancla si hay `sale`/`rent`/`temporary_rent`, ciudad/barrio, `q` ≥ 2 chars, o mapa comprometido con polígono/bbox. Si **no** hay ancla, `emptyExplanation` de cero total **no** se setea por el executor (el catálogo “vacío” de sesión se normaliza distinto en cliente — ver chips y copy `buscarNoAnchorMessage` en UI).

#### 1.A.5 Matriz resumida **searchV2** (condición → relajación → resultados → mensaje)

> Notación: “UI strong/near/widened” = secciones con títulos de `PORTAL_SEARCH_UX_COPY` / labels `SEARCH_V2_BUCKET_LABELS`. “Tarjeta vacía strong” = `searchV2BucketEmpty`.

| Condición (filtros activos) | Relajación aplicada (servidor) | Resultados mostrados | Mensaje / UI principal |
|------------------------------|--------------------------------|----------------------|-------------------------|
| ES OK, criterios suficientes, hay hits en strong | Ninguna | Solo bucket **strong** (+ near/widened si aplica) | Digest strong; si near>0: copy “Muy parecidos”; si widened>0: copy “Opciones ampliadas” |
| ES OK, strong vacío, ciudad+barrio estrictos, near encuentra | near: quita barrio, amenities preferred | **near** con cards; strong vacío muestra `searchV2BucketEmpty` | Mensaje near + teaser expandible |
| ES OK, strong+pocos near, widened numérico aporta | Superficie o −1 dorm o ±10% precio (si no fixed) | Bloque **widened** (colapsado por defecto en mapa: `listingsForMap` excluye widened hasta expandir) | Mensaje widened |
| ES OK, aún faltan slots en widened y hay `q` | Query sin `q`, post-filter texto off para widened | Más ítems en **widened** | Mensaje widened (texto) |
| ES OK, total 0 y `searchSessionHasAnchor` | Ninguna más (ya se intentó cadena) | Buckets vacíos; **acciones** sugeridas | `emptyExplanation` + botones `actions` |
| ES falla (`fromEs false`) primero | Ninguna en ES | Buckets vacíos | `messages` + `emptyExplanation` índice |
| ES falla pero detector SQL + SQL devuelve filas | SQL = **solo strong** | Items solo en strong; near/widened vacíos | `searchSqlFallbackRowsNote` |
| ES falla, SQL sin filas | SQL strong | 0 items | `emptyExplanation` SQL + acciones si ancla |
| Mapa dibujado, no comprometido | Geo fuera de filtros | Resultados **sin** filtro mapa | Mensaje “referencia… Buscar en esta zona” |
| Mapa comprometido bbox | Geo en todas las etapas | Solo pins dentro (si coords válidas) | — |
| Amenities **strict** | strong: strict; near: **preferred** | near puede poblar con avisos sin todos los amenities | Texto en mensaje near implícito por diferencia de modo |
| `fixedBudget` y rangos de precio | **No** se aplica `stretchPrice` en widened | Solo relaja superficie/dormis/texto según orden | — |
| `q` corta (<4) | No post-filter por tokens | strong puede llenar solo con ES `q` | — |

---

### 1.B `listing.searchConversational` (asistente en portal)

1. **Intención:** `runConversationalSearchOrchestrator` + catálogo de localidades (no MCP).
2. **Búsqueda:** `searchListingsLayered(effective)` con `matchProfile: 'intent'`.
3. **Relajación previa a layered (específica conversación):**
   - Si total ES 0 y `amenitiesMatchMode === 'strict'` → pasa a `preferred` + mensaje `conversationalRelaxedAmenitiesNote` y reintenta layered.
   - Si sigue 0 y había `operationType` → quita operación + `conversationalRelaxedOperationNote` y reintenta layered.
4. **Dentro de `searchListingsLayered`** (misma implementación que otros consumidores):
   - Si `primaryTotal >= 20`: tier exacto, sin mezcla.
   - Si `8 <= total < 20` y amenities no strict: puede mostrar `searchMidCountAmenitiesNote`.
   - Si `1 <= total < 8`: intenta `stripSecondaryDetails` y merge de suplementos → mensajes “pocas coincidencias exactas…” (`searchFewExactWithMore*`).
   - Si `total === 0`: recorre `ZERO_RESULTS_RELAXATION_SEQUENCE` acumulando pasos hasta obtener hits; mensajes `searchRelaxBroadenedLead` + `describeSearchRelaxationSteps` + nota mapa si se soltó geo.
   - Si tras toda la secuencia sigue 0: mensajes `searchEmptyAfterFullRelaxTitle/Body`.
5. **Si ES no disponible o sigue sin filas útiles:** SQL con `buildListingSearchSqlFromSeed` usando `effective` mezclado con `lastTriedFilters` según caso; mensaje `searchSqlFallbackCountNote` si aplica.

**Orden de relajación con cero resultados (ES):**  
`property_type` → amenities por tiers (leisure, outdoor, building, balcony) → `secondary_details` → parking/security → garages → bathrooms → **surface** → **price** → **map_geo** → **bedrooms_rooms** → **neighborhood** → **amenities_flags**  
(comentario en código: tipo antes que amenities por inventario heterogéneo.)

---

### 1.C `POST /api/assistant/query` (KiteProp + portal)

- Clasifica prompt: `classifyAssistantPrompt` → flags `useKitepropProperties`, `useKitepropLeads`, `usePortalSearch`.
- Ejecuta MCP/REST KiteProp **solo** si flags y hay `KITEPROP_API_KEY`.
- Portal: `promptToSearchSessionMVP` + si `usePortalSearch && shouldRunPortalSearchWithPrompt` y `searchSessionHasAnchor(sessionSuggestion)` → `runListingSearchV2` con `limitPerBucket: 12`.
- Respuesta: JSON con `slices` y `summary` textual; **no** modifica la UI de `/buscar`.

---

## 2. TAREA 2 — Clasificación formal de criterios (recomendación explícita)

Leyenda: según **comportamiento actual v2** y **riesgo de confianza** si se relaja mal.

| Criterio | Clasificación actual en **searchV2** | Recomendación de política |
|----------|--------------------------------------|---------------------------|
| **Operación** (`sale` / `rent` / `temporary_rent`) | **Dura** en v2 (no se relaja en near/widened) | **Dura.** Cambiar operación es otro mercado; solo fuera de v2 el conversacional puede relajarla tras agotar resto (ya lo hace). |
| **Tipo de propiedad** | **Dura** en v2 | **Dura** en listado público. Equivalencias (depto vs PH) solo con mapa explícito de negocio + tests. |
| **Subtipo** | No hay campo separado en `SearchSessionMVP` para subtipo en v2 | Tratar como **auxiliar** en índice / facets; no dominar ranking hasta modelar contrato. |
| **Zona (ciudad)** | **Dura** en post-filtro (`hitTouchesPlace`) | **Semidura:** ampliar ciudad solo con producto “explorar región” explícito, no silencioso. |
| **Barrio** | **Semidura** (near lo quita) | **Semidura** controlada: near ya documentado en mensaje. |
| **Polígono / mapa** | **Dura** una vez comprometido | **Semidura:** mantener en near/widened; soltar solo vía acción o paso documentado (acciones v2 / secuencia layered). |
| **Precio** | **Semidura** (±10% una vez, si no `fixedBudget`) | **Semidura** con techo: mantener sanity 0.45× / 2×; no encadenar múltiples ±10% en v2 sin rediseño. |
| **Dormitorios** | **Semidura** (−1 como mucho en widened) | **Semidura:** un paso por request; evaluar −2 solo con umbral mínimo de resultados y copy honesto. |
| **Superficie** | **Semidura** (se elimina min/max en un paso widened) | **Flexible** respecto a dormis/precio en términos de UX (usuarios toleran más ruido en m²). |
| **Amenities** | **Flexible** near (preferred); strict solo en strong | **Flexible temprano** para no vaciar listado; strict = compromiso duro de producto “debe tener”. |
| **Texto libre `q`** | **Semidura** (widened puede ignorar match de tokens en ES) | **Auxiliar** para ranking: nunca único ancla sin ciudad/op/tipo; mensaje claro cuando se relaja texto. |
| **Señales MCP** | **No entran** en `searchV2` / `searchConversational` | **Auxiliares** siempre: resumen paralelo, nunca ranking principal del portal. |

---

## 3. TAREA 3 — Política de relajación **recomendada** (formal y gradual)

### Caso A — “Falla por zona” (listado público v2)

- **Mantener:** operación, tipo, ciudad si está definida, mapa si está comprometido, precio/dormis según política de widened.
- **Relajar en orden ya implementado:** barrio (near) → superficie → dormitorios → precio (banda única) → texto libre (solo como último recurso en widened).
- **Límite:** no más de **un** eje numérico por la lógica actual de `filtersWidened`; el texto es un segundo sub-paso explícito con query distinta.
- **Orden alternativos:** mismos criterios ES + post-filtros de coherencia (precio/geo/texto), no re-ranking por distancia intra-ciudad salvo lo que ya haga ES.

**Recomendación incremental:** si en el futuro se agrega “ampliar a ciudades vecinas”, debe ser **bloque separado** con etiqueta propia y umbral mínimo de relevancia (no mezclar en strong).

### Caso B — “Falla por precio”

- **Implementado v2:** una banda `min*0.9` / `max*1.1` si hay precio y no `fixedBudget`.
- **Sanidad:** descarta hits > `2× max` o < `0.45× min` (defiende contra alternativas “económicamente absurdas” aunque ES devuelva ruido).
- **Recomendación:** mantener **una sola** banda por request en v2; si se necesita segunda banda, exigir interacción explícita (“Ampliar presupuesto 20%”) y registrar métrica.

### Caso C — “Falla por tipo”

- **v2:** no hay equivalencias automáticas (tipo es duro).
- **Conversational layered:** primer paso de cero resultados puede **stripPropertyType**.
- **Recomendación:** equivalencias (casa ↔ dúplex) solo con tabla versionada en `@propieya/shared` + tests; **prohibido** inferir tipo desde MCP para el listado público sin ese contrato.

### Caso D — “Filtros finos” (amenities, superficie, dormis, texto)

**Orden recomendado alineado al código actual v2:**  
superficie → dormitorios → precio → texto (widened); near ya trató barrio/amenities preferred.

**Conversational (layered) cuando todo falla:** sigue `ZERO_RESULTS_RELAXATION_SEQUENCE` (tipo y amenities antes que números y geo).

---

## 4. TAREA 4 — Resultados alternativos útiles y presentación

### 4.1 Lo que ya existe (nombres canónicos en código)

- **Exactos / fuertes:** label bucket `Encajan con lo que pediste` (`SEARCH_V2_BUCKET_LABELS.strong`) + título UI `searchV2BucketTitleStrong`.
- **Cercanos:** `Muy parecidos` + UI near colapsable con teaser.
- **Ampliados:** `Opciones ampliadas` + widened colapsable; mapa por defecto **oculta** pins widened hasta expandir (`listingsForMap`).

### 4.2 Propuesta de política de copy (bloques simples)

| Bloque | Cuándo | Título sugerido (producto) | Regla |
|--------|--------|----------------------------|--------|
| **Coincidencias principales** | `strong` > 0 | Mantener actual “Encajan…” | Solo hits que pasan post-filtros strong |
| **Misma búsqueda, barrio flexible** | `near` > 0 | “Misma zona pedida, barrio flexible” o mantener “Muy parecidos” con subtítulo | Explicar en una línea que ciudad se mantiene |
| **Misma operación y tipo, números o texto ajustados** | `widened` > 0 | “Opciones ampliadas (criterios suavizados)” | Subtítulo que diga **qué** se relajó (derivar de `widenedExplainUsed` / mensajes servidor) |
| **Exploración honesta** | total 0 con ancla | “No encontramos coincidencias” + acciones | Sin inventar listas: usar `actions` + CTAs existentes |

**Regla anti-confusión:** no mezclar cards de strong y widened en la misma grilla sin encabezado de sección (hoy ya están separadas por bucket).

---

## 5. TAREA 5 — Asistente y MCP (política recomendada)

### 5.1 Modo base (portal sin depender de MCP)

- **Listado:** siempre `searchV2` / SQL fallback según `listing.ts`.
- **Asistente UI:** `searchConversational` + orquestador local + ES/SQL; sin llamadas a `kiteprop-mcp`.

### 5.2 Modo enriquecido (API `assistant/query` o integraciones futuras)

- **MCP / REST KiteProp:** propiedades y leads como **slices paralelos** con `summary` textual.
- **Portal:** `runListingSearchV2` opcional como “complemento” cuando hay ancla en sesión inferida del prompt.
- **Contrato:** la respuesta debe etiquetar `source: mcp | rest_fallback` por slice para que el cliente pueda **ordenar la UI** (KiteProp abajo o pestaña “CRM”).

### 5.3 Modo fallback MCP

- **Código actual:** `queryPropertiesFromMCP` intenta MCP; si falla, **REST** `getProperties`; si falla, resultados vacíos + summary de error.
- **Timeout:** hoy `fetch` sin `AbortSignal` explícito — **recomendación:** añadir en implementación futura **8–12 s** por slice MCP + cancelación paralela; si vence, omitir slice y continuar con portal-only.
- **Errores:** no bloquear respuesta completa si portal slice existe; mensaje explícito “KiteProp no respondió”.

### 5.4 Qué sí / qué no debe consultar MCP

| Sí (auxiliar) | No |
|----------------|-----|
| Resúmenes de cartera / leads para CRM | Ranking principal de `/buscar` |
| Sugerencias de copys o datos externos al índice del portal | Sustituir `searchV2` o SQL fallback |
| Enriquecer respuesta de asistente **fuera** del listado público | Exigir MCP para mostrar listado en producción |

---

## 6. TAREA 6 — Riesgos y mitigaciones

| Riesgo | Problema | Mitigación recomendada |
|--------|----------|------------------------|
| Relajar demasiado | Usuario cree que todo “encaja” cuando es widened | Mantener secciones separadas + `matchReasons` compactos + copy que nombre el criterio relajado |
| Mezclar recomendación con exacto | Pérdida de confianza | No unificar grids; usar headings y, si hace falta, badge en card (“Criterio suavizado”) |
| MCP como ranking | Resultados CRM mezclados con inventario público sin etiqueta | Forzar `source` visible; tests de contrato API |
| Precios absurdos | ES devuelve outliers | Mantener `passesPriceSanity`; auditar factores 2× / 0.45× |
| Geo cercana pero mercado incompatible | Ej. alquiler temporal vs largo plazo | Operación **dura** en v2; revisar prompts conversacionales que quiten operación |
| Degradación por pantalla vacía | ES abajo y SQL no dispara | Mantener detector fallback unificado (`messages` + `emptyExplanation`) — ya documentado en doc 50 |
| Divergencia v2 vs conversacional | Mismo prompt distinto resultado | Documentar dualidad (esta hoja); a largo plazo **unificar criterios** o etiquetar UI “modo asistente” |

---

## 7. TAREA 7 — Roadmap incremental (sin código en esta etapa)

### Etapa 1 — Cambios mínimos seguros

- **Qué:** documentación y telemetría (eventos ya existentes `LISTING_SEARCH_EXECUTED`, `ASSISTANT_SEARCH_TRIGGERED`): dashboards que separan `search_v2` vs `search_v2_sql_fallback` vs conversacional.
- **Impacto:** visibilidad; sin cambio de ranking.
- **Riesgo:** bajo.
- **Archivos probables:** `docs/*`, queries en panel si aplica.
- **Rollback:** N/A (solo docs/métricas).

### Etapa 2 — Mejoras medianas

- **Qué:** timeouts/`AbortController` en MCP; alinear copy de widened con **qué** filtro se relajó (derivado de sesión vs `widenedExplainUsed`); segunda banda de precio **solo** con CTA explícita.
- **Impacto:** menos timeouts colgantes; mayor claridad.
- **Riesgo:** medio (regresiones en assistant query).
- **Archivos probables:** `kiteprop-mcp.ts`, `buscar-content.tsx`, `portal-packs.ts`.
- **Rollback:** revert commit; feature flag por env si se introduce.

### Etapa 3 — Enriquecimiento opcional MCP

- **Qué:** UI cliente (p.ej. panel) que consuma `assistant/query` con tabs “Portal / KiteProp”; plantillas de prompt que fuercen `usePortalSearch` cuando el usuario busca inventario público.
- **Impacto:** valor CRM sin tocar buscador público.
- **Riesgo:** medio-alto (secretos, CORS, costo).
- **Archivos probables:** cliente del panel, `assistant/query/route.ts`, tests integración.
- **Rollback:** desactivar flag o secret; portal intacto.

---

## 8. Referencias cruzadas

- Estabilidad ES → SQL y regresión detector: `docs/50-BUSCADOR-PORTAL-ESTABILIDAD-Y-FALLBACK.md`
- Niveles / relajación en código comentada: `docs/50-BUSQUEDA-NIVELES-Y-RELAX.md`
- Claves KiteProp vs webhook portal: `docs/58-KITEPROP-API-KEY-UNICA-MCP-Y-REST.md`

---

*Documento generado como entregable único de análisis; no implica cambios en código ni despliegue.*
