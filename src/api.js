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
  const studentSlug = active.key?.startsWith('g:eleve-') ? active.key.slice(2) : '';
  const student = studentSlug ? `&eleve=${encodeURIComponent(studentSlug)}` : '';
  return `/api/photo/${photoId}?s=${size}${token}${student}`;
}

/**
 * Réduit une photo dans le navigateur avant l'envoi : le fichier d'origine
 * reste inchangé. On prépare une version web et une vignette pour garder
 * l'affichage léger; le mode téléchargement peut aussi envoyer l'original.
 */
export async function prepareImage(file, maxSide, quality, watermark = false) {
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
  if (watermark) {
    const barHeight = Math.max(24, height * 0.045);
    const y = height * 0.68 - barHeight / 2;
    context.fillStyle = 'rgba(159,18,4,0.65)';
    context.fillRect(0, y, width, barHeight);
    const text = 'PHOTO NON RETOUCHÉE • POUR SÉLECTION UNIQUEMENT';
    let fontSize = Math.min(barHeight * 0.55, width / 28);
    context.font = `bold ${fontSize}px Arial`;
    while (context.measureText(text).width > width * 0.94) { fontSize -= 0.5; context.font = `bold ${fontSize}px Arial`; }
    context.fillStyle = '#fff'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(text, width / 2, y + barHeight / 2);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return { blob, width, height };
}
