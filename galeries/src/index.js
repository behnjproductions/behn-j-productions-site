/**
 * Behn J. Productions — API des galeries client.
 *
 * Ce Worker est le seul morceau de code qui touche aux photos (R2) et aux
 * données (D1). Le site public, hébergé chez Netlify, lui parle par /api/*.
 * Tout ce qui protège une galerie vit ici : le navigateur du client ne reçoit
 * jamais un mot de passe ni une adresse de fichier devinable.
 */

const SESSION_HOURS = 24 * 30; // Un client garde son accès un mois.
const ADMIN_HOURS = 12;
const MAX_FAILS = 10; // Essais de mot de passe ratés tolérés par 15 minutes.

// Un Worker du forfait gratuit ne dispose que de 10 ms de calcul par requête :
// un PBKDF2 à 120 000 tours le dépasse et la requête est coupée. 4 000 tours
// tiennent dans le budget. La vraie défense reste la limite d'essais
// ci-dessus — sans elle, aucun nombre de tours ne sauve un mot de passe court.
const PBKDF2_ROUNDS = 4000;

/* ------------------------------------------------------------------ outils */

const enc = new TextEncoder();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

// Comparaison à temps constant : ne révèle rien à qui mesure le temps de réponse.
function safeEqual(a, b) {
  const x = enc.encode(a || '');
  const y = enc.encode(b || '');
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function makeToken(secret, scope, hours) {
  const exp = Date.now() + hours * 3600 * 1000;
  const body = `${scope}.${exp}`;
  return `${body}.${await hmac(secret, body)}`;
}

async function readToken(secret, scope, token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenScope, exp, sig] = parts;
  if (tokenScope !== scope) return false;
  if (!Number(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(secret, `${tokenScope}.${exp}`));
}

// Mot de passe : jamais stocké en clair. PBKDF2 + sel aléatoire.
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${PBKDF2_ROUNDS}$${b64url(salt)}$${b64url(bits)}`;
}

async function checkPassword(password, stored) {
  if (!stored) return false;
  const [scheme, iterations, salt, expected] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;
  const raw = Uint8Array.from(atob(salt.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: raw, iterations: Number(iterations), hash: 'SHA-256' }, key, 256);
  return safeEqual(b64url(bits), expected);
}

function cookies(request) {
  const out = {};
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(name, value, hours) {
  const age = Math.round(hours * 3600);
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${value ? age : 0}; HttpOnly; Secure; SameSite=Lax`;
}

const id = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

const slugify = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/* --------------------------------------------------------- limite d'essais */

async function tooManyFails(env, scope, ip) {
  const since = Date.now() - 15 * 60 * 1000;
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE scope = ? AND ip = ? AND at > ?')
    .bind(scope, ip, since).first();
  return (row?.n || 0) >= MAX_FAILS;
}

async function noteFail(env, scope, ip) {
  await env.DB.batch([
    env.DB.prepare('INSERT INTO login_attempts (scope, ip, at) VALUES (?, ?, ?)').bind(scope, ip, Date.now()),
    env.DB.prepare('DELETE FROM login_attempts WHERE at < ?').bind(Date.now() - 24 * 3600 * 1000),
  ]);
}

/* ------------------------------------------------------------------ accès */

// Le jeton de session voyage de trois façons : cookie (cas normal), en-tête
// (appels JavaScript) ou paramètre ?t= (balises <img>, qui ne peuvent pas
// porter d'en-tête). Netlify relaie /api/* au Worker et tous les chemins
// restent valables, quelle que soit la façon dont l'hébergeur traite les
// cookies d'un domaine relayé.
function tokenFrom(request, cookieName) {
  const url = new URL(request.url);
  return cookies(request)[cookieName]
    || request.headers.get('x-bjp-token')
    || url.searchParams.get('t')
    || '';
}

const isAdmin = (request, env) => readToken(env.SESSION_SECRET, 'admin', tokenFrom(request, 'bjp_admin'));

const galleryCookieName = (collectionId) => `bjp_g_${collectionId.slice(0, 12)}`;

async function canSee(request, env, collection) {
  if (await isAdmin(request, env)) return true; // aperçu du photographe
  if (collection.status !== 'publié') return false;
  if (!collection.password_hash) return true;
  return readToken(env.SESSION_SECRET, `g:${collection.id}`, tokenFrom(request, galleryCookieName(collection.id)));
}

