# Propieya — Documento Fundacional de Producto y Arquitectura

**Versión:** 1.0  
**Fecha:** 2026-03-18  
**Tipo:** Base fundacional — Source of truth para inicio de proyecto  
**Estado:** Para revisión y validación del equipo fundador

---

## 1. Resumen Ejecutivo

Propieya es una plataforma inmobiliaria conversacional-first, diseñada para capturar intención de demanda, construir perfiles dinámicos de búsqueda y generar matching real entre oferta y demanda inmobiliaria.

**La apuesta central** no es "un portal con chat", sino un cambio de paradigma en cómo se busca propiedad: de filtros estáticos a conversación contextual con refinamiento progresivo.

**Modelo de entrada:** B2B2C. Se entra con inventario asegurado vía alianzas con redes, colegios, comercializadoras y desarrollistas. No se lanza como portal abierto compitiendo por tráfico orgánico desde cero.

**Escala de diseño:** Fundación pensada para 50.000 propiedades y 1.000 operadores en fase 1, con crecimiento ordenado hacia 500.000 propiedades sin rediseño estructural.

**Decisión arquitectónica clave:** Monolito modular con separación clara de dominios, preparado para extraer servicios cuando la escala lo justifique. No microservicios prematuros, no monolito acoplado.

**Decisión de producto clave:** El MVP debe demostrar el diferencial conversacional de forma tangible. No se lanza sin que la conversación funcione como eje real de búsqueda — pero se lanza con un alcance acotado del motor conversacional (intención + refinamiento básico + matching explicado), no con un agente omnisciente.

**Lo que NO entra en MVP:** White-label completo, módulo desarrollistas, hub de inversiones, tokenización, analytics avanzado, multi-tenant real. Se diseñan las interfaces y el data model para soportarlos, pero no se implementan.

**Criterios extendidos (MLS-ready real, filtros facetados, mapa profundo, semántica y UX por capas):** ver **`docs/38-CRITERIOS-MLS-FILTROS-MAPA-SEMANTICA.md`** — complementa este documento para backlog y arquitectura evolutiva.

**Norte del portal (descubrimiento, decisión, confianza, inventario):** **`docs/41-PROPUESTA-VALOR-PORTAL.md`**.

**Evolución sin “Frankenstein” (reglas, capas A–D, modo agente):** **`docs/42-DIRECTIVA-OPERATIVA-PROPIEYA.md`**. **Matriz y backlog integrables:** **`docs/43-ANEXO-MASTERPLAN-MEJORAS-INTEGRABLES.md`**.

**Onboarding por persona (buscador / dueño / inmobiliaria) y monetización (Mercado Pago):** **`docs/40-ONBOARDING-PERSONAS-Y-FLUJOS.md`**, **`docs/39-MONETIZACION-MERCADOPAGO.md`**.

---

## 2. Replanteo Crítico del Producto

### 2.1 Tensiones identificadas

| Tensión | Riesgo | Resolución propuesta |
|---------|--------|---------------------|
| Conversacional-first requiere AI madura vs. MVP rápido | Lanzar con conversación mediocre destruye el diferencial | MVP con flujo conversacional acotado pero funcional: captura de intención, refinamiento guiado, matching explicado. No "chat libre" sino conversación estructurada con escape a filtros |
| Escala 50K-500K vs. empezar de cero | Sobre-ingeniería paraliza; sub-ingeniería obliga a rehacer | Monolito modular con Elasticsearch desde día 1 para búsqueda. PostgreSQL con schema multi-tenant preparado pero no activado |
| White-label + multi-tenant vs. foco | Multi-tenant real multiplica complejidad 3-5x en cada feature | MVP single-tenant con `organization_id` en toda entidad. White-label se activa post-MVP con theming + subdomain routing |
| B2B2C entry vs. producto público | Sin B2B el inventario no existe; sin público el valor no se demuestra | MVP con portal público + panel B2B básico. El portal público es el escaparate que justifica la alianza B2B |
| Módulo desarrollistas + inversiones vs. core | Dispersan foco de MVP | Diseñar data model para soportarlos. No implementar en MVP. Son extensiones del inventario, no productos separados |
| UX innovadora vs. simple | Innovación mal ejecutada es peor que convencional bien hecho | Conversación como innovación visible. UI de resultados/fichas inicialmente convencional pero limpia. Progresividad real |
| Política de vigencia estricta vs. fricción para publicadores | Si la vigencia es incómoda, no publican | Vigencia es diferencial de calidad. Implementar con UX amable: recordatorios anticipados, renovación en 1 click, no castigo sino cuidado |

### 2.2 Partes del alcance clasificadas

**Núcleo real (sin esto no hay producto):**
- Búsqueda conversacional funcional
- Búsqueda tradicional con filtros
- Inventario con vigencia controlada
- Perfil dinámico de demanda (al menos básico)
- Matching con explicabilidad
- Lead enriquecido
- Panel B2B mínimo

**Diferenciales estratégicos (proteger, implementar temprano pero no todo en MVP):**
- Conversación como eje real (no decoración)
- Vigencia/calidad del inventario
- Perfil de demanda progresivo
- Matching explicado
- Lead calificado con contexto

**Postergar sin culpa:**
- White-label completo (diseñar schema, no implementar)
- Módulo desarrollistas (post-MVP cercano)
- Hub de inversiones (post-MVP)
- Analytics avanzado / insights comerciales
- Multi-tenant real
- Alertas inteligentes avanzadas (MVP: alertas básicas)

**No implementar todavía ni diseñar en detalle:**
- Tokenización
- MLS federation real
- Marketplace de servicios complementarios

### 2.3 Errores a evitar

1. **Lanzar sin conversación funcional.** Si la conversación no agrega valor real en MVP, el producto pierde su razón de ser y compite como "otro portal más".
2. **Implementar white-label antes de tener el producto core probado.** White-label multiplica cada bug, cada cambio de UX, cada decisión de diseño.
3. **Subestimar la política de vigencia.** Es un diferencial de calidad que ningún portal tradicional resuelve bien. Debe estar desde MVP.
4. **Construir el motor conversacional como sistema cerrado.** Debe ser una capa que consume el mismo motor de búsqueda que los filtros. No dos sistemas paralelos.
5. **Diseñar la UI como si fuera solo desktop.** El 70%+ del tráfico inmobiliario es mobile. Mobile-first real.

---

## 3. Núcleo Irrenunciable del Producto

El producto mínimo que justifica existir tiene exactamente estos componentes:

```
┌─────────────────────────────────────────────────┐
│              EXPERIENCIA PÚBLICA                │
│                                                 │
│  ┌─────────────┐    ┌──────────────────────┐   │
│  │  Búsqueda   │    │    Conversación      │   │
│  │ Tradicional │◄──►│  (captura intención, │   │
│  │  (filtros)  │    │   refinamiento,      │   │
│  │             │    │   matching explicado) │   │
│  └──────┬──────┘    └──────────┬───────────┘   │
│         │                      │                │
│         ▼                      ▼                │
│  ┌─────────────────────────────────────────┐   │
│  │         Motor de Búsqueda Unificado     │   │
│  │      (Elasticsearch + scoring/match)    │   │
│  └──────────────────┬──────────────────────┘   │
│                     │                           │
│         ┌───────────┼───────────┐               │
│         ▼           ▼           ▼               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Resultados│ │  Ficha   │ │Lead enriquec.│   │
│  │ + match  │ │propiedad │ │  (contacto)  │   │
│  │explicado │ │          │ │              │   │
│  └──────────┘ └──────────┘ └──────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     Perfil Dinámico de Demanda          │   │
│  │  (gustos, rechazos, imprescindibles)    │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              INVENTARIO + CALIDAD               │
│                                                 │
│  ┌────────────────┐  ┌────────────────────┐    │
│  │   Publicación  │  │    Vigencia /      │    │
│  │   (manual/API) │  │    Freshness       │    │
│  └────────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              PANEL B2B BÁSICO                   │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Mis avisos│ │Mis leads │ │Mi organización│  │
│  └──────────┘ └──────────┘ └───────────────┘  │
└─────────────────────────────────────────────────┘
```

**Si falta cualquiera de estos, no hay producto diferencial.**
Si se agrega más de esto en MVP, se dispersa foco y se retrasa lanzamiento.

---

## 4. Arquitectura Funcional v1

### 4.1 Mapa de módulos

#### M01 — Portal Público / Front

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Experiencia de búsqueda pública, ficha de propiedad, landing pages, SEO |
| **Usuario principal** | Visitante, usuario registrado, comprador, inversor |
| **Inputs** | Query de búsqueda (texto libre o filtros), interacciones de navegación, URL con parámetros |
| **Outputs** | Resultados de búsqueda, fichas de propiedad, sugerencias, CTAs de contacto |
| **Dependencias** | M02 (conversación), M03 (búsqueda), M04 (perfil demanda), M05 (matching), M17 (theming) |
| **MVP** | **Sí** |

#### M02 — Capa de Experiencia Conversacional

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Interfaz conversacional para captura de intención, refinamiento de búsqueda, explicación de resultados |
| **Usuario principal** | Cualquier usuario buscando propiedad |
| **Inputs** | Texto libre del usuario, contexto de sesión, perfil de demanda existente, historial de conversación |
| **Outputs** | Queries estructuradas al motor de búsqueda, mensajes de refinamiento, resultados con explicación, actualizaciones al perfil de demanda |
| **Dependencias** | M03 (búsqueda), M04 (perfil demanda), M05 (matching), LLM externo (OpenAI/Anthropic) |
| **MVP** | **Sí** — versión acotada: captura de intención, refinamiento guiado (máx 3-4 turnos productivos), matching explicado. No "chat libre" omnisciente |

