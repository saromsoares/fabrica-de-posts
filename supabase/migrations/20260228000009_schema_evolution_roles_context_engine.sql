-- ============================================================
-- Migration 009: Schema Evolution — Roles, Context Engine Fields
-- NÃO deleta dados. Apenas ALTER TABLE.
-- ============================================================

-- ─────────────────────────────────────
-- 1. PROFILES — Novas colunas
-- ─────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_voice text;

-- Atualizar CHECK constraint para aceitar 'super_admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['lojista'::text, 'fabricante'::text, 'admin'::text, 'super_admin'::text]));

-- Atualizar o usuário ASX (role='admin') para super_admin
UPDATE profiles
SET is_super_admin = true,
    role = 'super_admin'
WHERE role = 'admin';

-- ─────────────────────────────────────
-- 2. FACTORIES — Novas colunas
-- ─────────────────────────────────────

ALTER TABLE factories ADD COLUMN IF NOT EXISTS niche text;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS brand_differentials text;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS brand_voice text;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS target_audience text;
-- sector_id já existe, mas usar IF NOT EXISTS por segurança
ALTER TABLE factories ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES sectors(id);

-- Popular sector_id da ASX ILUMINACAO (idempotente — já pode estar preenchido)
UPDATE factories
SET sector_id = (SELECT id FROM sectors WHERE slug = 'automotivo' LIMIT 1)
WHERE name ILIKE '%ASX%'
  AND (sector_id IS NULL OR sector_id = (SELECT id FROM sectors WHERE slug = 'automotivo' LIMIT 1));

-- ─────────────────────────────────────
-- 3. PRODUCTS — Novas colunas
-- ─────────────────────────────────────

ALTER TABLE products ADD COLUMN IF NOT EXISTS main_benefit text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS technical_specs text;
