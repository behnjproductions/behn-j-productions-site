-- Existing collections keep their current experience.
ALTER TABLE collections ADD COLUMN collection_type TEXT NOT NULL DEFAULT 'standard' CHECK (collection_type IN ('standard', 'school'));
