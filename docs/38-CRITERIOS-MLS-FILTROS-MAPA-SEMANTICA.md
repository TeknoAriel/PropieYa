# Criterios ampliados: MLS-ready, filtros, mapa y semántica

**Versión:** 1.0  
**Fecha:** 2026-03-30  
**Tipo:** Criterios de producto y arquitectura — complementa `docs/00-fundacion-producto.md`  
**Objetivo del portal:** combinar **experiencia conversacional cálida y moderna** con **estructura de búsqueda profunda**, MLS-ready, geoespacial y altamente filtrable, **sin abrumar**.

---

## X. Capacidades MLS-ready reales

El producto no debe usar “MLS-ready” solo como posicionamiento: debe estar **preparado en diseño de producto, datos y arquitectura** para evolucionar hacia lógicas de red / MLS.

### Requisitos desde el inicio

| Área | Qué debe contemplarse |
|------|------------------------|
| **Ingesta** | Normalización de publicaciones de **múltiples fuentes**; trazabilidad de **origen** por aviso (`source`, feed, `externalId`). |
| **Calidad** | **Deduplicación** explícita (reglas + identificadores); **freshness** y **vigencia**; política de **historial de cambios** (quién/cuándo/qué). |
| **Datos** | **Estandarización de atributos** hacia un modelo interno estable; `features` extensible sin perder campos de fuente cuando haga falta. |
| **Organizaciones** | Inventario de **redes, cámaras, colegios, franquicias, cuentas institucionales**; **visibilidad y permisos por organización**. |
| **Distribución** | **Reglas de publicación por red** (qué se muestra dónde); preparación para **cooperación controlada** entre actores (fases futuras). |
| **Búsqueda** | **Matching y ranking** sobre **inventario normalizado** (no solo texto crudo). |

### Principio dual

- Operar como **portal abierto** cuando corresponda.  
- Soportar evolución hacia **red / MLS más profunda** sin reescribir el núcleo (contratos de datos, org, permisos, trazabilidad).

**Referencias en repo:** `packages/database/src/schema/listings.ts` (`organizationId`, `externalId`, `importFeedSourceId`, `importContentHash`, `source`, vigencia); `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md` (import).

---

## Y. Sistema de filtros enriquecidos

Los filtros **no** se limitan a operación, tipo, ubicación, precio, ambientes, superficie y un subconjunto fijo de amenities.

### Regla central

Todo **atributo estructurado relevante** presente en fuentes tipo **Zonaprop JSON / Yumblin** (o equivalentes) debe poder usarse como:

1. **Filtro manual** (UI + API).  
2. **Condición interpretable** por el asistente (LLM → query estructurada).  
3. **Campo indexado** en búsqueda (Elasticsearch / capa equivalente).  
4. **Criterio de sugerencias** (autocomplete, chips).  
5. **Condición de alertas y búsquedas guardadas**.

### Ejemplos de atributos (no exhaustivo)

Chimenea, aire acondicionado, piscina, quincho, jardín, patio, parrilla, balcón, terraza, SUM, gimnasio, seguridad, laundry, dependencia, apto crédito, apto profesional, calefacción, orientación, piso, amenities adicionales que agregue la fuente.

### Estrategia (no hardcodear “solo algunos”)

- **Catálogo de facets / atributos** versionado (schema o tabla): `id` estable, tipo (bool, enum, rango, texto), etiquetas i18n, **mapeo desde claves de feed**.  
- **`features` JSONB** como almacén flexible **más** índice ES con campos materializados para lo filtrable con frecuencia.  
- **Nuevas claves de fuente** → mapeo configurable sin redeploy de lógica central cuando sea posible.

**Referencias:** `docs/36-MAPEO-ZONAPROP-XML-AMENITIES.md`, `packages/shared/src/amenity-mapping.ts`, `apps/web` búsqueda / ES mapping (revisar ampliación).

---

## Z. Filtros avanzados sin abrumar (UX progresiva)

### Capas

