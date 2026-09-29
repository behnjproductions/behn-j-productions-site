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
  slug: 'metal-7', client: 'Métal 7', photos: [{ id: 'photo-1' }, { id: 'photo-2' }],
  submitted: { ids: ['photo-2'] },
};

function createPage({ slug = 'metal-7', storage = new Map(), storageUnavailable = false, data = gallery, post = async () => ({ ok: true }) } = {}) {
  const pageSlots = [];
  const sessions = [];
  const requests = [];
  let slots = pageSlots, child, cursor = 0, dirty = true, tree, effects = [];
  const changed = (before, after) => !before || !after || before.length !== after.length || after.some((value, index) => !Object.is(value, before[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      const owner = slots;
      if (!(index in owner)) owner[index] = typeof initial === 'function' ? initial() : initial;
      return [owner[index], (next) => {
        const value = typeof next === 'function' ? next(owner[index]) : next;
        if (!Object.is(value, owner[index])) { owner[index] = value; dirty = true; }
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
      const owner = slots;
      if (changed(owner[index]?.deps, deps)) {
        const previous = owner[index];
        owner[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); owner[index].cleanup = callback(); });
      }
    },
  };
  const jsx = (type, props, key) => ({ type, props, key });
  const module = { exports: {} };
  const context = vm.createContext({
    module, exports: module.exports,
    window: { location: { pathname: `/galerie/${slug}` }, localStorage: {
      getItem: (key) => { if (storageUnavailable) throw new Error('Storage unavailable'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (storageUnavailable) throw new Error('Storage unavailable'); storage.set(key, value); },
    } },
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => key });
      if (name === './brand.js') return { BRAND: {} };
      if (name === './galerie-cinema.css') return {};
      if (name === './LightGallery.jsx') return { LightGallery: () => null };
      if (name === './api.js') return {
        useSession() {}, saveSession: (key, token) => sessions.push({ key, token }), photoUrl: (id) => `/test-photo/${id}`,
        api: async (url, options) => {
          if (!options) return typeof data === 'function' ? data() : data;
          requests.push({ url, method: options.method, body: JSON.parse(options.body) });
          return post(requests.at(-1));
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  new vm.Script(compiled).runInContext(context);
  function render() {
    dirty = false; cursor = 0; slots = pageSlots;
    tree = module.exports.GaleriePage();
    // LockScreen is the only stateful child needed for entry-flow tests. Give
    // it its own hook slots and remount when React would change its key.
    if (tree.type?.name === 'LockScreen') {
      if (!child || child.key !== tree.key) child = { key: tree.key, slots: [] };
      cursor = 0; slots = child.slots;
      tree = tree.type(tree.props);
    } else child = undefined;
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
  const passwordInput = () => find((node) => node.props?.type === 'password');
  const thanks = () => find((node) => node.props?.id === 'cinema-merci-title');
  function text(value) {
    if (Array.isArray(value)) return value.map(text).join('');
    if (value && typeof value === 'object') return text(value.props?.children);
    return value == null || typeof value === 'boolean' ? '' : String(value);
  }
  return {
    flush, requests, sessions, storage, nameInput, passwordInput, thanks, text,
    send: () => byClass('cinema-send'), pick: () => byClass('cinema-pick'),
    saved: () => byClass('cinema-selection__saved'), error: () => byClass('cinema-error'),
    switchEmployee: () => find((node) => node.type === 'button' && text(node) === 'Changer d’employé'),
    async name(value) { nameInput().props.onChange({ target: { value } }); await flush(); },
    async password(value) { passwordInput().props.onChange({ target: { value } }); await flush(); },
    async open() { await byClass('cinema-access').props.onSubmit({ preventDefault() {} }); await flush(); },
    async identify(name) { await this.name(name); await this.open(); },
    async changeEmployee() { this.switchEmployee().props.onClick(); await flush(); },
    async choose() { byClass('cinema-pick').props.onClick(); await flush(); },
    async submit() { await byClass('cinema-send').props.onClick(); await flush(); },
  };
}

test('a new Metal 7 visitor ignores the shared submission and leaves legacy storage unchanged', async () => {
  const storage = new Map([[legacyKey, '["photo-2"]']]);
  const page = createPage({ storage });
  await page.flush();
  assert.equal(page.nameInput().props.value, '');
  assert.equal(page.passwordInput(), undefined);
  assert.equal(page.pick(), undefined);
  assert.equal(page.send().props.disabled, true);
  assert.equal(page.text(page.send()), 'Ouvrir ma galerie ');
  assert.equal(storage.has(employeeKey), false);
  await page.identify('Marie Tremblay');
  assert.equal(page.nameInput(), undefined);
  assert.equal(page.pick().props['aria-pressed'], false);
  assert.equal(page.pick().props.disabled, false);
  assert.equal(page.send().props.disabled, true);
  assert.equal(page.text(page.send()), 'Confirmer ma sélection ');
  assert.equal(page.saved(), undefined);
  assert.equal(storage.get(legacyKey), '["photo-2"]');
  assert.deepEqual(JSON.parse(storage.get(employeeKey)), { name: 'Marie Tremblay', ids: [], submitted: false });
  assert.equal(page.requests.length, 0);
});

test('empty and whitespace names cannot open the gallery or select photos', async () => {
  const page = createPage();
  await page.flush();
  for (const name of ['', ' \n\t ']) {
    await page.name(name);
    assert.equal(page.nameInput().props.required, true);
    await page.open(); // Check the handler guard as well as disabled controls.
    assert.equal(page.pick(), undefined);
    assert.equal(page.send().props.disabled, true);
    assert.equal(page.text(page.error()), 'Veuillez saisir votre prénom et votre nom.');
    assert.equal(page.requests.length, 0);
    assert.equal(page.storage.has(employeeKey), false);
  }
});

test('locked Metal 7 requires both name and password and sends the normalized name on login', async () => {
  let locked = true;
  const page = createPage({
    data: () => locked ? { ...gallery, locked: true, photos: [] } : gallery,
    post: async () => { locked = false; return { token: 'named-session' }; },
  });
  await page.flush();
  assert.equal(page.pick(), undefined);
  await page.password('gallery-password');
  await page.open();
  assert.equal(page.requests.length, 0);
  await page.name('  Marie   Tremblay  ');
  await page.password(''); await page.open();
  assert.equal(page.requests.length, 0);
  assert.equal(page.send().props.disabled, true);
  await page.password('gallery-password'); await page.open();
  assert.deepEqual(page.requests, [{ url: '/galerie/metal-7/session', method: 'POST', body: {
    password: 'gallery-password', employeeName: 'Marie Tremblay',
  } }]);
  assert.deepEqual(page.sessions, [{ key: 'g:metal-7', token: 'named-session' }]);
  assert.equal(page.nameInput(), undefined);
  assert.equal(page.pick().props['aria-pressed'], false);
  assert.deepEqual(JSON.parse(page.storage.get(employeeKey)), { name: 'Marie Tremblay', ids: [], submitted: false });
});

test('wrong password retains the typed name and leaves the saved employee draft intact', async () => {
  const draft = JSON.stringify({ name: 'Marie Tremblay', ids: ['photo-1'], submitted: true });
  const storage = new Map([[employeeKey, draft], [legacyKey, '["photo-2"]']]);
  const page = createPage({ storage, data: { ...gallery, locked: true, photos: [] },
    post: async () => { throw new Error('Mot de passe incorrect.'); },
  });
  await page.flush();
  assert.equal(page.nameInput().props.value, 'Marie Tremblay');
  await page.name('Jean Gagnon'); await page.password('incorrect'); await page.open();
  assert.equal(page.nameInput().props.value, 'Jean Gagnon');
  assert.equal(page.text(page.error()), 'Mot de passe incorrect.');
  assert.equal(page.pick(), undefined);
  assert.equal(storage.get(employeeKey), draft);
  assert.equal(storage.get(legacyKey), '["photo-2"]');
  assert.equal(page.sessions.length, 0);
});

test('login and submission retain the employee name when local storage is unavailable', async () => {
  let locked = true;
  const page = createPage({ storageUnavailable: true,
    data: () => locked ? { ...gallery, locked: true, photos: [] } : gallery,
    post: async () => { locked = false; return { token: 'named-session' }; },
  });
  await page.flush(); await page.name('Jean Gagnon'); await page.password('gallery-password'); await page.open();
  assert.equal(page.pick().props.disabled, false);
  await page.choose(); await page.submit();
  assert.equal(page.requests[1].body.note, 'Nom et prénom : Jean Gagnon');
  assert.equal(page.text(page.thanks()), 'Merci, Jean Gagnon!');
});

test('submission carries the normalized name and waits for the API before confirming success', async () => {
  let complete;
  const pending = new Promise((resolve) => { complete = resolve; });
  const page = createPage({ post: () => pending });
  await page.flush();
  await page.identify('  Marie   Tremblay  ');
  await page.choose();
  const sending = page.send().props.onClick();
  await page.flush();
  assert.deepEqual(page.requests, [{ url: '/galerie/metal-7/selection', method: 'POST', body: {
    photoIds: ['photo-1'], note: 'Nom et prénom : Marie Tremblay',
  } }]);
  assert.equal(page.thanks(), undefined);
  assert.equal(page.send().props.disabled, true);
  assert.equal(page.switchEmployee().props.disabled, true);
  await page.changeEmployee(); // A stale click handler cannot change identity mid-send.
  assert.equal(page.nameInput(), undefined);
  assert.equal(page.pick().props.disabled, true);
  assert.equal(JSON.parse(page.storage.get(employeeKey)).submitted, false);
  complete({ ok: true });
  await sending; await page.flush();
  assert.equal(page.text(page.thanks()), 'Merci, Marie Tremblay!');
  assert.equal(page.text(page.send()), 'Envoyer ma sélection modifiée ');
  assert.deepEqual(JSON.parse(page.storage.get(employeeKey)), { name: 'Marie Tremblay', ids: ['photo-1'], submitted: true });
});

test('failed submission retains the employee draft and never displays success', async () => {
  const page = createPage({ post: async () => { throw new Error('Connexion interrompue'); } });
  await page.flush(); await page.identify('Jean Gagnon'); await page.choose(); await page.submit();
  assert.equal(page.text(page.error()), 'Connexion interrompue');
  assert.equal(page.thanks(), undefined);
  assert.equal(page.send().props.disabled, false);
  assert.deepEqual(JSON.parse(page.storage.get(employeeKey)), { name: 'Jean Gagnon', ids: ['photo-1'], submitted: false });
});

test('reload restores only the local employee and a revision appends a clearly named submission', async () => {
  const storage = new Map([[employeeKey, JSON.stringify({ name: 'Marie Tremblay', ids: ['photo-1', 'removed-photo'], submitted: true })]]);
  const page = createPage({ storage });
  await page.flush();
  assert.equal(page.nameInput(), undefined);
  assert.equal(page.pick().props['aria-pressed'], true);
  assert.equal(page.text(page.send()), 'Envoyer ma sélection modifiée ');
  assert.equal(page.thanks(), undefined);
  await page.submit();
  assert.deepEqual(page.requests[0].body, {
    photoIds: ['photo-1'], note: 'Nom et prénom : Marie Tremblay\nNouvel envoi de ma sélection modifiée.',
  });
  assert.equal(page.requests[0].method, 'POST');
});

test('re-entering the same normalized employee name restores their picks and sent state', async () => {
  const storage = new Map([[employeeKey, JSON.stringify({ name: 'Marie Tremblay', ids: ['photo-1'], submitted: true })]]);
  const page = createPage({ storage });
  await page.flush(); await page.changeEmployee();
  assert.equal(page.nameInput().props.value, '');
  assert.equal(page.pick(), undefined);
  await page.identify('  Marie   Tremblay  ');
  assert.equal(page.pick().props['aria-pressed'], true);
  assert.equal(page.text(page.send()), 'Envoyer ma sélection modifiée ');
  assert.ok(page.saved());
  assert.deepEqual(JSON.parse(storage.get(employeeKey)), { name: 'Marie Tremblay', ids: ['photo-1'], submitted: true });
  assert.equal(page.requests.length, 0);
});

test('changing the employee at entry resets the displayed picks and sent state', async () => {
  const storage = new Map([[employeeKey, JSON.stringify({ name: 'Marie Tremblay', ids: ['photo-1'], submitted: true })]]);
  const page = createPage({ storage });
  await page.flush(); await page.changeEmployee(); await page.identify('Jean Gagnon');
  assert.equal(page.pick().props['aria-pressed'], false);
  assert.equal(page.send().props.disabled, true);
  assert.equal(page.text(page.send()), 'Confirmer ma sélection ');
  assert.equal(page.saved(), undefined);
  await page.choose(); await page.submit();
  assert.equal(page.requests[0].body.note, 'Nom et prénom : Jean Gagnon');
});

test('an expired session returns to name and password entry while preserving the unsent draft', async () => {
  let expired = true;
  const page = createPage({ post: async ({ url }) => {
    if (url.endsWith('/session')) { expired = false; return { token: 'renewed-session' }; }
    if (expired) throw Object.assign(new Error('Accès refusé.'), { status: 403 });
    return { ok: true };
  } });
  await page.flush(); await page.identify('Marie Tremblay'); await page.choose(); await page.submit();
  assert.equal(page.nameInput().props.value, 'Marie Tremblay');
  assert.ok(page.passwordInput());
  assert.equal(page.pick(), undefined);
  assert.equal(page.thanks(), undefined);
  assert.deepEqual(JSON.parse(page.storage.get(employeeKey)), { name: 'Marie Tremblay', ids: ['photo-1'], submitted: false });
  await page.password('gallery-password'); await page.open();
  assert.equal(page.pick().props['aria-pressed'], true);
  assert.equal(page.text(page.send()), 'Confirmer ma sélection ');
  await page.submit();
  assert.equal(page.text(page.thanks()), 'Merci, Marie Tremblay!');
  assert.equal(page.requests.at(-1).body.note, 'Nom et prénom : Marie Tremblay');
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

test('unrelated locked galleries retain password-only login and the existing session payload', async () => {
  let locked = true;
  const data = { ...gallery, slug: 'other-gallery' };
  const page = createPage({ slug: 'other-gallery',
    data: () => locked ? { ...data, locked: true, photos: [] } : data,
    post: async () => { locked = false; return { token: 'original-session' }; },
  });
  await page.flush();
  assert.equal(page.nameInput(), undefined);
  assert.ok(page.passwordInput());
  await page.password('gallery-password'); await page.open();
  assert.deepEqual(page.requests, [{ url: '/galerie/other-gallery/session', method: 'POST', body: { password: 'gallery-password' } }]);
  assert.deepEqual(page.sessions, [{ key: 'g:other-gallery', token: 'original-session' }]);
  assert.equal(page.nameInput(), undefined);
  assert.equal(page.switchEmployee(), undefined);
  assert.equal(page.text(page.send()), 'Renvoyer ma sélection ');
  assert.equal(page.storage.has(employeeKey), false);
});
