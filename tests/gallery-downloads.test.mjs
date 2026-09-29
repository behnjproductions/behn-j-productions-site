import assert from 'node:assert/strict';
import test from 'node:test';
import { BlobReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import { archiveFilename, prepareGalleryDownload, preparePhotoDownload } from '../src/gallery-downloads.js';

const photos = [
  { id: 'one', filename: 'Portrait.jpg', downloadQuality: 'original' },
  { id: 'two', filename: 'Portrait.jpg', downloadQuality: 'original' },
  { id: 'three', filename: '../été.webp', downloadQuality: 'original' },
];
const photoUrl = (id) => `/api/photo/${id}?s=web&t=private-test-token`;
const bytesFor = (id, quality) => new TextEncoder().encode(`${quality} bytes for ${id}`);
function setup(t, implementation) {
  const previous = globalThis.window;
  globalThis.window = { location: { origin: 'https://gallery.example' } };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url: new URL(url), options });
    if (implementation) return implementation(url, options);
    const id = url.pathname.split('/')[3];
    return new Response(bytesFor(id, url.searchParams.get('quality')), { headers: { 'content-type': 'image/jpeg' } });
  });
  return requests;
}

async function inspectArchive(blob) {
  assert.equal(blob.type, 'application/zip');
  const reader = new ZipReader(new BlobReader(blob), { useWebWorkers: false });
  try {
    const entries = await reader.getEntries();
    return await Promise.all(entries.map(async (entry) => ({
      name: entry.filename, bytes: await entry.getData(new Uint8ArrayWriter()),
    })));
  } finally { await reader.close(); }
}

test('single photo quality selects protected original or social bytes and the matching filename', async (t) => {
  const requests = setup(t);
  const photo = { ...photos[0], filename: 'Portrait.PNG', downloadFilename: 'Portrait.PNG' };
  for (const quality of ['original', 'social']) {
    const result = await preparePhotoDownload({ photo, quality, photoUrl });
    assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), bytesFor('one', quality));
    assert.equal(result.filename, quality === 'original' ? 'Portrait.PNG' : 'Portrait.jpg');
    assert.equal(requests.at(-1).url.pathname, '/api/photo/one/download');
    assert.equal(requests.at(-1).url.searchParams.get('quality'), quality);
    assert.equal(requests.at(-1).url.searchParams.get('t'), 'private-test-token');
    assert.equal(requests.at(-1).url.searchParams.has('s'), false);
    assert.equal(requests.at(-1).options.credentials, 'same-origin');
  }
});

test('one ZIP contains every original byte, disambiguates duplicate names and strips paths', async (t) => {
  const requests = setup(t);
  const progress = [];
  const blob = await prepareGalleryDownload({ photos, quality: 'original', photoUrl, onProgress: (p) => progress.push(p) });
  const entries = await inspectArchive(blob);
  assert.deepEqual(entries.map((e) => e.name), ['Portrait.jpg', 'Portrait (2).jpg', 'été.webp']);
  entries.forEach((entry, index) => assert.deepEqual(entry.bytes, bytesFor(photos[index].id, 'original')));
  assert.deepEqual(progress, [0, 1, 2, 3].map((done) => ({ done, total: 3 })));
  assert.equal(requests.length, photos.length);
});

test('social ZIP downloads all web versions and names them as JPEGs', async (t) => {
  const requests = setup(t);
  const blob = await prepareGalleryDownload({ photos, quality: 'social', photoUrl });
  const entries = await inspectArchive(blob);
  assert.deepEqual(entries.map((e) => e.name), ['Portrait.jpg', 'Portrait (2).jpg', 'été.jpg']);
  entries.forEach((entry, index) => assert.deepEqual(entry.bytes, bytesFor(photos[index].id, 'social')));
  assert.ok(requests.every(({ url }) => url.searchParams.get('quality') === 'social'));
});

test('missing originals, empty galleries and invalid quality fail before any network request', async (t) => {
  const requests = setup(t);
  const mixed = [...photos, { id: 'old', downloadQuality: 'web' }];
  await assert.rejects(prepareGalleryDownload({ photos: mixed, quality: 'original', photoUrl }), /originale/);
  await assert.rejects(preparePhotoDownload({ photo: mixed.at(-1), quality: 'original', photoUrl }), /originale/);
  await assert.rejects(prepareGalleryDownload({ photos: [], quality: 'social', photoUrl }), /Aucune photo/);
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'unknown', photoUrl }), /Choisissez/);
  assert.equal(requests.length, 0);
});

