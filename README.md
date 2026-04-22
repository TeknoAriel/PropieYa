# Propieya

**Plataforma inmobiliaria conversacional-first** para búsqueda de propiedades con intención, matching explicado y leads enriquecidos.

| Repositorio oficial | https://github.com/kiteprop/ia-propieya |
|---------------------|----------------------------------------|
| Clonar (SSH) | `git clone git@github.com:kiteprop/ia-propieya.git` |
| Repo histórico (solo referencia; no es la fuente de deploy) | https://github.com/TeknoAriel/PropieYa |

---

## Visión

Propieya no es "otro portal con chat". Es una plataforma donde la **conversación es el eje principal** de la experiencia de búsqueda inmobiliaria:

- **Conversacional-first**: El usuario describe lo que busca en lenguaje natural
- **Perfil dinámico de demanda**: El sistema aprende gustos, rechazos, imprescindibles
- **Matching explicado**: Cada resultado tiene una explicación de por qué aparece
- **Leads enriquecidos**: Cuando alguien contacta, llega con contexto valioso
- **Calidad de inventario**: Política de vigencia estricta (30 días máx)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 15 (App Router) |
| UI | Tailwind CSS + Radix UI |
| API | tRPC (type-safe) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Search | Elasticsearch 8 |
| Cache/Jobs | Redis + BullMQ |
| Storage | S3 compatible |
| LLM | OpenAI / Anthropic |

---

## Estructura del Proyecto

```
propieya/
├── apps/
│   ├── web/                # Portal público
│   └── panel/              # Panel B2B
├── packages/
│   ├── config/             # ESLint, TypeScript configs
│   ├── shared/             # Types, schemas, utils
│   ├── database/           # Drizzle schema
│   └── ui/                 # Design system
├── docs/                   # Documentación
└── docker-compose.yml      # Servicios de desarrollo
```

---

## Desarrollo Local

### Requisitos

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Setup

```bash
# 1. Clonar el repositorio
git clone git@github.com:kiteprop/ia-propieya.git
cd ia-propieya

# 2. Instalar dependencias
pnpm install

# 3. Levantar servicios (PostgreSQL, Elasticsearch, Redis, MinIO)
docker compose up -d

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env (DATABASE_URL a localhost:5433 para Docker). Para Next, también apps/web/.env.local si hace falta.

# 5. Aplicar schema (Drizzle + parches SQL idempotentes)
pnpm db:schema:local

# 6. Iniciar desarrollo
pnpm dev
```

### URLs locales

| Servicio | URL |
|----------|-----|
| Portal web | http://localhost:3010 |
| Panel B2B | http://localhost:3011 |
| PostgreSQL | localhost:5433 |
| Elasticsearch | http://localhost:9200 |
| Redis | localhost:6379 |
| MinIO Console | http://localhost:9001 |

---

## Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Levantar todos los apps en modo dev
pnpm build            # Build de producción
pnpm lint             # Lint de todo el monorepo
pnpm typecheck        # Type check de todo el monorepo

# Base de datos
pnpm db:schema:local  # Push Drizzle + docs/sql (recomendado en local)
pnpm db:sql:apply     # Solo parches SQL (manifest)
pnpm db:generate      # Generar migraciones
pnpm db:migrate       # Aplicar migraciones
pnpm db:push          # Solo push Drizzle (sin parches manifest)
pnpm db:studio        # Abrir Drizzle Studio
pnpm infra:test       # Docker + schema + build + health (smoke)

# Otros
pnpm clean            # Limpiar node_modules y caches
pnpm format           # Formatear código
```

---

## Documentación

- [Documento Fundacional](./docs/00-fundacion-producto.md) - Visión de producto, MVP, flujos
- [Arquitectura Técnica](./docs/01-arquitectura-tecnica.md) - Stack, decisiones, estructura
- [Deploy y URLs canónicas](./docs/DEPLOY-PASOS-URIs.md) - Flujo `deploy/infra`, Vercel, GitHub Actions

---

## Licencia

Propietario. Todos los derechos reservados.
