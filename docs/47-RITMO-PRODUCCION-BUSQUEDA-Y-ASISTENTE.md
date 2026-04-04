# Ritmo de producción: búsqueda, escala y asistente

**Estado:** mandato operativo y hoja de ruta. **No es un proyecto hobby:** el portal debe evolucionar con **ritmo de producción**, entregas verificables en la URL canónica y **mínimos retraces** por bloqueos no documentados.

---

## 1. Mandato para el agente (máximo ritmo autónomo)

- **Ejecutar** sin pedir confirmación en cada micro-paso: seguir `docs/24-sprints-y-hitos.md`, completar tareas, `pnpm verify` antes de push, push a **`deploy/infra`**, `pnpm verificar:deploy` (y diagnóstico si falla).
- **No bloquear** al propietario con listas de pasos manuales de Git/Vercel; los bloqueos externos van a **`docs/REGISTRO-BLOQUEOS.md`** con un solo desbloqueo claro.
- **Priorizar** mejoras que el usuario final nota en **usabilidad real** (`/buscar`, ficha, home, asistente) y que reduzcan riesgo a escala (ES, paginación, relevancia).
- **Documentar** cada eje grande en `docs/` (este archivo + sprints) para que el siguiente turno de agente no repita análisis.

Referencias duras: `docs/42-DIRECTIVA-OPERATIVA-PROPIEYA.md`, `docs/43-ANEXO-MASTERPLAN-MEJORAS-INTEGRABLES.md`, `AGENTS.md`, `.cursor/rules/automacion-propietario.mdc`.

---

## 2. Pilares de producto (orden sugerido de inversión)

| Pilar | Objetivo | Notas técnicas (repo) |
|--------|-----------|------------------------|
| **Usabilidad real** | Menos fricción en descubrimiento y refinamiento | Mapa, filtros, chips, comparador, bloque conversacional compacto |
| **Búsqueda a volumen** | 20k–200k avisos sin degradar UX | **Elasticsearch** como camino principal; SQL solo fallback; hoy `offset` máx. 500 — hace falta **`search_after`** o equivalente para catálogos grandes |
| **Precisión / relevancia** | Resultados percibidos como “justos” | ES: `multi_match` + orden por fecha; pendiente tuning (boosts, sinónimos, métricas) |
| **Asistente** | Colabora al **traducir intención** y **proponer continuidad** | Hoy: un turno → filtros → `searchListings` (`extractIntentionFromMessage`). Pendiente: multi-turno, sugerencias post-resultado, alineado al mismo motor |
| **Medición** | Saber si mejoramos | `search_history` (usuarios logueados); logs opcionales `LOG_SEARCH_MS`; golden queries (apéndice); futuro: harness / etiquetado |

---

## 3. Fases de ejecución (entregables)

**F0 — Observabilidad y baseline (ya iniciado)**  
- Variable `LOG_SEARCH_MS=1`: logs JSON de fase ES / SQL en `listing.search` (ver `.env.example`).  
- Ejecutar pruebas manuales o scripts contra `/buscar` usando el **apéndice A** (registrar latencia subjetiva y totales).

**F1 — Escala de listado** (en código)  
- Elasticsearch: `search_after` con sort por recencia (`publishedAt` / `updatedAt` / `createdAt` / `id`) **o**, si hay texto residual en `q`, primero `_score` (5 valores en cursor) + cursor base64 en `listing.search` (`nextCursor`, input `cursor`; con cursor, `offset` debe ser 0).  
- UI `/buscar`: “Cargar más resultados” acumula páginas; sin ES activo se sigue con `offset` (hasta 50 000 en Zod).  
- Si el índice se creó antes del sort de 4 campos, conviene **reindex** (`pnpm reindex:es` / sync) para cursors consistentes.  
- Primera página sin cursor sigue usando `from` en ES (tope interno 500 en `query.ts`); el flujo normal del portal usa cursor tras la primera página.

**F2 — Calidad de ranking**  
- Conjunto golden etiquetado (relevante / no relevante para top-k).  
- Ajustes de query ES y, si aplica, reindex con mapping revisado.  
- **Hecho (v0):** con texto residual, sort primario `_score` y boosts en `multi_match` (`title^3`, barrio/ciudad); sin texto, solo recencia (cursor de 4 claves).

**F3 — Asistente con continuidad** (en código, v0)  
- `searchConversational` acepta `previousContext: { userMessage, filters }` y el LLM (o merge heurístico sin API) **fusiona** el nuevo mensaje con filtros previos.  
- `sessionStorage` (`propieya.conversational.v1`, TTL 45 min) + banner y chips en `/buscar` dentro de `ConversationalSearchBlock`; “Empezar de cero” limpia contexto.  
- La home reutiliza el mismo storage al enviar (sin banner, para no ocupar el hero).

**Paralelo (producto)**  
- `docs/46-BACKLOG-EMPRENDIMIENTOS-MULTIPAIS-MONEDA.md` cuando el inventario lo permita.

---

## 4. Apéndice A — Consultas golden (baseline manual)

Usar en producción o staging con ES activo; anotar **total**, **latencia**, **¿útil el top 5?** (sí/no/corta).

| # | Intención (español) | Qué validar |
|---|---------------------|-------------|
| 1 | Alquiler 2 ambientes Palermo hasta 400 mil | ciudad/barrio + precio + dorm |
| 2 | Casa venta Nordelta pileta | tipo + amenity + zona nominal |
| 3 | Departamento luminoso reciclado CABA | texto residual en `q` + geo implícita |
| 4 | PH sin expensas caba | tipo + texto |
| 5 | Cochera venta Belgrano | tipo parking + barrio |
| 6 | Local comercial alquiler microcentro | commercial + operación |
| 7 | Terreno en venta más de 300 m2 | land + superficie |
| 8 | Alquiler temporario mar del plata 4 personas | temporary_rent + ciudad + texto |
| 9 | Oficina coworking | office + palabras clave |
| 10 | Duplex 3 dormitorios zona norte GBA | dorm + texto + región |
| 11 | Monoambiente inversión subte | apartment + `q` |
| 12 | Casa quinta pileta quincho | house + amenities múltiples |
| 13 | Venta a estrenar pozo | texto emprendimiento (hasta que exista facet dedicado) |
| 14 | Filtro solo mapa (bbox) sin texto | geo_bounding_box |
| 15 | Barrio + precio mínimo sin máximo | range parcial |
| 16 | Búsqueda vacía solo operación venta | volumen alto, orden por fecha |
| 17 | Query con typo “Palermmo” | fuzziness ES |
| 18 | Conversacional: “algo chico para estudiante cerca de facultad” | asistente → filtros + `q` |
| 19 | Conversacional: “no más de 500 lucas 2 dorm” | precio coloquial |
| 20 | Paginación: misma query offset 0 / 24 / 48 | consistencia + tiempos |

---

## 5. Enlaces

- Importación e inventario: `docs/37-PRODUCCION-SPRINTS-E-IMPORTACION.md`  
- Criterios MLS / facets / mapa: `docs/38-CRITERIOS-MLS-FILTROS-MAPA-SEMANTICA.md`  
- Emprendimientos / multipaís: `docs/46-BACKLOG-EMPRENDIMIENTOS-MULTIPAIS-MONEDA.md`  
- Sprints numerados: `docs/24-sprints-y-hitos.md` (Sprint 34)

---

*Documento vivo; actualizar fechas y casillas de sprint al cerrar fases.*
