# Test de infraestructura

Valida que el proyecto compile, migre la base de datos y responda correctamente antes de avanzar o hacer deploy.

---

## Ejecución local (completa)

```bash
pnpm run infra:test
```

**Qué hace:**

1. Verifica que Docker esté corriendo
2. Levanta `docker compose` (PostgreSQL, Elasticsearch, Redis, MinIO)
3. Espera que PostgreSQL esté healthy
4. Verifica/copia `.env`
5. Instala dependencias (`pnpm install`)
6. Ejecuta **typecheck**
7. Aplica schema a la DB (`pnpm db:push`, config `strict: false` en drizzle para CI)
8. **Build** de todas las apps (`pnpm build`)
9. Arranca la app web, llama a `/api/health`, verifica respuesta
10. Detiene el servidor

**Requisitos:** Docker Desktop corriendo, `.env` configurado (o `.env.example` copiado a `.env`).

---

## CI (GitHub Actions)

En cada **push** y **PR** a `main`:

- **Lint**: `pnpm lint` (ESLint en packages + `next lint` en web/panel)
- **Typecheck**: compila tipos
- **Build**: construye todas las apps (simula deploy)

Si los tres pasan, el PR puede mergearse y el proyecto está listo para deploy.

---

## Health check

**Endpoint:** `GET /api/health`

**Respuesta 200 (healthy):**
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok", "latencyMs": 5 }
  },
  "latencyMs": 10,
  "timestamp": "2024-03-19T..."
}
```

**Respuesta 503 (degraded):** cuando la base de datos no responde u otra dependencia falla. Usar para monitoreo y health checks de Kubernetes/load balancers.

---

## Manejo de errores

| Capa        | Comportamiento |
|-------------|----------------|
| **Health API** | 503 si DB falla; mensaje de error en `checks.database.error` |
| **tRPC**       | Errores con formato Zod; `UNAUTHORIZED` / `FORBIDDEN` cuando corresponde |
| **Database**   | `getDb()` lanza si `DATABASE_URL` falta; conexión lazy |
| **CI**         | Fallo explícito en lint, typecheck o build; no merge si no pasa |

---

## Notas

- **ESLint en apps**: `.eslintrc.js` usa `require.resolve('@propieya/config/eslint/next.js')` para que Next resuelva el config del monorepo.
- **Iconos Lucide**: `@propieya/ui` reexporta solo iconos usados en el repo (evita choque con el componente `Badge`). Si importás uno nuevo desde `@propieya/ui`, agregalo en `packages/ui/src/index.ts`.

---

## Próximos pasos (deuda técnica)

- [ ] Tests unitarios con Vitest
- [ ] Health extendido (Redis, Elasticsearch, S3) cuando se usen en runtime
- [ ] E2E con Playwright para flujos críticos
- [ ] Integración con Vercel/Railway para deploy real
