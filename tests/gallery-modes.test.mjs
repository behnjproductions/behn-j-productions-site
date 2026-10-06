import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createGalleryFixture } from './helpers/galerie-fixture.mjs';

function token(secret, scope) {
  const body = `${scope}.${Date.now() + 60_000}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

function fixture(t) {
  const f = createGalleryFixture();
  t.after(f.close);
  const initialSelections = JSON.stringify(f.rows());
  const files = new Map([['test-photo', { bytes: new TextEncoder().encode('existing-web'), type: 'image/jpeg' }]]);
  const reads = [];
  const writes = [];
  const deletions = [];
  f.env.BUCKET = {
    get: async (key) => {
      reads.push(key);
      const file = files.get(key);
      return file ? {
        body: file.bytes, httpEtag: 'test-etag',
        writeHttpMetadata(headers) { headers.set('content-type', file.type); },
      } : null;
    },
    put: async (key, stream, options) => {
      writes.push(key);
      files.set(key, { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), type: options.httpMetadata.contentType });
    },
    delete: async (keys) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        deletions.push(key);
        files.delete(key);
      }
    },
  };
  const adminToken = token(f.env.SESSION_SECRET, 'admin');
  return {
    ...f, files, reads, writes, deletions, adminToken,
    unchanged: () => assert.equal(JSON.stringify(f.rows()), initialSelections, 'every existing selection remains exactly unchanged'),
    admin: (path, method = 'GET', body) => f.request(`/admin${path}`, {
      method, headers: { 'x-bjp-token': adminToken, ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    }),
    mode: (value, id = 'metal7') => f.sqlite.prepare('UPDATE collections SET mode = ? WHERE id = ?').run(value, id),
  };
}

function upload(original, filename = 'Portrait.jpg') {
  const form = new FormData();
  form.append('web', new File(['web-copy'], 'web.jpg', { type: 'image/jpeg' }));
  form.append('thumb', new File(['thumb-copy'], 'thumb.jpg', { type: 'image/jpeg' }));
  form.append('filename', filename);
  form.append('width', '2000');
  form.append('height', '1333');
  if (original !== undefined) form.append('original', original);
  return form;
}

test('existing galleries default to selection and retain their saved submissions and normal photo access', async (t) => {
  const f = fixture(t);
  const gallery = await f.request('/galerie/metal-7').then((r) => r.json());
  assert.equal(gallery.mode, 'selection');
  assert.equal(gallery.downloadsEnabled, false);
  assert.deepEqual(gallery.submitted.ids, JSON.parse(f.rows().filter((r) => r.collection_id === 'metal7').at(-1).photo_ids));
  assert.equal(gallery.photos[0].downloadQuality, undefined);
  assert.equal(gallery.photos[0].filename, undefined);
  assert.equal((await f.request('/photo/photo-1')).status, 200);
  assert.equal((await f.request('/photo/photo-1/download')).status, 403);
  assert.equal((await f.request('/photo/photo-1/download', { headers: { 'x-bjp-token': f.adminToken } })).status, 403);
  assert.equal((await f.request('/photo/photo-1/download/extra')).status, 404);
  const locked = await f.request('/galerie/galerie-verrouillee').then((r) => r.json());
  assert.equal(locked.mode, 'selection');
  assert.equal(locked.locked, true);
  const admin = await f.admin('/collections').then((r) => r.json());
  assert.ok(admin.collections.every((c) => c.mode === 'selection' && !c.downloadsEnabled));
  f.unchanged();
});

test('admin creation accepts both modes, defaults to selection and rejects invalid modes without creating records', async (t) => {
  const f = fixture(t);
  for (const mode of [undefined, 'selection', 'download']) {
    const response = await f.admin('/collections', 'POST', { client: `Client ${mode}`, ...(mode === undefined ? {} : { mode }) });
    assert.equal(response.status, 201);
    const { collection } = await response.json();
    assert.equal(collection.mode, mode ?? 'selection');
    assert.equal(collection.downloadsEnabled, mode === 'download');
  }
  const before = f.sqlite.prepare('SELECT * FROM collections ORDER BY id').all();
  for (const mode of [null, '', 'Download', 'both', 1, {}, []]) {
    assert.equal((await f.admin('/collections', 'POST', { client: 'Invalid', mode })).status, 400);
  }
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM collections ORDER BY id').all(), before);
  f.unchanged();
});

test('admin mode changes preserve all existing selections and omitted mode preserves the current mode', async (t) => {
  const f = fixture(t);
  const originalPhotos = f.sqlite.prepare('SELECT * FROM photos ORDER BY id').all();
  assert.equal((await f.admin('/collections/metal-7', 'PATCH', { mode: 'download' })).status, 200);
  f.unchanged();
  const response = await f.admin('/collections/metal-7', 'PATCH', { title: 'Livraison finale' });
  assert.equal((await response.json()).collection.mode, 'download');
  const before = f.sqlite.prepare('SELECT * FROM collections WHERE id = ?').get('metal7');
  for (const mode of [null, 'invalid', false]) {
    assert.equal((await f.admin('/collections/metal-7', 'PATCH', { mode, title: 'Do not save' })).status, 400);
  }
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM collections WHERE id = ?').get('metal7'), before);
  assert.equal((await f.submit({ photoIds: ['photo-1'] })).status, 409, 'an already-open selection page cannot submit in download mode');
  f.unchanged();
  assert.equal((await f.admin('/collections/metal-7', 'PATCH', { mode: 'selection' })).status, 200);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM photos ORDER BY id').all(), originalPhotos);
  f.unchanged();
  assert.equal((await f.submit({ photoIds: ['photo-1'], note: 'Future submission' })).status, 200);
  assert.equal(f.rows().length, 12, 'returning to selection mode keeps append-only submission behavior');
});

test('download payload exposes file quality and hides historical proofing choices without rewriting them', async (t) => {
  const f = fixture(t);
  f.mode('download');
  f.sqlite.prepare('UPDATE photos SET filename = ?, original_key = ? WHERE id = ?').run('Portrait final.png', 'original.png', 'photo-1');
  f.sqlite.prepare('UPDATE photos SET filename = ? WHERE id = ?').run('Ancienne photo.CR3', 'photo-2');
  const gallery = await f.request('/galerie/metal-7').then((r) => r.json());
  assert.equal(gallery.mode, 'download');
  assert.equal(gallery.downloadsEnabled, true);
  assert.equal(gallery.submitted, null);
  assert.equal(gallery.photos[0].downloadQuality, 'original');
  assert.equal(gallery.photos[0].downloadFilename, 'Portrait final.png');
  assert.equal(gallery.photos[1].downloadQuality, 'web');
  assert.equal(gallery.photos[1].downloadFilename, 'Ancienne photo.jpg');
  const admin = await f.admin('/collections/metal-7').then((r) => r.json());
  assert.equal(admin.photos[0].downloadQuality, 'original');
  assert.equal(admin.photos[1].downloadFilename, 'Ancienne photo.jpg');
  assert.equal(admin.selections.length, 10);
  f.unchanged();
});

test('downloads require gallery access, retain all session transports and respect draft visibility', async (t) => {
  const f = fixture(t);
  f.mode('download', 'locked');
  const gallery = await f.request('/galerie/galerie-verrouillee').then((r) => r.json());
  assert.equal(gallery.mode, 'download');
  assert.equal(gallery.downloadsEnabled, true);
  assert.equal(gallery.photos, undefined);
  assert.equal((await f.request('/photo/locked-photo/download')).status, 403);
  assert.equal(f.reads.length, 0);
  const valid = token(f.env.SESSION_SECRET, 'g:locked');
  for (const options of [
    { headers: { 'x-bjp-token': valid } },
    { headers: { cookie: `bjp_g_locked=${encodeURIComponent(valid)}` } },
  ]) assert.equal((await f.request('/photo/locked-photo/download', options)).status, 200);
  assert.equal((await f.request(`/photo/locked-photo/download?t=${encodeURIComponent(valid)}`)).status, 200);
  assert.equal((await f.request('/photo/locked-photo/download', { headers: { 'x-bjp-token': token(f.env.SESSION_SECRET, 'g:other') } })).status, 403);
  f.sqlite.prepare('UPDATE collections SET status = ? WHERE id = ?').run('brouillon', 'locked');
  assert.equal((await f.request(`/photo/locked-photo/download?t=${encodeURIComponent(valid)}`)).status, 403);
  assert.equal((await f.request('/photo/locked-photo/download', { headers: { 'x-bjp-token': f.adminToken } })).status, 200);
  assert.equal((await f.request('/photo/missing/download')).status, 404);
  f.unchanged();
});

test('download streams the original bytes, with safe Unicode filenames and no shared cache', async (t) => {
  const f = fixture(t);
  f.mode('download');
  f.files.set('original.png', { bytes: new TextEncoder().encode('unchanged-original-bytes'), type: 'image/png' });
  f.sqlite.prepare('UPDATE photos SET filename = ?, original_key = ? WHERE id = ?').run('../été "portrait"\r\n.png', 'original.png', 'photo-1');
  const response = await f.request('/photo/photo-1/download');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'unchanged-original-bytes');
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const disposition = response.headers.get('content-disposition');
  assert.match(disposition, /^attachment; filename="/);
  assert.match(disposition, /filename\*=UTF-8''%C3%A9t%C3%A9%20%22portrait%22\.png$/);
  assert.doesNotMatch(disposition, /\.\.\/|\r|\n/);
  assert.deepEqual(f.reads, ['original.png']);
  const fallback = await f.request('/photo/photo-2/download');
  assert.equal(await fallback.text(), 'existing-web');
  assert.match(fallback.headers.get('content-disposition'), /filename="IMG_0002.jpg"/);
  f.unchanged();
});

test('explicit download quality returns the requested original or social bytes and matching filename', async (t) => {
  const f = fixture(t);
  f.mode('download');
  const originalBytes = Uint8Array.of(0, 255, 1, 128, 12);
  f.files.set('original.png', { bytes: originalBytes, type: 'image/png' });
  f.sqlite.prepare('UPDATE photos SET filename = ?, original_key = ? WHERE id = ?').run('../été "portrait".png', 'original.png', 'photo-1');
  const photosBefore = f.sqlite.prepare('SELECT * FROM photos ORDER BY id').all();
  const original = await f.request('/photo/photo-1/download?quality=original');
  assert.equal(original.status, 200);
  assert.deepEqual(new Uint8Array(await original.arrayBuffer()), originalBytes);
  assert.equal(original.headers.get('content-type'), 'image/png');
  assert.match(original.headers.get('content-disposition'), /filename\*=UTF-8''%C3%A9t%C3%A9%20%22portrait%22\.png$/);
  const social = await f.request('/photo/photo-1/download?quality=social');
  assert.equal(social.status, 200);
  assert.equal(await social.text(), 'existing-web');
  assert.equal(social.headers.get('content-type'), 'image/jpeg');
  assert.match(social.headers.get('content-disposition'), /filename\*=UTF-8''%C3%A9t%C3%A9%20%22portrait%22\.jpg$/);
  assert.equal(original.headers.get('cache-control'), 'private, no-store');
  assert.equal(social.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(f.reads, ['original.png', 'test-photo']);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM photos ORDER BY id').all(), photosBefore);
  f.unchanged();
});

test('explicit original quality never silently falls back to a web file', async (t) => {
  const f = fixture(t);
  f.mode('download');
  const original = await f.request('/photo/photo-1/download?quality=original');
  assert.equal(original.status, 409);
  assert.match((await original.json()).error, /^Le fichier original n’est pas disponible/);
  assert.deepEqual(f.reads, [], 'missing original fails before accessing storage');
  const social = await f.request('/photo/photo-1/download?quality=social');
  assert.equal(social.status, 200);
  assert.equal(await social.text(), 'existing-web');
  const unspecified = await f.request('/photo/photo-1/download');
  assert.equal(unspecified.status, 200, 'omitted quality preserves existing best-available behavior');
  assert.equal(await unspecified.text(), 'existing-web');
  assert.deepEqual(f.writes, []);
  f.unchanged();
});

test('unsupported download quality is rejected and quality parameters cannot bypass access or gallery mode', async (t) => {
  const f = fixture(t);
  f.mode('download');
  for (const quality of ['', 'high', 'Original', 'web', '../original']) {
    assert.equal((await f.request(`/photo/photo-1/download?quality=${encodeURIComponent(quality)}`)).status, 400);
  }
  assert.deepEqual(f.reads, []);
  for (const quality of ['original', 'social']) {
    assert.equal((await f.request(`/photo/other-photo/download?quality=${quality}`)).status, 403, 'selection mode denies either download quality');
    f.mode('download', 'locked');
    assert.equal((await f.request(`/photo/locked-photo/download?quality=${quality}`)).status, 403, 'missing gallery session denies either download quality');
  }
  assert.deepEqual(f.reads, []);
  assert.deepEqual(f.writes, []);
  f.unchanged();
});

test('original upload is retained in selection mode without enabling downloads', async (t) => {
  const f = fixture(t);
  const before = f.sqlite.prepare('SELECT COUNT(*) AS n FROM photos').get().n;
  const response = await f.admin('/collections/metal-7/photos', 'POST', upload(new File(['original'], 'Portrait.jpg', { type: 'image/jpeg' })));
  assert.equal(response.status, 201);
  assert.equal(f.writes.length, 3);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM photos').get().n, before + 1);
  assert.equal((await f.request('/photo/' + (await response.json()).photo.id + '/download')).status, 403);
  f.unchanged();
});

test('download original upload rejects unsupported, empty, oversized and non-file inputs before writes', async (t) => {
  const f = fixture(t);
  f.mode('download');
  const before = f.sqlite.prepare('SELECT COUNT(*) AS n FROM photos').get().n;
  for (const [original, status] of [
    [new File(['svg'], 'Portrait.svg', { type: 'image/svg+xml' }), 400],
    [new File([], 'Empty.jpg', { type: 'image/jpeg' }), 413],
    ['not-a-file', 400],
    [new File([new Uint8Array(75 * 1024 * 1024 + 1)], 'Large.jpg', { type: 'image/jpeg' }), 413],
  ]) {
    const response = await f.admin('/collections/metal-7/photos', 'POST', upload(original));
    assert.equal(response.status, status, await response.text());
    assert.deepEqual(f.writes, []);
    assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM photos').get().n, before);
  }
  f.unchanged();
});

test('download uploads preserve JPEG, PNG and WebP originals and report each actual download format', async (t) => {
  const f = fixture(t);
  f.mode('download');
  for (const [type, extension] of [['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]) {
    const bytes = `Original bytes for ${type}`;
    const response = await f.admin('/collections/metal-7/photos', 'POST', upload(new File([bytes], `Portrait.${extension}`, { type }), 'Portrait.wrong'));
    assert.equal(response.status, 201);
    const { photo } = await response.json();
    assert.equal(photo.downloadQuality, 'original');
    assert.equal(photo.downloadFilename, `Portrait.${extension}`);
    const stored = f.sqlite.prepare('SELECT * FROM photos WHERE id = ?').get(photo.id);
    assert.match(stored.original_key, new RegExp(`-original\\.${extension}$`));
    assert.ok(f.files.has(stored.r2_key));
    assert.ok(f.files.has(stored.thumb_key));
    const download = await f.request(`/photo/${photo.id}/download`);
    assert.equal(download.headers.get('content-type'), type);
    assert.equal(await download.text(), bytes);
    assert.match(download.headers.get('content-disposition'), new RegExp(`filename="Portrait\\.${extension}"`));
  }
  f.unchanged();
});

test('uploads without originals retain old upload behavior and honestly report web quality', async (t) => {
  const f = fixture(t);
  for (const mode of ['selection', 'download']) {
    f.mode(mode);
    const response = await f.admin('/collections/metal-7/photos', 'POST', upload(undefined, 'Portrait.png'));
    assert.equal(response.status, 201);
    const { photo } = await response.json();
    assert.equal(photo.downloadQuality, 'web');
    assert.equal(photo.downloadFilename, 'Portrait.jpg');
    assert.equal(f.sqlite.prepare('SELECT original_key FROM photos WHERE id = ?').get(photo.id).original_key, null);
  }
  f.unchanged();
});

test('explicit photo and collection removal include newly stored original files', async (t) => {
  const f = fixture(t);
  const { collection } = await f.admin('/collections', 'POST', { client: 'Disposable local collection', mode: 'download' }).then((r) => r.json());
  const add = () => f.admin(`/collections/${collection.slug}/photos`, 'POST', upload(new File(['original'], 'Portrait.jpg', { type: 'image/jpeg' }))).then((r) => r.json());
  const first = (await add()).photo;
  const storedFirst = f.sqlite.prepare('SELECT * FROM photos WHERE id = ?').get(first.id);
  assert.equal((await f.admin(`/photos/${first.id}`, 'DELETE')).status, 200);
  for (const key of [storedFirst.r2_key, storedFirst.thumb_key, storedFirst.original_key]) assert.ok(f.deletions.includes(key));
  const second = (await add()).photo;
  const storedSecond = f.sqlite.prepare('SELECT * FROM photos WHERE id = ?').get(second.id);
  assert.equal((await f.admin(`/collections/${collection.slug}`, 'DELETE')).status, 200);
  for (const key of [storedSecond.r2_key, storedSecond.thumb_key, storedSecond.original_key]) assert.ok(f.deletions.includes(key));
  assert.equal(f.sqlite.prepare('SELECT * FROM collections WHERE id = ?').get(collection.id), undefined);
  f.unchanged();
});

test('the additive migration preserves every legacy collection field, photo and selection', (t) => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const schema = readFileSync(new URL('../galeries/schema.sql', import.meta.url), 'utf8');
  const legacySchema = schema
    .replace("  mode TEXT NOT NULL DEFAULT 'selection' CHECK (mode IN ('selection', 'download')),\n", '')
    .replace('  original_key TEXT,\n', '');
  db.exec(legacySchema);
  db.exec("INSERT INTO collections (id, slug, client, status, password_hash) VALUES ('legacy', 'legacy', 'Legacy', 'publié', 'existing-secret-hash')");
  db.exec("INSERT INTO photos (id, collection_id, r2_key, thumb_key, filename) VALUES ('legacy-photo', 'legacy', 'existing-web', 'existing-thumb', 'Original.jpg')");
  for (let i = 0; i < 10; i += 1) db.prepare('INSERT INTO selections (collection_id, photo_ids, note, email_status, submitted_at) VALUES (?, ?, ?, ?, ?)')
    .run('legacy', '["legacy-photo"]', i % 2 ? null : `Untouched ${i}`, i % 2 ? 'envoyé' : null, `2026-09-${10 + i} 12:00:00`);
  const before = Object.fromEntries(['collections', 'photos', 'selections'].map((table) => [table, JSON.stringify(db.prepare(`SELECT * FROM ${table}`).all())]));
  db.exec(readFileSync(new URL('../galeries/migrations/0001_gallery_modes.sql', import.meta.url), 'utf8'));
  assert.equal(JSON.stringify(db.prepare('SELECT * FROM selections').all()), before.selections);
  const collections = db.prepare('SELECT * FROM collections').all();
  assert.equal(collections[0].mode, 'selection');
  for (const collection of collections) delete collection.mode;
  assert.equal(JSON.stringify(collections), before.collections);
  const photos = db.prepare('SELECT * FROM photos').all();
  assert.equal(photos[0].original_key, null);
  for (const photo of photos) delete photo.original_key;
  assert.equal(JSON.stringify(photos), before.photos);
  assert.throws(() => db.exec("UPDATE collections SET mode = 'invalid'"), /CHECK constraint failed/);
});

test('independent categories upload and round-trip through client/admin without changing legacy selections', async (t) => {
  const f = fixture(t);
  f.mode('download');
  const uploaded = [];
  for (const category of ['full', 'social', 'social', 'bw']) {
    const form = upload(new File([`final-${category}`], `${category}.jpg`, { type: 'image/jpeg' }), `${category}.jpg`);
    form.append('category', category);
    const response = await f.admin('/collections/metal-7/photos', 'POST', form);
    assert.equal(response.status, 201);
    const { photo } = await response.json();
    assert.equal(photo.category, category);
    uploaded.push(photo);
    const download = await f.request(`/photo/${photo.id}/download?quality=original`);
    assert.equal(await download.text(), `final-${category}`);
  }
  const gallery = await f.request('/galerie/metal-7').then((r) => r.json());
  const admin = await f.admin('/collections/metal-7').then((r) => r.json());
  for (const payload of [gallery, admin]) {
    assert.equal(payload.photos.filter((p) => p.category === 'full').length, 4);
    assert.equal(payload.photos.filter((p) => p.category === 'social').length, 2);
    assert.equal(payload.photos.filter((p) => p.category === 'bw').length, 1);
  }
  const form = upload(); form.append('category', 'unknown');
  const writes = f.writes.length;
  assert.equal((await f.admin('/collections/metal-7/photos', 'POST', form)).status, 400);
  assert.equal(f.writes.length, writes);
  f.unchanged();
});

test('school collections retain their type independently of selection and download modes', async (t) => {
  const f = fixture(t);
  for (const mode of ['selection', 'download']) {
    const response = await f.admin('/collections', 'POST', { client: `École ${mode}`, collectionType: 'school', mode });
    assert.equal(response.status, 201);
    const { collection } = await response.json();
    assert.equal(collection.collectionType, 'school');
    assert.equal(collection.mode, mode);
    const updated = await f.admin(`/collections/${collection.slug}`, 'PATCH', { mode: mode === 'selection' ? 'download' : 'selection' }).then(r => r.json());
    assert.equal(updated.collection.collectionType, 'school');
    const listed = await f.admin('/collections').then(r => r.json());
    assert.equal(listed.collections.find(c => c.id === collection.id).collectionType, 'school');
    assert.equal(f.sqlite.prepare('SELECT collection_type FROM collections WHERE id = ?').get(collection.id).collection_type, 'school');
  }
  assert.equal((await f.admin('/collections', 'POST', { client: 'Invalid', collectionType: 'unknown' })).status, 400);
  f.unchanged();
});
