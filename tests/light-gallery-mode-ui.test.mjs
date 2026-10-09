import * as categories from '../src/gallery-categories.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { transformSync } from 'esbuild';

// Render the real component and run its public controls against isolated browser
// services. The fixture never contacts production or starts a real download.
const compiled = transformSync(readFileSync(new URL('../src/LightGallery.jsx', import.meta.url), 'utf8'), {
  loader: 'jsx', jsx: 'automatic', format: 'cjs',
}).code;
const photos = [
  { id: 'photo-1', filename: 'portrait-final.JPG', downloadFilename: 'portrait-final-original.JPG', downloadQuality: 'original' },
  { id: 'photo-2', filename: 'famille.jpg', downloadFilename: 'famille-web.jpg', downloadQuality: 'web' },
];

function createGallery({ mode, downloadsEnabled, sent = false, photoList = photos, failDownload = false, prepareGallery, showSaveFilePicker, cover } = {}) {
  const slots = [], requests = [], downloads = [], copied = [], toggled = [];
  let cursor = 0, dirty = true, effects = [], tree, submitted = 0;
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
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useCallback(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) {
        const previous = slots[index]; slots[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback(); });
      }
    },
  };
  const props = {
    category: 'full', onCategory: (category) => { props.category = category; props.photos = categories.categoryPhotos(photoList, category); props.active = 0; dirty = true; },
    gallery: { cover, photos: photoList, slug: 'metal-7', client: 'Métal 7', mode, downloadsEnabled, maxPicks: 1, extraPrice: 25 },
    photos: photoList, picks: new Set(photoList.map((photo) => photo.id)), active: 0,
    onActive: (index) => { props.active = index; dirty = true; },
    onToggle: (id) => toggled.push(id), onSend: () => { submitted += 1; },
    sent, sending: false, employeeGallery: true, employeeName: 'Marie Tremblay',
    onChangeEmployee() {}, onCloseReview() {},
    photoUrl: (id, size = 'thumb') => `/api/photo/${id}?s=${size}&t=private-session`,
    Dialog: 'dialog', contactUrl: '/contact', brand: { email: 'contact@example.test' },
  };
  const module = { exports: {} };
  class BrowserURL extends URL {
    static createObjectURL() { return 'blob:test-download'; }
    static revokeObjectURL() {}
  }
  const jsx = (type, props) => ({ type, props });
  const context = vm.createContext({ module, exports: module.exports, URL: BrowserURL, AbortController,
    window: {
      location: { origin: 'https://behnjproductions.ca', href: 'https://behnjproductions.ca/galerie/metal-7?apercu=clair&t=private-session' },
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      setInterval: () => 1, clearInterval() {}, setTimeout: () => 2, clearTimeout() {},
      ...(showSaveFilePicker ? { showSaveFilePicker } : {}),
    },
    navigator: { clipboard: { writeText: async (value) => copied.push(value) } },
    document: {
      body: { appendChild() {} },
      createElement: () => ({ click() { downloads.push({ href: this.href, filename: this.download }); }, remove() {} }),
    },
    require(name) {
      if (name === './gallery-categories.js') return categories;
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '@phosphor-icons/react') return new Proxy({}, { get: (_, key) => key });
      if (name === './light-gallery.css') return {};
      if (name === './gallery-downloads.js') return {
        archiveFilename: (slug, quality) => `galerie-${slug}-${quality}.zip`,
        preparePhotoDownload: async (options) => {
          requests.push({ kind: 'single', ...options });
          if (failDownload) throw new Error('Download refused');
          return { blob: new Blob(['image-fixture']), filename: options.quality === 'original' ? options.photo.downloadFilename : 'photo-social.jpg' };
        },
        prepareGalleryDownload: async (options) => {
          requests.push({ kind: 'all', ...options });
          if (failDownload) throw new Error('ZIP failed');
          if (prepareGallery) return prepareGallery(options);
          options.onProgress({ done: options.photos.length, total: options.photos.length });
          return options.writable ? null : new Blob(['zip-fixture']);
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  new vm.Script(compiled).runInContext(context);
  async function flush() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (dirty) {
        dirty = false; cursor = 0; tree = module.exports.LightGallery(props);
        const pending = effects; effects = []; pending.forEach((effect) => effect());
      }
      await new Promise((resolve) => setImmediate(resolve));
      if (!dirty) return;
    }
    throw new Error('Component did not settle');
  }
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    return value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : [];
  }
  function text(value) {
    if (Array.isArray(value)) return value.map(text).join('');
    if (value && typeof value === 'object') return text(value.props?.children);
    return value == null || typeof value === 'boolean' ? '' : String(value);
  }
  const find = (predicate) => nodes(tree).find(predicate);
  return {
    flush, text: () => text(tree), requests, downloads, copied, toggled, submitted: () => submitted,
    label: (value) => find((node) => node.props?.['aria-label'] === value),
    button: (value) => find((node) => node.type === 'button' && text(node).trim() === value),
    radio: (name, value) => find((node) => node.type === 'input' && node.props.name === name && node.props.value === value),
    all: (predicate) => nodes(tree).filter(predicate),
    async click(control) { assert.ok(control, 'expected control to be present'); await control.props.onClick(); await flush(); },
    async choose(name, value) { const radio = this.radio(name, value); assert.ok(radio); assert.notEqual(radio.props.disabled, true); radio.props.onChange(); await flush(); },
  };
}

