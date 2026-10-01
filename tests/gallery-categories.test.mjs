import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { categoryPhotos } from '../src/gallery-categories.js';

test('category migration leaves legacy files and IDs intact and defaults them to full', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec("CREATE TABLE photos(id TEXT, collection_id TEXT, position INTEGER, r2_key TEXT); INSERT INTO photos VALUES ('old', 'collection', 4, 'unchanged-file');");
    db.exec(readFileSync(new URL('../galeries/migrations/0002_photo_categories.sql', import.meta.url), 'utf8'));
    assert.deepEqual({ ...db.prepare('SELECT * FROM photos').get() }, { id: 'old', collection_id: 'collection', position: 4, r2_key: 'unchanged-file', category: 'full' });
    assert.throws(() => db.exec("UPDATE photos SET category = 'invalid'"));
  } finally { db.close(); }
});

test('unequal and empty sets keep photo identities and legacy photos in full', () => {
  const photos = [{ id: 'old' }, { id: 'full', category: 'full' }, { id: 'social', category: 'social' }];
  assert.deepEqual(categoryPhotos(photos, 'full').map((p) => p.id), ['old', 'full']);
  assert.deepEqual(categoryPhotos(photos, 'social').map((p) => p.id), ['social']);
  assert.deepEqual(categoryPhotos(photos, 'bw'), []);
});
