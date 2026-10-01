-- Additive migration: preserves photo IDs, files, covers and selections.
ALTER TABLE photos ADD COLUMN category TEXT NOT NULL DEFAULT 'full' CHECK (category IN ('full', 'social', 'bw'));
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(collection_id, category, position);