test('selection mode retains hearts, prices and confirmation but exposes no delivery download', async () => {
  const page = createGallery({ mode: 'selection', downloadsEnabled: true });
  await page.flush();
  assert.match(page.text(), /25 \$ CAD par photo supplémentaire/);
  assert.ok(page.button('Confirmer ma sélection'));
  assert.equal(page.label('Télécharger toutes les photos'), undefined);
  await page.click(page.label('Retirer la photo 1 des favoris'));
  await page.click(page.button('Confirmer ma sélection'));
  assert.deepEqual(page.toggled, ['photo-1']);
  assert.equal(page.submitted(), 1);
});

test('delivery hides selection controls and prices despite old selections, including in the viewer', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true, sent: 'déjà' });
  await page.flush();
  assert.doesNotMatch(page.text(), /Confirmer ma sélection|sélection déjà envoyée|supplémentaire|CAD|Changer d’employé/i);
  assert.equal(page.all((node) => node.props?.['aria-pressed'] !== undefined && node.props?.className === 'light-heart').length, 0);
  assert.ok(page.label('Télécharger la photo 1'));
  await page.click(page.label('Agrandir la photo 1'));
  assert.equal(page.label('Retirer cette photo des favoris'), undefined);
  assert.ok(page.label('Télécharger cette photo'));
  assert.equal(page.submitted(), 0);
});

test('individual delivery downloads pass the photo, quality and authenticated URL service to the helper', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true });
  await page.flush(); await page.click(page.label('Télécharger la photo 1'));
  assert.match(page.text(), /portrait-final-original.JPG/);
  assert.equal(page.radio('download-scope', 'single').props.checked, true);
  assert.equal(page.radio('download-quality', 'original').props.checked, true);
  await page.click(page.button('Télécharger cette photo'));
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].kind, 'single');
  assert.equal(page.requests[0].photo.id, 'photo-1');
  assert.equal(page.requests[0].quality, 'original');
  assert.match(page.requests[0].photoUrl('photo-1'), /t=private-session/);
  assert.equal(page.requests[0].signal.aborted, false);
  assert.deepEqual(page.downloads, [{ href: 'blob:test-download', filename: 'portrait-final-original.JPG' }]);
  assert.match(page.text(), /Le téléchargement a été lancé/);
  assert.equal(page.submitted(), 0);
});

test('a refused download displays failure and never starts a browser save', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true, failDownload: true });
  await page.flush(); await page.click(page.label('Télécharger la photo 1'));
  await page.click(page.button('Télécharger cette photo'));
  assert.equal(page.requests.length, 1);
  assert.equal(page.downloads.length, 0);
  assert.match(page.text(), /Le téléchargement a échoué/);
  assert.doesNotMatch(page.text(), /Le téléchargement a été lancé/);
});

test('delivery download controls require an explicit enabled flag', async () => {
  for (const downloadsEnabled of [undefined, false, 'true']) {
    const page = createGallery({ mode: 'download', downloadsEnabled });
    await page.flush();
    assert.equal(page.label('Télécharger toutes les photos'), undefined);
    assert.equal(page.label('Télécharger la photo 1'), undefined);
    assert.equal(page.requests.length, 0);
  }
});

test('sharing a delivery gallery copies only the canonical gallery link', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true });
  await page.flush(); await page.click(page.label('Partager la galerie'));
  await page.click(page.button('Copier le lien'));
  assert.deepEqual(page.copied, ['https://behnjproductions.ca/galerie/metal-7']);
  assert.equal(page.requests.length, 0);
});

