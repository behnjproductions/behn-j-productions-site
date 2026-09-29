-- Apply once to an existing database before deploying the gallery-mode Worker.
-- New databases use schema.sql directly. No selections or photos are rewritten.
ALTER TABLE collections ADD COLUMN mode TEXT NOT NULL DEFAULT 'selection' CHECK (mode IN ('selection', 'download'));
ALTER TABLE photos ADD COLUMN original_key TEXT;
