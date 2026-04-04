# Mergear deploy/infra a main (3 pasos)

**Repo operativo (Actions + Vercel):** [TeknoAriel/PropieYa](https://github.com/TeknoAriel/PropieYa). Tras cada push a `deploy/infra`, el workflow **Proponer sincronización main** puede abrir un PR `main` ← `deploy/infra` si `main` va atrasada.

---

## Paso 1: Abrir la pantalla de creación del PR

**Tekno (recomendado):**

```
https://github.com/TeknoAriel/PropieYa/compare/main...deploy/infra
```

**Copia org (auditoría):**

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
| Crear PR (Tekno) | https://github.com/TeknoAriel/PropieYa/compare/main...deploy/infra |
| PRs abiertos (Tekno) | https://github.com/TeknoAriel/PropieYa/pulls |
| Crear PR (kiteprop) | https://github.com/kiteprop/ia-propieya/compare/main...deploy/infra |
| Repo Tekno | https://github.com/TeknoAriel/PropieYa |
| Repo kiteprop | https://github.com/kiteprop/ia-propieya |