const getCollection = (env, slug) => env.DB.prepare('SELECT * FROM collections WHERE slug = ?').bind(slug).first();

const listPhotos = (env, collectionId) => env.DB
  .prepare('SELECT id, filename, width, height, position FROM photos WHERE collection_id = ? ORDER BY position, created_at')
  .bind(collectionId).all();

/* ------------------------------------------------------------------ courriel */

async function sendSelectionEmail(env, collection, photos, note) {
  if (!env.RESEND_API_KEY) return;
  const url = `${env.SITE_ORIGIN}/galerie/${collection.slug}`;
  const list = photos.map((p) => `<li>${escapeHtml(p.filename || p.id)}</li>`).join('');

  // Au-delà du forfait, chaque photo est facturée : le total est calculé ici
  // pour qu'il soit dans le courriel, prêt à reporter sur la facture.
  const included = collection.max_picks || 0;
  const price = collection.extra_price ?? 25;
  const extras = included ? Math.max(0, photos.length - included) : 0;
  const supplement = extras
    ? `<p style="padding:12px 14px;background:#fdf6e6;border-left:3px solid #ffb604"><strong>${extras} photo${extras > 1 ? 's' : ''} au-delà du forfait</strong> (${included} incluses) — ${extras} × ${price} $ = <strong>${extras * price} $ CAD à facturer</strong></p>`
    : '';

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1a1a1a;line-height:1.55">
      <h2 style="margin:0 0 4px">Nouvelle sélection reçue</h2>
      <p style="margin:0 0 18px;color:#666">${escapeHtml(collection.client)}${collection.title ? ` — ${escapeHtml(collection.title)}` : ''}</p>
      <p><strong>${photos.length}</strong> photo${photos.length > 1 ? 's' : ''} choisie${photos.length > 1 ? 's' : ''} :</p>
      <ol>${list}</ol>
      ${supplement}
      ${note ? `<p><strong>Message du client :</strong><br>${escapeHtml(note).replace(/\n/g, '<br>')}</p>` : ''}
      <p><a href="${url}">Ouvrir la galerie</a></p>
    </div>`;
  const text = `${collection.client} — ${photos.length} photo(s) choisie(s)\n\n`
    + photos.map((p) => p.filename || p.id).join('\n')
    + (extras ? `\n\n${extras} au-dela du forfait (${included} incluses) : ${extras} x ${price} $ = ${extras * price} $ CAD a facturer` : '')
    + (note ? `\n\nMessage : ${note}` : '')
    + `\n\n${url}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [env.MAIL_TO],
      subject: extras
        ? `Sélection — ${collection.client} (${photos.length} photos, ${extras * price} $ à facturer)`
        : `Sélection — ${collection.client} (${photos.length} photos)`,
      html,
      text,
    }),
  });
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ routes */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const ip = request.headers.get('cf-connecting-ip') || 'inconnu';

    if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) {
      return json({ error: 'Worker non configuré : ajoutez les secrets ADMIN_PASSWORD et SESSION_SECRET.' }, 503);
    }

    // Requêtes venues directement d'un autre domaine (tests, aperçu).
    const origin = request.headers.get('origin');
    const cors = origin && (origin === env.SITE_ORIGIN || origin.endsWith('.netlify.app') || origin.startsWith('http://localhost'))
      ? {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type,x-bjp-token',
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      }
      : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      const response = await route(request, env, url, path, ip);
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
      return response;
    } catch (error) {
      return json({ error: 'Erreur interne', detail: String(error && error.message || error) }, 500);
    }
  },
};

