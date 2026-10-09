CREATE TABLE IF NOT EXISTS download_requests (
 id TEXT PRIMARY KEY,
 collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
 student_id TEXT,
 email TEXT NOT NULL,
 photo_ids TEXT NOT NULL,
 category TEXT NOT NULL,
 quality TEXT NOT NULL,
 notification_status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_download_requests_collection ON download_requests(collection_id, created_at);
