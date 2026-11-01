-- Additive migration: thematic sections inside a collection (ex. Cérémonie,
-- Discours, Équipe). NULL = no section; the gallery then shows no section bar.
-- Preserves photo IDs, files, categories, covers and selections.
ALTER TABLE photos ADD COLUMN section TEXT;
