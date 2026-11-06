-- Delivery rows are additive: do not change student links, photos or selections.
CREATE TABLE IF NOT EXISTS school_deliveries (
 student_id TEXT PRIMARY KEY REFERENCES school_students(id),
 collection_id TEXT NOT NULL REFERENCES collections(id),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 batch_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS school_delivery_photos (
 student_id TEXT NOT NULL REFERENCES school_deliveries(student_id),
 photo_id TEXT NOT NULL REFERENCES photos(id),
 r2_key TEXT NOT NULL,
 thumb_key TEXT NOT NULL,
 original_key TEXT NOT NULL,
 width INTEGER NOT NULL,
 height INTEGER NOT NULL,
 PRIMARY KEY(student_id,photo_id)
);