**Nota crítica:** Este módulo NO es un chatbot genérico. Es un traductor de intención inmobiliaria a queries estructuradas, con capacidad de refinamiento contextual. En MVP funciona como flujo semi-estructurado (el sistema guía, el usuario refina). En versiones posteriores evoluciona hacia conversación más abierta.

#### M03 — Motor de Búsqueda Tradicional

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Búsqueda por filtros, facets, ordenamiento, geo-búsqueda |
| **Usuario principal** | Todos los usuarios del portal público, panel B2B |
| **Inputs** | Filtros estructurados (tipo, operación, ubicación, precio, superficie, amenities, etc.) |
| **Outputs** | Resultados paginados, facets disponibles, conteos |
| **Dependencias** | M08 (inventario), Elasticsearch |
| **MVP** | **Sí** |

#### M04 — Perfil Dinámico de Demanda

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Construcción progresiva del perfil de búsqueda del usuario: gustos, rechazos, imprescindibles, deseables, negociables, descartes |
| **Usuario principal** | Usuario registrado (implícito vía conversación), sistema de matching |
| **Inputs** | Interacciones conversacionales, likes/dislikes explícitos, historial de navegación, propiedades guardadas/descartadas |
| **Outputs** | Perfil estructurado de demanda, señales para matching, señales para alertas |
| **Dependencias** | M02 (conversación), M05 (matching), M13 (alertas) |
| **MVP** | **Sí** — versión básica: captura de preferencias explícitas desde conversación y acciones (guardar, descartar, contactar). No inferencia implícita avanzada |

#### M05 — Motor de Matching

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Scoring de compatibilidad entre perfil de demanda y propiedades disponibles. Explicabilidad del match |
| **Usuario principal** | Sistema (alimenta resultados), usuario (ve explicación), inmobiliaria (ve calidad del lead) |
| **Inputs** | Perfil de demanda, inventario indexado, reglas de scoring |
| **Outputs** | Score de match por propiedad, explicación textual del match ("cumple X, no cumple Y, podría interesarte porque Z") |
| **Dependencias** | M04 (perfil demanda), M03 (búsqueda), M08 (inventario) |
| **MVP** | **Sí** — versión v1: scoring basado en coincidencia de atributos explícitos + pesos. No ML avanzado. Explicación basada en reglas |

#### M06 — Lead Enrichment

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Cuando un usuario contacta, el lead llega con contexto: qué buscó, qué vio, qué le importa, score de match, nivel de intención |
| **Usuario principal** | Inmobiliaria, agente, desarrollista |
| **Inputs** | Perfil de demanda, historial de interacción, propiedad contactada, datos del usuario |
| **Outputs** | Lead estructurado con contexto enriquecido |
| **Dependencias** | M04 (perfil), M05 (matching), M09 (panel B2B) |
| **MVP** | **Sí** — versión básica: perfil de búsqueda + propiedades vistas + match score. No scoring predictivo de conversión |

#### M07 — Sistema de Vigencia / Calidad de Inventario

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Control de frescura y vigencia de avisos. Renovación cada 30 días para manuales, 24h máx para integraciones |
| **Usuario principal** | Sistema (automático), publicador (recibe alertas de vencimiento), admin plataforma |
| **Inputs** | Fecha de publicación, fecha de última validación, fuente del aviso (manual/API), señales de frescura |
| **Outputs** | Estado del aviso (activo, próximo a vencer, suspendido, archivado, baja), notificaciones al publicador |
| **Dependencias** | M08 (inventario), M13 (alertas), scheduler/cron |
| **MVP** | **Sí** — es diferencial de calidad |

**Estados del aviso:**
```
activo ──(27 días sin validar)──► próximo_a_vencer ──(30 días)──► suspendido ──(15 días)──► archivado
                                                                       │
                                                                  (renovación)
                                                                       │
                                                                       ▼
                                                                    activo
```

#### M08 — Gestión de Inventario

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | CRUD de propiedades, media, normalización de datos, ingestión manual y por API/feed |
| **Usuario principal** | Inmobiliaria, agente, integración API, admin |
| **Inputs** | Datos de propiedad (manual o feed), imágenes, documentos, ubicación |
| **Outputs** | Propiedad normalizada indexada, disponible para búsqueda |
| **Dependencias** | M07 (vigencia), M03 (búsqueda — indexación), storage de media |
| **MVP** | **Sí** |

#### M09 — Panel B2B

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Dashboard para inmobiliarias: gestión de avisos, leads recibidos, métricas básicas, configuración de organización |
| **Usuario principal** | Inmobiliaria, agente, coordinador |
| **Inputs** | Avisos propios, leads recibidos, datos de organización |
| **Outputs** | Vista de gestión, métricas, acciones sobre avisos y leads |
| **Dependencias** | M08 (inventario), M06 (leads), M07 (vigencia) |
| **MVP** | **Sí** — versión básica: CRUD avisos, lista de leads con contexto, datos de organización |

#### M10 — Módulo White-Label

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Permitir que redes, colegios o franquicias tengan su propia instancia visual del portal con su marca, dominio y configuración |
| **Usuario principal** | Operador white-label, admin de red/colegio |
| **Inputs** | Configuración de marca, dominio, logo, colores, inventario filtrado |
| **Outputs** | Portal personalizado bajo marca del tenant |
| **Dependencias** | M01 (portal), M15 (admin), sistema de theming, DNS/subdomain routing |
| **MVP** | **No** — se diseña el schema con `organization_id` y `tenant_id` desde día 1, pero no se implementa la capa de personalización ni multi-dominio |

#### M11 — Módulo Desarrollistas / Constructoras

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Gestión de emprendimientos: proyecto, tipologías, unidades, stock, financiación, avance de obra |
| **Usuario principal** | Desarrollista, comercializadora |
| **Inputs** | Datos del emprendimiento, tipologías, precios, planos, estado de obra |
| **Outputs** | Ficha de emprendimiento, unidades disponibles, integración con búsqueda |
| **Dependencias** | M08 (inventario — extensión), M03 (búsqueda), M09 (panel B2B) |
| **MVP** | **No** — post-MVP cercano. Se diseña el data model extensible para soportar `property_type: development_unit` |

#### M12 — Hub de Oportunidades / Inversión

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Sección de oportunidades de inversión validadas con criterios objetivos (rentabilidad, cap rate, contexto de zona, tendencia) |
| **Usuario principal** | Inversor, comprador con perfil inversor |
| **Inputs** | Propiedades marcadas como oportunidad, datos de mercado, criterios de validación |
| **Outputs** | Listado curado con fundamentación, métricas de inversión |
| **Dependencias** | M08 (inventario), M03 (búsqueda), datos de mercado externos |
| **MVP** | **No** — post-MVP. Requiere datos de mercado que no se tendrán en fase 1 |

#### M13 — Alertas / Notificaciones

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Notificaciones por nuevas propiedades que matchean perfil, vencimiento de avisos, leads nuevos, actividad relevante |
| **Usuario principal** | Todos los roles |
| **Inputs** | Eventos del sistema, perfil de demanda, preferencias de notificación |
| **Outputs** | Notificaciones in-app, email, push (futuro) |
| **Dependencias** | M04 (perfil), M05 (matching), M07 (vigencia), sistema de eventos |
| **MVP** | **Parcial** — alertas de vencimiento para publicadores + alerta básica por email de nuevas propiedades para buscadores. No alertas inteligentes con refinamiento |

#### M14 — Analytics / Insights

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Métricas de uso, rendimiento de avisos, calidad de leads, insights de demanda |
| **Usuario principal** | Inmobiliaria (sus métricas), admin plataforma (métricas globales) |
| **Inputs** | Eventos de uso, interacciones, conversiones |
| **Outputs** | Dashboards, reportes, indicadores |
| **Dependencias** | Sistema de eventos, todos los módulos |
| **MVP** | **Mínimo** — métricas básicas en panel B2B: vistas de avisos, leads recibidos, tasa de contacto. No dashboards avanzados |

#### M15 — Administración / Configuración

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Gestión de la plataforma: usuarios, organizaciones, configuración global, moderación |
| **Usuario principal** | Admin plataforma, soporte |
| **Inputs** | Configuración de sistema, gestión de entidades |
| **Outputs** | Control operativo de la plataforma |
| **Dependencias** | Todos los módulos |
| **MVP** | **Básico** — CRUD de organizaciones, usuarios, moderación de avisos. No panel avanzado |

#### M16 — Sistema de Preferencias de Visualización (Simple/Pro)

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Permitir que el usuario elija nivel de complejidad visible: modo limpio (menos filtros, más conversación) vs. modo profesional (todos los filtros, datos técnicos, métricas) |
| **Usuario principal** | Cualquier usuario del portal público |
| **Inputs** | Preferencia del usuario (toggle), tipo de usuario (inferido) |
| **Outputs** | UI adaptada al nivel de complejidad elegido |
| **Dependencias** | M01 (portal), M02 (conversación) |
| **MVP** | **Sí** — implementado como toggle simple que controla visibilidad de secciones. No como dos UIs completamente diferentes |

#### M17 — Sistema de Theming (Light/Dark)

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Soporte nativo de modo claro y oscuro |
| **Usuario principal** | Todos |
| **Inputs** | Preferencia del usuario o del sistema operativo |
| **Outputs** | Tema visual aplicado |
| **Dependencias** | Design system, CSS variables |
| **MVP** | **Sí** — desde el inicio con CSS custom properties y design tokens |

---

## 5. Arquitectura Fundacional del Sistema

### 5.1 Enfoque general

**Monolito modular** con los siguientes principios:

