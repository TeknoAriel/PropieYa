# Propieya — Backlog Técnico Inicial

**Versión:** 1.0  
**Fecha:** 2026-03-18

Este documento define las tareas técnicas priorizadas para el desarrollo del MVP.

---

## Épica 0: Fundación Técnica

### 0.1 Setup Monorepo ✅
- [x] Estructura de directorios
- [x] Configuración Turborepo
- [x] Configuración pnpm workspaces
- [x] TypeScript base config
- [x] ESLint config compartida
- [x] Prettier config
- [x] .gitignore
- [x] .env.example

### 0.2 Package @propieya/config ✅
- [x] ESLint config base
- [x] ESLint config Next.js
- [x] TypeScript config base
- [x] TypeScript config Next.js

### 0.3 Package @propieya/shared ✅
- [x] Types del dominio (user, org, listing, search, etc.)
- [x] Constantes (labels, configs, tokens)
- [x] Utilities (format, validation, url)
- [x] Schemas Zod (auth, listing, search, lead)

### 0.4 Package @propieya/database ✅
- [x] Drizzle config
- [x] Schema users
- [x] Schema organizations
- [x] Schema listings
- [x] Schema search/conversations
- [x] Schema leads
- [x] Schema notifications
- [x] Client de conexión

### 0.5 Package @propieya/ui ✅
- [x] Tailwind config con tokens
- [x] CSS globals con variables light/dark
- [x] Componente Button
- [x] Componente Input
- [x] Componente Card
- [x] Componente Badge
- [x] Componente Dialog
- [x] Componente Select
- [x] Componente Dropdown
- [x] Componente Tabs
- [x] Componente Tooltip
- [x] Componente Switch
- [x] Componente Skeleton/Separator

### 0.6 Infraestructura Local ✅
- [x] docker-compose.yml
- [x] PostgreSQL
- [x] Elasticsearch
- [x] Redis
- [x] MinIO (S3)

### 0.7 Documentación Base ✅
- [x] README.md
- [x] Documento fundacional
- [x] Arquitectura técnica
- [x] Decisiones técnicas (ADR)
- [x] Backlog técnico

---

## Épica 1: Apps Base

### 1.1 App Web (Portal Público)
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 0.3, 0.4, 0.5

- [ ] Crear app Next.js 15
- [ ] Configurar Tailwind con @propieya/ui
- [ ] Layout base con header/footer
- [ ] Configurar tRPC client
- [ ] Provider de theme (light/dark)
- [ ] Provider de display mode (simple/pro)
- [ ] Página home placeholder
- [ ] Página búsqueda placeholder
- [ ] Página ficha placeholder

### 1.2 App Panel (B2B)
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 0.3, 0.4, 0.5

- [ ] Crear app Next.js 15
- [ ] Configurar Tailwind con @propieya/ui
- [ ] Layout de dashboard
- [ ] Sidebar de navegación
- [ ] Auth guard (protected routes)
- [ ] Página dashboard placeholder
- [ ] Página avisos placeholder
- [ ] Página leads placeholder

### 1.3 API Base (tRPC)
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 0.4

- [ ] Setup tRPC en Next.js API
- [ ] Context con db y session
- [ ] Middleware de auth
- [ ] Router base (health, auth)
- [ ] Error handling
- [ ] Logging estructurado

---

## Épica 2: Autenticación

### 2.1 Auth Backend
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 1.3

- [ ] Hash de passwords (argon2)
- [ ] Generación JWT
- [ ] Refresh token rotation
- [ ] Endpoints: register, login, logout, refresh
- [ ] Endpoint: me (current user)
- [ ] Email verification (estructura)
- [ ] Password reset (estructura)

### 2.2 Auth Frontend (Portal)
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 2.1, 1.1

- [ ] Modal/página de login
- [ ] Modal/página de registro
- [ ] Manejo de sesión (React Context)
- [ ] Redirect post-login
- [ ] Persistencia de sesión

### 2.3 Auth Frontend (Panel)
**Prioridad:** P0  
**Estimación:** S  
**Dependencias:** 2.1, 1.2

- [ ] Página de login
- [ ] Protected routes
- [ ] Selector de organización (si tiene varias)
- [ ] Logout

---

## Épica 3: Inventario

### 3.1 CRUD de Propiedades (Backend)
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 1.3

- [ ] Router listings con CRUD
- [ ] Validación con schemas Zod
- [ ] Autorización (solo propias/de org)
- [ ] Normalización de datos
- [ ] Cálculo de pricePerM2

### 3.2 Upload de Media
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 3.1

