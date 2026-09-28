import assert from 'node:assert/strict';
import test from 'node:test';
import { createGalleryFixture } from './helpers/galerie-fixture.mjs';

for (const concurrent of [false, true]) {
  test(`${concurrent ? 'concurrent' : 'sequential'} employee submissions and revision preserve all legacy rows`, async (t) => {
    const fixture = createGalleryFixture();
    t.after(fixture.close);
    const network = t.mock.method(globalThis, 'fetch', () => { throw new Error('Tests must not contact production or email services'); });
    const before = JSON.stringify(fixture.rows());
    const submissions = [
      { photoIds: ['photo-1'], note: 'Nom et prénom : Marie Tremblay' },
      { photoIds: ['photo-2'], note: 'Nom et prénom : Jean Gagnon' },
      { photoIds: ['photo-3'], note: 'Nom et prénom : Marie Tremblay\nSélection modifiée.' },
    ];
    const responses = concurrent
      ? await Promise.all(submissions.map((body) => fixture.submit(body)))
      : [await fixture.submit(submissions[0]), await fixture.submit(submissions[1]), await fixture.submit(submissions[2])];
    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true, count: 1 });
    }
    const after = fixture.rows();
    assert.equal(JSON.stringify(after.slice(0, 11)), before, '10 existing employee rows and the unrelated gallery must remain byte-for-byte equal');
    assert.equal(after.length, 14);
    for (const submitted of submissions) {
      const matching = after.slice(11).filter((row) => row.note === submitted.note);
      assert.equal(matching.length, 1);
      assert.equal(matching[0].collection_id, 'metal7');
      assert.equal(matching[0].photo_ids, JSON.stringify(submitted.photoIds));
      assert.equal(matching[0].email_status, 'non configure : le secret RESEND_API_KEY manque au Worker');
    }
    assert.equal(network.mock.callCount(), 0);
  });
}

test('existing unnamed submissions still append through the unchanged API', async (t) => {
  const fixture = createGalleryFixture();
  t.after(fixture.close);
  const before = JSON.stringify(fixture.rows());
  assert.equal((await fixture.submit({ photoIds: ['photo-2'] })).status, 200);
  assert.equal(JSON.stringify(fixture.rows().slice(0, 11)), before);
  assert.equal(fixture.rows().at(-1).note, null);
  assert.equal(fixture.rows().at(-1).photo_ids, '["photo-2"]');
});

test('unauthorized, empty and foreign-photo requests cannot write selections', async (t) => {
  const fixture = createGalleryFixture();
  t.after(fixture.close);
  const before = JSON.stringify(fixture.rows());
  assert.equal((await fixture.submit({ photoIds: ['locked-photo'], note: 'Intrus' }, 'galerie-verrouillee')).status, 403);
  for (const photoIds of [[], ['missing'], ['other-photo']]) {
    assert.equal((await fixture.submit({ photoIds, note: 'Nom et prénom : Marie Tremblay' })).status, 400);
  }
  assert.equal(JSON.stringify(fixture.rows()), before);
});
