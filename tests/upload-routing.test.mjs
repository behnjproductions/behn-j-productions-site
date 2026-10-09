import test from 'node:test';
import assert from 'node:assert/strict';
import { api, saveSession } from '../src/api.js';

test('large originals go directly to the Worker with admin authentication', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  globalThis.window = { location: { hostname: 'behnjproductions.ca' }, localStorage: { setItem() {} } };
  saveSession('admin', 'test-token');
  const form = new FormData();
  form.append('original', new Blob([new Uint8Array(12 * 1024 * 1024)], { type: 'image/jpeg' }), 'portrait.jpg');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://bjp-galeries.behnjedy.workers.dev/api/admin/collections/test/photos');
    assert.equal(options.headers['x-bjp-token'], 'test-token');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.body.get('original').size, 12 * 1024 * 1024);
    assert.equal(options.headers['content-type'], undefined);
    return Response.json({ photo: { id: 'saved' } }, { status: 201 });
  };
  try { assert.equal((await api('/admin/collections/test/photos', { method: 'POST', body: form })).photo.id, 'saved'); }
  finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test('local uploads and ordinary API requests retain the same-origin route', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  globalThis.window = { location: { hostname: 'localhost' } };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/admin/collections/test/photos');
    assert.equal(options.credentials, 'include');
    return Response.json({});
  };
  try { await api('/admin/collections/test/photos', { method: 'POST', body: new FormData() }); }
  finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test('high-resolution cover bypasses the proxy and retains the supplied JPEG bytes', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  globalThis.window = { location: { hostname: 'behnjproductions.ca' }, localStorage: { setItem() {} } };
  saveSession('admin', 'test-token');
  const form = new FormData();
  form.append('image', new Blob([new Uint8Array(9 * 1024 * 1024)], { type: 'image/jpeg' }), 'cover.jpg');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://bjp-galeries.behnjedy.workers.dev/api/admin/collections/test/cover');
    assert.equal(options.headers['x-bjp-token'], 'test-token');
    assert.equal(options.body.get('image').size, 9 * 1024 * 1024);
    return Response.json({});
  };
  try { await api('/admin/collections/test/cover', { method: 'POST', body: form }); }
  finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});