| Capa | Contenido |
|------|-----------|
| **1** | Búsqueda **asistida** / simple (hero conversacional + entrada clara). |
| **2** | Filtros **esenciales** siempre visibles (operación, tipo, zona/precio reducidos según contexto). |
| **3** | Bloque **“Más opciones” / “Avanzados”** expandible (resto de facets relevantes). |
| **4** | Filtros **contextuales** según tipo de propiedad, operación o comportamiento (ej. rural vs urbano; alquiler vs venta). |

**Objetivo:** primera pantalla **simple**; precisión **máxima** disponible sin formulario intimidante.

---

## AA. Búsqueda por mapa (capacidad central)

No basta un mapa con pins: la geografía es **eje de producto**.

### Debe soportar (roadmap explícito)

- Mapa + **lista sincronizados**.  
- Actualización por **viewport** (bounds).  
- **Clusters** en zoom bajo.  
- Búsqueda por **área dibujada**, **polígono**, **radio** alrededor de punto.  
- **Barrio / zona / subzona** (jerarquías configurables).  
- **Búsquedas geográficas guardadas** y **alertas por área**.  
- **Sugerencias** de zonas cercanas o equivalentes.  
- Compatibilidad con **variantes de ubicación** y jerarquías (ciudad, partido, polígono administrativo, etc.).  
- Integración con **filtros manuales** y **asistente IA** (misma query unificada).

**Estado actual:** hay `locationLat` / `locationLng` en listings y hooks en schemas de búsqueda; la **UI mapa completa** y **viewport/polígono** son trabajo mayor pendiente.

---

## AB. Variantes completas y entendimiento semántico

### Objetivo

Búsqueda manual, conversacional, sugerencias, matching y alertas deben compartir una capa de:

- **Normalización** de términos.  
- **Alias y sinónimos** (español regional).  
- **Mapeo semántico** por tipo de inmueble y por atributo.

### Ejemplos

- depto / departamento / monoambiente (con matices).  
- pileta / piscina.  
- AA / aire acondicionado / acondicionado.  
- cochera / garage / cochera fija.  
- parrilla / asador / BBQ.  
- lote / terreno.  
- casa quinta / quinta / casa con parque.

### Tipos de propiedad ampliados

Incluir en el modelo de producto (y en taxonomía interna) variantes **rurales y especiales**: agrícola, ganadero, forestal, campo, chacra, etc., con sus **atributos propios** (hectáreas, riego, mejoras, acceso, etc.) sin forzarlas al mismo formulario que un departamento urbano.

**Implementación sugerida:** tabla o JSON de **sinónimos → facet_id**; prompt LLM alineado al catálogo; extractor de texto (`extractFiltersFromQuery`) y ES analyzers/sinónimos donde aplique.

---

## Contraste con el estado actual del repo (marzo 2026)

| Criterio | Ya presente (base) | Brecha principal |
|----------|-------------------|------------------|
| **X MLS-ready** | `organizationId`, `externalId`, feeds, hash import, vigencia, `features` JSONB | Dedup explícito, historial de cambios por campo, reglas por red, cooperación MLS |
| **Y Filtros ricos** | Amenities mapeados, SQL/ES, schema `search` con `amenities[]` | Catálogo de facets escalable; todos los campos Yumblin/ZP como filtro/index; alertas con cualquier facet |
| **Z UX progresiva** | Hero conversacional + `/buscar` con filtros | Capas 2–4 explícitas en UI; “Más opciones” contextual |
| **AA Mapa** | Geo en DB y schemas | Mapa lista sincronizada, viewport, polígono, clusters, alertas geo |
| **AB Semántica** | `amenity-mapping`, extractor, LLM intención | Taxonomía rural; sinónimos centralizados; cobertura completa tipos/atributos |

Este documento **no** sustituye `docs/00-fundacion-producto.md`; lo **extiende** para decisiones de arquitectura y backlog. Próximos sprints deberían tomar ítems priorizados desde las tablas anteriores.

---

## Documentos relacionados

- `docs/00-fundacion-producto.md` — visión y MVP.  
- `docs/36-MAPEO-ZONAPROP-XML-AMENITIES.md` — referencia de campos / amenities.  
- `docs/01-arquitectura-tecnica.md` — capas técnicas.  
- `packages/shared/src/schemas/search.ts` — filtros tipados actuales (a extender).  
- `docs/CANONICAL-URLS.md` — URLs de producto.
