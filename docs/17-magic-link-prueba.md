# Magic link (modo prueba)

Acceso rápido al **panel** sin contraseña, solo para entornos de prueba.

## Variables (Vercel)

| Proyecto | Variable | Valor |
|----------|----------|-------|
| **Web** | `MAGIC_LINK_TEST_MODE` | `1` |
| **Web** | `NEXT_PUBLIC_PANEL_URL` | URL del panel, ej. `https://tu-panel.vercel.app` |
| **Panel** | `NEXT_PUBLIC_MAGIC_LINK_TEST_MODE` | `1` (muestra el bloque en `/login`) |

Sin `MAGIC_LINK_TEST_MODE` en el **web**, las mutaciones `generateTestMagicLink` y `consumeMagicLink` responden 403.

## Uso

1. Panel → **Login** → sección **Modo prueba — magic link**.
2. Email (+ nombre opcional) → **Generar enlace de acceso**.
3. Abrí el enlace mostrado (vence en 15 min, un solo uso).

## Seguridad

Desactivá `MAGIC_LINK_TEST_MODE` en producción real o dejalo solo en preview/staging.
