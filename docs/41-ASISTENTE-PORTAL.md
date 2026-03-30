# Asistente en el portal (home → /buscar)

**Referencia de producto:** `docs/00-fundacion-producto.md` (conversacional-first, mismo motor que filtros).

## Qué hace

- En el **home**, el bloque principal es el **Asistente Propieya** (`HeroSearch`): badge + microcopy según pack de copy, **chip de estado** (IA conectada vs reglas locales) vía `GET /api/assistant-config`, contenedor visual del input y chips de ejemplo. El usuario escribe en lenguaje natural → `listing.searchConversational` traduce intención en filtros + `q` y redirige a `/buscar`.
- **Con `OPENAI_API_KEY`** en el servidor (Vercel → proyecto `apps/web`): extracción vía modelo configurado en `OPENAI_MODEL` (default `gpt-4o-mini`).
- **Sin clave:** mismo flujo con **reglas locales** (`extractFiltersFromQuery` y heurísticas en `llm.ts`).

## Variables (apps/web)

Ver `.env.example`:

- `OPENAI_API_KEY` — opcional; si falta, el asistente sigue funcionando en modo reglas.
- `OPENAI_MODEL` — ej. `gpt-4o-mini`.

## Copy y tono

- Pack por defecto: **`conversacion_primero`** (`NEXT_PUBLIC_PORTAL_COPY_PACK`). Otros: `regla_portal_v1`, `variante_b_cercano` (ver `docs/18-copy-portal-ab.md`).
- Endpoint público **`GET /api/assistant-config`**: `{ openAiConfigured, model }` para el chip de estado en el hero (no expone la clave).

## Privacidad

El mensaje del usuario se envía al backend tRPC y, si hay API key, al proveedor LLM solo para extraer JSON de filtros (sin almacenamiento obligatorio en esta capa).
