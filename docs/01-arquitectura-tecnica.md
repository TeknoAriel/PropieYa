# Propieya — Arquitectura Técnica

**Versión:** 1.0  
**Fecha:** 2026-03-18

---

## 1. Visión General

### 1.1 Enfoque Arquitectónico

**Monolito Modular** con separación clara por bounded contexts.

**Razón:** Un equipo fundador pequeño no puede operar múltiples microservicios. Un monolito bien modularizado permite:
- Desarrollo más rápido
- Debugging más simple
- Deployment unificado
- Refactoring interno sin fricción

**Preparado para evolucionar:** Cuando un dominio necesite escalar independientemente, se extrae como servicio. Los boundaries están claros desde el inicio.

### 1.2 Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Monorepo** | Turborepo + pnpm | Builds incrementales, workspaces eficientes |
| **Frontend** | Next.js 15 (App Router) | SSR/ISR para SEO, RSC, streaming |
| **UI** | Tailwind + Radix UI | Theming nativo, accesibilidad, headless |
| **API** | Next.js API Routes + tRPC | Type-safety end-to-end |
| **ORM** | Drizzle | Type-safe, mejor control que Prisma |
| **Database** | PostgreSQL 16 | JSONB, PostGIS, particionamiento |
| **Search** | Elasticsearch 8 | Full-text, geo, facets, scoring |
| **Cache** | Redis | Sessions, cache, pub/sub, jobs |
| **Jobs** | BullMQ | Background jobs, scheduling |
| **Storage** | S3/R2 | Media de propiedades |
| **LLM** | OpenAI/Anthropic | Motor conversacional |

---

## 2. Estructura del Monorepo

```
propieya/
├── apps/
│   ├── web/                    # Portal público (Next.js)
│   └── panel/                  # Panel B2B (Next.js)
│
├── packages/
│   ├── config/                 # ESLint, TypeScript configs
│   ├── shared/                 # Types, constants, utils, schemas
│   ├── database/               # Drizzle schema, client, migrations
│   ├── ui/                     # Design system (componentes)
│   ├── search/                 # Elasticsearch client (futuro)
│   ├── conversation/           # LLM integration (futuro)
│   └── matching/               # Motor de matching (futuro)
│
├── services/
│   └── worker/                 # BullMQ workers (futuro)
│
├── infrastructure/             # Docker, IaC (futuro)
│
└── docs/                       # Documentación
```

### 2.1 Descripción de Packages

| Package | Propósito | Estado |
|---------|-----------|--------|
| `@propieya/config` | Configuraciones compartidas de ESLint y TypeScript | ✅ Creado |
| `@propieya/shared` | Tipos del dominio, constantes, utils, schemas Zod | ✅ Creado |
| `@propieya/database` | Schema Drizzle, cliente PostgreSQL, migraciones | ✅ Creado |
| `@propieya/ui` | Design system con Tailwind + Radix | ✅ Creado |
| `@propieya/search` | Cliente Elasticsearch, queries, indexación | 📋 Por crear |
| `@propieya/conversation` | Abstracción LLM, extracción de intención | 📋 Por crear |
| `@propieya/matching` | Motor de scoring y explicación | 📋 Por crear |

---

## 3. Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLATAFORMA PROPIEYA                      │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   IDENTITY &    │   PROPERTY &    │   SEARCH & DISCOVERY        │
│   ACCESS        │   INVENTORY     │                             │
│                 │                 │                             │
│   - Users       │   - Listings    │   - Query engine            │
│   - Orgs        │   - Media       │   - Conversation layer      │
│   - Roles       │   - Freshness   │   - Demand profile          │
│   - Tenants     │   - Ingest      │   - Matching engine         │
│   - AuthZ       │   - Quality     │   - Recommendations         │
├─────────────────┼─────────────────┼─────────────────────────────┤
│   LEAD &        │   NOTIFICATION  │   ANALYTICS &               │
│   ENGAGEMENT    │   & ALERTS      │   INSIGHTS                  │
│                 │                 │                             │
│   - Leads       │   - In-app      │   - Events                  │
│   - Enrichment  │   - Email       │   - Metrics                 │
│   - Tracking    │   - Push        │   - Reports                 │
│   - CRM basic   │   - Scheduler   │                             │
├─────────────────┼─────────────────┼─────────────────────────────┤
│   PLATFORM      │   BILLING &     │                             │
│   ADMIN         │   PLANS         │   (post-MVP)                │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## 4. Data Model