- [ ] Endpoint de upload a S3
- [ ] Pipeline de resize (job)
- [ ] Generación de thumbnails
- [ ] Ordenamiento de imágenes
- [ ] Limpieza de huérfanas

### 3.3 Formulario de Publicación (Panel)
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 3.1, 3.2

- [ ] Formulario multi-step
- [ ] Modo simple/pro (campos visibles)
- [ ] Autocompletado de ubicación
- [ ] Selector de amenities
- [ ] Variante rural para publicaciones tipo `land` (agrícola/ganadero/mixto/forestal/otro) + campos específicos
- [ ] Upload de imágenes con preview
- [ ] Drag & drop reordenamiento
- [ ] Preview antes de publicar

### 3.4 Lista de Avisos (Panel)
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 3.1

- [ ] Tabla/grid de avisos
- [ ] Filtros por estado
- [ ] Acciones: editar, renovar, pausar, eliminar
- [ ] Indicador de vigencia
- [ ] Paginación

---

## Épica 4: Sistema de Vigencia

### 4.1 Job de Vigencia
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 3.1

- [ ] Setup BullMQ
- [ ] Job de chequeo diario
- [ ] Transición de estados
- [ ] Registro de validaciones

### 4.2 Notificaciones de Vigencia
**Prioridad:** P1  
**Estimación:** M  
**Dependencias:** 4.1

- [ ] Template de email "próximo a vencer"
- [ ] Template de email "suspendido"
- [ ] Job de envío
- [ ] Link de renovación en email

### 4.3 Renovación
**Prioridad:** P0  
**Estimación:** S  
**Dependencias:** 4.1

- [ ] Endpoint de renovación
- [ ] Botón en panel
- [ ] Renovación desde email (token)

---

## Épica 5: Búsqueda

### 5.1 Package @propieya/search
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 0.4

- [ ] Cliente Elasticsearch
- [ ] Mapping del índice
- [ ] Query builder (filtros → ES query)
- [ ] Geo-queries
- [ ] Facets
- [ ] Paginación cursor-based

### 5.2 Indexación
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 5.1, 4.1

- [ ] Job de indexación on-demand
- [ ] Sincronización inicial (bulk)
- [ ] Eventos de cambio → job
- [ ] Exclusión de no-activos

### 5.3 API de Búsqueda
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 5.1

- [ ] Endpoint search
- [ ] Parseo de filtros desde URL
- [ ] Retorno de facets
- [ ] Cache de queries frecuentes

### 5.4 UI de Búsqueda (Portal)
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 5.3, 1.1

- [ ] Página de resultados
- [ ] Panel de filtros (responsive)
- [ ] Cards de resultados
- [ ] Paginación infinita
- [ ] Vista lista/grid/mapa
- [ ] Filtros en URL (SEO)

### 5.5 Ficha de Propiedad (Portal)
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 3.1, 1.1

- [ ] Galería de imágenes
- [ ] Datos principales
- [ ] Mapa de ubicación
- [ ] Amenities
- [ ] Descripción
- [ ] CTA de contacto
- [ ] Propiedades similares (básico)
- [ ] SSR/ISR para SEO

---

## Épica 6: Experiencia Conversacional

### 6.1 Package @propieya/conversation
**Prioridad:** P0  
**Estimación:** XL  
**Dependencias:** 5.1

- [ ] Abstracción de LLM provider
- [ ] Implementación OpenAI
- [ ] Prompt de extracción de intención
- [ ] Parser de respuesta estructurada
- [ ] Traducción intención → query
- [ ] Rate limiting
- [ ] Cache de queries similares

### 6.2 Gestión de Conversaciones
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 6.1

- [ ] Crear/recuperar conversación
- [ ] Almacenar mensajes
- [ ] Acumular contexto
- [ ] Límite de turnos (anónimos)

### 6.3 API Conversacional
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 6.1, 6.2

- [ ] Endpoint de mensaje
- [ ] Streaming de respuesta (SSE)
- [ ] Retorno de resultados inline
- [ ] Sugerencias de refinamiento

### 6.4 UI Conversacional (Portal)
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 6.3, 1.1

- [ ] Input conversacional en home
- [ ] Chips de ejemplo
- [ ] Panel de conversación
- [ ] Streaming de respuesta
- [ ] Indicador de "pensando"
- [ ] Resultados inline
- [ ] Transición a búsqueda tradicional

### 6.5 Home Conversacional-First
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 6.4

- [ ] Hero con input prominente
- [ ] Sugerencias de búsqueda
- [ ] Link a filtros tradicionales
- [ ] Secciones de descubrimiento

