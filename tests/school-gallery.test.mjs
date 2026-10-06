import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createGalleryFixture } from './helpers/galerie-fixture.mjs';

async function school(t, mode = 'selection') {
  const f = createGalleryFixture(); t.after(f.close);
  const login = await f.request('/admin/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: f.env.ADMIN_PASSWORD }) }).then(r => r.json());
  const admin = (path, method = 'GET', body) => f.request(`/admin${path}`, { method, headers: { 'x-bjp-token': login.token, ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
  const { collection } = await admin('/collections', 'POST', { client: 'École locale', collectionType: 'school', mode }).then(r => r.json());
  const { group } = await admin(`/collections/${collection.slug}/groups`, 'POST', { name: 'Groupe 101' }).then(r => r.json());
  const students = [];
  for (const name of ['Ana', 'Pedro']) students.push((await admin(`/collections/${collection.slug}/students`, 'POST', { name, groupId: group.id }).then(r => r.json())).student);
  const files = new Map();
  f.env.BUCKET = {
    put: async (key, stream, options) => files.set(key, { bytes: await new Response(stream).arrayBuffer(), type: options.httpMetadata.contentType }),
    get: async key => { const file = files.get(key); return file ? { body: file.bytes, httpEtag: 'local-test', writeHttpMetadata(h) { h.set('content-type', file.type); } } : null; },
    delete: async keys => (Array.isArray(keys) ? keys : [keys]).forEach(key => files.delete(key)),
  };
  const upload = async (studentId, filename = 'portrait.jpg', target = collection.slug) => {
    const body = new FormData(); body.append('web', new File(['web'], 'web.jpg', { type: 'image/jpeg' })); body.append('original', new File(['original'], filename, { type: 'image/jpeg' })); body.append('filename', filename); if (studentId) body.append('studentId', studentId);
    return admin(`/collections/${target}/photos`, 'POST', body);
  };
  return { ...f, admin, collection, group, students, upload, token: login.token };
}

test('groups and students persist within their school; foreign groups and uploads are refused', async t => {
  const f = await school(t);
  const { collection: other } = await f.admin('/collections', 'POST', { client: 'Autre école', collectionType: 'school' }).then(r => r.json());
  assert.equal((await f.admin(`/collections/${other.slug}/students`, 'POST', { name: 'Wrong', groupId: f.group.id })).status, 404);
  assert.equal((await f.upload(f.students[0].id, 'wrong.jpg', other.slug)).status, 400);
  assert.equal((await f.upload(null)).status, 400);
  assert.equal((await f.admin('/collections/metal-7/groups', 'POST', { name: 'Wrong' })).status, 400);
  assert.equal((await f.admin(`/collections/${f.collection.slug}/groups`, 'POST', { name: ' ' })).status, 400);
  assert.equal((await f.admin(`/collections/${f.collection.slug}`, 'PATCH', { collectionType: 'standard' })).status, 409);
  const data = await f.admin(`/collections/${f.collection.slug}`).then(r => r.json());
  assert.deepEqual(data.groups, [{ id: f.group.id, name: 'Groupe 101' }]); assert.equal(data.students.length, 2); assert.ok(data.students.every(s => /^eleve-[a-f0-9]{32}$/.test(s.slug)));
  assert.equal((await f.request(`/admin/collections/${f.collection.slug}/groups`, { method: 'POST', body: '{}' })).status, 401);
});

test('student links isolate photos, selections and direct photo URLs; parent gallery is inaccessible', async t => {
  const f = await school(t); const [ana, pedro] = f.students;
  const photoA = (await (await f.upload(ana.id, 'Ana.jpg')).json()).photo;
  const photoB = (await (await f.upload(pedro.id, 'Pedro.jpg')).json()).photo;
  assert.equal((await f.request(`/galerie/${ana.slug}`)).status, 404, 'draft link is closed');
  await f.admin(`/collections/${f.collection.slug}`, 'PATCH', { status: 'publié' });
  const galleryA = await f.request(`/galerie/${ana.slug}`).then(r => r.json());
  assert.equal(galleryA.client, 'Ana'); assert.deepEqual(galleryA.photos.map(p => p.id), [photoA.id]);
  assert.equal((await f.request(`/galerie/${f.collection.slug}`)).status, 403);
  assert.equal((await f.request(`/photo/${photoA.id}`)).status, 403);
  assert.equal((await f.request(`/photo/${photoA.id}?eleve=${ana.slug}`)).status, 200);
  assert.equal((await f.request(`/photo/${photoB.id}?eleve=${ana.slug}`)).status, 403);
  const submit = (slug, ids) => f.request(`/galerie/${slug}/selection`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ photoIds: ids }) });
  assert.equal((await submit(ana.slug, [photoA.id, photoB.id])).status, 400);
  assert.equal((await submit(ana.slug, [photoA.id])).status, 200);
  const a = await f.request(`/galerie/${ana.slug}`).then(r => r.json());
  const b = await f.request(`/galerie/${pedro.slug}`).then(r => r.json());
  assert.deepEqual(a.submitted.ids, [photoA.id]); assert.equal(b.submitted, null);
  const saved = f.sqlite.prepare('SELECT student_id FROM selections WHERE collection_id = ?').get(f.collection.id); assert.equal(saved.student_id, ana.id);
});

test('school download links deliver only the chosen student and follow parent mode and publication', async t => {
  const f = await school(t, 'download'); const [ana, pedro] = f.students;
  const a = (await (await f.upload(ana.id)).json()).photo;
  const b = (await (await f.upload(pedro.id)).json()).photo;
  await f.admin(`/collections/${f.collection.slug}`, 'PATCH', { status: 'publié' });
  const own = await f.request(`/photo/${a.id}/download?eleve=${ana.slug}`); assert.equal(own.status, 200); assert.equal(await own.text(), 'original');
  assert.equal((await f.request(`/photo/${b.id}/download?eleve=${ana.slug}`)).status, 403);
  const data = await f.request(`/galerie/${ana.slug}`).then(r => r.json()); assert.equal(data.downloadsEnabled, true); assert.equal(data.photos.length, 1);
  await f.admin(`/collections/${f.collection.slug}`, 'PATCH', { mode: 'selection' }); assert.equal((await f.request(`/photo/${a.id}/download?eleve=${ana.slug}`)).status, 403);
  await f.admin(`/collections/${f.collection.slug}`, 'PATCH', { status: 'brouillon' }); assert.equal((await f.request(`/photo/${a.id}?eleve=${ana.slug}`)).status, 403);
});

test('password sessions and cookies are scoped to a single student', async t => {
  const f = await school(t); const [ana, pedro] = f.students;
  const a = (await (await f.upload(ana.id)).json()).photo;
  const b = (await (await f.upload(pedro.id)).json()).photo;
  await f.admin(`/collections/${f.collection.slug}`, 'PATCH', { status: 'publié', password: 'local-school-password' });
  const login = await f.request(`/galerie/${ana.slug}/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'local-school-password' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0]; const { token } = await login.json();
  assert.equal((await f.request(`/photo/${a.id}?eleve=${ana.slug}&t=${encodeURIComponent(token)}`)).status, 200);
  assert.equal((await f.request(`/photo/${b.id}?eleve=${pedro.slug}&t=${encodeURIComponent(token)}`)).status, 403);
  const own = await f.request(`/galerie/${ana.slug}`, { headers: { cookie } }).then(r => r.json()); assert.equal(own.locked, false);
  const other = await f.request(`/galerie/${pedro.slug}`, { headers: { cookie } }).then(r => r.json()); assert.equal(other.locked, true);
});

test('school migration preserves legacy collections, photos and selections', () => {
  const db = new DatabaseSync(':memory:');
  try {
    let schema = readFileSync(new URL('../galeries/schema.sql', import.meta.url), 'utf8');
    schema = schema.replace(/CREATE TABLE IF NOT EXISTS school_groups[\s\S]*?CREATE TABLE IF NOT EXISTS photos/, 'CREATE TABLE IF NOT EXISTS photos').replace(/  student_id TEXT REFERENCES school_students\(id\),\n/g, '').replace(/CREATE INDEX IF NOT EXISTS (school_groups_collection|school_students_group|photos_student)[^;]+;/g, '');
    db.exec(schema); db.exec("INSERT INTO collections(id,slug,client) VALUES('old','old','Existing'); INSERT INTO photos(id,collection_id,r2_key) VALUES('p','old','key'); INSERT INTO selections(collection_id,photo_ids) VALUES('old','[\"p\"]');");
    const before = ['collections','photos','selections'].map(table => db.prepare(`SELECT * FROM ${table}`).all());
    db.exec(readFileSync(new URL('../galeries/migrations/0004_school_groups_students.sql', import.meta.url), 'utf8'));
    for (const [index, table] of ['collections','photos','selections'].entries()) {
      const after = db.prepare(`SELECT * FROM ${table}`).all().map(({ student_id, ...row }) => row);
      assert.deepEqual(after, before[index].map(row => ({ ...row })));
    }
  } finally { db.close(); }
});