test('both all-photo entry points open the whole-gallery ZIP dialog', async () => {
  for (const entryPoint of ['toolbar', 'prominent']) {
    const page = createGallery({ mode: 'download', downloadsEnabled: true });
    await page.flush();
    await page.click(entryPoint === 'toolbar' ? page.label('Télécharger toutes les photos') : page.button('Télécharger toutes les photos'));
    assert.equal(page.radio('download-scope', 'all').props.checked, true);
    assert.match(page.text(), /toutes les photos de la catégorie FULL SIZE — RETOUCHE DE BASE dans un seul fichier ZIP/);
    assert.ok(page.button('Télécharger toutes les photos (.zip)'));
    assert.equal(page.requests.length, 0, 'opening the chooser does not start a transfer');
  }
});

test('a mixed gallery defaults to social quality and explains unavailable originals', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  assert.equal(page.radio('download-quality', 'original').props.disabled, true);
  assert.equal(page.radio('download-quality', 'social').props.checked, true);
  assert.match(page.text(), /taille originale ne sont pas encore disponibles pour toutes les photos/);
  await page.click(page.button('Télécharger toutes les photos (.zip)'));
  assert.equal(page.requests[0].kind, 'all');
  assert.equal(page.requests[0].quality, 'social');
  assert.deepEqual(page.requests[0].photos.map((photo) => photo.id), ['photo-1', 'photo-2']);
  assert.deepEqual(page.downloads, [{ href: 'blob:test-download', filename: 'galerie-metal-7-full-social.zip' }]);
});

test('all-original galleries offer both qualities and pass the chosen quality to the ZIP helper', async () => {
  for (const quality of ['original', 'social']) {
    const page = createGallery({ mode: 'download', downloadsEnabled: true, photoList: photos.map((photo) => ({ ...photo, downloadQuality: 'original' })) });
    await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
    assert.equal(page.radio('download-quality', 'original').props.disabled, false);
    assert.equal(page.radio('download-quality', 'original').props.checked, true);
    await page.choose('download-quality', quality);
    await page.click(page.button('Télécharger toutes les photos (.zip)'));
    assert.equal(page.requests[0].quality, quality);
    assert.equal(page.downloads[0].filename, `galerie-metal-7-full-${quality}.zip`);
  }
});

test('individual quality follows the selected photo and never implies unavailable originals', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true });
  await page.flush(); await page.click(page.label('Télécharger la photo 1'));
  await page.choose('download-quality', 'social');
  await page.click(page.button('Télécharger cette photo'));
  assert.equal(page.requests[0].quality, 'social');
  assert.equal(page.downloads[0].filename, 'photo-social.jpg');
  await page.click(page.button('Suivante'));
  assert.equal(page.radio('download-quality', 'original').props.disabled, true);
  assert.equal(page.radio('download-quality', 'social').props.checked, true);
  assert.match(page.text(), /taille originale n’est pas disponible pour cette photo/);
  await page.click(page.button('Télécharger cette photo'));
  assert.equal(page.requests[1].photo.id, 'photo-2');
  assert.equal(page.requests[1].quality, 'social');
});

test('ZIP progress is visible and cancelling aborts work without saving a partial archive', async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const page = createGallery({ mode: 'download', downloadsEnabled: true, prepareGallery: () => pending });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  const running = page.button('Télécharger toutes les photos (.zip)').props.onClick();
  await page.flush();
  assert.equal(page.button('Préparation…').props.disabled, true);
  const request = page.requests[0];
  request.onProgress({ done: 1, total: 2 }); await page.flush();
  assert.match(page.text(), /1 \/ 2 photos préparées/);
  assert.equal(page.label('Préparation des photos').props.value, 1);
  await page.click(page.button('Annuler'));
  assert.equal(request.signal.aborted, true);
  assert.match(page.text(), /Préparation annulée/);
  resolve(new Blob(['late-result'])); await running; await page.flush();
  assert.equal(page.downloads.length, 0);
  assert.doesNotMatch(page.text(), /Le téléchargement a été lancé/);
});

test('closing the ZIP dialog aborts an in-flight archive and ignores its late completion', async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const page = createGallery({ mode: 'download', downloadsEnabled: true, prepareGallery: () => pending });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  const running = page.button('Télécharger toutes les photos (.zip)').props.onClick(); await page.flush();
  await page.click(page.label('Fermer'));
  assert.equal(page.requests[0].signal.aborted, true);
  resolve(new Blob(['late-result'])); await running; await page.flush();
  assert.equal(page.downloads.length, 0);
  assert.equal(page.radio('download-scope', 'all'), undefined);
});

