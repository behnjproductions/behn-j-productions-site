// Parcours complet en vrai navigateur : galerie verrouillée → mot de passe →
// choix → envoi → écran de remerciement, puis le panneau d'administration.
//
// Le test crée sa propre galerie de test, la remplit, la publie, la traverse,
// puis la supprime : il peut donc être relancé autant de fois que voulu.
// Lancer avec `node tests/galerie-e2e.mjs` pendant que `wrangler dev`
// (port 8787) et `vite` (port 5173) tournent.

import { chromium, devices } from 'playwright';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:5173';
const ADMIN = process.env.ADMIN_PASSWORD || 'test-admin-2026';
const MOT_DE_PASSE = 'soleil2026';
const SLUG = 'galerie-de-test'; // suffixé par appareil : chaque parcours part d'une galerie neuve
const SHOTS = 'captures';
mkdirSync(SHOTS, { recursive: true });

const errors = [];
const step = (name) => console.log(`  • ${name}`);

/* ----------------------------------------------------- préparation API --- */

let jeton = '';
async function apiCall(path, options = {}) {
  const response = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      ...(jeton ? { 'x-bjp-token': jeton } : {}),
      ...(options.body && typeof options.body === 'string' ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path} → ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function preparer(slug) {
  ({ token: jeton } = await apiCall('/admin/session', { method: 'POST', body: JSON.stringify({ password: ADMIN }) }));
  await apiCall(`/admin/collections/${slug}`, { method: 'DELETE' }).catch(() => {});
  await apiCall('/admin/collections', {
    method: 'POST',
    body: JSON.stringify({
      client: 'Galerie de test', slug, title: 'Séance de vérification',
      eventDate: '2026-09-20', password: MOT_DE_PASSE, maxPicks: 2, extraPrice: 25,
    }),
  });

  const dossier = 'public/assets/portfolio';
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.jpg')).slice(0, 12);
  for (const nom of fichiers) {
    const form = new FormData();
    form.append('filename', nom);
    form.append('width', '2000');
    form.append('height', '1333');
    const blob = new Blob([readFileSync(path.join(dossier, nom))], { type: 'image/jpeg' });
    form.append('web', blob, 'web.jpg');
    form.append('thumb', blob, 'thumb.jpg');
    await apiCall(`/admin/collections/${slug}/photos`, { method: 'POST', body: form });
  }
  await apiCall(`/admin/collections/${slug}`, { method: 'PATCH', body: JSON.stringify({ status: 'publié' }) });
  console.log(`  (galerie de test prête : ${fichiers.length} photos, forfait de 2, extra 25 $)`);
}

/* ----------------------------------------------------------- le parcours --- */

async function run(label, viewport, extra = {}) {
  const slug = `${SLUG}-${label}`;
  await preparer(slug);
  console.log(`\n${label}`);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const context = await browser.newContext({ viewport, ...extra });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${label} — ${e.message}`));
  // Deux bruits attendus : le 401 des mauvais mots de passe qu'on teste
  // volontairement, et les polices Google que le réseau du banc d'essai bloque.
  const attendu = (t) => t.includes('401') || t.includes('ERR_TUNNEL_CONNECTION_FAILED');
  page.on('console', (m) => {
    if (m.type() === 'error' && !attendu(m.text())) errors.push(`${label} — console: ${m.text()}`);
  });

  // 1. Galerie verrouillée
  await page.goto(`${BASE}/galerie/${slug}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.gal-lock__panel');
  await page.screenshot({ path: `${SHOTS}/${label}-1-verrou.png` });
  step('écran de mot de passe affiché');

  // 2. Mauvais mot de passe refusé
  await page.fill('.gal-lock__field input', 'mauvais');
  await page.click('.gal-lock button[type=submit]');
  await page.waitForSelector('.gal-lock__error');
  step('mauvais mot de passe refusé');

  // 3. Bon mot de passe
  await page.fill('.gal-lock__field input', MOT_DE_PASSE);
  await page.click('.gal-lock button[type=submit]');
  await page.waitForSelector('.gal-cover', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/${label}-2-couverture.png` });
  step('couverture ouverte');

  // 4. Les photos viennent bien de R2
  await page.click('.gal-cover__cta');
  await page.waitForTimeout(1600);
  const broken = await page.evaluate(() => [...document.querySelectorAll('.gal-grid img')]
    .filter((img) => img.complete && img.naturalWidth === 0).length);
  if (broken) errors.push(`${label} — ${broken} photos ne se chargent pas`);
  await page.screenshot({ path: `${SHOTS}/${label}-3-grille.png` });
  step(`grille affichée (${await page.locator('.gal-grid figure').count()} photos, ${broken} cassée(s))`);

  // 4 bis. Le mode d'emploi est visible et annonce le tarif
  const guide = await page.locator('.gal-guide').innerText();
  if (!guide.includes('25 $')) errors.push(`${label} — le tarif des photos supplémentaires n'apparaît pas`);
  await page.screenshot({ path: `${SHOTS}/${label}-3b-mode-emploi.png` });
  step('mode d’emploi affiché avec le tarif');

  // 5. Choisir trois photos : une de plus que le forfait de deux
  const hearts = page.locator('.gal-heart');
  for (const i of [0, 2, 4]) await hearts.nth(i).click();
  const compteur = (await page.locator('.gal-bar span').first().innerText()).replace(/\s+/g, ' ');
  if (!compteur.startsWith('3')) errors.push(`${label} — compteur inattendu : ${compteur}`);
  const supplement = await page.locator('.gal-bar__extra').count()
    ? (await page.locator('.gal-bar__extra').innerText()).replace(/\s+/g, ' ')
    : '';
  if (!supplement.includes('25')) errors.push(`${label} — le supplément ne s'affiche pas (${supplement || 'absent'})`);
  step(`compteur : ${compteur} | supplément : ${supplement}`);

  // 6. Visionneuse plein écran
  await page.locator('.gal-zoom').nth(1).click();
  await page.waitForSelector('.gal-light img');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/${label}-4-agrandie.png` });
  await page.keyboard.press('Escape');
  step('visionneuse plein écran');

  // 7. Envoyer la sélection
  await page.click('.gal-bar .gal-send');
  await page.waitForSelector('.gal-merci__panel', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/${label}-5-merci.png` });
  step('sélection envoyée + invitation Google');

  // 8. En rouvrant la galerie, le client retrouve son choix
  await page.goto(`${BASE}/galerie/${slug}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.gal-grid', { timeout: 15000 });
  const retrouvees = await page.locator('.gal-heart[aria-pressed="true"]').count();
  if (retrouvees !== 3) errors.push(`${label} — sélection non retrouvée (${retrouvees} au lieu de 3)`);
  step(`sélection retrouvée après rechargement : ${retrouvees} photos`);

  // 9. Le panneau d'administration
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.adm-login__panel');
  await page.screenshot({ path: `${SHOTS}/${label}-6-admin-connexion.png` });
  await page.fill('.adm-login__panel input', ADMIN);
  await page.click('.adm-login__panel button[type=submit]');
  await page.waitForSelector('.adm-card', { timeout: 15000 });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${SHOTS}/${label}-7-admin-liste.png` });
  step('panneau ouvert');

  await page.locator('.adm-card__cover').first().click();
  await page.waitForSelector('.adm-link', { timeout: 15000 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${SHOTS}/${label}-8-admin-collection.png`, fullPage: true });
  if (!(await page.locator('.adm-selection').count())) {
    errors.push(`${label} — la sélection du client n'apparaît pas dans le panneau`);
  }
  await page.click('.adm-editor__actions button:has-text("Réglages")');
  await page.waitForSelector('.adm-settings');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${label}-9-admin-reglages.png` });
  step('sélection du client et réglages visibles');

  await browser.close();
  await apiCall(`/admin/collections/${slug}`, { method: 'DELETE' }).catch(() => {});
}

await run('ordinateur', { width: 1440, height: 900 });
await run('cellulaire', null, devices['iPhone 13']);

console.log(`\n${errors.length ? '✗ Problèmes :' : '✓ Aucun problème détecté.'}`);
for (const e of errors) console.log(`  - ${e}`);
process.exit(errors.length ? 1 : 0);