async function route(request, env, url, path, ip) {
  const { method } = request;
  const segments = path.split('/').filter(Boolean); // ['api', ...]
  if (segments[0] !== 'api') return json({ error: 'Introuvable' }, 404);
  const [, section, ...rest] = segments;

  /* ---------- santé ---------- */
  if (section === 'sante') return json({ ok: true });

  /* ---------- photos ---------- */
  if (section === 'photo' && method === 'GET') {
    const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(rest[0]).first();
    if (!photo) return new Response('Introuvable', { status: 404 });
    const collection = await env.DB.prepare('SELECT * FROM collections WHERE id = ?').bind(photo.collection_id).first();
    if (!collection || !(await canSee(request, env, collection))) return new Response('Accès refusé', { status: 403 });

    const key = url.searchParams.get('s') === 'web' ? photo.r2_key : (photo.thumb_key || photo.r2_key);
    const object = await env.BUCKET.get(key);
    if (!object) return new Response('Introuvable', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'private, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  }

  /* ---------- galerie du client ---------- */
  if (section === 'galerie') {
    const slug = rest[0];
    const collection = slug ? await getCollection(env, slug) : null;
    if (!collection) return json({ error: 'Galerie introuvable' }, 404);

    // Entrée par mot de passe
    if (rest[1] === 'session' && method === 'POST') {
      const scope = `g:${collection.id}`;
      if (await tooManyFails(env, scope, ip)) {
        return json({ error: 'Trop d’essais. Réessayez dans quinze minutes.' }, 429);
      }
      const body = await request.json().catch(() => ({}));
      if (!(await checkPassword(String(body.password || ''), collection.password_hash))) {
        await noteFail(env, scope, ip);
        await new Promise((r) => setTimeout(r, 400));
        return json({ error: 'Mot de passe incorrect.' }, 401);
      }
      const token = await makeToken(env.SESSION_SECRET, scope, SESSION_HOURS);
      return json({ ok: true, token }, 200, { 'set-cookie': setCookie(galleryCookieName(collection.id), token, SESSION_HOURS) });
    }

    // Envoi de la sélection
    if (rest[1] === 'selection' && method === 'POST') {
      if (!(await canSee(request, env, collection))) return json({ error: 'Accès refusé' }, 403);
      const body = await request.json().catch(() => ({}));
      const wanted = Array.isArray(body.photoIds) ? body.photoIds.slice(0, 500).map(String) : [];
      if (!wanted.length) return json({ error: 'Aucune photo choisie.' }, 400);

      const { results: photos } = await listPhotos(env, collection.id);
      const chosen = photos.filter((p) => wanted.includes(p.id));
      if (!chosen.length) return json({ error: 'Photos introuvables.' }, 400);

      const note = String(body.note || '').slice(0, 2000);
      await env.DB.prepare('INSERT INTO selections (collection_id, photo_ids, note) VALUES (?, ?, ?)')
        .bind(collection.id, JSON.stringify(chosen.map((p) => p.id)), note || null).run();
      await sendSelectionEmail(env, collection, chosen, note).catch(() => {});
      return json({ ok: true, count: chosen.length });
    }

    // Lecture de la galerie
    if (!rest[1] && method === 'GET') {
      const open = await canSee(request, env, collection);
      const base = {
        slug: collection.slug,
        client: collection.client,
        title: collection.title,
        date: collection.event_date,
        maxPicks: collection.max_picks,
        extraPrice: collection.extra_price ?? 25,
      };
      if (!open) {
        const exists = collection.status === 'publié';
        return json({ ...base, locked: true, exists }, exists ? 200 : 404);
      }
      const { results: photos } = await listPhotos(env, collection.id);
      const last = await env.DB
        .prepare('SELECT photo_ids, submitted_at FROM selections WHERE collection_id = ? ORDER BY id DESC LIMIT 1')
        .bind(collection.id).first();
      return json({
        ...base,
        locked: false,
        draft: collection.status !== 'publié',
        cover: collection.cover_key || photos[0]?.id || null,
        photos: photos.map((p) => ({ id: p.id, w: p.width, h: p.height })),
        submitted: last ? { at: last.submitted_at, ids: JSON.parse(last.photo_ids) } : null,
      });
    }

    return json({ error: 'Introuvable' }, 404);
  }

  /* ---------- administration ---------- */
  if (section !== 'admin') return json({ error: 'Introuvable' }, 404);

  // Ouverture de session (seule route admin accessible sans cookie)
  if (rest[0] === 'session') {
    if (method === 'POST') {
      if (await tooManyFails(env, 'admin', ip)) {
        return json({ error: 'Trop d’essais. Réessayez dans quinze minutes.' }, 429);
      }
      const body = await request.json().catch(() => ({}));
      if (!safeEqual(String(body.password || ''), env.ADMIN_PASSWORD)) {
        await noteFail(env, 'admin', ip);
        await new Promise((r) => setTimeout(r, 400));
        return json({ error: 'Mot de passe incorrect.' }, 401);
      }
      const token = await makeToken(env.SESSION_SECRET, 'admin', ADMIN_HOURS);
      return json({ ok: true, token }, 200, { 'set-cookie': setCookie('bjp_admin', token, ADMIN_HOURS) });
    }
    if (method === 'DELETE') return json({ ok: true }, 200, { 'set-cookie': setCookie('bjp_admin', '', 0) });
    if (method === 'GET') return json({ ok: await isAdmin(request, env) });
  }

  if (!(await isAdmin(request, env))) return json({ error: 'Accès réservé' }, 401);

  /* ---------- liste et création ---------- */
  if (rest[0] === 'collections' && rest.length === 1) {
    if (method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT c.*, (SELECT COUNT(*) FROM photos p WHERE p.collection_id = c.id) AS photo_count,
               (SELECT COUNT(*) FROM selections s WHERE s.collection_id = c.id) AS selection_count
        FROM collections c ORDER BY c.created_at DESC`).all();
      return json({ collections: results.map(publicShape) });
    }

    if (method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const client = String(body.client || '').trim();
      if (!client) return json({ error: 'Le nom du client est obligatoire.' }, 400);

      let slug = slugify(body.slug || client);
      if (!slug) slug = `galerie-${id().slice(0, 6)}`;
      if (await getCollection(env, slug)) slug = `${slug}-${id().slice(0, 4)}`;

      const password = String(body.password || '').trim();
      const row = {
        id: id(),
        slug,
        client,
        title: String(body.title || '').trim() || null,
        event_date: body.eventDate || null,
        max_picks: Number(body.maxPicks) > 0 ? Number(body.maxPicks) : null,
        extra_price: Number(body.extraPrice) >= 0 ? Number(body.extraPrice) : 25,
        password_hash: password ? await hashPassword(password) : null,
      };
      await env.DB.prepare(`INSERT INTO collections (id, slug, client, title, event_date, status, max_picks, extra_price, password_hash)
        VALUES (?, ?, ?, ?, ?, 'brouillon', ?, ?, ?)`)
        .bind(row.id, row.slug, row.client, row.title, row.event_date, row.max_picks, row.extra_price, row.password_hash).run();
      return json({ collection: publicShape({ ...row, status: 'brouillon', photo_count: 0, selection_count: 0 }) }, 201);
    }
  }

  /* ---------- une collection ---------- */
  if (rest[0] === 'collections' && rest[1]) {
    const collection = await getCollection(env, rest[1]);
    if (!collection) return json({ error: 'Collection introuvable' }, 404);
    const action = rest[2];

    if (!action && method === 'GET') {
      const { results: photos } = await listPhotos(env, collection.id);
      const { results: selections } = await env.DB
        .prepare('SELECT * FROM selections WHERE collection_id = ? ORDER BY id DESC LIMIT 20')
        .bind(collection.id).all();
      const byId = new Map(photos.map((p) => [p.id, p]));
      return json({
        collection: publicShape(collection),
        photos: photos.map((p) => ({ id: p.id, filename: p.filename, w: p.width, h: p.height })),
        selections: selections.map((s) => {
          const ids = JSON.parse(s.photo_ids);
          return {
            at: s.submitted_at,
            note: s.note,
            photos: ids.map((pid) => ({ id: pid, filename: byId.get(pid)?.filename || pid })),
          };
        }),
      });
    }

    if (!action && method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const sets = [];
      const values = [];
      const put = (column, value) => { sets.push(`${column} = ?`); values.push(value); };

      if (body.client !== undefined) put('client', String(body.client).trim());
      if (body.title !== undefined) put('title', String(body.title).trim() || null);
      if (body.eventDate !== undefined) put('event_date', body.eventDate || null);
      if (body.maxPicks !== undefined) put('max_picks', Number(body.maxPicks) > 0 ? Number(body.maxPicks) : null);
      if (body.extraPrice !== undefined) put('extra_price', Number(body.extraPrice) >= 0 ? Number(body.extraPrice) : 25);
      if (body.status !== undefined) put('status', body.status === 'publié' ? 'publié' : 'brouillon');
      if (body.cover !== undefined) put('cover_key', body.cover || null);
      if (body.password !== undefined) {
        const password = String(body.password).trim();
        put('password_hash', password ? await hashPassword(password) : null);
      }
      if (body.slug !== undefined) {
        const next = slugify(body.slug);
        if (!next) return json({ error: 'Adresse invalide.' }, 400);
        const taken = await getCollection(env, next);
        if (taken && taken.id !== collection.id) return json({ error: 'Cette adresse est déjà prise.' }, 409);
        put('slug', next);
      }
      if (!sets.length) return json({ error: 'Rien à modifier.' }, 400);

      values.push(collection.id);
      await env.DB.prepare(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
      const fresh = await env.DB.prepare('SELECT * FROM collections WHERE id = ?').bind(collection.id).first();
      return json({ collection: publicShape(fresh) });
    }

    if (!action && method === 'DELETE') {
      const { results: photos } = await env.DB.prepare('SELECT r2_key, thumb_key FROM photos WHERE collection_id = ?')
        .bind(collection.id).all();
      const keys = photos.flatMap((p) => [p.r2_key, p.thumb_key]).filter(Boolean);
      for (let i = 0; i < keys.length; i += 500) await env.BUCKET.delete(keys.slice(i, i + 500));
      await env.DB.batch([
        env.DB.prepare('DELETE FROM selections WHERE collection_id = ?').bind(collection.id),
        env.DB.prepare('DELETE FROM photos WHERE collection_id = ?').bind(collection.id),
        env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collection.id),
      ]);
      return json({ ok: true });
    }

    /* ---------- téléversement d'une photo ---------- */
    if (action === 'photos' && method === 'POST') {
      const form = await request.formData();
      const web = form.get('web');
      const thumb = form.get('thumb');
      if (!(web instanceof File)) return json({ error: 'Fichier manquant.' }, 400);

      const photoId = id();
      const webKey = `collections/${collection.id}/${photoId}-web.jpg`;
      const thumbKey = `collections/${collection.id}/${photoId}-thumb.jpg`;
      await env.BUCKET.put(webKey, web.stream(), { httpMetadata: { contentType: 'image/jpeg' } });
      if (thumb instanceof File) {
        await env.BUCKET.put(thumbKey, thumb.stream(), { httpMetadata: { contentType: 'image/jpeg' } });
      }

      const next = await env.DB.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS n FROM photos WHERE collection_id = ?')
        .bind(collection.id).first();
      await env.DB.prepare(`INSERT INTO photos (id, collection_id, r2_key, thumb_key, filename, width, height, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(photoId, collection.id, webKey, thumb instanceof File ? thumbKey : null,
          String(form.get('filename') || '').slice(0, 200) || null,
          Number(form.get('width')) || null, Number(form.get('height')) || null, next.n).run();

      return json({ photo: { id: photoId, filename: form.get('filename'), w: Number(form.get('width')) || null, h: Number(form.get('height')) || null } }, 201);
    }
  }

  /* ---------- suppression d'une photo ---------- */
  if (rest[0] === 'photos' && rest[1] && method === 'DELETE') {
    const photo = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(rest[1]).first();
    if (!photo) return json({ error: 'Photo introuvable' }, 404);
    await env.BUCKET.delete([photo.r2_key, photo.thumb_key].filter(Boolean));
    await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photo.id).run();
    await env.DB.prepare('UPDATE collections SET cover_key = NULL WHERE cover_key = ?').bind(photo.id).run();
    return json({ ok: true });
  }

  return json({ error: 'Introuvable' }, 404);
}

function publicShape(row) {
  return {
    id: row.id,
    slug: row.slug,
    client: row.client,
    title: row.title,
    date: row.event_date,
    status: row.status,
    maxPicks: row.max_picks,
    extraPrice: row.extra_price ?? 25,
    cover: row.cover_key,
    hasPassword: Boolean(row.password_hash),
    photoCount: row.photo_count ?? undefined,
    selectionCount: row.selection_count ?? undefined,
    createdAt: row.created_at,
  };
}
