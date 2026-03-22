# Registro de bloqueos automáticos

El agente anota aquí fallos que **no puede resolver** sin acción externa (GitHub org, Vercel, secretos).

| Fecha | Qué falló | Acción necesaria (una vez) |
|-------|-----------|----------------------------|
| 2026-03-22 | Build Vercel: `@elastic/elasticsearch/api/types` y `@/lib/search` | Corregido en mapping.ts (tipo local) y lib/search/index.ts |
| 2026-03-22 | main desactualizado: promote workflow fallaba por build | Ver GitHub Actions; si verify pasa, merge debería completarse |

Formato al añadir fila:

```markdown
| YYYY-MM-DD | workflow X / error Y | quién hace qué en qué URL |
```
