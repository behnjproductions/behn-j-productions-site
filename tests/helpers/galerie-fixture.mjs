import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../../galeries/src/index.js';

// Real schema and SQL, isolated in memory; no Cloudflare or email credentials.
export function createGalleryFixture({ slug = 'metal-7' } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../galeries/schema.sql', import.meta.url), 'utf8'));
  const prepare = (sql, values = []) => ({
    bind: (...bound) => prepare(sql, bound),
    first: async () => sqlite.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
    run: async () => {
      const result = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { last_row_id: Number(result.lastInsertRowid), changes: result.changes } };
    },
  });
  const env = {
    DB: { prepare, batch: (statements) => Promise.all(statements.map((statement) => statement.run())) },
    ADMIN_PASSWORD: 'local-test-admin', SESSION_SECRET: 'local-fixture-secret-only',
    SITE_ORIGIN: 'http://localhost:5173',
  };
  const collection = sqlite.prepare('INSERT INTO collections (id, slug, client, status, password_hash) VALUES (?, ?, ?, ?, ?)');
  collection.run('metal7', slug, 'Métal 7', 'publié', null);
  collection.run('other', 'galerie-regression', 'Galerie témoin', 'publié', null);
  collection.run('locked', 'galerie-verrouillee', 'Galerie verrouillée', 'publié', 'locked-test-fixture');
  const photo = sqlite.prepare('INSERT INTO photos (id, collection_id, r2_key, filename, position) VALUES (?, ?, ?, ?, ?)');
  for (let index = 1; index <= 3; index += 1) photo.run(`photo-${index}`, 'metal7', 'test-photo', `IMG_000${index}.jpg`, index);
  photo.run('other-photo', 'other', 'test-photo', 'OTHER.jpg', 0);
  photo.run('locked-photo', 'locked', 'test-photo', 'LOCKED.jpg', 0);
  const seed = sqlite.prepare('INSERT INTO selections (collection_id, photo_ids, note, email_status, submitted_at) VALUES (?, ?, ?, ?, ?)');
  for (let index = 1; index <= 10; index += 1) {
    seed.run('metal7', JSON.stringify([`photo-${1 + index % 3}`]), index % 2 ? null : `Note existante ${index}`, index % 2 ? 'envoyé' : null, `2026-09-${String(index).padStart(2, '0')} 12:34:56`);
  }
  seed.run('other', '["other-photo"]', 'Sélection témoin', 'envoyé', '2026-09-01 00:00:00');
  const rows = () => sqlite.prepare('SELECT * FROM selections ORDER BY id').all();
  const request = (path, options = {}) => worker.fetch(new Request(`http://localhost/api${path}`, options), env);
  const submit = (body, target = slug) => request(`/galerie/${target}/selection`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { sqlite, env, rows, request, submit, close: () => sqlite.close() };
}