1. **Una aplicación, dominios separados internamente.** Cada bounded context tiene su propio directorio, sus propios tipos, su propia lógica. Comparten base de datos pero con schemas/prefijos claros.
2. **API-first.** El frontend consume APIs REST/GraphQL. No server-side rendering acoplado a lógica de negocio.
3. **Event bus interno.** Los módulos se comunican por eventos (en memoria inicialmente, migrable a cola de mensajes cuando la escala lo requiera).
4. **Preparado para extraer.** Cuando un módulo necesite escalar independientemente, se extrae como servicio. Pero eso no pasa en fase 1.

**Razón:** Un equipo fundador pequeño no puede operar 8 microservicios. Un monolito bien modularizado es más rápido de desarrollar, debuggear y desplegar. La clave es que la modularización interna sea real, no nominal.

### 5.2 Stack tecnológico recomendado

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | Next.js 14+ (App Router) + React | SSR para SEO (crítico en inmobiliario), React para UX rica, ISR para fichas de propiedad |
| **Design System** | Tailwind CSS + Radix UI primitives + CSS custom properties | Theming light/dark nativo, accesibilidad, componentes headless personalizables |
| **API** | Node.js (TypeScript) — puede ser el mismo Next.js API routes o un servicio Express/Fastify separado | TypeScript end-to-end, ecosistema maduro, buen soporte para streaming (conversación) |
| **Base de datos principal** | PostgreSQL 16+ | JSONB para datos semi-estructurados de propiedades, extensiones geoespaciales (PostGIS), particionamiento nativo, row-level security para multi-tenant futuro |
| **Motor de búsqueda** | Elasticsearch 8+ (o OpenSearch) | Full-text search, geo-queries, facets, scoring personalizado. Imprescindible para 50K+ propiedades |
| **Cache** | Redis | Sesiones, cache de queries frecuentes, rate limiting, pub/sub para eventos en tiempo real |
| **LLM Integration** | OpenAI API / Anthropic Claude API (abstracción propia) | Motor conversacional. Abstracción propia para no acoplarse a un provider |
| **Cola de tareas** | BullMQ (Redis-backed) | Jobs de vigencia, indexación, notificaciones, procesamiento de imágenes |
| **Storage** | S3 / compatible (Cloudflare R2, MinIO) | Imágenes de propiedades, documentos |
| **Autenticación** | Auth propio con JWT + refresh tokens, o Auth.js (NextAuth) | Flexibilidad para multi-tenant futuro |
| **Infra** | Docker + Railway/Render/Fly.io inicialmente → AWS/GCP cuando escale | No over-engineer infra en fase 1 |
| **Observabilidad** | Structured logging (Pino) + métricas (Prometheus) + tracing básico | Desde día 1, no como parche |

### 5.3 Bounded Contexts / Dominios

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLATAFORMA PROPIEYA                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  IDENTITY &  │  │  PROPERTY &  │  │  SEARCH & DISCOVERY   │ │
│  │  ACCESS      │  │  INVENTORY   │  │                       │ │
│  │              │  │              │  │  - Query engine        │ │
│  │  - Users     │  │  - Listings  │  │  - Conversation layer │ │
│  │  - Orgs      │  │  - Media     │  │  - Demand profile     │ │
│  │  - Roles     │  │  - Freshness │  │  - Matching engine    │ │
│  │  - Tenants   │  │  - Ingest    │  │  - Recommendations    │ │
│  │  - AuthZ     │  │  - Quality   │  │                       │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  LEAD &      │  │  NOTIFICATION│  │  ANALYTICS &          │ │
│  │  ENGAGEMENT  │  │  & ALERTS    │  │  INSIGHTS             │ │
│  │              │  │              │  │                       │ │
│  │  - Leads     │  │  - In-app    │  │  - Events             │ │
│  │  - Enrichment│  │  - Email     │  │  - Metrics            │ │
│  │  - Tracking  │  │  - Push      │  │  - Reports            │ │
│  │  - CRM basic │  │  - Scheduler │  │                       │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  PLATFORM    │  │  BILLING &   │  (post-MVP)               │
│  │  ADMIN       │  │  PLANS       │                            │
│  │              │  │              │                            │
│  │  - Config    │  │  - Subs      │                            │
│  │  - Moderation│  │  - Usage     │                            │
│  │  - Ops       │  │  - Invoicing │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Criterios para multi-tenant / white-label

- Toda entidad principal incluye `organization_id` desde día 1.
- Se reserva `tenant_id` en schema pero no se implementa lógica multi-tenant real en MVP.
- White-label se resuelve con: theming (CSS variables por tenant), subdomain routing, configuración de marca en DB, filtrado de inventario por organización.
- Row-Level Security de PostgreSQL se activa cuando haya multi-tenant real, no antes.
- No hay bases de datos separadas por tenant. Single-DB, schema compartido con filtrado.

### 5.5 Criterios para búsqueda y escalabilidad de inventario

- **Elasticsearch como motor de búsqueda desde día 1.** PostgreSQL para CRUD, ES para queries de búsqueda. No intentar hacer búsqueda inmobiliaria con SQL.
- Índice de ES diseñado para 500K documentos con queries complejas (geo, rango, full-text, facets).
- Indexación asíncrona: cambio en PostgreSQL → evento → job de indexación en ES. No indexación síncrona.
- Geo-queries con ES native geo_point / geo_shape para "buscar en zona" y "cercanía a punto".
- Facets dinámicos para filtros: el frontend no hardcodea opciones, consulta facets disponibles.
- Paginación con `search_after` para deep pagination eficiente.

### 5.6 Criterios para conversación y perfilado

- La capa conversacional es un **servicio interno** que:
  1. Recibe texto libre del usuario + contexto de sesión.
  2. Usa LLM para extraer intención estructurada (tipo de operación, zona, rango de precio, atributos deseados, rechazos, etc.).
  3. Traduce intención a query de búsqueda (misma API que filtros tradicionales).
  4. Recibe resultados y genera respuesta explicativa.
  5. Actualiza perfil de demanda.
- **Abstracción de LLM provider:** interface `ConversationEngine` con implementaciones intercambiables. No acoplarse a OpenAI.
- **Prompt engineering como configuración, no como código hardcodeado.** Templates de prompts en configuración, versionados.
- **Fallback graceful:** si el LLM no entiende, ofrece filtros tradicionales. Nunca un "no entendí" sin salida.
- **Streaming de respuestas** para UX fluida (Server-Sent Events).
- **Rate limiting por usuario** para controlar costos de LLM.
- **Cache de queries frecuentes** para reducir llamadas al LLM.

### 5.7 Criterios para ingestión de datos

- **Ingestión manual:** formulario de publicación en panel B2B con validación de campos mínimos + media.
- **Ingestión por API/feed:** endpoint REST para integraciones. Cada integración tiene API key + rate limit + mapping de campos.
- **Normalización:** pipeline de normalización que mapea datos de distintas fuentes a schema canónico (tipo, operación, ubicación normalizada, precio en moneda base, superficie, etc.).
- **Deduplicación:** lógica básica para detectar misma propiedad publicada por distintas fuentes (por dirección + superficie + precio similar).
- **Media processing:** pipeline asíncrono de optimización de imágenes (resize, compress, formatos modernos).

### 5.8 Criterios para vigencia/freshness

- **Job scheduler** (BullMQ) ejecuta diariamente:
  1. Marca avisos manuales > 27 días como `próximo_a_vencer` → notificación.
  2. Marca avisos manuales > 30 días sin validación como `suspendido` → notificación.
  3. Marca avisos suspendidos > 15 días como `archivado`.
  4. Verifica integraciones: si la última sincronización de un feed > 24h, marca avisos de ese feed como `sin_refresh`.
  5. Si un feed no sincroniza en > 72h, suspende sus avisos.
- **Renovación:** 1 click desde panel B2B o email. No fricción innecesaria.
- Los avisos suspendidos/archivados se excluyen de búsqueda pero se mantienen en DB.

### 5.9 Criterios de observabilidad

- **Structured logging** (JSON) en todos los servicios con correlation ID por request.
- **Métricas de negocio** desde día 1: búsquedas realizadas, conversaciones iniciadas, leads generados, avisos publicados, tasa de renovación, conversión búsqueda→contacto.
- **Health checks** en cada componente.
- **Alerting** por errores críticos (LLM down, ES down, jobs fallidos).

### 5.10 Criterios de seguridad y permisos

- **Autenticación:** JWT con refresh tokens. Sesiones stateless.
- **Autorización:** RBAC (Role-Based Access Control) con permisos granulares. Roles asignados por organización.
- **Data isolation:** queries siempre filtradas por `organization_id` para datos B2B. Datos públicos no tienen filtro de org.
- **API security:** rate limiting, input validation, CORS estricto, sanitización.
- **Secrets management:** variables de entorno, nunca hardcodeado.
- **HTTPS everywhere.**

### 5.11 Crecimiento de 50K a 500K sin rediseño

| Aspecto | 50K propiedades | 500K propiedades | Acción necesaria |
|---------|----------------|------------------|-----------------|
| Elasticsearch | Single node | Cluster de 3+ nodos | Scale out, no rediseño |
| PostgreSQL | Single instance | Read replicas + particionamiento por fecha | Particionamiento preparado desde diseño de tablas |
| API | Single instance | Múltiples instancias tras load balancer | Stateless desde día 1 |
| Media | Single bucket | CDN + múltiples buckets por región | CDN desde día 1, restructurar buckets cuando sea necesario |
| Cache | Redis single | Redis cluster | Scale out |
| Jobs | BullMQ single worker | BullMQ múltiples workers | Scale out workers |
| LLM calls | Direct API | Cola de prioridad + cache agresivo | Agregar cola, no rediseñar |

