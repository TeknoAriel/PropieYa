-- Columnas que Drizzle incluye en INSERT a organizations (monetización / ranking).
-- Sin ellas, registro como dueño o inmobiliaria falla con 42703 en lead_credits_balance.
-- Aplicar contra la misma DATABASE_URL que usa el portal.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS lead_credits_balance integer NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS search_boost_points integer NOT NULL DEFAULT 0;
