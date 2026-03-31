# Mergear deploy/infra a main (3 pasos)

---

## Paso 1: Abrir la pantalla de creación del PR

Abrí en el navegador:

```
https://github.com/kiteprop/ia-propieya/compare/main...deploy/infra
```

---

## Paso 2: Crear el PR

1. En la página de compare, hacé clic en **Create pull request** (botón verde).
2. En el título poné (o dejá el sugerido): `Deploy: fixes para Vercel`
3. Clic en **Create pull request**.

---

## Paso 3: Mergear

1. Esperá a que pasen los checks (Typecheck, etc.).
2. Clic en **Merge pull request**.
3. Clic en **Confirm merge**.

Listo. Vercel va a detectar el nuevo commit en `main` y hará un deploy automático.

---

## URLs rápidas

| Acción | URL |
|--------|-----|
| Crear PR | https://github.com/kiteprop/ia-propieya/compare/main...deploy/infra |
| Ver PRs abiertos | https://github.com/kiteprop/ia-propieya/pulls |
| Repo | https://github.com/kiteprop/ia-propieya |