---

## Épica 7: Perfil de Demanda y Matching

### 7.1 Perfil de Demanda
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 6.2

- [ ] Crear/actualizar perfil
- [ ] Captura desde conversación
- [ ] Captura desde acciones
- [ ] Endpoint de lectura

### 7.2 Package @propieya/matching
**Prioridad:** P0  
**Estimación:** L  
**Dependencias:** 7.1, 5.1

- [ ] Motor de scoring v1
- [ ] Evaluación por categoría
- [ ] Pesos configurables
- [ ] Penalizaciones/bonuses

### 7.3 Explicación de Match
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 7.2

- [ ] Templates de explicación
- [ ] Generación de texto
- [ ] Múltiples niveles de detalle

### 7.4 UI de Matching
**Prioridad:** P0  
**Estimación:** S  
**Dependencias:** 7.2, 7.3

- [ ] Badge de match en cards
- [ ] Sección "Por qué te la mostramos" en ficha
- [ ] Tooltip de explicación

---

## Épica 8: Leads

### 8.1 Flujo de Contacto
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 5.5, 7.1

- [ ] Modal de contacto
- [ ] Mensaje pre-rellenado
- [ ] Registro inline si no logueado
- [ ] Creación de lead

### 8.2 Lead Enrichment
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 8.1, 7.1

- [ ] Adjuntar perfil de demanda
- [ ] Adjuntar historial
- [ ] Calcular quality score
- [ ] Detectar signals de intención

### 8.3 Notificación de Lead
**Prioridad:** P0  
**Estimación:** S  
**Dependencias:** 8.1

- [ ] Email al publicador
- [ ] Resumen del lead en email
- [ ] Link al panel

### 8.4 Gestión de Leads (Panel)
**Prioridad:** P0  
**Estimación:** M  
**Dependencias:** 8.1, 8.2

- [ ] Lista de leads
- [ ] Detalle con enriquecimiento
- [ ] Cambio de estado
- [ ] Agregar notas
- [ ] Filtros

---

## Épica 9: Panel B2B Completo

### 9.1 Dashboard
**Prioridad:** P1  
**Estimación:** M  
**Dependencias:** 3.4, 8.4

- [ ] Métricas resumen
- [ ] Avisos por estado
- [ ] Leads recientes
- [ ] Próximos a vencer

### 9.2 Gestión de Organización
**Prioridad:** P1  
**Estimación:** M  
**Dependencias:** 1.2

- [ ] Datos de la organización
- [ ] Invitar miembros
- [ ] Gestión de roles

---

## Épica 10: Alertas Básicas

### 10.1 Guardar Búsqueda
**Prioridad:** P1  
**Estimación:** S  
**Dependencias:** 5.3

- [ ] Botón "Guardar búsqueda"
- [ ] Configurar frecuencia
- [ ] Listar alertas guardadas

### 10.2 Job de Matching de Alertas
**Prioridad:** P1  
**Estimación:** M  
**Dependencias:** 10.1, 7.2

- [ ] Job horario
- [ ] Cruzar nuevas propiedades
- [ ] Enviar email

---

## Leyenda

**Prioridad:**
- P0: Imprescindible para MVP
- P1: Importante, entra si hay tiempo
- P2: Post-MVP

**Estimación (T-shirt):**
- S: < 1 día
- M: 1-3 días
- L: 3-5 días
- XL: > 5 días

---

## Resumen de Estado

| Épica | Tareas | Completadas | % |
|-------|--------|-------------|---|
| 0. Fundación | 7 | 7 | 100% |
| 1. Apps Base | 3 | 0 | 0% |
| 2. Auth | 3 | 0 | 0% |
| 3. Inventario | 4 | 0 | 0% |
| 4. Vigencia | 3 | 0 | 0% |
| 5. Búsqueda | 5 | 0 | 0% |
| 6. Conversación | 5 | 0 | 0% |
| 7. Matching | 4 | 0 | 0% |
| 8. Leads | 4 | 0 | 0% |
| 9. Panel B2B | 2 | 0 | 0% |
| 10. Alertas | 2 | 0 | 0% |

**Total MVP (P0):** ~30 tareas  
**Fundación completada:** ✅

---

## Siguiente Paso

Con la fundación técnica completada, el siguiente paso es:

1. **Crear las apps base** (web + panel) con Next.js
2. **Implementar autenticación**
3. **CRUD de propiedades** con formulario de publicación
4. **Búsqueda básica** con Elasticsearch

Esto da un flujo end-to-end mínimo sobre el cual construir las features conversacionales.
