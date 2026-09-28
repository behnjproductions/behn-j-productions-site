import assert from 'node:assert/strict';
import { createHmac, pbkdf2Sync } from 'node:crypto';
import test from 'node:test';
import { createGalleryFixture } from './helpers/galerie-fixture.mjs';

const password = 'local-gallery-password';
const salt = Buffer.from('local-test-salt-only');
const passwordHash = `pbkdf2$4000$${salt.toString('base64url')}$${pbkdf2Sync(password, salt, 4000, 32, 'sha256').toString('base64url')}`;

function signedToken(secret, scope) {
  const body = `${scope}.${Date.now() + 60_000}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

function protectedFixture(t) {
  const fixture = createGalleryFixture();
  t.after(fixture.close);
  fixture.sqlite.prepare('UPDATE collections SET password_hash = ? WHERE id IN (?, ?)').run(passwordHash, 'metal7', 'other');
  let photoReads = 0;
  fixture.env.BUCKET = { get: async () => {
    photoReads += 1;
    return { body: 'test-photo', httpEtag: 'test-etag', writeHttpMetadata(headers) { headers.set('content-type', 'image/jpeg'); } };
  } };
  const before = JSON.stringify(fixture.rows());
  const originalCount = fixture.rows().length;
  return {
    ...fixture,
    photoReads: () => photoReads,
    unchanged: () => assert.equal(JSON.stringify(fixture.rows()), before, 'all existing selections remain byte-for-byte unchanged'),
    originalsUnchanged: () => assert.equal(JSON.stringify(fixture.rows().slice(0, originalCount)), before),
    login: (body, slug = 'metal-7') => fixture.request(`/galerie/${slug}/session`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }),
  };
}

for (const transport of ['cookie', 'header', 'query']) {
  test(`old Metal 7 ${transport} token cannot read the gallery, fetch a photo or submit a selection`, async (t) => {
    const fixture = protectedFixture(t);
    const token = signedToken(fixture.env.SESSION_SECRET, 'g:metal7');
    const headers = transport === 'cookie' ? { cookie: `bjp_g_metal7=${encodeURIComponent(token)}` }
      : transport === 'header' ? { 'x-bjp-token': token } : {};
    const path = (value) => transport === 'query' ? `${value}?t=${encodeURIComponent(token)}` : value;
    const gallery = await fixture.request(path('/galerie/metal-7'), { headers });
    assert.equal(gallery.status, 200);
    const data = await gallery.json();
    assert.equal(data.locked, true);
    assert.equal(data.photos, undefined);
    assert.equal(data.submitted, undefined);
    assert.equal((await fixture.request(path('/photo/photo-1'), { headers })).status, 403);
    assert.equal(fixture.photoReads(), 0, 'revoked tokens must be rejected before accessing image storage');
    assert.equal((await fixture.request(path('/galerie/metal-7/selection'), {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ photoIds: ['photo-1'], note: 'Nom et prénom : Ancienne session' }),
    })).status, 403);
    fixture.unchanged();
  });
}

test('named Metal 7 login issues a valid versioned token and permits a new append-only submission', async (t) => {
  const fixture = protectedFixture(t);
  const response = await fixture.login({ password, employeeName: '  Marie   Tremblay  ' });
  assert.equal(response.status, 200);
  const { token } = await response.json();
  const [scope, expires, signature] = token.split('.');
  assert.equal(scope, 'g:metal7:named-v1');
  assert.ok(Number(expires) > Date.now());
  assert.equal(signature, createHmac('sha256', fixture.env.SESSION_SECRET).update(`${scope}.${expires}`).digest('base64url'));
  assert.ok(response.headers.get('set-cookie').startsWith(`bjp_g_metal7=${encodeURIComponent(token)};`), 'successful login replaces the existing gallery cookie');
  const headers = { 'x-bjp-token': token };
  const gallery = await fixture.request('/galerie/metal-7', { headers });
  assert.equal((await gallery.json()).locked, false);
  assert.equal((await fixture.request(`/photo/photo-1?t=${encodeURIComponent(token)}`)).status, 200);
  fixture.unchanged();
  const submitted = await fixture.request('/galerie/metal-7/selection', {
    method: 'POST', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ photoIds: ['photo-1'], note: 'Nom et prénom : Marie Tremblay' }),
  });
  assert.equal(submitted.status, 200);
  fixture.originalsUnchanged();
  assert.equal(fixture.rows().length, 12);
  assert.equal(fixture.rows().at(-1).note, 'Nom et prénom : Marie Tremblay');
});

test('Metal 7 login rejects missing, blank or invalid names without issuing a session or changing selections', async (t) => {
  const fixture = protectedFixture(t);
  for (const employeeName of [undefined, '', ' \n\t ', 42, {}, 'x'.repeat(121)]) {
    const response = await fixture.login({ password, employeeName });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).token, undefined);
    assert.equal(response.headers.get('set-cookie'), null);
    fixture.unchanged();
  }
  assert.equal(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM login_attempts').get().n, 0);
});

test('a name does not bypass the existing Metal 7 password check', async (t) => {
  const fixture = protectedFixture(t);
  const response = await fixture.login({ password: 'incorrect', employeeName: 'Marie Tremblay' });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, 'Mot de passe incorrect.');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM login_attempts').get().n, 1);
  fixture.unchanged();
  const retry = await fixture.login({ password, employeeName: 'Marie Tremblay' });
  assert.equal(retry.status, 200);
  fixture.unchanged();
});

test('Metal 7 scope rotation preserves the existing password-attempt limit', async (t) => {
  const fixture = protectedFixture(t);
  const failed = fixture.sqlite.prepare('INSERT INTO login_attempts (scope, ip, at) VALUES (?, ?, ?)');
  for (let index = 0; index < 10; index += 1) failed.run('g:metal7', 'inconnu', Date.now());
  const response = await fixture.login({ password, employeeName: 'Marie Tremblay' });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('set-cookie'), null);
  fixture.unchanged();
});

test('other galleries keep existing tokens and password-only login', async (t) => {
  const fixture = protectedFixture(t);
  const token = signedToken(fixture.env.SESSION_SECRET, 'g:other');
  const headers = { cookie: `bjp_g_other=${encodeURIComponent(token)}` };
  const gallery = await fixture.request('/galerie/galerie-regression', { headers });
  assert.equal((await gallery.json()).locked, false);
  assert.equal((await fixture.request('/photo/other-photo', { headers })).status, 200);
  const login = await fixture.login({ password }, 'galerie-regression');
  assert.equal(login.status, 200);
  assert.equal((await login.json()).token.split('.')[0], 'g:other');
  assert.equal((await fixture.request('/galerie/metal-7', { headers: { 'x-bjp-token': token } }).then((response) => response.json())).locked, true);
  fixture.unchanged();
});

test('existing admin sessions retain Metal 7 preview and administration access', async (t) => {
  const fixture = protectedFixture(t);
  const token = signedToken(fixture.env.SESSION_SECRET, 'admin');
  const oldGalleryToken = signedToken(fixture.env.SESSION_SECRET, 'g:metal7');
  const headers = { cookie: `bjp_admin=${encodeURIComponent(token)}; bjp_g_metal7=${encodeURIComponent(oldGalleryToken)}` };
  assert.equal((await fixture.request('/admin/session', { headers }).then((response) => response.json())).ok, true);
  assert.equal((await fixture.request('/admin/collections', { headers })).status, 200);
  assert.equal((await fixture.request('/galerie/metal-7', { headers }).then((response) => response.json())).locked, false);
  assert.equal((await fixture.request('/photo/photo-1', { headers })).status, 200);
  fixture.unchanged();
});