### 4.1 Entidades Principales

El schema completo está en `packages/database/src/schema/`.

**Core:**
- `users` - Usuarios del sistema
- `user_preferences` - Preferencias (theme, display mode, notificaciones)
- `user_sessions` - Sesiones activas
- `organizations` - Inmobiliarias, desarrollistas, etc.
- `organization_memberships` - Membresías usuario-organización
- `teams` - Equipos/sucursales dentro de una org

**Inventory:**
- `listings` - Propiedades/avisos
- `listing_media` - Imágenes, videos, planos
- `listing_validations` - Historial de renovaciones
- `listing_moderations` - Acciones de moderación
- `user_favorites` - Propiedades guardadas
- `user_discards` - Propiedades descartadas

**Search & Demand:**
- `conversations` - Conversaciones de búsqueda
- `conversation_messages` - Mensajes de cada conversación
- `demand_profiles` - Perfiles de demanda de usuarios
- `search_alerts` - Alertas guardadas
- `search_history` - Historial de búsquedas

**Leads:**
- `leads` - Leads recibidos
- `lead_notes` - Notas en leads
- `lead_activities` - Timeline de actividad
- `lead_ratings` - Calificaciones

**Notifications:**
- `notifications` - Notificaciones enviadas
- `notification_preferences` - Preferencias por usuario

### 4.2 Decisiones de Diseño

1. **UUIDs en todas las entidades** - No auto-increment, facilita distribuir.
2. **`organization_id` en toda entidad de negocio** - Preparado para multi-tenant.
3. **`tenant_id` reservado pero no usado** - Para white-label futuro.
4. **JSONB para datos semi-estructurados** - Features de listings, preferencias, etc.
5. **Timestamps con timezone** - Siempre UTC en DB, conversión en frontend.
6. **Índices explícitos** - Definidos en schema, no inferidos.

---

## 5. API Design

### 5.1 Enfoque

**tRPC** para comunicación type-safe entre frontend y backend.

```typescript
// Ejemplo de router
export const listingRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.query.listings.findFirst({
        where: eq(listings.id, input.id),
        with: { media: true, organization: true }
      })
    }),
  
  create: protectedProcedure
    .input(createListingSchema)
    .mutation(async ({ input, ctx }) => {
      // ...
    }),
})
```

### 5.2 Endpoints REST (para integraciones)

Además de tRPC, endpoints REST para:
- Ingestión de feeds externos
- Webhooks
- API pública (futuro)

---

## 6. Búsqueda (Elasticsearch)

**Criterios de facets dinámicos, mapa geoespacial completo y semántica:** `docs/38-CRITERIOS-MLS-FILTROS-MAPA-SEMANTICA.md` (secciones Y, AA, AB) — guían la evolución del mapping, queries y capa de sinónimos.

### 6.1 Índice de Propiedades

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "organization_id": { "type": "keyword" },
      "property_type": { "type": "keyword" },
      "operation_type": { "type": "keyword" },
      "status": { "type": "keyword" },
      
      "title": { "type": "text", "analyzer": "spanish" },
      "description": { "type": "text", "analyzer": "spanish" },
      
      "location": { "type": "geo_point" },
      "address": {
        "properties": {
          "neighborhood": { "type": "keyword" },
          "city": { "type": "keyword" },
          "state": { "type": "keyword" }
        }
      },
      
      "price": {
        "properties": {
          "amount": { "type": "float" },
          "currency": { "type": "keyword" },
          "per_m2": { "type": "float" }
        }
      },
      
      "surface": {
        "properties": {
          "total": { "type": "float" },
          "covered": { "type": "float" }
        }
      },
      
      "rooms": {
        "properties": {
          "bedrooms": { "type": "integer" },
          "bathrooms": { "type": "integer" },
          "total": { "type": "integer" }
        }
      },
      
      "amenities": { "type": "keyword" },
      "published_at": { "type": "date" }
    }
  }
}
```

### 6.2 Sincronización

```
PostgreSQL (CRUD) 
    │
    ├──(evento)──► BullMQ Job
    │                 │
    │                 ▼
    │            Elasticsearch
    │                 │
    └────────────────►│
                      ▼
               (Búsqueda)
