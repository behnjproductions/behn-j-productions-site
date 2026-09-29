const validQuality = (quality) => quality === 'original' || quality === 'social';

function checkRequest(photos, quality, signal) {
  signal?.throwIfAborted();
  if (!validQuality(quality)) throw new Error('Choisissez la taille originale ou la version pour les réseaux sociaux.');
  if (!photos.length) throw new Error('Aucune photo à télécharger.');
  if (quality === 'original' && photos.some((photo) => photo.downloadQuality !== 'original')) {
    throw new Error('La taille originale n’est pas encore disponible pour toutes ces photos.');
  }
}

function safeFilename(value, fallback) {
  const name = String(value || '').split(/[\\/]/).pop()
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').replace(/^[. ]+|[. ]+$/g, '').trim();
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? `photo-${name}` : name || fallback;
}

function filenameFor(photo, quality) {
  const filename = safeFilename(photo.downloadFilename || photo.filename, `photo-${photo.id}.jpg`);
  return quality === 'social' ? `${filename.replace(/\.[^.]+$/, '')}.jpg` : filename;
}

function uniqueFilename(filename, used) {
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot) : '';
  let next = filename;
  for (let suffix = 2; used.has(next.normalize('NFC').toLowerCase()); suffix += 1) next = `${base} (${suffix})${extension}`;
  used.add(next.normalize('NFC').toLowerCase());
  return next;
}

async function fetchPhoto(photo, quality, photoUrl, signal) {
  signal?.throwIfAborted();
  const url = new URL(photoUrl(photo.id, 'web'), window.location.origin);
  if (url.origin !== window.location.origin) throw new Error('Adresse de téléchargement invalide.');
  url.pathname += '/download';
  url.searchParams.delete('s');
  url.searchParams.set('quality', quality);
  const response = await fetch(url, { credentials: 'same-origin', signal });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Le téléchargement a échoué. Réessayez.');
  }
  if (!response.headers.get('content-type')?.startsWith('image/') || !response.body) {
    await response.body?.cancel();
    throw new Error('Le fichier photo est indisponible.');
  }
  return response;
}

export function archiveFilename(slug, quality) {
  return `galerie-${safeFilename(slug, 'photos')}-${quality === 'original' ? 'originaux' : 'reseaux-sociaux'}.zip`;
}

export async function preparePhotoDownload({ photo, quality, photoUrl, signal }) {
  checkRequest(photo ? [photo] : [], quality, signal);
  const response = await fetchPhoto(photo, quality, photoUrl, signal);
  const blob = await response.blob();
  signal?.throwIfAborted();
  return { blob, filename: filenameFor(photo, quality) };
}

export async function prepareGalleryDownload({ photos, quality, photoUrl, signal, onProgress = () => {}, writable,
  maxBufferedBytes = 512 * 1024 * 1024 }) {
  let writer;
  try {
    checkRequest(photos, quality, signal);
    // Load ZIP support only when requested. Images are already compressed, so
    // STORE preserves their exact bytes and avoids recompression work.
    const { BlobWriter, ZipWriter } = await import('@zip.js/zip.js');
    signal?.throwIfAborted();
    writer = new ZipWriter(writable || new BlobWriter('application/zip'), {
      level: 0, bufferedWrite: false, useWebWorkers: false, preventClose: Boolean(writable),
    });
    const names = new Set();
    let bufferedBytes = 0;
    const tooLarge = () => {
      const error = new Error('Cette galerie est trop volumineuse pour ce navigateur. Choisissez la version pour les réseaux sociaux ou téléchargez les originaux individuellement.');
      error.code = 'ARCHIVE_TOO_LARGE';
      return error;
    };
    onProgress({ done: 0, total: photos.length });
    for (const [index, photo] of photos.entries()) {
      signal?.throwIfAborted();
      const response = await fetchPhoto(photo, quality, photoUrl, signal);
      if (!writable && bufferedBytes + Number(response.headers.get('content-length') || 0) > maxBufferedBytes) {
        await response.body.cancel();
        throw tooLarge();
      }
      const stream = writable ? response.body : response.body.pipeThrough(new TransformStream({
        transform(chunk, controller) {
          bufferedBytes += chunk.byteLength;
          if (bufferedBytes > maxBufferedBytes) throw tooLarge();
          controller.enqueue(chunk);
        },
      }));
      // Consume each response as a stream, not an array of full-size images.
      await writer.add(uniqueFilename(filenameFor(photo, quality), names), stream, { signal });
      signal?.throwIfAborted();
      onProgress({ done: index + 1, total: photos.length });
    }
    const blob = await writer.close();
    signal?.throwIfAborted();
    if (writable) {
      const destination = writable.getWriter();
      try { await destination.close(); } finally { destination.releaseLock(); }
      return null;
    }
    return blob;
  } catch (error) {
    // A file-picker destination commits only after success. Abort its temporary
    // file on failure; never close it with an incomplete archive.
    if (writable) await writable.abort(error).catch(() => {});
    else await writer?.close().catch(() => {});
    throw error;
  }
}