**Lo que se hace desde día 1 para no rediseñar:**
- IDs como UUIDs (no auto-increment).
- Timestamps en todas las entidades.
- `organization_id` en todas las entidades de negocio.
- Índices de ES con mappings explícitos (no dynamic mapping).
- Queries con paginación cursor-based, no offset-based.
- Archivos de media con path basado en hash, no en ID secuencial.

---

## 6. Actores y Permisos

### 6.1 Matriz de roles

#### R01 — Visitante (no registrado)

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Portal público, resultados de búsqueda, fichas de propiedad (con limitación en datos de contacto), conversación básica |
| **Qué puede hacer** | Buscar (filtros y conversación), ver fichas, ver resultados, iniciar conversación limitada (máx N turnos sin registro) |
| **Qué datos administra** | Ninguno persistente |
| **Tenant** | Portal principal |
| **Restricciones** | No puede contactar (requiere registro), no guarda preferencias, conversación limitada, no ve datos de contacto del publicador |

#### R02 — Usuario registrado

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Todo lo público + propiedades guardadas, historial de búsqueda, perfil de demanda, alertas |
| **Qué puede hacer** | Buscar sin límite, conversar sin límite, guardar/descartar propiedades, configurar alertas, contactar publicadores, gestionar perfil |
| **Qué datos administra** | Su perfil, sus preferencias, sus guardados |
| **Tenant** | Portal principal |
| **Restricciones** | No publica, no accede a panel B2B |

#### R03 — Comprador (es un usuario registrado con intención marcada)

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Mismo que R02 + matching explicado + sugerencias personalizadas |
| **Qué puede hacer** | Todo de R02 + definir perfil de demanda completo + recibir alertas inteligentes |
| **Qué datos administra** | Su perfil de demanda, sus criterios |
| **Tenant** | Portal principal |
| **Restricciones** | No es un rol separado técnicamente; es un usuario registrado con perfil de demanda activo |

#### R04 — Inversor (futuro, post-MVP)

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Todo de R03 + hub de oportunidades + métricas de inversión |
| **Qué puede hacer** | Todo de R03 + acceder a oportunidades validadas + análisis de inversión |
| **Tenant** | Portal principal |
| **Restricciones** | Post-MVP |

#### R05 — Agente / Corredor

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Panel B2B: sus avisos, sus leads, métricas de sus publicaciones |
| **Qué puede hacer** | Publicar avisos (con límite según plan), ver y gestionar leads, renovar vigencia, responder consultas |
| **Qué datos administra** | Sus avisos, respuestas a leads |
| **Tenant** | Su organización |
| **Restricciones** | Solo ve avisos y leads propios (o de su equipo si el coordinador lo permite). No configura organización |

#### R06 — Coordinador (de equipo/sucursal)

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Todo de R05 + avisos y leads de su equipo/sucursal + métricas agregadas |
| **Qué puede hacer** | Todo de R05 + asignar leads + ver rendimiento del equipo + gestionar miembros de equipo |
| **Qué datos administra** | Equipo, asignación de leads |
| **Tenant** | Su organización |
| **Restricciones** | No configura organización a nivel top. No ve otras sucursales (salvo permiso explícito) |

#### R07 — Administrador de Organización (inmobiliaria)

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Todo de R06 + configuración de organización + facturación/plan + todos los avisos y leads de la org + métricas globales de org |
| **Qué puede hacer** | Todo de R06 + configurar organización + gestionar usuarios de la org + gestionar plan/facturación + configurar integraciones API |
| **Qué datos administra** | Toda la organización |
| **Tenant** | Su organización |
| **Restricciones** | No accede a datos de otras organizaciones. No accede a admin de plataforma |

#### R08 — Desarrollista / Constructora (post-MVP)

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Panel B2B + módulo de emprendimientos (proyectos, tipologías, stock, avance) |
| **Qué puede hacer** | Todo de R07 para su org + gestionar emprendimientos + configurar tipologías + actualizar stock y avance de obra |
| **Qué datos administra** | Emprendimientos, tipologías, unidades |
| **Tenant** | Su organización |
| **Restricciones** | Post-MVP. Mismo nivel de acceso que admin org pero con módulo adicional |

#### R09 — Operador White-Label (post-MVP)

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Configuración de su tenant: marca, theming, dominio, inventario disponible, métricas de su portal |
| **Qué puede hacer** | Configurar apariencia del portal white-label, definir qué inventario se muestra, gestionar organizaciones miembro del tenant |
| **Qué datos administra** | Configuración de tenant, membresías |
| **Tenant** | Su propio tenant |
| **Restricciones** | Post-MVP. No accede a datos de otros tenants. No accede a admin de plataforma |

#### R10 — Administrador de Plataforma

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Todo. Todas las organizaciones, todos los tenants, todas las métricas, configuración global |
| **Qué puede hacer** | Todo. CRUD de organizaciones, gestión de planes, moderación de avisos, configuración de sistema, gestión de integraciones globales |
| **Qué datos administra** | Toda la plataforma |
| **Tenant** | Plataforma central |
| **Restricciones** | Acceso restringido a personas del equipo Propieya |

#### R11 — Soporte / Operaciones

| Aspecto | Detalle |
|---------|---------|
| **Qué ve** | Vista de soporte: búsqueda de usuarios, organizaciones, avisos. Logs de actividad. Estado de integraciones |
| **Qué puede hacer** | Buscar y consultar entidades, resolver incidencias, moderar avisos, suspender/reactivar cuentas (con aprobación) |
| **Qué datos administra** | No administra, opera sobre datos existentes con permisos limitados |
| **Tenant** | Plataforma central |
| **Restricciones** | No puede eliminar datos definitivamente. No configura sistema. Auditoría de acciones |

### 6.2 Modelo de permisos

```
Platform
  └── Tenant (white-label instance) [post-MVP]
       └── Organization (inmobiliaria, desarrollista, etc.)
            └── Team/Branch (sucursal/equipo) [opcional]
                 └── User (con role dentro de la org)
```

Permisos resueltos como:
- `resource:action` (ej: `listing:create`, `lead:view`, `org:manage`)
- Roles son conjuntos de permisos.
- Un usuario tiene un rol POR organización (puede pertenecer a varias orgs con distintos roles, post-MVP).

---

## 7. Flujos Principales de UX

### F01 — Home Conversacional-First

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Que el usuario entienda en 3 segundos que puede buscar hablando, y que quiera hacerlo |
| **Pasos** | 1. Landing con input conversacional prominente ("Contame qué estás buscando...") + sugerencias de ejemplo. 2. Debajo: acceso a filtros tradicionales (link secundario, no competidor visual). 3. Secciones de descubrimiento: propiedades destacadas, zonas populares, últimas publicaciones. 4. Footer con información institucional |
| **Puntos de decisión** | ¿Habla o filtra? ¿Explora o busca? |
| **Fricciones a resolver** | No debe sentirse como un chatbot genérico. Las sugerencias de ejemplo deben ser reales e inmobiliarias ("Busco un 3 ambientes en Palermo con balcón, hasta 200K"). El input debe verse como búsqueda, no como chat |
| **Datos capturados** | Primer query (incluso si no la envía, captura intención del placeholder seleccionado) |
| **Eventos** | `page_view:home`, `conversation:start`, `search:traditional_start`, `discovery:click` |

### F02 — Búsqueda Conversacional → Refinamiento → Resultados

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Convertir una intención en lenguaje natural en resultados relevantes, refinando progresivamente |
| **Pasos** | 1. Usuario escribe intención libre. 2. Sistema extrae intención estructurada y muestra comprensión ("Entendí que buscás X en Y, con Z. ¿Es así?"). 3. Muestra primeros resultados con explicación de match. 4. Ofrece refinamientos ("¿Te importa tener cochera?", "¿Cuánto más estarías dispuesto a pagar si tiene terraza?"). 5. Usuario refina, resultados se actualizan. 6. En cualquier momento, usuario puede ver/ajustar filtros traducidos. 7. Puede guardar búsqueda como alerta |
| **Puntos de decisión** | ¿Confirma la interpretación? ¿Refina o explora resultados? ¿Guarda búsqueda? |
| **Fricciones** | LLM puede malinterpretar → mostrar siempre la interpretación y permitir corregir. Latencia del LLM → streaming + indicador de "pensando". Resultados vacíos → ofrecer alternativas ("No encontré exactamente eso, pero mirá estas opciones cercanas") |
| **Datos capturados** | Intención original, intención estructurada, refinamientos, preferencias explícitas/implícitas |
| **Eventos** | `conversation:message_sent`, `conversation:intent_extracted`, `conversation:refinement`, `search:results_shown`, `search:result_click` |

### F03 — Búsqueda Tradicional Asistida

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Búsqueda por filtros para usuarios que prefieren control directo |
| **Pasos** | 1. Acceso a panel de filtros (tipo, operación, zona, precio, superficie, ambientes, amenities). 2. Modo simple: filtros esenciales visibles. Modo pro: todos los filtros. 3. Resultados actualizados en tiempo real. 4. Barra lateral sugiere: "¿Querés contarme más sobre lo que buscás?" (puente a conversación). 5. Puede ordenar, cambiar vista (lista/grilla/mapa) |
| **Puntos de decisión** | ¿Usa modo simple o pro? ¿Pasa a conversación? ¿Cambia vista? |
| **Fricciones** | No saturar con filtros en modo simple. Geo-selección debe ser intuitiva (mapa o autocompletado). Filtros deben mostrar conteo de resultados en real-time |
| **Datos capturados** | Filtros aplicados, cambios de filtro, modo de visualización preferido |
| **Eventos** | `search:filter_applied`, `search:filter_changed`, `search:view_changed`, `search:conversation_bridge_clicked` |

