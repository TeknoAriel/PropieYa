# Deploy simplificado

Propuesta para reducir complejidad: **una rama, un flujo**.

---

## Situación actual

```
deploy/infra → [Promote workflow] → main → [Vercel web + panel]
     ↑                                   ↑
  desarrollo                          a veces falla el merge
```

- 2 proyectos Vercel (web, panel) — necesario: apps distintas
- 1 repo, 2 ramas activas (deploy/infra, main)
- Promote puede fallar (branch protection, permisos)

---

## Opción simplificada: deploy directo desde main

### Flujo propuesto

1. **Desarrollo en ramas feature** (opcional) o directo en `main`
2. **Push a main** → Vercel despliega web y panel automáticamente
3. **Sin Promote** — se elimina el workflow intermedio

### Cambios necesarios

1. **Branch protection en main**: permitir push directo (o merge de PR sin status checks estrictos)
2. **Eliminar o desactivar** el workflow Promote
3. **Conectar Vercel** a rama `main` (ya está)
4. **Convención**: merges a main solo tras `pnpm verify` local

### Ventajas

- Menos pasos
- Menos puntos de fallo
- Más directo: push → deploy

### Desventajas

- Si main está protegido con "require status checks", hay que configurar CI en PR o relajar la regla

---

## Estructura actual (mantener)

| Componente | Rol |
|------------|-----|
| **Git** | Fuente de verdad del código |
| **Neon** | PostgreSQL; una instancia, `DATABASE_URL` en ambos proyectos Vercel |
| **Vercel Web** | `apps/web`, Root Directory, rama main |
| **Vercel Panel** | `apps/panel`, Root Directory, rama main |

**Por qué 2 proyectos Vercel:** web y panel son dos apps Next.js con `package.json` distintos. Vercel necesita un proyecto por app cuando el Root Directory difiere.

---

## Resumen

Para simplificar **sin refactor grande**:

1. Considerar **eliminar deploy/infra** y trabajar directo en `main`
2. Ajustar **branch protection** para permitir merge a main (con o sin checks)
3. **Neon + Vercel**: sin cambios; la conexión es solo `DATABASE_URL`

Si querés aplicar esto, el siguiente paso es revisar las reglas de `main` en GitHub (Settings → Rules).
