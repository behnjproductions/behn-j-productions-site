import { PHOTO_CATEGORIES, categoryPhotos } from './gallery-categories.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, CaretLeft, CaretRight, Check, Copy, DeviceMobile, DownloadSimple, Heart, ImageSquare, NotePencil, Pause, Play, ShareFat, ShoppingCart, Star, X } from '@phosphor-icons/react';
import { archiveFilename, prepareGalleryDownload, preparePhotoDownload } from './gallery-downloads.js';
import { api } from './api.js';
import './light-gallery.css';

const countLabel = (count) => `${count} photo${count > 1 ? 's' : ''}`;
// Sur téléphone, le menu de partage natif propose « Enregistrer l'image » :
// la photo va directement dans l'app Photos au lieu de l'app Fichiers.
function deviceCanSaveToPhotos() {
  try {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return false;
    return navigator.canShare({ files: [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })] });
  } catch { return false; }
}
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOOGLE_REVIEW_URL = 'https://g.page/r/CQkeWPsjYGSdEBM/review';
const OTHER_SECTION = '__autres__';
const photoName = (photo, index) => photo?.downloadFilename || photo?.filename || `Photo ${index + 1}`;
function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}
function readNotes(key) {
  try { const value = JSON.parse(window.localStorage.getItem(key) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}
function writeNotes(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* navigation privée */ } }

export function LightGallery({ category = 'full', onCategory, gallery, photos, picks, active, onActive, onToggle, sending, sent, onSend, sendError,
  employeeName, employeeGallery, onChangeEmployee, onCloseReview, photoUrl, Dialog, contactUrl, brand }) {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [section, setSection] = useState('all');
  const [viewer, setViewer] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [toolPanel, setToolPanel] = useState(null);
  const [copyState, setCopyState] = useState('');
  const [downloadState, setDownloadState] = useState('');
  const [downloadScope, setDownloadScope] = useState('all');
  const [downloadQuality, setDownloadQuality] = useState('social');
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });
  const [downloadError, setDownloadError] = useState('');
  const [downloadEmail, setDownloadEmail] = useState('');
  const notesKey = `bjp-notes-${gallery.slug}`;
  const [notes, setNotes] = useState(() => readNotes(notesKey));
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const gridRef = useRef(null);
  const filmRef = useRef(null);
  const downloadRequest = useRef(null);
  const downloadObject = useRef(null);
  const downloadTimer = useRef(null);
  const [canSaveToPhone] = useState(deviceCanSaveToPhotos);
  const [phoneFiles, setPhoneFiles] = useState(null);
  const [phoneSaved, setPhoneSaved] = useState(0);
  const phoneUrl = useRef(null);
  const current = photos[active] || photos[0];
  const cover = (gallery.photos || photos).find((photo) => photo.id === gallery.cover) || (gallery.photos || photos)[0];
  const coverId = gallery.cover?.startsWith('cover-') ? gallery.cover : cover?.id;
  const downloadMode = gallery.mode === 'download';
  const schoolSelection = gallery.collectionType === 'school' && !downloadMode;
  const clientName = gallery.client || gallery.title;
  const eyebrow = [gallery.title && gallery.title !== gallery.client ? gallery.title : '', formatDate(gallery.date)].filter(Boolean).join(' · ')
    || (downloadMode ? 'Vos photos sont prêtes' : 'Votre galerie privée');

  // Sections thématiques (ex. Cérémonie · Soirée), dans l'ordre d'apparition.
  const sections = (() => {
    const names = [];
    photos.forEach((photo) => { if (photo.section && !names.includes(photo.section)) names.push(photo.section); });
    if (names.length < 2) return [];
    const list = names.map((name) => ({ id: name, label: name, count: photos.filter((photo) => photo.section === name).length }));
    const others = photos.filter((photo) => !photo.section).length;
    return others ? [...list, { id: OTHER_SECTION, label: 'Autres', count: others }] : list;
  })();
  const inSection = (photo) => section === 'all' || (section === OTHER_SECTION ? !photo.section : photo.section === section);
  const visible = photos.map((photo, index) => ({ photo, index }))
    .filter(({ photo }) => inSection(photo) && (downloadMode || !favoritesOnly || picks.has(photo.id)));
  const visibleIndexes = visible.map(({ index }) => index);
  const position = visibleIndexes.indexOf(active);
  const categoriesShown = PHOTO_CATEGORIES
    .map((item) => ({ ...item, count: categoryPhotos(gallery.photos || photos, item.id).length }))
    .filter((item) => item.count > 0 || item.id === category);

  const maxPicks = gallery.maxPicks;
  const extraPrice = gallery.extraPrice ?? 25;
  const extras = maxPicks ? Math.max(0, picks.size - maxPicks) : 0;
  const progress = maxPicks ? Math.min(100, Math.round((picks.size / maxPicks) * 100)) : 0;
  const canDownload = downloadMode && gallery.downloadsEnabled === true;
  const originalAvailable = downloadScope === 'all'
    ? photos.length > 0 && photos.every((photo) => photo.downloadQuality === 'original')
    : current?.downloadQuality === 'original';
  const quality = downloadQuality === 'original' && originalAvailable ? 'original' : 'social';
  const downloadBusy = downloadState === 'busy';
  // Lots plus petits en haute résolution pour ménager la mémoire du téléphone.
  const phoneBatch = quality === 'original' ? 10 : 25;
  const selectionDisabled = sending || (employeeGallery && !employeeName?.trim());
  // A share link identifies the gallery only. Never copy the session or preview query.
  const shareUrl = `https://behnjproductions.ca/galerie/${encodeURIComponent(gallery.slug)}`;
  const heading = downloadMode ? (section === 'all' ? 'Vos photos à télécharger' : sections.find((item) => item.id === section)?.label)
    : favoritesOnly ? 'Mes favoris' : section === 'all' ? 'Toutes les photos' : sections.find((item) => item.id === section)?.label;

  const move = useCallback((step) => {
    if (!visibleIndexes.length) return;
    const from = position < 0 ? (step > 0 ? -1 : 0) : position;
    onActive(visibleIndexes[(from + step + visibleIndexes.length) % visibleIndexes.length]);
  }, [visibleIndexes, position, onActive]);
  const closeViewer = useCallback(() => { setViewer(null); setPlaying(false); }, []);
  const abortDownload = useCallback(() => {
    const controller = downloadRequest.current;
    downloadRequest.current = null;
    controller?.abort();
  }, []);
  const closePanel = useCallback(() => {
    abortDownload();
    setToolPanel(null); setCopyState(''); setDownloadState(''); setDownloadError(''); setPhoneFiles(null); setPhoneSaved(0);
    setDownloadProgress({ done: 0, total: 0 });
  }, [abortDownload]);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => { setReducedMotion(Boolean(query?.matches)); if (query?.matches) setPlaying(false); };
    query?.addEventListener?.('change', change);
    return () => query?.removeEventListener?.('change', change);
  }, []);
  useEffect(() => {
    if (!viewer || !playing || visibleIndexes.length < 2) return undefined;
    const interval = window.setInterval(() => move(1), 5000);
    return () => window.clearInterval(interval);
  }, [viewer, playing, visibleIndexes.length, move]);
  useEffect(() => {
    if (sent === true) { closeViewer(); closePanel(); }
  }, [sent, closeViewer, closePanel]);
  useEffect(() => { writeNotes(notesKey, notes); }, [notes, notesKey]);
  useEffect(() => {
    // Keep the active thumbnail visible without moving the page.
    const strip = filmRef.current;
    const thumb = strip?.querySelector('[aria-current="true"]');
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft;
    if (left < strip.scrollLeft || left + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left - (strip.clientWidth - thumb.offsetWidth) / 2), behavior: reducedMotion ? 'instant' : 'smooth' });
    }
  }, [active, viewer, reducedMotion]);
  useEffect(() => () => {
    abortDownload();
    window.clearTimeout(downloadTimer.current);
    if (downloadObject.current) URL.revokeObjectURL(downloadObject.current);
  }, [abortDownload]);

  const scrollToPhotos = () => gridRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  const chooseSection = (id) => { setSection(id); setFavoritesOnly(false); scrollToPhotos(); };
  const openPhoto = (index) => { onActive(index); setViewer('photo'); setPlaying(false); };
  const setNote = (photoId, text) => setNotes((previous) => {
    const next = { ...previous };
    if (text.trim()) next[photoId] = text.slice(0, 500); else delete next[photoId];
    return next;
  });
  const submit = () => onSend(Object.fromEntries(Object.entries(notes).filter(([photoId]) => picks.has(photoId))));
  const openPanel = (panel) => {
    if (downloadRequest.current) return;
    closeViewer(); setCopyState(''); setDownloadState(''); setToolPanel(panel);
  };
  const setDownloadOptions = (scope, photo = current) => {
    if (downloadRequest.current) return;
    const hasOriginals = scope === 'all' ? photos.length > 0 && photos.every((item) => item.downloadQuality === 'original') : photo?.downloadQuality === 'original';
    setDownloadScope(scope); setDownloadQuality(hasOriginals ? 'original' : 'social');
    setDownloadState(''); setDownloadError(''); setDownloadProgress({ done: 0, total: 0 });
    setPhoneFiles(null); setPhoneSaved(0);
  };
  const openDownload = (scope, photo = current) => {
    if (!canDownload || downloadRequest.current) return;
    setDownloadOptions(scope, photo); openPanel('download');
  };
  const moveDownloadPhoto = (step) => {
    if (downloadRequest.current || !photos.length) return;
    const index = (active + step + photos.length) % photos.length;
    onActive(index); setDownloadOptions('single', photos[index]);
  };
  const openSlideshow = () => {
    if (downloadRequest.current || !visible.length) return;
    setToolPanel(null);
    if (position < 0) onActive(visible[0].index);
    setViewer('slideshow'); setPlaying(!reducedMotion && visible.length > 1);
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopyState('copied'); }
    catch { setCopyState('failed'); }
  };
  const downloadPhotos = async () => {
    if (!canDownload || !current || downloadRequest.current || downloadBusy) return;
    if (gallery.downloadEmailRequired && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(downloadEmail.trim()))) { setDownloadState('failed'); setDownloadError('Indiquez un courriel valide.'); return; }
    const controller = new AbortController();
    downloadRequest.current = controller;
    const total = downloadScope === 'all' ? photos.length : 1;
    setDownloadState('busy'); setDownloadError(''); setDownloadProgress({ done: 0, total });
    const isCurrentRequest = () => downloadRequest.current === controller && !controller.signal.aborted;
    try {
      let blob;
      let filename;
      let downloadPhotoUrl = photoUrl;
      const register = async () => {
        if (!gallery.downloadEmailRequired) return;
        const result = await api(`/galerie/${gallery.slug}/download-request`, {method:'POST',signal:controller.signal,body:JSON.stringify({email:downloadEmail,category,quality,photoIds:(downloadScope === 'all' ? photos : [current]).map(p=>p.id)})});
        downloadPhotoUrl = (...args) => { const url=photoUrl(...args); return `${url}${url.includes('?') ? '&' : '?'}d=${encodeURIComponent(result.downloadId)}&dt=${encodeURIComponent(result.token)}`; };
      };
      if (downloadScope === 'all') {
        filename = archiveFilename(`${gallery.slug}-${category}`, quality);
        let writable;
        if (typeof window.showSaveFilePicker === 'function') {
          // Invoke the picker in the click event, before the first await.
          const handle = await window.showSaveFilePicker({ suggestedName: filename,
            types: [{ description: 'Archive ZIP', accept: { 'application/zip': ['.zip'] } }],
          });
          if (!isCurrentRequest()) return;
          writable = await handle.createWritable();
          if (!isCurrentRequest()) { await writable.abort().catch(() => {}); return; }
        }
        try { await register(); } catch (error) { if (writable) await writable.abort().catch(() => {}); throw error; }
        // Once passed in, the helper owns the destination's commit or abort.
        blob = await prepareGalleryDownload({ photos, quality, photoUrl: downloadPhotoUrl, signal: controller.signal, writable,
          onProgress: (value) => { if (isCurrentRequest()) setDownloadProgress(value); },
        });
      } else {
        await register();
        ({ blob, filename } = await preparePhotoDownload({ photo: current, quality, photoUrl: downloadPhotoUrl, signal: controller.signal }));
      }
      if (!isCurrentRequest()) return;
      if (blob !== null) {
        if (downloadObject.current) URL.revokeObjectURL(downloadObject.current);
        window.clearTimeout(downloadTimer.current);
        const objectUrl = URL.createObjectURL(blob);
        downloadObject.current = objectUrl;
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        downloadTimer.current = window.setTimeout(() => { URL.revokeObjectURL(objectUrl); downloadObject.current = null; }, 1000);
      }
      setDownloadProgress({ done: total, total }); setDownloadState(blob === null ? 'saved' : 'done');
    } catch (error) {
      if (isCurrentRequest()) {
        setDownloadError(error.code === 'ARCHIVE_TOO_LARGE' ? error.message : '');
        setDownloadState(error.name === 'AbortError' ? 'cancelled' : 'failed');
      }
    } finally { if (downloadRequest.current === controller) downloadRequest.current = null; }
  };
  const saveToPhone = async (batch = phoneFiles, automatic = false) => {
    if (!batch) return;
    try {
      await navigator.share({ files: batch.files });
    } catch (error) {
      // Menu fermé, ou le téléphone exige un nouveau toucher : le bouton reste prêt.
      if (error?.name === 'AbortError' || (automatic && error?.name === 'NotAllowedError')) return;
      setPhoneFiles(null); setDownloadState('failed');
      setDownloadError('Votre téléphone n’a pas pu ouvrir l’enregistrement. Utilisez le téléchargement ci-dessous.');
      return;
    }
    setPhoneFiles(null); setPhoneSaved(batch.end);
    setDownloadState(batch.end < batch.total ? 'phone-next' : 'phone-done');
  };
  const preparePhone = async (start = 0) => {
    if (!canDownload || !canSaveToPhone || !current || downloadRequest.current || downloadBusy) return;
    if (gallery.downloadEmailRequired && !EMAIL_PATTERN.test(downloadEmail.trim())) { setDownloadState('failed'); setDownloadError('Indiquez un courriel valide.'); return; }
    const list = downloadScope === 'all' ? photos.slice(start, start + phoneBatch) : [current];
    if (!list.length) return;
    const total = downloadScope === 'all' ? photos.length : 1;
    const controller = new AbortController();
    downloadRequest.current = controller;
    setPhoneFiles(null); setDownloadState('busy'); setDownloadError(''); setDownloadProgress({ done: 0, total: list.length, phone: true });
    const isCurrentRequest = () => downloadRequest.current === controller && !controller.signal.aborted;
    try {
      if (!gallery.downloadEmailRequired) phoneUrl.current = photoUrl;
      else if (start === 0 || !phoneUrl.current) {
        const result = await api(`/galerie/${gallery.slug}/download-request`, { method: 'POST', signal: controller.signal, body: JSON.stringify({ email: downloadEmail, category, quality, photoIds: (downloadScope === 'all' ? photos : [current]).map((p) => p.id) }) });
        phoneUrl.current = (...args) => { const url = photoUrl(...args); return `${url}${url.includes('?') ? '&' : '?'}d=${encodeURIComponent(result.downloadId)}&dt=${encodeURIComponent(result.token)}`; };
      }
      const files = [];
      for (const photo of list) {
        const { blob, filename } = await preparePhotoDownload({ photo, quality, photoUrl: phoneUrl.current, signal: controller.signal });
        files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
        if (isCurrentRequest()) setDownloadProgress({ done: files.length, total: list.length, phone: true });
      }
      if (!isCurrentRequest()) return;
      downloadRequest.current = null;
      const batch = { files, start, end: start + list.length, total };
      setPhoneFiles(batch); setDownloadState('phone-ready');
      await saveToPhone(batch, true);
    } catch (error) {
      if (isCurrentRequest()) { setDownloadError(''); setDownloadState(error.name === 'AbortError' ? 'cancelled' : 'failed'); }
    } finally { if (downloadRequest.current === controller) downloadRequest.current = null; }
  };
  const cancelDownload = () => { abortDownload(); setDownloadState('cancelled'); };
  const currentPicked = current ? picks.has(current.id) : false;
  const currentNote = current ? notes[current.id] || '' : '';

  return <div className={`light-gallery${downloadMode ? ' light-gallery--download' : picks.size ? ' light-gallery--has-selection' : ''}`}>
    <section className="light-cover" aria-labelledby="light-gallery-title">
      {coverId && <img className="light-cover__photo" src={photoUrl(coverId, 'web')} alt="" fetchPriority="high" />}
      <header className="light-cover__top">
        <span className="light-cover__brand">Behn J. <em>Productions</em></span>
        <span className="light-cover__private">Galerie privée</span>
      </header>
      <div className="light-cover__bottom">
        <div className="light-cover__title">
          <p>{eyebrow}</p>
          <h1 id="light-gallery-title">{clientName}</h1>
          <span>Chaque détail compte</span>
        </div>
        <button className="light-cover__enter" type="button" onClick={scrollToPhotos}>{downloadMode ? 'Accéder à mes photos' : 'Voir la galerie'} <ArrowDown size={18} weight="regular" aria-hidden="true" /></button>
      </div>
    </section>

    <header className="light-toolbar">
      {sections.length ? <nav className="light-sections" aria-label="Sections de la galerie">
        <button type="button" aria-pressed={section === 'all' && !favoritesOnly} onClick={() => chooseSection('all')}>Tout <span>{photos.length}</span></button>
        {sections.map((item) => <button key={item.id} type="button" aria-pressed={section === item.id && !favoritesOnly} onClick={() => chooseSection(item.id)}>{item.label} <span>{item.count}</span></button>)}
      </nav> : <a className="light-toolbar__identity" href="#light-photographies" onClick={(event) => { event.preventDefault(); scrollToPhotos(); }}>
        <strong>{clientName}</strong><span>Behn J. Productions</span>
      </a>}
      <nav className="light-toolbar__actions" aria-label="Outils de la galerie">
        {!downloadMode && <button className={`light-pill${favoritesOnly ? ' is-active' : ''}`} type="button" aria-pressed={favoritesOnly}
          onClick={() => { setFavoritesOnly((value) => !value); scrollToPhotos(); }}>
          <Heart size={18} weight={favoritesOnly ? 'fill' : 'regular'} aria-hidden="true" /><span>Favoris · {picks.size}</span></button>}
        <button className="light-pill" type="button" onClick={openSlideshow} disabled={!visible.length}><Play size={18} aria-hidden="true" /><span>Diaporama</span></button>
        {canDownload && <button className="light-pill" type="button" onClick={() => openDownload('all')} disabled={!photos.length} aria-label="Télécharger toutes les photos"><DownloadSimple size={18} aria-hidden="true" /><span>Télécharger</span></button>}
        <button className="light-icon" type="button" onClick={() => openPanel('share')} aria-label="Partager la galerie" title="Partager"><ShareFat size={20} /></button>
        <a className="light-icon" href={`/boutique?galerie=${encodeURIComponent(gallery.slug)}#murs`} target="bjp-boutique" aria-label="Boutique d’impression" title="Boutique d’impression"><ShoppingCart size={20} /></a>
      </nav>
    </header>

    <main className="light-main" id="light-photographies" ref={gridRef}>
      {gallery.draft && <p className="light-draft">Aperçu privé — cette galerie n’est pas encore publiée.</p>}
      {!schoolSelection && categoriesShown.length > 1 && <nav className="light-categories" aria-label="Versions des photos">
        {categoriesShown.map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => onCategory?.(item.id)}>{item.label}<span>{item.count}</span></button>)}
      </nav>}
      <div className="light-collection-heading">
        <h2>{heading}</h2>
        {downloadMode ? <div className="light-collection-heading__side">
          <p>{countLabel(visible.length)} · À conserver et à partager</p>
          {canDownload && photos.length > 0 && <button className="light-button light-download-all" type="button" onClick={() => openDownload('all')}><DownloadSimple size={18} /> Télécharger toutes les photos</button>}
        </div> : favoritesOnly ? <button className="light-text-button" type="button" onClick={() => setFavoritesOnly(false)}>Toutes les photos <ArrowRight size={16} /></button>
          : <p className="light-collection-heading__hint">{maxPicks > 0
            ? `Touchez le cœur pour choisir vos photos. Votre forfait en comprend ${maxPicks} · ${extraPrice} $ CAD par photo supplémentaire.`
            : 'Touchez le cœur pour choisir vos photos, puis envoyez votre sélection.'}</p>}
      </div>
      {!downloadMode && employeeGallery && <div className="light-employee"><p>Sélection de <strong>{employeeName}</strong></p><button className="light-text-button" type="button" disabled={sending} onClick={onChangeEmployee}>Changer d’employé</button></div>}
      {visible.length ? <div className="light-photo-grid">
        {visible.map(({ photo, index }) => <article className={`light-photo${picks.has(photo.id) ? ' is-selected' : ''}`} key={photo.id}>
          <button className="light-photo__open" type="button" onClick={() => openPhoto(index)} aria-label={`Agrandir la photo ${index + 1}`}>
            <img src={photoUrl(photo.id, 'web')} alt={`Photo ${index + 1} de ${clientName}`} width={photo.w || photo.width || undefined} height={photo.h || photo.height || undefined} loading="lazy" decoding="async" />
          </button>
          {notes[photo.id] && !downloadMode && <span className="light-photo__note" title="Note de retouche"><NotePencil size={15} aria-hidden="true" /><span className="light-sr">Note de retouche</span></span>}
          {downloadMode ? canDownload && <button className="light-photo__heart" type="button" onClick={() => { onActive(index); openDownload('single', photo); }} aria-label={`Télécharger la photo ${index + 1}`}><DownloadSimple size={20} /></button>
            : <button className={`light-photo__heart${picks.has(photo.id) ? ' is-selected' : ''}`} type="button" disabled={selectionDisabled} onClick={() => onToggle(photo.id)}
              aria-label={`${picks.has(photo.id) ? 'Retirer' : 'Ajouter'} la photo ${index + 1} ${picks.has(photo.id) ? 'des' : 'aux'} favoris`} aria-pressed={picks.has(photo.id)}><Heart size={20} weight={picks.has(photo.id) ? 'fill' : 'regular'} /></button>}
          {schoolSelection && photo.filename && <span className="light-photo__code">Code : {photo.filename}</span>}
        </article>)}
      </div> : <div className="light-empty">
        {favoritesOnly ? <Heart size={34} weight="thin" /> : <ImageSquare size={34} weight="thin" />}
        <h3>{favoritesOnly ? 'Vos coups de cœur commencent ici.' : 'Vos photos arrivent bientôt.'}</h3>
        <p>{favoritesOnly ? 'Touchez le cœur sur une photo pour la retrouver dans votre sélection.' : 'Revenez dans cette galerie pour les découvrir.'}</p>
        {favoritesOnly && <button className="light-button" type="button" onClick={() => setFavoritesOnly(false)}>Découvrir les photos <ArrowRight size={18} /></button>}
      </div>}
    </main>
    <footer className="light-footer">
      <div><p className="light-footer__tagline">Chaque détail compte.</p>
        <p className="light-footer__contact">Behn J. Productions · Sept-Îles{brand?.phone ? ` · ${brand.phone}` : ''}</p></div>
      <a href={contactUrl}>Une question? Écrivez-nous</a>
    </footer>

    {!downloadMode && picks.size > 0 && <aside className="light-selection" aria-label="Confirmer votre sélection">
      <div className="light-selection__count">
        {maxPicks > 0 && <span className="light-selection__bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>}
        <div>
          <p role="status" aria-live="polite"><strong>{picks.size}</strong>{maxPicks ? ` / ${maxPicks} photos` : ` photo${picks.size > 1 ? 's' : ''}`}</p>
          {extras > 0 && <span className="light-selection__extra">+ {extras} en supplément · {extras * extraPrice} $</span>}
          {sent && sent !== true && <span><Check size={12} /> Déjà envoyée · vous pouvez la modifier</span>}
        </div>
      </div>
      <div className="light-selection__action">{sendError && <p className="light-error" role="alert">{sendError}</p>}
        <button className="light-button" type="button" disabled={selectionDisabled} onClick={submit}>{sending ? 'Envoi…' : employeeGallery ? (sent ? 'Envoyer ma sélection modifiée' : 'Confirmer ma sélection') : (sent ? 'Renvoyer ma sélection' : 'Envoyer ma sélection')}</button>
      </div>
    </aside>}

    {viewer && current && sent !== true && <Dialog className="light-overlay light-overlay--viewer" label={viewer === 'slideshow' ? 'Diaporama de votre galerie' : 'Photo agrandie'} onClose={closeViewer} onMove={move}>
      <div className="light-viewer__top">
        <div className="light-viewer__title">
          <button className="light-round" type="button" onClick={closeViewer} aria-label="Fermer la photo"><X size={20} /></button>
          <div><strong>{current.section || clientName}</strong>
            <span aria-live={playing ? 'off' : 'polite'}>{position >= 0 ? `${position + 1} / ${visible.length}` : `${active + 1} / ${photos.length}`}{schoolSelection && current.filename ? ` · Code : ${current.filename}` : ''}</span></div>
        </div>
        <div className="light-viewer__tools">
          <button className="light-pill" type="button" onClick={() => setPlaying((value) => !value)} disabled={visible.length < 2}>{playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}<span>{playing ? 'Pause' : 'Diaporama'}</span></button>
          {canDownload && <button className="light-pill" type="button" onClick={() => openDownload('single')} aria-label="Télécharger cette photo"><DownloadSimple size={17} aria-hidden="true" /><span>Télécharger</span></button>}
          {!downloadMode && <button className={`light-pill${currentPicked ? ' is-active' : ''}`} type="button" disabled={selectionDisabled} onClick={() => onToggle(current.id)} aria-pressed={currentPicked} aria-label={currentPicked ? 'Retirer cette photo des favoris' : 'Ajouter cette photo aux favoris'}>
            <Heart size={17} weight={currentPicked ? 'fill' : 'regular'} aria-hidden="true" /><span>{currentPicked ? 'Dans mes favoris' : 'Ajouter aux favoris'}</span></button>}
        </div>
      </div>
      <div className="light-viewer__stage">
        <button className="light-round light-round--large" type="button" onClick={() => move(-1)} disabled={visible.length < 2} aria-label="Photo précédente"><CaretLeft size={22} /></button>
        <div className="light-viewer__image"><img src={photoUrl(current.id, 'web')} alt={`Photo ${active + 1} de ${clientName}`} /></div>
        {!downloadMode && <aside className="light-viewer__note">
          <label htmlFor="light-note">Note pour Behn</label>
          <textarea id="light-note" rows={4} maxLength={500} value={currentNote} placeholder="Ex. : enlever un objet à gauche, recadrer plus serré…"
            onChange={(event) => setNote(current.id, event.target.value)} />
          <p>{currentNote && !currentPicked ? 'Ajoutez cette photo à vos favoris pour envoyer la note.' : 'La note part avec votre sélection.'}</p>
        </aside>}
        <button className="light-round light-round--large" type="button" onClick={() => move(1)} disabled={visible.length < 2} aria-label="Photo suivante"><CaretRight size={22} /></button>
      </div>
      {visible.length > 1 && <div className="light-viewer__film" ref={filmRef}>
        {visible.map(({ photo, index }) => <button key={photo.id} type="button" onClick={() => onActive(index)} aria-current={index === active ? 'true' : undefined}
          aria-label={`Afficher la photo ${index + 1}${picks.has(photo.id) ? ', dans vos favoris' : ''}`} className={picks.has(photo.id) ? 'is-selected' : ''}>
          <img src={photoUrl(photo.id)} alt="" loading="lazy" decoding="async" />
        </button>)}
      </div>}
    </Dialog>}

    {toolPanel && sent !== true && <Dialog className="light-overlay light-overlay--panel" labelledBy="light-panel-title" onClose={closePanel}>
      <button className="light-round light-panel__close" type="button" onClick={closePanel} aria-label="Fermer"><X size={20} /></button>
      {toolPanel === 'share' ? <>
        <p className="light-panel__eyebrow">Partager</p><h2 id="light-panel-title">Partager ces souvenirs</h2>
        <p>Copiez le lien de votre galerie. Si un mot de passe vous a été remis, il reste nécessaire pour accéder à la galerie.</p>
        <label className="light-share-field"><span>Lien de la galerie</span><input type="text" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>
        <button className="light-button" type="button" onClick={copyLink}>{copyState === 'copied' ? <><Check size={18} /> Lien copié</> : <><Copy size={18} /> Copier le lien</>}</button>
        <p className={copyState === 'failed' ? 'light-error' : 'light-status'} role="status">{copyState === 'failed' ? 'Copie impossible. Sélectionnez le lien ci-dessus pour le copier.' : copyState === 'copied' ? 'Le lien est prêt à partager.' : ''}</p>
      </> : <>
        <p className="light-panel__eyebrow">Téléchargement</p><h2 id="light-panel-title">Vos photos, prêtes à garder</h2>
        {canDownload && current ? <><p>{downloadScope === 'all' ? `Retrouvez toutes les photos de la catégorie ${PHOTO_CATEGORIES.find((item) => item.id === category)?.label || 'FULL SIZE'} ${canSaveToPhone ? 'directement dans votre galerie.' : 'dans un seul fichier ZIP.'}` : 'Enregistrez cette photo sur votre appareil pour la garder et la partager.'}</p>
          {gallery.downloadEmailRequired && <div className="light-download-contact">
            <label>Courriel<input type="email" autoComplete="email" maxLength={254} value={downloadEmail} disabled={downloadBusy} onChange={e=>setDownloadEmail(e.target.value)} required /></label>
            <p>Votre courriel est transmis à Behn J. Productions pour enregistrer votre demande de téléchargement. Il ne vous inscrit pas à des communications promotionnelles.</p>
          </div>}
          <fieldset className="light-download-scope" disabled={downloadBusy}>
            <legend>Quelles photos?</legend>
            <label><input type="radio" name="download-scope" value="all" checked={downloadScope === 'all'} onChange={() => setDownloadOptions('all')} /><span>Toute la galerie</span><small>{countLabel(photos.length)}</small></label>
            <label><input type="radio" name="download-scope" value="single" checked={downloadScope === 'single'} onChange={() => setDownloadOptions('single')} /><span>Cette photo</span><small>{photoName(current, active)}</small></label>
          </fieldset>
          {downloadScope === 'single' && <div className="light-download-photo"><img src={photoUrl(current.id)} alt="" /><span>{photoName(current, active)}<small>Photo {active + 1} sur {photos.length}</small></span></div>}
          <fieldset className="light-download-quality" disabled={downloadBusy}>
            <legend>Format</legend>
            <label className={originalAvailable ? '' : 'is-unavailable'}><input type="radio" name="download-quality" value="original" checked={quality === 'original'} disabled={!originalAvailable} onChange={() => { setDownloadQuality('original'); setDownloadState(''); setPhoneFiles(null); setPhoneSaved(0); }} /><span>Haute résolution<small>Taille originale · pour l’impression</small></span></label>
            <label><input type="radio" name="download-quality" value="social" checked={quality === 'social'} onChange={() => { setDownloadQuality('social'); setDownloadState(''); setPhoneFiles(null); setPhoneSaved(0); }} /><span>Web<small>Réseaux sociaux · 2 000 px</small></span></label>
          </fieldset>
          {!originalAvailable && <p className="light-download-note">{downloadScope === 'all' ? 'Les fichiers en taille originale ne sont pas encore disponibles pour toutes les photos. Vous pouvez télécharger la version web.' : 'Le fichier en taille originale n’est pas disponible pour cette photo. La version web reste accessible.'}</p>}
          {downloadBusy && <div className="light-download-progress">
            <progress value={downloadProgress.done} max={downloadProgress.total || 1} aria-label="Préparation des photos" />
            <p role="status">{downloadProgress.done} / {downloadProgress.total} photo{downloadProgress.total > 1 ? 's' : ''} préparée{downloadProgress.total > 1 ? 's' : ''}{downloadScope === 'all' && !downloadProgress.phone && downloadProgress.done === downloadProgress.total ? ' · Création du ZIP…' : '…'}</p>
          </div>}
          {canSaveToPhone && <div className="light-phone-save">
            {phoneFiles && !downloadBusy
              ? <button className="light-button light-button--wide" type="button" onClick={() => saveToPhone()}><DeviceMobile size={18} />{phoneFiles.total > 1 ? `Enregistrer les photos ${phoneFiles.start + 1} à ${phoneFiles.end}` : 'Enregistrer dans ma galerie'}</button>
              : <button className="light-button light-button--wide" type="button" onClick={() => preparePhone(downloadState === 'phone-next' ? phoneSaved : 0)} disabled={downloadBusy}><DeviceMobile size={18} />{downloadBusy ? 'Préparation…' : downloadState === 'phone-next' ? `Continuer : photos ${phoneSaved + 1} à ${Math.min(phoneSaved + phoneBatch, photos.length)}` : 'Enregistrer dans ma galerie'}</button>}
            <p className="light-status" role="status">{downloadState === 'phone-ready' ? 'Prêt! Touchez le bouton, puis choisissez « Enregistrer l’image » dans le menu.' : downloadState === 'phone-next' ? `${phoneSaved} photos sur ${photos.length} envoyées vers votre galerie. Continuez avec la suite.` : downloadState === 'phone-done' ? 'C’est fait! Retrouvez vos photos dans l’app Photos de votre téléphone.' : 'Les photos vont directement dans l’app Photos de votre téléphone.'}</p>
          </div>}
          <button className={canSaveToPhone ? 'light-text-button light-download-alt' : 'light-button light-button--wide'} type="button" onClick={downloadPhotos} disabled={downloadBusy}><DownloadSimple size={18} />{downloadBusy ? 'Préparation…' : downloadScope === 'all' ? 'Télécharger toutes les photos (.zip)' : 'Télécharger cette photo'}</button>
          {downloadBusy && <button className="light-download-cancel light-text-button" type="button" onClick={cancelDownload}>Annuler</button>}
          <p className={downloadState === 'failed' ? 'light-error' : 'light-status'} role="status">{downloadState === 'failed' ? downloadError || 'Le téléchargement a échoué. Aucun fichier n’a été téléchargé. Réessayez ou écrivez-nous.' : downloadState === 'saved' ? 'Votre fichier ZIP a été enregistré.' : downloadState === 'done' ? 'Le téléchargement a été lancé.' : downloadState === 'cancelled' ? 'Préparation annulée. Aucun fichier n’a été téléchargé.' : ''}</p>
          {downloadScope === 'all' && (downloadState === 'done' || downloadState === 'saved' || downloadState === 'phone-done') && <div className="light-review">
            <div className="light-review__stars" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={16} weight="fill" />)}</div>
            <h3>Un petit mot avant de partir?</h3>
            <p>Votre avis Google nous aiderait beaucoup. Ça prend une minute et ça fait une vraie différence pour une entreprise d’ici.</p>
            <a className="light-button" href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">Laisser un avis Google</a>
          </div>}
          {downloadScope === 'single' && <div className="light-download-nav"><button className="light-text-button" type="button" disabled={downloadBusy || photos.length < 2} onClick={() => moveDownloadPhoto(-1)}><CaretLeft size={16} /> Précédente</button><span>{active + 1} / {photos.length}</span><button className="light-text-button" type="button" disabled={downloadBusy || photos.length < 2} onClick={() => moveDownloadPhoto(1)}>Suivante <CaretRight size={16} /></button></div>}
        </> : <><p>Vos photos finales seront disponibles après la confirmation de votre sélection et leur préparation.</p><p>En attendant, choisissez vos coups de cœur dans la galerie.</p><a className="light-button" href={contactUrl}>Une question? Écrivez-nous</a></>}
      </>}
    </Dialog>}

    {!downloadMode && sent === true && <Dialog className="light-overlay light-overlay--panel light-overlay--thanks" labelledBy="light-success-title" onClose={onCloseReview}>
      <button className="light-round light-panel__close" type="button" onClick={onCloseReview} aria-label="Fermer"><X size={20} /></button>
      <span className="light-thanks__check" aria-hidden="true"><Check size={28} /></span>
      <h2 id="light-success-title">{employeeName ? `Merci, ${employeeName}!` : <>Merci, votre sélection <em>est bien reçue</em></>}</h2>
      <p>{countLabel(picks.size)} choisie{picks.size > 1 ? 's' : ''}. Je commence les retouches et je vous écris dès que vos photos finales sont prêtes.</p>
      {extras > 0 && <p className="light-selection__extra">{extras} photo{extras > 1 ? 's' : ''} en supplément · {extras * extraPrice} $ CAD s’ajouteront à votre facture.</p>}
      {!employeeGallery && <div className="light-review">
        <div className="light-review__stars" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={18} weight="fill" />)}</div>
        <p>Votre expérience vous a plu? Un avis Google m’aide énormément à me faire connaître sur la Côte-Nord.</p>
        <a className="light-button" href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">Laisser un avis Google</a>
      </div>}
      <button className="light-text-button light-thanks__back" type="button" onClick={onCloseReview}>Revenir à la galerie</button>
    </Dialog>}
  </div>;
}