### F04 — Resultado → Ficha → Justificación del Match

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Que el usuario entienda POR QUÉ esa propiedad aparece y qué tan bien calza con lo que busca |
| **Pasos** | 1. En lista de resultados, cada card muestra badge de match ("92% compatible"). 2. Click abre ficha completa. 3. Ficha tiene sección "Por qué te la mostramos" con explicación: qué criterios cumple, cuáles no, cuáles parcialmente. 4. Galería, datos, ubicación, mapa, amenities, descripción. 5. CTA de contacto prominente. 6. Acciones: guardar, descartar ("no me interesa porque..."), compartir |
| **Puntos de decisión** | ¿Contacta? ¿Guarda? ¿Descarta? ¿Vuelve a resultados? |
| **Fricciones** | La explicación del match no debe ser técnica ("score: 0.92") sino humana ("Tiene los 3 ambientes que pediste, está en la zona que te gusta, pero no tiene balcón"). El descarte debe capturar el por qué (para mejorar perfil) |
| **Datos capturados** | Tiempo en ficha, secciones vistas, acción final (contacto/guardar/descartar), razón de descarte |
| **Eventos** | `listing:view`, `listing:gallery_view`, `listing:match_explanation_view`, `listing:save`, `listing:discard`, `listing:contact_start` |

### F05 — Ficha → Lead Enriquecido

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Generar un contacto que llegue al publicador con contexto valioso, no solo "nombre + teléfono" |
| **Pasos** | 1. Usuario hace click en "Contactar". 2. Si no está registrado, registro rápido (email + nombre, mínima fricción). 3. Formulario de contacto con mensaje pre-rellenado basado en intención ("Hola, estoy buscando [resumen de intención]. Me interesa esta propiedad porque [match]"). 4. Usuario puede editar y enviar. 5. El lead llega al publicador con: datos del usuario, perfil de demanda, propiedades vistas, match score, nivel de intención estimado |
| **Puntos de decisión** | ¿Se registra? ¿Envía mensaje predeterminado o edita? |
| **Fricciones** | Registro debe ser mínimo — no pedir 15 campos. Mensaje pre-rellenado debe ser natural, no robótico. El publicador no debe recibir un PDF de 3 páginas sino un resumen ejecutivo del lead |
| **Datos capturados** | Datos de registro, mensaje enviado, propiedad contactada, contexto completo del lead |
| **Eventos** | `lead:created`, `lead:enriched`, `user:registered` (si aplica) |

### F06 — Guardado de Preferencias / Alertas

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Que el usuario pueda volver sin empezar de cero y reciba avisos de nuevas propiedades relevantes |
| **Pasos** | 1. Desde resultados o conversación: "Guardar esta búsqueda como alerta". 2. Configurar frecuencia (inmediata, diaria, semanal). 3. Desde ficha: guardar propiedad en favoritos. 4. Perfil del usuario muestra: búsquedas guardadas, favoritos, descartados, perfil de demanda |
| **Puntos de decisión** | ¿Qué frecuencia? ¿Email o in-app? |
| **Fricciones** | No pedir registrarse solo para guardar una búsqueda (permitir con cookie, migrar al registrarse). Alertas no deben ser spam |
| **Datos capturados** | Búsquedas guardadas, frecuencia preferida, propiedades favoritas |
| **Eventos** | `alert:created`, `listing:favorited`, `preference:saved` |

### F07 — Publicación Manual → Vigencia

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Que el publicador suba una propiedad correctamente y entienda el compromiso de vigencia |
| **Pasos** | 1. Desde panel B2B: "Nueva publicación". 2. Formulario guiado: selecciona `propertyType` (incluye `land`/terreno rural y los demás tipos), `operationType`, ubicación, precio, superficie, ambientes, descripción, amenities, imágenes. Si `propertyType` es `land`: selector de variante rural de campo (agrícola/ganadero/mixto/forestal/otro) + campos específicos de esa variante. 3. Modo simple: campos esenciales. Modo pro: todos los campos. 4. Preview antes de publicar. 5. Al publicar: aviso queda activo con timer de 30 días. 6. A los 27 días: notificación "Tu aviso vence en 3 días. ¿Sigue disponible?". 7. Renovación en 1 click (o desde email). 8. Si no renueva: suspendido → notificación → archivado |
| **Puntos de decisión** | ¿Datos suficientes? ¿Imágenes de calidad? ¿Renueva a tiempo? |
| **Fricciones** | Formulario no debe ser exhaustivo de entrada — modo simple primero. La renovación debe ser sin fricción. El vencimiento no debe sentirse como castigo sino como cuidado de calidad |
| **Datos capturados** | Datos completos de propiedad, calidad de publicación (score), historial de vigencia |
| **Eventos** | `listing:created`, `listing:published`, `listing:expiring_soon`, `listing:renewed`, `listing:suspended` |

### F08 — Integración/API → Freshness

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Que avisos de feeds externos se mantengan frescos y se suspendan si la fuente deja de actualizar |
| **Pasos** | 1. Admin org configura integración (API key, endpoint, mapping). 2. Sincronización periódica (configurable, mín cada 24h). 3. Cada sync: crear/actualizar/desactivar avisos según feed. 4. Si sync falla: reintentar con backoff. 5. Si no hay sync en > 24h: marcar avisos como `sin_refresh`. 6. Si > 72h sin sync: suspender avisos del feed |
| **Puntos de decisión** | ¿Sync automática o manual? ¿Qué pasa con conflictos de datos? |
| **Fricciones** | Mappings de campos entre sistemas es complejo — ofrecer templates para CRMs comunes. Mostrar log de sync para debuggear problemas |
| **Datos capturados** | Estado de integración, historial de sync, errores |
| **Eventos** | `integration:sync_started`, `integration:sync_completed`, `integration:sync_failed`, `integration:listings_updated` |

### F09 — Gestión B2B de Leads

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Que la inmobiliaria gestione sus leads eficientemente y vea el valor del enriquecimiento |
| **Pasos** | 1. Panel B2B → sección Leads. 2. Lista de leads con: nombre, propiedad, match score, nivel de intención, fecha. 3. Click en lead: ver perfil completo (qué busca, qué vio, por qué contactó esta propiedad). 4. Acciones: marcar como contactado, calificar (interesado/no interesado/cerrado), agregar nota. 5. Filtrar leads por estado, fecha, propiedad, score |
| **Puntos de decisión** | ¿Prioriza por score? ¿Filtra por propiedad? |
| **Fricciones** | El enriquecimiento debe ser visualmente claro y valioso, no un dump de datos. CRM básico suficiente; no competir con CRMs dedicados |
| **Datos capturados** | Estado del lead, feedback del publicador, tiempo de respuesta |
| **Eventos** | `lead:viewed`, `lead:status_changed`, `lead:rated` |

### F10 — Flujo Desarrollista (post-MVP)

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Publicar un emprendimiento completo con tipologías, stock y avance |
| **Pasos** | 1. Crear emprendimiento (nombre, ubicación, tipo, descripción, masterplan). 2. Definir tipologías (1 amb, 2 amb, etc. con planos y precios). 3. Cargar unidades con estado (disponible, reservada, vendida). 4. Configurar financiación. 5. Actualizar avance de obra. 6. El emprendimiento aparece en búsqueda como ficha especial |
| **MVP** | No — se diseña el schema, se implementa post-MVP |

### F11 — Flujo Oportunidad/Inversión (post-MVP)

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Mostrar oportunidades de inversión validadas con fundamentación objetiva |
| **Pasos** | 1. Propiedad o emprendimiento se marca como "oportunidad" con criterios: rentabilidad estimada, cap rate, tendencia de zona, comparativa. 2. Validación por equipo o algoritmo. 3. Aparece en hub de inversiones con ficha especial. 4. Inversor puede filtrar por tipo de oportunidad, rentabilidad, zona |
| **MVP** | No |

### F12 — Flujo White-Label / Configuración Tenant (post-MVP)

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Configurar un portal con marca propia sobre la plataforma Propieya |
| **Pasos** | 1. Operador accede a panel de configuración de tenant. 2. Configura: logo, colores, dominio, textos legales, organizaciones miembro. 3. Define inventario visible (solo de miembros, todo el marketplace, híbrido). 4. Preview y activación |
| **MVP** | No |

### F13 — Flujo de Cambio Simple/Pro

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Que el usuario controle cuánta complejidad ve |
| **Pasos** | 1. Toggle accesible (pero no invasivo) en la interfaz. 2. Modo simple: filtros básicos, ficha resumida, conversación prominente. 3. Modo pro: todos los filtros, datos técnicos en ficha (precio/m², antigüedad exacta, expensas detalladas), métricas de matching |
| **Puntos de decisión** | ¿El default es simple? Sí. ¿Se recuerda la preferencia? Sí |
| **Fricciones** | El cambio debe ser instantáneo (no reload). No debe haber features exclusivas de pro — solo más detalle/control |
| **Datos capturados** | Preferencia, frecuencia de cambio |
| **Eventos** | `preference:display_mode_changed` |

### F14 — Flujo Light/Dark Mode

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Cambiar entre modo claro y oscuro |
| **Pasos** | 1. Default: seguir preferencia del sistema operativo. 2. Toggle en header/settings para override manual. 3. Cambio instantáneo sin reload |
| **Fricciones** | Imágenes de propiedades deben verse bien en ambos modos. Mapas deben adaptarse (tile style). No debe haber elementos con fondo blanco hardcodeado que se vean mal en dark |
| **Datos capturados** | Preferencia |
| **Eventos** | `preference:theme_changed` |

---

## 8. Lineamientos UX/UI Estratégicos

### 8.1 Principios UX del producto