test('ZIP failure never saves an incomplete file and permits a retry', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true, failDownload: true });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  await page.click(page.button('Télécharger toutes les photos (.zip)'));
  assert.equal(page.requests[0].kind, 'all');
  assert.equal(page.downloads.length, 0);
  assert.match(page.text(), /Aucun fichier n’a été téléchargé/);
  assert.equal(page.button('Télécharger toutes les photos (.zip)').props.disabled, false);
});

test('supported browsers stream the original ZIP to the chosen file without a second blob download', async () => {
  const pickerCalls = [];
  const writable = { abort() {} };
  const page = createGallery({ mode: 'download', downloadsEnabled: true,
    photoList: photos.map((photo) => ({ ...photo, downloadQuality: 'original' })),
    showSaveFilePicker: async (options) => { pickerCalls.push(options); return { createWritable: async () => writable }; },
  });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  await page.click(page.button('Télécharger toutes les photos (.zip)'));
  assert.equal(pickerCalls.length, 1);
  assert.equal(pickerCalls[0].suggestedName, 'galerie-metal-7-full-original.zip');
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].writable, writable);
  assert.equal(page.requests[0].quality, 'original');
  assert.equal(page.downloads.length, 0, 'a completed streamed ZIP does not trigger a second browser download');
  assert.match(page.text(), /téléchargement a été lancé|fichier.*enregistré|archive.*enregistrée/i);
});

test('cancelling the save-file picker starts no ZIP transfer and no browser download', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true,
    showSaveFilePicker: async () => { throw Object.assign(new Error('User cancelled'), { name: 'AbortError' }); },
  });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  await page.click(page.button('Télécharger toutes les photos (.zip)'));
  assert.equal(page.requests.length, 0);
  assert.equal(page.downloads.length, 0);
  assert.match(page.text(), /annulé/i);
  assert.doesNotMatch(page.text(), /Le téléchargement a été lancé/);
});

test('a file-picker write permission error saves nothing and leaves a visible retry', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true,
    showSaveFilePicker: async () => ({ createWritable: async () => { throw new Error('Permission denied'); } }),
  });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  await page.click(page.button('Télécharger toutes les photos (.zip)'));
  assert.equal(page.requests.length, 0);
  assert.equal(page.downloads.length, 0);
  assert.match(page.text(), /échoué/);
  assert.equal(page.button('Télécharger toutes les photos (.zip)').props.disabled, false);
});

test('a memory-limited fallback ZIP gives a clear size error and never saves a partial file', async () => {
  const page = createGallery({ mode: 'download', downloadsEnabled: true,
    prepareGallery: async () => { throw Object.assign(new Error('Cette galerie est trop volumineuse pour ce navigateur. Choisissez la version pour les réseaux sociaux ou téléchargez les originaux individuellement.'), { code: 'ARCHIVE_TOO_LARGE' }); },
  });
  await page.flush(); await page.click(page.label('Télécharger toutes les photos'));
  await page.click(page.button('Télécharger toutes les photos (.zip)'));
  assert.equal(page.downloads.length, 0);
  assert.match(page.text(), /volumineu|trop (?:grand|lourd)|mémoire/i);
  assert.equal(page.button('Télécharger toutes les photos (.zip)').props.disabled, false);
});

test('category controls keep the collection cover and download only the selected unequal set', async () => {
  const list = [
    { ...photos[0], category: 'full' },
    { ...photos[0], id: 'social-1', category: 'social' },
    { ...photos[0], id: 'social-2', category: 'social' },
    { ...photos[0], id: 'bw-1', category: 'bw' },
  ];
  const page = createGallery({ mode: 'download', downloadsEnabled: true, photoList: list });
  await page.flush();
  await page.click(page.button('NOIR & BLANC1'));
  await page.click(page.label('Télécharger toutes les photos'));
  await page.click(page.button('Télécharger toutes les photos (.zip)'));
  assert.deepEqual(page.requests[0].photos.map((photo) => photo.id), ['bw-1']);
  assert.equal(page.requests[0].quality, 'original');
  assert.match(page.downloads[0].filename, /bw-original.zip$/);
  const cover = page.all((node) => node.props?.className === 'light-cover__photo')[0];
  assert.match(cover.props.src, /photo-1/);
});

test('uploaded cover is used for the main image instead of the first collection photo', async () => {
  const page = createGallery({mode: 'download', downloadsEnabled: true, cover: 'cover-custom'});
  await page.flush();
  const image = page.all(node => node.props?.className === 'light-cover__photo')[0];
  assert.match(image.props.src, /cover-custom/);
});