test('a refused file rejects the complete ZIP and does not skip ahead or return a partial archive', async (t) => {
  const requests = setup(t, (url) => url.pathname.includes('/two/')
    ? new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 403, headers: { 'content-type': 'application/json' } })
    : new Response('photo bytes', { headers: { 'content-type': 'image/jpeg' } }));
  const progress = [];
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'social', photoUrl, onProgress: (p) => progress.push(p.done) }), /Accès refusé/);
  assert.equal(requests.length, 2);
  assert.deepEqual(progress, [0, 1]);
});

test('cancelling between files stops the archive and remaining requests', async (t) => {
  const requests = setup(t);
  const controller = new AbortController();
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'original', photoUrl, signal: controller.signal,
    onProgress: ({ done }) => { if (done === 1) controller.abort(); },
  }), { name: 'AbortError' });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.signal, controller.signal);
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'social', photoUrl, signal: controller.signal }), { name: 'AbortError' });
  assert.equal(requests.length, 1);
});

test('a broken stream cannot yield a successful ZIP', { timeout: 5000 }, async (t) => {
  setup(t, () => new Response(new ReadableStream({ start(controller) { controller.error(new Error('Connection interrupted')); } }), { headers: { 'content-type': 'image/jpeg' } }));
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'social', photoUrl }), /Connection interrupted/);
});

test('HTML responses and external URLs cannot be saved as photos', async (t) => {
  const requests = setup(t, () => new Response('<html>Sign in</html>', { headers: { 'content-type': 'text/html' } }));
  await assert.rejects(preparePhotoDownload({ photo: photos[0], quality: 'social', photoUrl }), /indisponible/);
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'social', photoUrl: () => 'https://external.example/photo.jpg' }), /invalide/);
  assert.equal(requests.length, 1);
  assert.equal(archiveFilename('../famille', 'original'), 'galerie-famille-originaux.zip');
  assert.equal(archiveFilename('famille', 'social'), 'galerie-famille-reseaux-sociaux.zip');
});

test('a writable destination streams the complete ZIP and commits only after success', async (t) => {
  setup(t);
  const chunks = [];
  let closed = false;
  const writable = new WritableStream({ write(chunk) { chunks.push(chunk); }, close() { closed = true; } });
  const result = await prepareGalleryDownload({ photos, quality: 'original', photoUrl, writable, maxBufferedBytes: 1 });
  assert.equal(result, null);
  assert.equal(closed, true);
  const entries = await inspectArchive(new Blob(chunks, { type: 'application/zip' }));
  assert.equal(entries.length, photos.length);
  entries.forEach((entry, index) => assert.deepEqual(entry.bytes, bytesFor(photos[index].id, 'original')));
});

test('a cancelled writable download aborts the temporary file instead of committing a partial ZIP', async (t) => {
  setup(t);
  let closed = false, aborted = false;
  const controller = new AbortController();
  const writable = new WritableStream({ write() {}, close() { closed = true; }, abort() { aborted = true; } });
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'original', photoUrl, writable, signal: controller.signal,
    onProgress: ({ done }) => { if (done === 1) controller.abort(); },
  }), { name: 'AbortError' });
  assert.equal(aborted, true);
  assert.equal(closed, false);
});

test('the Blob fallback limits measured bytes even without a content-length header', async (t) => {
  setup(t);
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'original', photoUrl, maxBufferedBytes: 25 }), { code: 'ARCHIVE_TOO_LARGE' });
});

test('the Blob fallback rejects a declared oversized file without reading its body', async (t) => {
  let cancelled = false;
  setup(t, () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
    headers: { 'content-type': 'image/jpeg', 'content-length': String(513 * 1024 * 1024) },
  }));
  await assert.rejects(prepareGalleryDownload({ photos, quality: 'original', photoUrl }), { code: 'ARCHIVE_TOO_LARGE' });
  assert.equal(cancelled, true);
});