1. **Conversación como puerta principal, no como feature secundaria.** El primer elemento visible en home es el input conversacional. Los filtros existen pero no compiten visualmente.

2. **Revelación progresiva.** No mostrar todo a la vez. Empezar limpio, agregar capas cuando el usuario las busca o las necesita.

3. **Cada interacción enriquece.** Cada click, búsqueda, descarte o guardado alimenta el perfil de demanda. El sistema mejora con el uso, y el usuario lo percibe.

4. **Explicabilidad sobre magia.** No mostrar resultados sin explicar por qué. El usuario debe entender qué está pasando y confiar en el sistema.

5. **Simplicidad operativa.** Para el publicador B2B, publicar y renovar debe ser tan fácil como enviar un mensaje. No formularios de 50 campos.

6. **Mobile-first real.** 70%+ del tráfico será mobile. La conversación debe funcionar excelente en mobile. La ficha debe ser consumible en mobile.

### 8.2 Materialización del enfoque conversacional-first

**Home:**
- Hero section con input de texto largo y prominente: "Contame qué estás buscando..."
- Debajo del input: chips de ejemplo clickeables ("3 ambientes en Palermo", "Casa con jardín en zona norte", "Invertir hasta 100K USD").
- Los chips no son filtros — son prompts de conversación.
- Debajo: enlace secundario "Prefiero buscar con filtros →".

**Resultados:**
- Layout split: conversación a la izquierda (o arriba en mobile), resultados a la derecha (o abajo).
- La conversación sigue activa mientras se ven resultados. El usuario puede refinar sin volver atrás.
- Cada resultado muestra badge de relevancia/match.

**Ficha:**
- Sección "Por qué esta propiedad" visible, no escondida.
- Posibilidad de preguntar al asistente sobre la propiedad ("¿Tiene cochera?", "¿A cuánto queda del subte?") — esta interacción alimenta el perfil.

**Transición conversación ↔ filtros:**
- Si el usuario empieza con conversación, los filtros se pre-llenan con lo interpretado. Puede ajustar manualmente.
- Si el usuario empieza con filtros, puede pasar a conversación y el contexto se mantiene.
- NUNCA son dos sistemas aislados.

### 8.3 Cómo evitar saturación visual

- **Jerarquía visual estricta.** Un solo elemento primario por pantalla. No cinco CTAs compitiendo.
- **Espaciado generoso.** Whitespace es parte del diseño, no desperdicio.
- **Tipografía como estructura.** Tamaños y pesos claros para crear jerarquía sin necesidad de bordes, fondos o decoración.
- **Color con intención.** Paleta reducida: 1 color primario, 1 secundario, grises, y acentos para estado (éxito, error, warning). No arcoíris de categorías.
- **Datos bajo demanda.** En modo simple, mostrar datos esenciales. El resto se revela al expandir, hacer hover, o cambiar a modo pro.

### 8.4 Cómo hacer visible la innovación sin complejizar

- La innovación visible es la **conversación que entiende.** No gadgets, no animaciones, no dashboards. La primera vez que el usuario dice "quiero algo luminoso cerca del parque" y recibe resultados relevantes con explicación, entiende el diferencial.
- **Demostrar, no explicar.** No poner banners que digan "Usamos AI". Que se note en el resultado.
- **Momentos de sorpresa calibrada.** Cuando el sistema recuerda una preferencia o sugiere algo que no se pidió explícitamente pero es relevante. Eso es innovación perceptible.

### 8.5 Opciones sugestivas e inductivas

- En cada punto de la conversación, ofrecer opciones clickeables que el usuario puede aceptar o ignorar.
- Ejemplo: "¿Qué es lo que más te importa?" → chips: "Ubicación", "Precio", "Luminosidad", "Espacio exterior", "Silencio".
- Estas opciones no son filtros — son pistas de conversación. El usuario puede clickear o escribir algo completamente distinto.
- En resultados: "Propiedades similares a las que guardaste", "Zonas que podrían interesarte".

### 8.6 Convivencia entre conversación y selectores

| Situación | Conversación | Selectores |
|-----------|-------------|------------|
| Primer acercamiento | ✅ Protagonista | Accesible pero secundario |
| Refinamiento de zona precisa | Opción de texto | ✅ Mapa / autocompletado más eficiente |
| Rango de precio | Texto acepta rangos | ✅ Slider más preciso |
| Amenities específicas | Texto acepta | ✅ Checkboxes más rápido para selección múltiple |
| Definir "ambiente" / "vibe" | ✅ Solo conversación puede | No existe selector para "luminoso y tranquilo" |
| Operación + tipo | Ambos | ✅ Un poco más rápido con selectores |
| Combinación compleja | ✅ "Quiero 3 amb en Palermo o Belgrano, hasta 200K, con balcón, sin expensas altas, y que sea luminoso" | Requiere 8 filtros |

**Criterio:** Si la intención es simple y discretizable, selectores son buenos aceleradores. Si la intención es compleja, ambigua o emocional, la conversación es superior. Ambos siempre disponibles.

### 8.7 Visibilidad simple vs. profesional

**Modo simple (default):**
- Filtros: operación, tipo, zona, precio, ambientes.
- Ficha: fotos, precio, ubicación, superficie, ambientes, descripción, match score, contacto.
- Cards en resultados: foto, precio, zona, ambientes, match badge.

**Modo profesional:**
- Filtros: todos los anteriores + antigüedad, piso, orientación, tipo de construcción, cochera, amenities detalladas, expensas, precio/m².
- Ficha: todo lo anterior + precio/m², comparativa de zona, antigüedad, disposición, datos técnicos, historial de precio (futuro).
- Cards en resultados: todo lo anterior + precio/m², antiguedad, superficie total vs. cubierta.

**Implementación:** CSS classes condicionales controladas por una variable de estado global. No dos codebases. Un solo componente con secciones que se muestran/ocultan.

### 8.8 Diseño cálido, moderno y amable

**Tipografía:**
- Sans-serif humanista (Inter, Plus Jakarta Sans, o similar). No geométricas frías (no Roboto puro, no Helvetica). Algo con personalidad pero legible.
- Tamaños generosos para títulos. Cuerpo de texto ≥ 16px.

