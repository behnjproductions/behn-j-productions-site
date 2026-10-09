-- Preserve every photo row, ID, R2 key and selection. Retain the old column
-- rather than rebuild the populated photos table to expand its CHECK constraint.
ALTER TABLE photos RENAME COLUMN category TO category_legacy;
ALTER TABLE photos ADD COLUMN category TEXT NOT NULL DEFAULT 'full' CHECK (category IN ('full', 'advanced', 'social', 'bw'));
UPDATE photos SET category = category_legacy;
CREATE INDEX IF NOT EXISTS idx_photos_category_v2 ON photos(collection_id, category, position);
