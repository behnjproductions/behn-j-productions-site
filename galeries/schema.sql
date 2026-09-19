-- Schéma des galeries client. Les trois tables de base existent déjà dans D1;
-- ce fichier reste la référence complète du schéma attendu par le Worker.

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  client TEXT NOT NULL,
  title TEXT,
  event_date TEXT,
  status TEXT NOT NULL DEFAULT 'brouillon',
  max_picks INTEGER,
  extra_price INTEGER DEFAULT 25,
  cover_key TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  thumb_key TEXT,
  filename TEXT,
  width INTEGER,
  height INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS selections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  photo_ids TEXT NOT NULL,
  note TEXT,
  -- 'envoye' ou la raison de l'echec du courriel de notification.
  email_status TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Freine les essais de mot de passe répétés (une ligne par échec).
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_collection ON photos(collection_id, position);
CREATE INDEX IF NOT EXISTS idx_selections_collection ON selections(collection_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_attempts ON login_attempts(scope, ip, at);