**Color:**
- Paleta cálida como base. No azul corporativo frío.
- Primario: tono cálido diferencial (terracota suave, verde salvia, azul petróleo cálido — a definir con diseño visual).
- Superficies: no blanco puro (#FFFFFF); usar blanco cálido (#FAFAF8 o similar). En dark mode: no negro puro; usar gris oscuro cálido.
- Acentos: restringidos a acciones y estados.

**Bordes y sombras:**
- Bordes suaves (radius generoso, 8-12px). No esquinas duras.
- Sombras sutiles, no dramáticas.
- Preferir elevación por color de superficie sobre sombras fuertes.

**Imágenes:**
- Las fotos de propiedades son el contenido visual principal. Darles protagonismo.
- Aspect ratio consistente en listados.
- Lazy loading + blur placeholder.

**Animaciones:**
- Transiciones suaves (200-300ms) para cambios de estado.
- Skeleton loaders en vez de spinners.
- No animaciones llamativas ni decorativas. Funcionales y sutiles.

### 8.9 Light/Dark desde el inicio

**Implementación técnica:**
- Design tokens definidos como CSS custom properties:
  ```css
  :root {
    --color-surface-primary: #FAFAF8;
    --color-surface-secondary: #F0EDE8;
    --color-text-primary: #1A1A1A;
    --color-text-secondary: #666660;
    --color-accent: #C17B4A;
    /* ... */
  }

  [data-theme="dark"] {
    --color-surface-primary: #1C1C1E;
    --color-surface-secondary: #2C2C2E;
    --color-text-primary: #F0F0F0;
    --color-text-secondary: #A0A0A0;
    --color-accent: #D4956A;
    /* ... */
  }
  ```
- Todos los componentes usan variables, nunca colores literales.
- Imágenes: ningún tratamiento especial necesario (son fotos). Íconos SVG usan `currentColor`.
- Mapas: tile layer alternativo para dark mode.
- Default: preferencia del OS (`prefers-color-scheme`). Override manual persistido.

---

## 9. Backlog Inicial Priorizado

### Épica 0 — Fundación técnica

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 0.1 | Setup monorepo + tooling (TypeScript, linting, testing) | P0 | — | Proyecto corriendo localmente con hot reload, tests, linting |
| 0.2 | Design system base (tokens, componentes primitivos, light/dark) | P0 | — | Tokens definidos, componentes básicos (Button, Input, Card, Layout) funcionando en ambos modos |
| 0.3 | Base de datos (PostgreSQL schema v1) + migraciones | P0 | — | Schema inicial con tablas core, migraciones versionadas |
| 0.4 | Elasticsearch setup + índice de propiedades | P0 | — | Índice creado con mapping, indexación funcional desde DB |
| 0.5 | Auth (registro, login, JWT, roles básicos) | P0 | 0.3 | Usuario puede registrarse, loguearse, tokens funcionan |
| 0.6 | API base (routing, middleware, error handling, validation) | P0 | 0.3, 0.5 | Endpoints base respondiendo, auth middleware funcionando |
| 0.7 | Storage de media (S3 + pipeline de optimización de imágenes) | P0 | — | Upload de imágenes con resize y optimización |
| 0.8 | Job queue (BullMQ) + worker base | P0 | — | Jobs ejecutándose, retry funcional |

### Épica 1 — Inventario + Vigencia

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 1.1 | CRUD de propiedades (modelo canónico) | P0 | 0.3, 0.4 | Crear, editar, eliminar propiedad con todos los campos del schema canónico |
| 1.2 | Formulario de publicación (simple + pro) | P0 | 1.1, 0.2 | Publicar propiedad desde formulario con validación. Modo simple con campos esenciales, modo pro con todos |
| 1.3 | Indexación asíncrona PostgreSQL → Elasticsearch | P0 | 0.4, 0.8 | Cambio en DB se refleja en ES en < 5 segundos |
| 1.4 | Sistema de vigencia (estados, jobs, transiciones) | P0 | 1.1, 0.8 | Job diario cambia estados correctamente. Avisos expirados no aparecen en búsqueda |
| 1.5 | Notificaciones de vigencia (email) | P1 | 1.4, 0.8 | Publicador recibe email a los 27 días y al suspenderse |
| 1.6 | Renovación de vigencia (1 click) | P0 | 1.4 | Publicador renueva desde panel o desde email |
| 1.7 | Normalización de datos (ubicación, precio, moneda) | P0 | 1.1 | Datos normalizados en schema canónico |
| 1.8 | Upload y procesamiento de media | P0 | 0.7, 1.1 | Imágenes subidas, procesadas (resize/compress), servidas por CDN |

### Épica 2 — Búsqueda

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 2.1 | Motor de búsqueda por filtros (ES queries) | P0 | 0.4, 1.3 | Búsqueda por tipo, operación, zona, precio, superficie, ambientes. Facets. Paginación |
| 2.2 | Geo-búsqueda (por zona, por mapa) | P0 | 2.1 | Buscar por barrio/ciudad. Buscar dibujando en mapa |
| 2.3 | UI de búsqueda tradicional (filtros + resultados) | P0 | 2.1, 0.2 | Página de búsqueda funcional con filtros, resultados, paginación, cambio de vista |
| 2.4 | Ficha de propiedad (pública) | P0 | 1.1, 0.2 | Ficha completa: galería, datos, ubicación, mapa, descripción, CTA contacto |
| 2.5 | Modo simple/pro en filtros y fichas | P1 | 2.3, 2.4 | Toggle que muestra/oculta filtros y datos adicionales |

### Épica 3 — Experiencia Conversacional

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 3.1 | Abstracción de LLM provider | P0 | — | Interface con implementación OpenAI, intercambiable |
| 3.2 | Pipeline de extracción de intención inmobiliaria | P0 | 3.1 | Texto libre → intención estructurada (tipo, operación, zona, precio, atributos) |
| 3.3 | Traducción intención → query de búsqueda | P0 | 3.2, 2.1 | Intención estructurada genera misma query que filtros equivalentes |
| 3.4 | UI conversacional (input, mensajes, streaming) | P0 | 0.2, 3.1 | Interfaz de conversación con streaming de respuesta, indicador de "pensando" |
| 3.5 | Flujo conversacional: captura → confirmación → resultados | P0 | 3.2, 3.3, 3.4 | Usuario escribe, sistema confirma interpretación, muestra resultados |
| 3.6 | Refinamiento conversacional (2-3 turnos) | P1 | 3.5 | Sistema propone refinamientos, usuario acepta/rechaza, resultados se actualizan |
| 3.7 | Puente conversación ↔ filtros (sincronización bidireccional) | P1 | 3.5, 2.3 | Filtros reflejan lo extraído de conversación y viceversa |
| 3.8 | Home conversacional-first | P0 | 3.4, 0.2 | Home con input conversacional prominente, chips de ejemplo, acceso a filtros |
| 3.9 | Rate limiting + cache de queries LLM | P1 | 3.1 | Costos controlados, queries repetidas cacheadas |

### Épica 4 — Perfil de Demanda + Matching

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 4.1 | Modelo de perfil de demanda (schema + API) | P0 | 0.3 | Perfil almacenable: imprescindibles, deseables, rechazos |
| 4.2 | Captura de perfil desde conversación | P0 | 3.5, 4.1 | Lo dicho en conversación alimenta el perfil automáticamente |
| 4.3 | Captura de perfil desde acciones (guardar/descartar) | P1 | 4.1 | Guardar y descartar propiedades actualiza el perfil |
| 4.4 | Motor de matching v1 (scoring por atributos + pesos) | P0 | 4.1, 2.1 | Score de 0-100 por propiedad basado en coincidencia con perfil |
| 4.5 | Explicación de match (basada en reglas) | P0 | 4.4 | Texto que explica qué cumple, qué no, qué es parcial |
| 4.6 | Badge de match en resultados | P0 | 4.4, 2.3 | Cada card muestra score visual |
| 4.7 | Sección "Por qué te la mostramos" en ficha | P1 | 4.5, 2.4 | Ficha incluye explicación del match |

### Épica 5 — Leads

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 5.1 | Flujo de contacto (formulario con mensaje pre-rellenado) | P0 | 2.4, 0.5 | Usuario contacta con mensaje contextual |
| 5.2 | Lead enrichment (perfil + match + historial adjunto) | P0 | 5.1, 4.1 | Lead llega con contexto enriquecido |
| 5.3 | Notificación de lead al publicador (email) | P0 | 5.1 | Publicador recibe email con resumen del lead |

### Épica 6 — Panel B2B

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 6.1 | Dashboard de inmobiliaria (vista general) | P0 | 0.5, 0.2 | Vista con resumen: avisos activos, leads recientes, métricas básicas |
| 6.2 | Gestión de avisos (lista, estados, renovación) | P0 | 1.1, 1.4, 1.6 | Lista de avisos con filtro por estado, acciones de editar/renovar |
| 6.3 | Gestión de leads (lista, detalle, estados) | P0 | 5.2 | Lista de leads con contexto, cambio de estado, notas |
| 6.4 | Gestión de organización (datos, usuarios, roles) | P1 | 0.5 | Admin org puede invitar usuarios, asignar roles |
| 6.5 | Métricas básicas (vistas, leads, conversión) | P1 | 0.8 | Dashboard con métricas por aviso y totales |

### Épica 7 — Alertas básicas

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 7.1 | Guardar búsqueda como alerta | P1 | 2.1, 0.5 | Usuario guarda búsqueda con frecuencia |
| 7.2 | Job de matching de alertas | P1 | 7.1, 4.4, 0.8 | Nuevas propiedades se cruzan con alertas guardadas |
| 7.3 | Email de alerta | P1 | 7.2 | Usuario recibe email con nuevas propiedades relevantes |

### Épica 8 — Administración plataforma (básica)

| # | Feature | Prioridad | Dependencia | Criterio de aceptación |
|---|---------|-----------|-------------|----------------------|
| 8.1 | CRUD de organizaciones | P1 | 0.5 | Admin puede crear/editar orgs |
| 8.2 | Moderación de avisos | P1 | 1.1 | Admin puede revisar/aprobar/rechazar avisos |
| 8.3 | Dashboard admin básico | P2 | 0.8 | Métricas globales de plataforma |

### Post-MVP (priorizadas)

| # | Feature | Fase |
|---|---------|------|
| P1 | Ingestión por API / feeds | Post-MVP cercano |
| P2 | Módulo desarrollistas | Post-MVP cercano |
| P3 | Conversación avanzada (más turnos, contexto largo) | Post-MVP cercano |
| P4 | White-label básico (theming + subdomain) | Post-MVP |
| P5 | Hub de oportunidades/inversión | Post-MVP |
| P6 | Alertas inteligentes (refinamiento automático) | Post-MVP |
| P7 | Analytics avanzado (insights de demanda) | Post-MVP |
| P8 | Multi-tenant real (RLS, data isolation) | Post-MVP |
| P9 | CRM embebido mejorado | Futuro |
| P10 | Tokenización / inversión fraccional | Futuro lejano |

---

## 10. Definición Exacta del MVP

### 10.1 Qué entra SÍ o SÍ

| Componente | Alcance en MVP |
|-----------|---------------|
| **Portal público** | Home conversacional-first, búsqueda por filtros, resultados, ficha de propiedad |
| **Conversación** | Captura de intención, confirmación, resultados con explicación, 2-3 turnos de refinamiento. No chat libre omnisciente |
| **Búsqueda tradicional** | Filtros completos con facets, geo-búsqueda, paginación |
| **Perfil de demanda** | Versión básica: captura desde conversación y acciones explícitas. Imprescindibles, deseables, rechazos |
| **Matching** | Scoring v1 por coincidencia de atributos. Explicación basada en reglas |
| **Lead enriquecido** | Contacto con contexto: perfil + match + historial |
| **Inventario** | Publicación manual con formulario guiado (simple/pro) |
| **Vigencia** | Ciclo completo: activo → próximo a vencer → suspendido → archivado. Notificaciones. Renovación 1 click |
| **Panel B2B** | Dashboard, gestión de avisos, gestión de leads, datos de organización |
| **Light/Dark mode** | Desde día 1 con design tokens |
| **Simple/Pro** | Toggle funcional que controla visibilidad |
| **Auth** | Registro, login, roles básicos (usuario, agente, admin org, admin plataforma) |
| **Alertas** | Básicas: email por nuevas propiedades que matchean búsqueda guardada. Alertas de vigencia |
| **Responsividad** | Mobile-first completo |

### 10.2 Qué queda FUERA del MVP

| Componente | Razón |
|-----------|-------|
| White-label | Multiplica complejidad de cada feature. Se diseña schema, no se implementa |
| Módulo desarrollistas | Extensión del inventario, no core. Post-MVP cercano |
| Hub de inversiones | Requiere datos de mercado que no se tienen en fase 1 |
| Ingestión API/feeds | MVP entra con inventario manual. API se agrega post-MVP |
| Multi-tenant real | Se prepara schema (organization_id), no se implementa isolation |
| Analytics avanzado | MVP con métricas básicas solamente |
| Conversación avanzada | MVP con flujo acotado. Conversación "libre" post-MVP |
| Tokenización | Futuro lejano |
| Push notifications | Email primero. Push post-MVP |
| CRM embebido | Gestión de leads básica suficiente. No competir con CRMs |

### 10.3 Qué se DISEÑA ahora pero se implementa después

- **Schema de base de datos** con `organization_id`, `tenant_id`, campos para desarrollistas, campos para oportunidades.
- **API contracts** para módulos futuros (endpoints reservados, tipos definidos).
- **Design system** con soporte para theming por tenant (CSS variables con namespace).
- **Abstracción de LLM** para evolucionar el motor conversacional.
- **Modelo de permisos** completo (todos los roles definidos aunque no todos activos).

### 10.4 Hipótesis que valida el MVP

1. **Los usuarios prefieren buscar propiedad conversando vs. filtrando** (métrica: % de búsquedas que inician por conversación, tasa de conversión conversación vs. filtros).
2. **El lead enriquecido es más valioso para la inmobiliaria que el lead tradicional** (métrica: feedback de inmobiliarias, tasa de respuesta).
3. **La política de vigencia mejora la calidad percibida del inventario** (métrica: % de avisos renovados, feedback de usuarios sobre calidad).
4. **El matching explicado aumenta la confianza y el engagement** (métrica: CTR en resultados con match score alto vs. bajo, tiempo en ficha).
5. **Las inmobiliarias están dispuestas a pagar por leads calificados** (métrica: disposición a pagar, NPS B2B).

### 10.5 Riesgos de lanzar este MVP

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Conversación que no entiende bien destruye percepción | Alto | Flujo semi-estructurado con chips de ayuda + fallback a filtros. Prompts muy testeados. Beta cerrada primero |
| Sin API de ingestión, inventario inicial depende de carga manual | Medio | Entrar con partners que carguen manualmente (equipo de onboarding ayuda). API es prioridad post-MVP |
| Sin white-label, partners grandes no se enganchan | Medio | Ofrecer sub-sección branded dentro del portal principal como interim |
| LLM costs pueden escalar rápido | Medio | Rate limiting, cache, flujo semi-estructurado que reduce tokens. Monitoreo de costos diario |
| UX conversacional puede confundir a usuarios tradicionales | Medio | Búsqueda tradicional siempre accesible como alternativa completa |

### 10.6 Diferencial conversacional mínimo en MVP

El MVP **DEBE** demostrar que la conversación agrega valor real. Esto significa:

1. El usuario dice "Busco un 3 ambientes en Palermo, luminoso, hasta 200K dólares" → el sistema entiende correctamente y muestra resultados.
2. El sistema confirma: "Entendí que buscás un departamento de 3 ambientes en Palermo, hasta USD 200.000, con buena luminosidad. ¿Es así?"
3. El sistema explica resultados: "Te muestro 12 opciones. Las primeras 3 cumplen todo lo que pediste. Las siguientes son un poco más caras pero tienen balcón hacia el norte."
4. El sistema propone refinamiento: "¿Te importa que tenga cochera? Tengo 5 opciones con cochera si ampliás un poco el presupuesto."
5. Si no entiende: "No estoy seguro de entender eso. ¿Podrías decirme qué tipo de propiedad buscás y en qué zona? También podés usar los filtros →"

Si esto no funciona bien, el MVP pierde su razón de ser.

---

## 11. Riesgos Críticos y Recomendaciones

### 11.1 Riesgos de producto

| Riesgo | Probabilidad | Impacto | Recomendación |
|--------|-------------|---------|---------------|
| Producto se percibe como "otro portal con chat" | Alta si la conversación es mediocre | Fatal | Invertir fuerte en calidad de prompts y UX conversacional. Beta cerrada con usuarios reales antes de lanzar |
| Demasiados módulos dispersan foco y retrasan lanzamiento | Alta | Alto | Respetar el corte de MVP estrictamente. No agregar "solo un módulo más" |
| Sin inventario suficiente al lanzar, no hay valor | Alta | Fatal | Estrategia B2B2C: asegurar 5-10 partners con inventario antes de lanzar portal público |
| El perfil de demanda no se construye rápido | Media | Alto | Diseñar conversación para capturar preferencias en los primeros 2 turnos. No depender de uso prolongado |

### 11.2 Riesgos técnicos

| Riesgo | Probabilidad | Impacto | Recomendación |
|--------|-------------|---------|---------------|
| LLM hallucinations en extracción de intención | Alta | Alto | Validar output del LLM contra schema estricto. Si el output no parsea, fallback a preguntas estructuradas |
| Latencia del LLM afecta UX | Media | Alto | Streaming de respuestas + indicadores de progreso + cache agresivo |
| Costos de LLM escalan sin control | Media | Medio | Rate limiting por usuario, cache de queries similares, flujo semi-estructurado que reduce tokens |
| Elasticsearch cluster management | Baja (con managed service) | Alto si se cae | Usar managed ES (Elastic Cloud, OpenSearch en AWS). No self-host en fase 1 |
| Schema de DB mal diseñado obliga a migración traumática | Media | Alto | Invertir en data modeling antes de escribir código. Reviews del schema por alguien con experiencia inmobiliaria |

### 11.3 Riesgos de UX

| Riesgo | Probabilidad | Impacto | Recomendación |
|--------|-------------|---------|---------------|
| Usuarios no entienden que pueden hablar | Alta | Alto | Input conversacional como elemento visual dominante. Ejemplos claros. No parecer un chatbot de soporte |
| La explicación del match es confusa o inútil | Media | Medio | Testear con usuarios reales. Lenguaje simple. No métricas numéricas solas |
| Modo simple/pro confunde en vez de ayudar | Baja | Bajo | Default simple. Toggle poco invasivo. No perder funcionalidad core en ningún modo |
| Dark mode mal implementado | Media | Medio | Testear TODOS los componentes en ambos modos. Checklist de QA específico |

### 11.4 Riesgos operativos

| Riesgo | Probabilidad | Impacto | Recomendación |
|--------|-------------|---------|---------------|
| Onboarding de inmobiliarias es lento | Alta | Alto | Equipo dedicado a onboarding inicial. Template de avisos. Importación desde Excel como puente |
| Moderación de avisos escala mal | Media | Medio | Reglas automáticas + revisión manual solo para edge cases |
| Soporte de conversación genera tickets | Media | Medio | Fallbacks claros. FAQ. El "no entendí" siempre ofrece salida |

### 11.5 Riesgos comerciales

| Riesgo | Probabilidad | Impacto | Recomendación |
|--------|-------------|---------|---------------|
| Inmobiliarias no ven valor en lead enriquecido hasta probarlo | Alta | Alto | Período de prueba gratuito. Mostrar la diferencia con casos reales |
| Competencia copia el enfoque conversacional | Media | Medio | Velocidad de ejecución + profundidad de producto + datos de demanda como moat |
| Partners quieren white-label antes de que esté | Alta | Medio | Ofrecer sub-sección branded como interim. Roadmap transparente |

### 11.6 Recomendaciones para no sobrediseñar ni subdiseñar

**No sobrediseñar:**
- No implementar multi-tenant real hasta tener el segundo tenant.
- No construir CRM embebido; gestión de leads con estados básicos es suficiente.
- No hacer motor de matching con ML hasta tener datos de comportamiento real.
- No crear pipeline de ingestión de feeds hasta tener el primer partner que lo necesite.

**No subdiseñar:**
- SÍ poner `organization_id` y `tenant_id` en schema desde día 1.
- SÍ diseñar el motor de búsqueda con Elasticsearch desde el inicio (no empezar con SQL y migrar).
- SÍ implementar design tokens y theming desde el inicio (no hardcodear colores).
- SÍ abstraer el LLM provider (no acoplarse a OpenAI directamente).
- SÍ implementar la política de vigencia completa desde MVP (es diferencial).
- SÍ hacer mobile-first real (no "responsive" de último momento).

---

## 12. Siguiente Paso Recomendado

### Recomendación: Data Model + Arquitectura Técnica en paralelo

**¿Por qué no PRD expandido?**
Este documento ya tiene nivel de PRD fundacional. Expandirlo más antes de tener el data model definido es trabajo abstracto que no mueve la aguja.

**¿Por qué no UX wireframes?**
Sin el data model claro, los wireframes se hacen sobre suposiciones. Necesitamos saber exactamente qué datos maneja cada pantalla.

**¿Por qué data model + arquitectura técnica?**

1. **Data model** (sistema de información) porque:
   - Define la realidad del producto. Qué entidades existen, qué atributos tienen, cómo se relacionan.
   - Fuerza decisiones concretas: ¿qué es una "propiedad"? ¿Qué campos son obligatorios? ¿Cómo se modela una ubicación? ¿Cómo se estructura el perfil de demanda?
   - Es prerequisito para cualquier desarrollo backend y frontend.
   - Es donde se materializan las decisiones de multi-tenant, vigencia, matching.

2. **Arquitectura técnica** porque:
   - Define el setup del monorepo, la estructura de directorios, las tecnologías concretas, los contratos de API.
   - Permite empezar a buildear la fundación técnica (Épica 0).
   - Define cómo se conecta el frontend con el backend, cómo funciona la capa conversacional concretamente, cómo se indexan propiedades.

**Entregable propuesto para el siguiente paso:**

1. **Data model completo** (entidades, atributos, relaciones, índices) para todos los módulos del MVP + schema preparatorio para post-MVP.
2. **Arquitectura técnica** (estructura de monorepo, stack concreto, contratos de API principales, flujo de datos end-to-end).
3. **Setup inicial del proyecto** (monorepo scaffolding, configuración base, CI/CD mínimo).

Estos tres se pueden hacer en paralelo y constituyen la base real para empezar a desarrollar.

---

*Documento generado como base fundacional. Requiere revisión y validación antes de pasar a implementación.*
