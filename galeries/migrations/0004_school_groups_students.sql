CREATE TABLE school_groups (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE school_students (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES school_groups(id) ON DELETE CASCADE,
  link_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE photos ADD COLUMN student_id TEXT REFERENCES school_students(id);
ALTER TABLE selections ADD COLUMN student_id TEXT REFERENCES school_students(id);
CREATE INDEX school_groups_collection ON school_groups(collection_id);
CREATE INDEX school_students_group ON school_students(group_id);
CREATE INDEX photos_student ON photos(student_id);