```

- Indexación asíncrona via jobs
- Latencia objetivo: < 5 segundos
- Fallback: si ES falla, no se rompe el CRUD

---

## 7. Motor Conversacional

### 7.1 Arquitectura

```
Usuario
   │
   ▼
┌─────────────────────────────────────┐
│        Conversation Layer           │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   Session   │  │   Context    │ │
│  │   Manager   │  │   Accumulator│ │
│  └──────┬──────┘  └──────┬───────┘ │
│         │                │         │
│         ▼                ▼         │
│  ┌─────────────────────────────┐   │
│  │     Intent Extractor        │   │
│  │     (LLM + Prompt)          │   │
│  └──────────────┬──────────────┘   │
│                 │                   │
│                 ▼                   │
│  ┌─────────────────────────────┐   │
│  │    Query Builder            │   │
│  │    (Intent → ES Query)      │   │
│  └──────────────┬──────────────┘   │
│                 │                   │
└─────────────────┼───────────────────┘
                  │
                  ▼
           Elasticsearch
                  │
                  ▼
┌─────────────────────────────────────┐
│        Response Generator           │
│                                     │
│  - Explanation of results           │
│  - Refinement suggestions           │
│  - Fallback handling                │
└─────────────────────────────────────┘
```

### 7.2 Flujo de Extracción de Intención

```typescript
interface ExtractedIntent {
  filters: Partial<SearchFilters>
  confidence: number
  qualitative: QualitativeAttribute[]
  summary: string
  ambiguous?: AmbiguousField[]
}

// Prompt template (simplificado)
const EXTRACTION_PROMPT = `
Eres un asistente inmobiliario. Extrae la intención de búsqueda.

Texto del usuario: {user_message}
Contexto previo: {context}

Responde en JSON con este formato:
{
  "filters": { ... },
  "confidence": 0.0-1.0,
  "qualitative": [...],
  "summary": "...",
  "ambiguous": [...]
}
`
```

### 7.3 Abstracción de Provider

```typescript
interface ConversationEngine {
  extractIntent(message: string, context: ConversationContext): Promise<ExtractedIntent>
  generateResponse(results: SearchResult[], context: ConversationContext): Promise<string>
  suggestRefinements(results: SearchResult[], profile: DemandProfile): Promise<Refinement[]>
}

class OpenAIEngine implements ConversationEngine { ... }
class AnthropicEngine implements ConversationEngine { ... }
```

---

## 8. Motor de Matching

### 8.1 Scoring

```typescript
interface MatchingConfig {
  weights: {
    location: 30,
    price: 25,
    space: 20,
    features: 15,
    qualitative: 10
  },
  penalties: {
    mustHaveNotMet: -50,
    dealBreakerMet: -100
  },
  bonuses: {
    extraAmenity: +2,
    belowBudget: +5
  }
}

function calculateMatchScore(listing: Listing, profile: DemandProfile): MatchResult {
  let score = 0
  const breakdown = {}
  
  // Location (30 puntos máx)
  breakdown.location = evaluateLocation(listing, profile)
  score += breakdown.location.weightedScore
  
  // Price (25 puntos máx)
  breakdown.price = evaluatePrice(listing, profile)
  score += breakdown.price.weightedScore
  
  // ... etc
  
  // Apply penalties
  if (hasMustHaveNotMet) score += config.penalties.mustHaveNotMet
  
  // Apply bonuses
  if (hasBonusConditions) score += bonuses
  
  return { score: Math.max(0, Math.min(100, score)), breakdown }
}
```

### 8.2 Explicación

```typescript
function generateExplanation(matchResult: MatchResult, locale: string): string {
  const templates = getTemplates(locale)
  
  const matches = matchResult.breakdown.filter(c => c.fulfilled === true)
  const partials = matchResult.breakdown.filter(c => c.fulfilled === 'partial')
  const mismatches = matchResult.breakdown.filter(c => c.fulfilled === false)
  
  return templates.summary
    .replace('{matched}', matches.length)
    .replace('{total}', totalCriteria)
    .replace('{score}', matchResult.score)
}
```

---

## 9. Jobs y Procesamiento Asíncrono

### 9.1 BullMQ Queues

| Queue | Propósito | Frecuencia |
|-------|-----------|------------|
| `listing:index` | Indexar en ES | On-demand |
| `listing:freshness` | Check vigencia | Diario |
| `media:process` | Resize imágenes | On-demand |
| `notification:send` | Enviar emails | On-demand |
| `alert:match` | Matching de alertas | Cada hora |

### 9.2 Scheduler

```typescript
// Jobs recurrentes
scheduler.add('listing:freshness:check', {
  pattern: '0 3 * * *', // 3 AM diario
  handler: async () => {
    // Marcar avisos próximos a vencer
    // Suspender avisos vencidos
    // Archivar avisos suspendidos
  }
})

