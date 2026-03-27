# Configuración Elasticsearch con Bonsai (gratis)

Propieya usa Elasticsearch para la búsqueda en `/buscar`. Sin ES configurado, la búsqueda funciona por fallback a SQL, pero el cron `sync-search` falla y algunas capacidades avanzadas no están disponibles.

**Bonsai Sandbox** ofrece Elasticsearch gestionado gratis para siempre (125 MB, 35.000 documentos). Suficiente para miles de propiedades.

---

## 1. Crear cuenta y cluster en Bonsai

### Paso 1.1: Registro

1. Entrá a: **https://app.bonsai.io/signup/sandbox**
2. Completá el formulario:
   - Email: tu correo
   - Password: elegí una contraseña
3. Click en **Sign Up**
4. Confirmá el email si Bonsai lo solicita

### Paso 1.2: Crear el cluster Sandbox

1. Después de iniciar sesión, deberías ver la opción de crear un cluster Sandbox
2. Si te redirige al dashboard, buscá **Create Cluster** o **Sandbox**
3. URL directa al signup del plan Sandbox: **https://sprout.bonsai.io/signup/sandbox**
4. Elegí región: preferentemente la más cercana a tus usuarios (por ejemplo `us-east-1` si la mayoría está en América)
5. Confirmá la creación

### Paso 1.3: Obtener la URL de conexión

1. En el dashboard de Bonsai: **https://app.bonsai.io**
2. Seleccioná tu cluster (el que creaste)
3. Pestaña **Access** → en la tabla verás **Access Key** y **Access Secret**
4. Botón **Connect** (arriba a la derecha) → ahí está el host del cluster
5. La URL completa tiene este formato (Bonsai OpenSearch, plan Hobby):
   ```
   https://ACCESS_KEY:ACCESS_SECRET@HOST
   ```
6. Ejemplo de estructura (Propieya, us-east-1):
   ```
   https://ACCESS_KEY:ACCESS_SECRET@charming-jujube-1n9hxswr.us-east-1.bonsaisearch.net
   ```
   Reemplazá `ACCESS_KEY` y `ACCESS_SECRET` por los de tu cluster. El host (`*.bonsaisearch.net`) lo ves en **Connect**.
7. Ese string completo es el valor de `ELASTICSEARCH_URL` para Vercel.

---

## 2. Configurar en Vercel

### Paso 2.1: Ir a Environment Variables

1. Entrá a: **https://vercel.com/teknoariels-projects/propie-ya-web/settings/environment-variables**
2. Si tu proyecto tiene otro nombre o scope, ajustá la URL. El patrón es:
   ```
   https://vercel.com/{TU-TEAM}/{TU-PROYECTO-WEB}/settings/environment-variables
   ```

### Paso 2.2: Agregar ELASTICSEARCH_URL

1. Click en **Add New**
2. En **Key** poné exactamente: `ELASTICSEARCH_URL`
3. En **Value** pegá la URL que copiaste de Bonsai (con `https://`, usuario, contraseña y host)
4. En **Environments** marcá: Production (y opcionalmente Preview si querés)
5. Click en **Save**

### Paso 2.3: (Opcional) ELASTICSEARCH_INDEX_PREFIX

Si querés un prefijo distinto para el índice (por defecto `propieya`):

1. Add New → Key: `ELASTICSEARCH_INDEX_PREFIX`
2. Value: por ejemplo `propieya` (ya es el default, no hace falta si no cambiás nada)
3. Save

Si no lo agregás, el código usa `propieya` por defecto.

---

## 3. Redeploy

1. Entrá a: **https://vercel.com/teknoariels-projects/propie-ya-web**
2. Abrí el último deployment
3. Click en **⋯** (tres puntos) → **Redeploy**
4. Dejá **Use existing Build Cache** marcado si querés
5. Click en **Redeploy**

---

## 4. Indexar las propiedades

Después del redeploy, ejecutá el cron para crear el índice y cargar los listings:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  https://propieyaweb.vercel.app/api/cron/sync-search
```

Reemplazá `TU_CRON_SECRET` por el valor de `CRON_SECRET` de Vercel (mismo proyecto, misma pantalla de Environment Variables).

Respuesta esperada (si todo va bien):

```json
{"total":N,"indexed":N,"errors":0}
```

---

## 5. Verificación

1. Abrí **https://propieyaweb.vercel.app/buscar**
2. Deberías ver propiedades (si hay activas en la DB)
3. Probá búsquedas por texto, tipo, precio

---

## Valores exactos para copiar

| Variable | Dónde | Valor |
|----------|-------|-------|
| `ELASTICSEARCH_URL` | Bonsai → Cluster → Access/Credentials | La URL que te da Bonsai (empieza con `https://`, incluye usuario:contraseña) |
| `ELASTICSEARCH_INDEX_PREFIX` | Opcional en Vercel | `propieya` (o vacío, el default ya es ese) |

---

## Límites del plan Sandbox

- 125 MB de datos
- 35.000 documentos
- ~5–10 KB por propiedad → unas 3.500–7.000 propiedades aprox.
- Si lo superás, Bonsai avisa y podés pasar a Staging ($15/mo)

---

## Formato ELASTICSEARCH_URL (Bonsai OpenSearch)

```
https://ACCESS_KEY:ACCESS_SECRET@CLUSTER-ID.REGION.bonsaisearch.net
```

- **ACCESS_KEY** y **ACCESS_SECRET:** pestaña Access del cluster
- **CLUSTER-ID.REGION.bonsaisearch.net:** lo ves en el botón **Connect**

---

## Si Bonsai cambia su interfaz

Las URLs y pasos pueden variar. Si algo no coincide:

- Dashboard general: **https://app.bonsai.io**
- Documentación: **https://bonsai.io/docs**
- La URL de conexión siempre tiene formato: `https://ACCESS_KEY:ACCESS_SECRET@host` (credenciales en la URL)
