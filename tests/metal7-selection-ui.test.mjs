import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

// Execute the actual component and its handlers with isolated hooks, storage and
// API responses. No browser, production requests, or additional dependencies.
const compiled = transformSync(readFileSync(new URL('../src/GaleriePage.jsx', import.meta.url), 'utf8'), {
  loader: 'jsx', jsx: 'automatic', format: 'cjs',
}).code;
const employeeKey = 'bjp-employee-selection-v1-metal-7';
const legacyKey = 'bjp-picks-metal-7';
const gallery = {
  client: 'Métal 7', photos: [{ id: 'photo-1' }, { id: 'photo-2' }],
  submitted: { ids: ['photo-2'] },
};

function createPage({ slug = 'metal-7', storage = new Map(), data = gallery, post = async () => ({ ok: true }) } = {}) {
  const slots = [];
  const requests = [];
  let cursor = 0, dirty = true, tree, effects = [];
  const changed = (before, after) => !before || !after || before.length !== after.length || after.some((value, index) => !Object.is(value, before[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => {
        const value = typeof next === 'function' ? next(slots[index]) : next;
        if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ||= { current: initial };
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) {
        const previous = slots[index];
        slots[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback(); });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const context = vm.createContext({
    module, exports: module.exports,
    window: { location: { pathname: `/galerie/${slug}` }, localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    } },
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => key });
      if (name === './brand.js') return { BRAND: {} };
      if (name === './galerie-cinema.css') return {};
      if (name === './api.js') return {
        useSession() {}, saveSession() {}, photoUrl: (id) => `/test-photo/${id}`,
        api: async (url, options) => {
          if (!options) return data;
          requests.push({ url, method: options.method, body: JSON.parse(options.body) });
          return post(requests.at(-1));
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  new vm.Script(compiled).runInContext(context);
  function render() {
    dirty = false; cursor = 0;
    tree = module.exports.GaleriePage();
    const pending = effects; effects = [];
    pending.forEach((effect) => effect());
  }
  async function flush() {
    for (let attempts = 0; attempts < 20; attempts += 1) {
      if (dirty) render();
      await new Promise((resolve) => setImmediate(resolve));
      if (!dirty) return;
    }
    throw new Error('Component did not settle');
  }
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [];
    return [value, ...nodes(value.props?.children)];
  }
  const find = (predicate) => nodes(tree).find(predicate);
  const byClass = (name) => find((node) => node.props?.className?.split(' ').includes(name));
  const nameInput = () => find((node) => node.props?.name === 'employeeName');
  const thanks = () => find((node) => node.props?.id === 'cinema-merci-title');
  function text(value) {
    if (Array.isArray(value)) return value.map(text).join('');
    if (value && typeof value === 'object') return text(value.props?.children);
    return value == null || typeof value === 'boolean' ? '' : String(value);
  }
  return {
    flush, requests, storage, nameInput, thanks, text,
    send: () => byClass('cinema-send'), pick: () => byClass('cinema-pick'),
    saved: () => byClass('cinema-selection__saved'), error: () => byClass('cinema-error'),
    async name(value) { nameInput().props.onChange({ target: { value } }); await flush(); },
    async choose() { byClass('cinema-pick').props.onClick(); await flush(); },
    async submit() { await byClass('cinema-send').props.onClick(); await flush(); },
  };
}

test('a new Metal 7 visitor ignores the shared submission and leaves legacy storage unchanged', async () => {
  const storage = new Map([[legacyKey, '["photo-2"]']]);
  const page = createPage({ storage });
  await page.flush();
  assert.equal(page.nameInput().props.value, '');
  assert.equal(page.pick().props['aria-pressed'], false);
  assert.equal(page.pick().props.disabled, true);
  assert.equal(page.send().props.disabled, true);
  assert.equal(page.text(page.send()), 'Confirmer ma sélection ');
  assert.equal(page.saved(), undefined);
  assert.equal(storage.get(legacyKey), '["photo-2"]');
  assert.deepEqual(JSON.parse(storage.get(employeeKey)), { name: '', ids: [], submitted: false });
});

test('empty and whitespace names cannot select or submit photos', async () => {
  const page = createPage();
  await page.flush();
  for (const name of ['', ' \n\t ']) {
    await page.name(name);
    assert.equal(page.nameInput().props.required, true);
    assert.equal(page.pick().props.disabled, true);
    await page.choose(); // Check the handler guard as well as disabled controls.
    await page.submit();
    assert.equal(page.pick().props['aria-pressed'], false);
    assert.equal(page.send().props.disabled, true);
    assert.equal(page.requests.length, 0);
  }
});

test('submission carries the normalized name and waits for the API before confirming success', async () => {
  let complete;
  const pending = new Promise((resolve) => { complete = resolve; });
  const page = createPage({ post: () => pending });
  await page.flush();
  await page.name('  Marie   Tremblay  ');
  await page.choose();
  const sending = page.send().props.onClick();
  await page.flush();
  assert.deepEqual(page.requests, [{ url: '/galerie/metal-7/selection', method: 'POST', body: {
    photoIds: ['photo-1'], note: 'Nom et prénom : Marie Tremblay',
  } }]);
  assert.equal(page.thanks(), undefined);
  assert.equal(page.send().props.disabled, true);
  assert.equal(page.nameInput().props.disabled, true);
  assert.equal(JSON.parse(page.storage.get(employeeKey)).submitted, false);
  complete({ ok: true });
  await sending; await page.flush();
  assert.equal(page.text(page.thanks()), 'Merci, Marie Tremblay!');
  assert.equal(page.text(page.send()), 'Envoyer ma sélection modifiée ');
  assert.deepEqual(JSON.parse(page.storage.get(employeeKey)), { name: 'Marie Tremblay', ids: ['photo-1'], submitted: true });
});

test('failed submission retains the employee draft and never displays success', async () => {
  const page = createPage({ post: async () => { throw new Error('Connexion interrompue'); } });
  await page.flush(); await page.name('Jean Gagnon'); await page.choose(); await page.submit();
  assert.equal(page.text(page.error()), 'Connexion interrompue');
  assert.equal(page.thanks(), undefined);
  assert.equal(page.send().props.disabled, false);
  assert.deepEqual(JSON.parse(page.storage.get(employeeKey)), { name: 'Jean Gagnon', ids: ['photo-1'], submitted: false });
});

test('reload restores only the local employee and a revision appends a clearly named submission', async () => {
  const storage = new Map([[employeeKey, JSON.stringify({ name: 'Marie Tremblay', ids: ['photo-1', 'removed-photo'], submitted: true })]]);
  const page = createPage({ storage });
  await page.flush();
  assert.equal(page.nameInput().props.value, 'Marie Tremblay');
  assert.equal(page.pick().props['aria-pressed'], true);
  assert.equal(page.text(page.send()), 'Envoyer ma sélection modifiée ');
  assert.equal(page.thanks(), undefined);
  await page.submit();
  assert.deepEqual(page.requests[0].body, {
    photoIds: ['photo-1'], note: 'Nom et prénom : Marie Tremblay\nNouvel envoi de ma sélection modifiée.',
  });
  assert.equal(page.requests[0].method, 'POST');
});

test('changing the employee name resets the displayed picks and sent state', async () => {
  const storage = new Map([[employeeKey, JSON.stringify({ name: 'Marie Tremblay', ids: ['photo-1'], submitted: true })]]);
  const page = createPage({ storage });
  await page.flush(); await page.name('Jean Gagnon');
  assert.equal(page.pick().props['aria-pressed'], false);
  assert.equal(page.send().props.disabled, true);
  assert.equal(page.text(page.send()), 'Confirmer ma sélection ');
  assert.equal(page.saved(), undefined);
  await page.choose(); await page.submit();
  assert.equal(page.requests[0].body.note, 'Nom et prénom : Jean Gagnon');
});

test('an unrelated gallery keeps its server selection, wording and original submission shape', async () => {
  const storage = new Map([['bjp-picks-other-gallery', '["photo-1"]']]);
  const page = createPage({ slug: 'other-gallery', storage });
  await page.flush();
  assert.equal(page.nameInput(), undefined);
  assert.equal(page.text(page.send()), 'Renvoyer ma sélection ');
  assert.equal(storage.get('bjp-picks-other-gallery'), '["photo-2"]');
  await page.submit();
  assert.deepEqual(page.requests[0], { url: '/galerie/other-gallery/selection', method: 'POST', body: { photoIds: ['photo-2'] } });
  assert.equal(page.text(page.thanks()), 'Merci! C’est noté.');
  assert.equal(storage.has(employeeKey), false);
});