scheduler.add('alert:match:run', {
  pattern: '0 * * * *', // Cada hora
  handler: async () => {
    // Cruzar nuevas propiedades con alertas activas
    // Generar notificaciones
  }
})
```

---

## 10. Observabilidad

### 10.1 Logging

```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

// Uso
logger.info({ userId, listingId, action: 'listing:created' }, 'Listing created')
```

### 10.2 Métricas de Negocio

Capturar desde día 1:
- Búsquedas realizadas (filtros vs conversación)
- Conversaciones iniciadas / completadas
- Leads generados
- Tasa de renovación de avisos
- Tiempo de respuesta a leads
- Conversión búsqueda → contacto

---

## 11. Seguridad

### 11.1 Autenticación

- JWT con access + refresh tokens
- Access token: 15 min, en memory
- Refresh token: 30 días, httpOnly cookie
- Rotación de refresh token en cada uso

### 11.2 Autorización

```typescript
// RBAC con permisos granulares
const ROLE_PERMISSIONS = {
  user: ['listing:read'],
  agent: ['listing:create', 'listing:read', 'listing:update', 'lead:view'],
  org_admin: ['listing:*', 'lead:*', 'org:manage'],
  platform_admin: ['*']
}

// Middleware
async function requirePermission(permission: Permission) {
  return async (ctx: Context, next: Next) => {
    if (!hasPermission(ctx.user, permission)) {
      throw new ForbiddenError()
    }
    return next()
  }
}
```

### 11.3 Data Isolation

```typescript
// Todas las queries B2B filtran por organization_id
const listings = await db.query.listings.findMany({
  where: and(
    eq(listings.organizationId, ctx.organizationId),
    // ... otros filtros
  )
})
```

---

## 12. Escalabilidad

### 12.1 De 50K a 500K propiedades

| Componente | 50K | 500K | Cambio |
|------------|-----|------|--------|
| PostgreSQL | Single | Read replicas | Agregar replicas |
| Elasticsearch | Single node | 3+ nodos | Scale out |
| API | Single | Multiple + LB | Stateless, scale out |
| Redis | Single | Cluster | Scale out |
| Media | Single bucket | CDN + múltiples | Ya con CDN |

### 12.2 Lo que se hace desde día 1

- UUIDs (no auto-increment)
- `organization_id` en toda entidad
- Paginación cursor-based
- Índices de ES con mappings explícitos
- Media paths basados en hash
- Stateless API

---

## 13. Desarrollo Local

### 13.1 Requisitos

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 13.2 Setup

```bash
# Clonar
git clone <repo>
cd propieya

# Instalar dependencias
pnpm install

# Levantar servicios
docker compose up -d

# Configurar env
cp .env.example .env.local
# Editar .env.local con tus valores

# Migraciones
pnpm db:push

# Dev
pnpm dev
```

### 13.3 Servicios Docker

- PostgreSQL (5432)
- Elasticsearch (9200)
- Redis (6379)
- MinIO (9000) - S3 compatible

---

## 14. Decisiones Pendientes

| Decisión | Opciones | Para cuándo |
|----------|----------|-------------|
| Email provider | Resend vs SendGrid | Pre-MVP |
| Maps provider | Mapbox vs Google Maps | Pre-MVP |
| Error tracking | Sentry vs alternativa | Pre-MVP |
| Analytics | PostHog vs custom vs **capa propia** (`portal_stats_events` + rollups) | Ver **`docs/49-ARQUITECTURA-PANEL-ESTADISTICAS-Y-TELEMETRIA.md`** y `PORTAL_STATS_TERMINALS` en `@propieya/shared` |
| CI/CD | GitHub Actions vs otras | Pre-MVP |

---

*Documento actualizado conforme avanza el proyecto.*
