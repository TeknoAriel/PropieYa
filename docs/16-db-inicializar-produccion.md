# Error: `relation "users" does not exist`

La base en Neon (o la que use `DATABASE_URL` en Vercel) **no tiene las tablas** del proyecto.

## Solución

Desde tu máquina (con la misma URL que producción):

```bash
cd /path/al/repo
DATABASE_URL="postgresql://..." pnpm db:push
```

Después **reintentá** registro o login en `/registro` y en el panel.

Ver también `docs/CANONICAL-URLS.md` y variables en Vercel (web + panel comparten `DATABASE_URL` si es la misma instancia).
