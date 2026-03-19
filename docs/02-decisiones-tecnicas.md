# Propieya — Registro de Decisiones Técnicas (ADR)

Este documento registra las decisiones técnicas importantes tomadas durante el desarrollo de Propieya.

---

## ADR-001: Monolito Modular vs Microservicios

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
Necesitamos definir la arquitectura base del sistema. Las opciones son:
1. Microservicios desde el inicio
2. Monolito tradicional
3. Monolito modular con bounded contexts claros

### Decisión
**Monolito modular** con separación clara por bounded contexts, preparado para extraer servicios cuando la escala lo justifique.

### Razones
- Un equipo fundador pequeño no puede operar 8+ microservicios
- Los microservicios agregan complejidad operativa (deployment, networking, tracing distribuido)
- Un monolito bien modularizado permite desarrollo rápido inicial
- Los boundaries claros permiten extraer servicios después sin reescribir
- Next.js facilita tener API + Frontend en el mismo proceso

### Consecuencias
- (+) Desarrollo más rápido
- (+) Debugging más simple
- (+) Un solo deployment
- (-) Hay que ser disciplinado con los boundaries
- (-) Eventualmente habrá que extraer algunos módulos

---

## ADR-002: Drizzle ORM vs Prisma

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
Necesitamos un ORM para interactuar con PostgreSQL. Las opciones principales son Prisma y Drizzle.

### Decisión
**Drizzle ORM**

### Razones
- Type-safety superior en queries complejas
- Queries más cercanas a SQL real (útil para optimización)
- Mejor rendimiento (menos overhead)
- No requiere generación de cliente
- Migraciones más controlables

### Consecuencias
- (+) Mejor rendimiento
- (+) Más control sobre queries
- (+) Sin paso de generación
- (-) Documentación menos extensa que Prisma
- (-) Comunidad más pequeña

---

## ADR-003: Elasticsearch para Búsqueda

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
Necesitamos un motor de búsqueda capaz de:
- Full-text search en español
- Geo-queries (búsqueda por zona, cercanía)
- Facets dinámicos
- Scoring personalizado
- Escalar a 500K+ documentos

### Decisión
**Elasticsearch 8** (o OpenSearch como alternativa compatible)

### Razones
- Soporte nativo para todas las features requeridas
- Probado en producción a escala inmobiliaria
- Buen soporte para geo-queries
- Facets y agregaciones potentes
- Scoring configurable para matching

### Alternativas descartadas
- PostgreSQL full-text: No escala bien para queries complejas inmobiliarias
- Typesense: Más simple pero menos flexible en scoring
- Meilisearch: Similar a Typesense

### Consecuencias
- (+) Búsqueda potente y flexible
- (+) Escala bien
- (-) Requiere sincronización con PostgreSQL
- (-) Un servicio más que operar

---

## ADR-004: Next.js App Router

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
El frontend necesita:
- SSR para SEO (crítico en inmobiliario)
- Experiencia rica de usuario (React)
- ISR para fichas de propiedades (cacheo)
- Streaming para conversación

### Decisión
**Next.js 15 con App Router**

### Razones
- SSR/ISR nativo
- React Server Components reducen JS enviado al cliente
- Streaming para UX conversacional
- API routes integradas (menos config)
- Ecosistema maduro

### Consecuencias
- (+) SEO optimizado
- (+) Performance con RSC
- (+) Un solo framework
- (-) App Router todavía con algunos rough edges
- (-) Learning curve para el equipo

---

## ADR-005: Design System con Tailwind + Radix

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
Necesitamos un design system que:
- Soporte theming (light/dark)
- Sea accesible
- Permita componentes personalizables
- No imponga estética

### Decisión
**Tailwind CSS + Radix UI primitives + CSS custom properties**

### Razones
- Tailwind: utility-first, theming con CSS variables
- Radix: primitives accesibles sin estilo, máxima flexibilidad
- CSS custom properties: theming nativo, no runtime
- No depender de librerías con estilo predefinido (MUI, Chakra)

### Consecuencias
- (+) Control total sobre estética
- (+) Accesibilidad garantizada (Radix)
- (+) Theming eficiente
- (-) Hay que construir más componentes manualmente
- (-) Más trabajo inicial

---

## ADR-006: tRPC para API

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
Necesitamos comunicación type-safe entre frontend y backend.

### Decisión
**tRPC** para comunicación interna, con endpoints REST para integraciones externas.

### Razones
- Type-safety end-to-end sin generación de tipos
- Integración nativa con React Query
- No hay que mantener schemas de API separados
- REST solo donde es necesario (feeds externos, webhooks)

### Consecuencias
- (+) DX excelente
- (+) Sin duplicación de tipos
- (+) Validación automática
- (-) Solo funciona con TypeScript
- (-) Menos estándar que REST/GraphQL

---

## ADR-007: UUIDs para IDs

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
Necesitamos decidir el formato de IDs de las entidades.

### Decisión
**UUID v4** para todas las entidades.

### Razones
- No expone información sobre la secuencia (seguridad)
- Generables en cualquier lado (frontend, backend, DB)
- Facilita eventual distribución/sharding
- No hay colisiones al mergear datos de distintas fuentes

### Consecuencias
- (+) Seguridad (no predecibles)
- (+) Distribuibles
- (-) Más espacio en DB (36 bytes vs 8)
- (-) Menos legibles para debugging

---

## ADR-008: Abstracción de LLM Provider

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
El motor conversacional depende de un LLM (GPT-4, Claude, etc.). No queremos acoplarnos a un provider.

### Decisión
Crear una **interface `ConversationEngine`** con implementaciones intercambiables.

### Razones
- Los providers cambian precios y capacidades frecuentemente
- Podemos cambiar de provider sin modificar la lógica de negocio
- Facilita testing con mocks
- Permite usar diferentes providers para diferentes tareas

### Consecuencias
- (+) Flexibilidad
- (+) Testeable
- (-) Un poco más de código inicial

---

## ADR-009: BullMQ para Jobs

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
Necesitamos procesar tareas en background:
- Indexación en Elasticsearch
- Procesamiento de imágenes
- Envío de notificaciones
- Chequeo de vigencia

### Decisión
**BullMQ** (Redis-backed)

### Razones
- Ya tenemos Redis
- API simple y robusta
- Soporte para scheduling (cron)
- Reintentos configurables
- Dashboard de monitoreo

### Alternativas descartadas
- pg-boss: Más simple pero menos features
- SQS/Cloud Tasks: Overhead para fase inicial

### Consecuencias
- (+) Jobs robustos
- (+) Scheduling integrado
- (-) Depende de Redis
- (-) Workers separados del API

---

## ADR-010: Paginación Cursor-based

**Fecha:** 2026-03-18  
**Estado:** Aceptada

### Contexto
La búsqueda de propiedades necesita paginación eficiente que escale.

### Decisión
**Paginación cursor-based** (search_after en ES, keyset en PostgreSQL)

### Razones
- Offset-based se degrada con páginas profundas
- Cursor-based mantiene rendimiento constante
- Es el estándar para feeds infinitos
- Elasticsearch lo soporta nativamente

### Consecuencias
- (+) Rendimiento constante
- (+) Escala bien
- (-) No permite "saltar a página N"
- (-) Un poco más complejo de implementar

---

*Se agregan nuevas decisiones conforme se toman.*
