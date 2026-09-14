// Point d'entrée unique vers l'API des galeries (Worker Cloudflare).
// En production, Netlify relaie /api/* vers le Worker : pour le visiteur tout
// se passe sur behnjproductions.ca.
//
// Le jeton de session est gardé à deux endroits : un cookie posé par le Worker
// et une copie locale renvoyée en en-tête. Les deux chemins mènent au même
// contrôle côté serveur; garder la copie locale évite toute surprise si
// l'hébergeur relaie les cookies autrement.

let active = { key: null, token: null };

const storeKey = (key) => `bjp-tok-${key}`;

function read(key) {
  try { return window.localStorage.getItem(storeKey(key)); } catch { return null; }
}

export function useSession(key) {
  active = { key, token: read(key) };
}

export function saveSession(key, token) {
  active = { key, token: token || null };
  try {
    if (token) window.localStorage.setItem(storeKey(key), token);
    else window.localStorage.removeItem(storeKey(key));
  } catch { /* navigation privée */ }
}

export function clearSession(key) {
  saveSession(key, null);
}

export async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (active.token) headers['x-bjp-token'] = active.token;
  if (options.body && !(options.body instanceof FormData)) headers['content-type'] = 'application/json';

  const response = await fetch(`/api${path}`, { credentials: 'include', ...options, headers });

  let data = null;
  try { data = await response.json(); } catch { /* réponse vide */ }

  if (!response.ok) {
    const message = data && data.error
      ? (data.detail ? `${data.error} : ${data.detail}` : data.error)
      : `Erreur ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function photoUrl(photoId, size = 'thumb') {
  const token = active.token ? `&t=${encodeURIComponent(active.token)}` : '';
  return `/api/photo/${photoId}?s=${size}${token}`;
}

/**
 * Réduit une photo dans le navigateur avant l'envoi : le fichier d'origine
 * (souvent 10 Mo) ne quitte jamais l'ordinateur. On téléverse une version web
 * et une vignette — les galeries restent légères sur cellulaire.
 */
export async function prepareImage(file, maxSide, quality) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return { blob, width, height };
}
