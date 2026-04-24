-- Normaliza `listings.address` cuando quedó guardado como string JSON dentro de jsonb.
-- Efecto: los filtros por ciudad/barrio vuelven a funcionar (address->>'city' / neighborhood).
UPDATE listings
SET address = (address #>> '{}')::jsonb
WHERE jsonb_typeof(address) = 'string'
  AND (address #>> '{}') LIKE '{%';
