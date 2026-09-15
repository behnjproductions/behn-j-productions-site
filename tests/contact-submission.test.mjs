import assert from 'node:assert/strict';
import test from 'node:test';
import { submitContact } from '../src/contactSubmission.js';

function validForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    name: 'Camille Test',
    email: 'camille@example.test',
    phone: '',
    date: '',
    type: 'Événement',
    message: 'Bonjour, voici mon projet.',
    'privacy-consent': 'accepted',
    'bot-field': '',
  })) form.set(key, value);
  return form;
}

test('sends trimmed Unicode fields, preserves line breaks and honeypot, and fixes the form name', async () => {
  const form = validForm();
  form.set('name', '  Élodie & Cie  ');
  form.set('email', '  elodie+projet@example.test  ');
  form.set('phone', '  +1 514 000-0000  ');
  form.set('type', '  Événement  ');
  form.set('message', '  Bonjour !\nUn événement à Sept-Îles & une vidéo.\nMerci.  ');
  form.set('bot-field', '  garder ce contenu  ');
  form.set('form-name', 'wrong-form');
  const controller = new AbortController();
  let calls = 0;

  const result = await submitContact(form, {
    signal: controller.signal,
    fetcher: async (url, options) => {
      calls += 1;
      assert.equal(url, '/');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
      assert.equal(options.signal, controller.signal);
      const payload = new URLSearchParams(options.body);
      assert.equal(payload.get('form-name'), 'project-contact');
      assert.equal(payload.get('name'), 'Élodie & Cie');
      assert.equal(payload.get('email'), 'elodie+projet@example.test');
      assert.equal(payload.get('phone'), '+1 514 000-0000');
      assert.equal(payload.get('type'), 'Événement');
      assert.equal(payload.get('message'), 'Bonjour !\nUn événement à Sept-Îles & une vidéo.\nMerci.');
      assert.equal(payload.get('privacy-consent'), 'accepted');
      assert.equal(payload.get('bot-field'), '  garder ce contenu  ');
      return new Response('<h1>Thank you!</h1>', { status: 200 });
    },
  });

  assert.equal(result, undefined);
  assert.equal(calls, 1);
  assert.equal(form.get('name'), '  Élodie & Cie  ');
  assert.equal(form.get('form-name'), 'wrong-form');
});

test('rejects every missing or whitespace-only required field before sending', async () => {
  for (const field of ['name', 'email', 'type', 'message']) {
    for (const value of [null, ' \n\t ']) {
      const form = validForm();
      if (value === null) form.delete(field);
      else form.set(field, value);
      let calls = 0;
      await assert.rejects(submitContact(form, {
        fetcher: async () => { calls += 1; return new Response(''); },
      }), /Indiquez votre nom/);
      assert.equal(calls, 0);
    }
  }
});

test('requires the explicit accepted privacy value before sending', async () => {
  for (const value of [null, '', 'on', 'declined']) {
    const form = validForm();
    if (value === null) form.delete('privacy-consent');
    else form.set('privacy-consent', value);
    let calls = 0;
    await assert.rejects(submitContact(form, {
      fetcher: async () => { calls += 1; return new Response(''); },
    }), /accepter la politique de confidentialité/);
    assert.equal(calls, 0);
  }
});

test('accepts the Netlify thanks HTML and empty successful responses', async () => {
  for (const [body, status] of [
    ['<!doctype html><html><h1>Thank you!</h1><p>Your form submission has been received.</p></html>', 200],
    ['', 200],
    [null, 204],
  ]) {
    await submitContact(validForm(), { fetcher: async () => new Response(body, { status }) });
  }
});

test('rejects an HTTP 200 containing the production or development app shell', async () => {
  for (const html of [
    '<div id="root"></div><script type="module" crossorigin src="/assets/index-abc123.js"></script>',
    "<script src='/assets/main-abc123.js' type='module'></script><div class='app' id='root'></div>",
    '<div id=root></div><script type="module" src="/src/main.jsx"></script>',
    '<script type="module" src="/@vite/client"></script><div id="root"></div>',
  ]) {
    await assert.rejects(submitContact(validForm(), {
      fetcher: async () => new Response(html, { status: 200 }),
    }), /Impossible de confirmer l’envoi/);
  }
});

test('does not mistake unrelated HTML for our app shell', async () => {
  for (const html of [
    '<div id="root"><h1>Thank you!</h1></div>',
    '<script type="module" src="/assets/thanks.js"></script><h1>Thank you!</h1>',
    '<div data-id="root"></div><script type="module" src="/assets/thanks.js"></script>',
    '<div id="root"></div><script src="/assets/thanks.js"></script>',
  ]) {
    await submitContact(validForm(), { fetcher: async () => new Response(html, { status: 200 }) });
  }
});

test('rejects unsuccessful HTTP responses with a French error', async () => {
  for (const status of [400, 404, 500]) {
    await assert.rejects(submitContact(validForm(), {
      fetcher: async () => new Response('Upstream error', { status }),
    }), /Impossible de confirmer l’envoi/);
  }
});

test('converts network and response-reading failures to a French error', async () => {
  for (const fetcher of [
    async () => { throw new TypeError('Network unavailable'); },
    async () => ({ ok: true, text: async () => { throw new TypeError('Connection lost'); } }),
  ]) {
    await assert.rejects(submitContact(validForm(), { fetcher }), /Impossible de confirmer l’envoi/);
  }
});

test('does not send when already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(submitContact(validForm(), {
    signal: controller.signal,
    fetcher: async () => { calls += 1; return new Response(''); },
  }), { name: 'AbortError', message: /L’envoi a été interrompu/ });
  assert.equal(calls, 0);
});

test('reports an in-flight abort in French and preserves AbortError for the UI', async () => {
  await assert.rejects(submitContact(validForm(), {
    fetcher: async () => { throw new DOMException('This operation was aborted', 'AbortError'); },
  }), { name: 'AbortError', message: /L’envoi a été interrompu/ });
});

test('cannot confirm success if the signal is aborted while reading the response', async () => {
  const controller = new AbortController();
  await assert.rejects(submitContact(validForm(), {
    signal: controller.signal,
    fetcher: async () => ({
      ok: true,
      text: async () => { controller.abort(); return '<h1>Thank you!</h1>'; },
    }),
  }), { name: 'AbortError', message: /L’envoi a été interrompu/ });
});
