# Pipeline conversacional de búsqueda (intérprete + validación)

## Flujo

1. **Intérprete** (`apps/web/src/lib/llm.ts`): OpenAI con `response_format: json_object` si hay `OPENAI_API_KEY`; si no, heurísticas + `extractFiltersFromQuery` y regex de ubicación segura.
2. **Orquestador** (`apps/web/src/lib/conversational-search.ts`): encadena intérprete → validación.
3. **Validación y catálogos** (`packages/shared/src/conversational-search-pipeline.ts`):
   - **A — Normalización**: `normalizeConversationalText` (minúsculas, NFD, espacios).
   - **B — Reglas de frases** (prioridad operación/tipo): `applyConversationalPhraseRules` (equivalencias tipo “casa en venta” → `sale` + `house`).
   - **C — Validación**: `operationType` / `propertyType` contra enums reales; **ciudad/barrio solo si están en el catálogo** `PLACE_ENTRIES` o no son tokens de operación/tipo (`matchOperationTypeFromText` / `matchPropertyTypeFromText`); **amenities** solo ids de `FACET_FLAG_IDS_SET` (`search-facets.ts`).
   - **D — Salida plana**: objeto alineado con `listing.search` + `q` recompuesto con `unknownTerms` descartados como ubicación para no perder señal en full-text.
   - **E — Severidad amenities**: `preferred` por defecto; `strict` si el texto matchea `detectStrictAmenitiesFromText` (“sí o sí”, “obligatorio”, etc.) y hay amenities válidas.
4. **Motor** (`searchListingsLayered` + relajación existente en `search-layered.ts`): ya implementa etapas relajadas / similares en ES y fallback SQL.

## Reglas de interpretación (prioridad)

1. Operación (venta, alquiler, …)  
2. Tipo de propiedad  
3. Ubicación **solo catalogada** (expandir `PLACE_ENTRIES` con datos reales o conectar geocoder).  
4. Numéricos (precio, dormitorios, superficie)  
5. Preferencias (amenities catalogadas)

## Equivalencias soportadas (ejemplos)

- “casa en venta”, “comprar casa”, “busco casa para comprar”, … → `sale` + `house` (si faltaban en el pre-parse).
- “casa en alquiler”, “alquilar casa”, “arriendo casa”, … → `rent` + `house`.

## Logs de depuración

Con `LOG_CONVERSATIONAL_SEARCH=1` en el entorno del servidor web, `listing.searchConversational` loguea JSON con `structured`, `validationNotes`, `unknownTerms`, `droppedLocations`, `droppedAmenities`, `amenitiesMatchMode`.

## Tests

`pnpm --filter @propieya/shared test` — casos: casa / casa en venta / alquiler no barrio / Palermo / pileta strict / amenity inválida / ciudad fuera de catálogo.

## Próximos pasos sugeridos

- Hidratar `PLACE_ENTRIES` desde DB o API de geocoding ya usada en portal.  
- Opcional: mapear `mode` required/flexible/preferred por campo al orden de `ZERO_RESULTS_RELAXATION_SEQUENCE`.
