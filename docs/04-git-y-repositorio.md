# Propieya — Git y repositorio remoto

Guía paso a paso para dar de alta el repositorio y configurar reglas de ramas que prioricen **robustez y estabilidad**.

---

## Parte 1: Alta inicial (una sola vez)

### Paso 1.1 — Inicializar Git en el proyecto

En la raíz del monorepo (`/Users/arielcarnevali/Propieya`):

```bash
cd /Users/arielcarnevali/Propieya
git init
```

### Paso 1.2 — Verificar qué se va a versionar

Revisá que `.gitignore` esté completo (ya debería incluir `node_modules/`, `.env`, `.next/`, etc.). Si falta algo sensible, agregalo antes del primer commit.

```bash
git status
```

No deben aparecer archivos como `.env`, `node_modules`, `.next`, `*.log`.

### Paso 1.3 — Primer commit (rama principal)

```bash
git add .
git commit -m "chore: fundación del proyecto — monorepo, auth, CRUD propiedades inicial"
```

### Paso 1.4 — Nombrar la rama principal

Usamos `main` como rama estable por defecto:

```bash
git branch -M main
```

### Paso 1.5 — Crear el repositorio en la nube

**Opción A — GitHub**

1. Entrá a [github.com](https://github.com) e iniciá sesión.
2. Clic en **New repository**.
3. Nombre sugerido: `propieya` (o el que prefieras).
4. Dejalo **privado**.
5. **No** marques "Add a README" ni ".gitignore" (ya los tenés en el repo).
6. Crear el repo (sin clonar todavía).

**Opción B — GitLab**

1. Entrá a [gitlab.com](https://gitlab.com) (o tu instancia privada).
2. **New project** → **Create blank project**.
3. Nombre: `propieya`, visibilidad **Private**.
4. Desmarcá "Initialize repository with a README".
5. Crear proyecto.

### Paso 1.6 — Conectar el repo local con el remoto

Reemplazá `TU_USUARIO` y `propieya` si cambiaste el nombre.

**GitHub:**

```bash
git remote add origin https://github.com/TU_USUARIO/propieya.git
```

**GitLab:**

```bash
git remote add origin https://gitlab.com/TU_USUARIO/propieya.git
```

### Paso 1.7 — Primer push

```bash
git push -u origin main
```

Si te pide usuario/contraseña, en GitHub podés usar un **Personal Access Token** en lugar de la contraseña; en GitLab igual (token o SSH).

---

## Parte 2: Reglas duras de ramas (estabilidad prioritaria)

Seguir estas reglas evita que `main` se rompa y mantiene el proyecto estable.

### 2.1 — Ramas que existen

| Rama        | Uso |
|------------|-----|
| `main`     | **Única rama “de producción”.** Siempre compilable, tests verdes, lista para desplegar. |
| `develop`  | (Opcional) Integración de features; se puede usar para staging. |
| `feature/*`| Una rama por feature/épica (ej. `feature/auth-refresh`, `feature/listing-filters`). |
| `fix/*`    | Correcciones puntuales (ej. `fix/login-redirect`). |

No trabajamos **directo sobre `main`** para features nuevas.

### 2.2 — Reglas de conexión (obligatorias)

1. **Todo lo que entra a `main` pasa por Pull Request (o Merge Request).**  
   No se hace `git push origin main` desde una feature; se abre PR de `feature/xxx` → `main`.

2. **Antes de abrir el PR a `main`:**
   - `pnpm install`
   - `pnpm typecheck` → debe pasar sin errores.
   - (Cuando existan) tests: `pnpm test` → debe pasar.

3. **`main` está protegida:**  
   Configurá en GitHub/GitLab que a `main` **no** se pueda hacer push directo (solo merge vía PR y, si querés, con aprobación).

4. **Commits en ramas de feature:**  
   Mensajes claros; idealmente prefijo: `feat:`, `fix:`, `chore:`, `docs:`.

5. **Sincronizar con `main` a menudo:**  
   En tu rama de feature, periódicamente:
   ```bash
   git fetch origin
   git merge origin/main
   ```
   (o `git rebase origin/main` si preferís historial lineal). Así evitás conflictos enormes al cerrar el PR.

### 2.3 — Flujo de trabajo diario (resumen)

1. Crear rama desde `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/nombre-descriptivo
   ```
2. Trabajar, commitear en esa rama.
3. Subir la rama:
   ```bash
   git push -u origin feature/nombre-descriptivo
   ```
4. Abrir PR/MR **hacia `main`**.
5. Verificar en el PR que typecheck (y luego tests) pasen.
6. Hacer merge a `main`; borrar la rama `feature/*` si ya no la usás.
7. Volver a `main` y seguir:
   ```bash
   git checkout main
   git pull origin main
   ```

---

## Parte 3: Configuración en GitHub (recomendada)

1. Repo → **Settings** → **Branches**.
2. **Add branch protection rule**.
3. **Branch name pattern:** `main`.
4. Marcar:
   - **Require a pull request before merging** (al menos 1 aprobación si hay más personas; si sos solo vos, podés exigir solo que el PR exista).
   - **Require status checks to pass before merging** → elegir el check **Typecheck** (aparece después del primer push o PR que dispare el workflow en `.github/workflows/ci.yml`).
   - **Do not allow bypassing the above settings** (también para admins).

En GitLab: **Settings → Repository → Protected branches** → proteger `main` con “Allowed to merge” solo mediante MR y, si querés, exigir pipeline en verde (por ejemplo con un `.gitlab-ci.yml` que ejecute `pnpm typecheck`).

---

## Parte 4: Resumen de comandos (referencia rápida)

```bash
# Inicial (una vez)
git init
git add .
git commit -m "chore: fundación del proyecto — monorepo, auth, CRUD inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/propieya.git
git push -u origin main

# Día a día (nueva feature)
git checkout main && git pull origin main
git checkout -b feature/mi-feature
# ... trabajo y commits ...
git push -u origin feature/mi-feature
# Abrir PR a main → revisar → merge

# Después del merge
git checkout main && git pull origin main
```

Con esto tenés el alta del repo y reglas duras de conexión para mantener siempre robustez y estabilidad prioritaria. Si en algún paso te pide login o token, lo resolvemos en el siguiente mensaje.

---

## Deuda técnica (registro)

| Tema | Estado | Revisar cuando |
|------|--------|----------------|
| **Repo público** | Repo público temporalmente para que las reglas de branch protection (Rulesets) se apliquen. GitHub Free no aplica Rulesets en repos privados. | Avance el proyecto y haya datos sensibles o IP relevante. Valorar pasar a privado con plan Team o alternativas (GitLab, Bitbucket) si se necesita enforcement en privado. |
