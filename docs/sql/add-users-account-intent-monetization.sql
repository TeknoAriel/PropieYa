-- Portal: columnas de onboarding/monetización en users (registro / políticas).
-- Si faltan, auth.register falla con error de columna (p. ej. 42703).
-- Aplicar contra la misma DATABASE_URL que usa el proyecto web en Vercel.

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_intent varchar(32) NOT NULL DEFAULT 'seeker';
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_monetization_tier varchar(20) NOT NULL DEFAULT 'free';
