import { PHOTO_CATEGORIES, categoryPhotos } from './gallery-categories.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, CaretDown, CaretLeft, CaretRight, Check, Copy, DownloadSimple, Heart, ImageSquare, Pause, Play, ShareFat, ShoppingCart, Star, X } from '@phosphor-icons/react';
import { archiveFilename, prepareGalleryDownload, preparePhotoDownload } from './gallery-downloads.js';
import { api } from './api.js';
import './light-gallery.css';

const countLabel = (count) => `${count} photo${count > 1 ? 's' : ''}`;
const GOOGLE_REVIEW_URL = 'https://g.page/r/CQkeWPsjYGSdEBM/review';
const photoName = (photo, index) => photo?.downloadFilename || photo?.filename || `Photo ${index + 1}`;

export function LightGallery({ category = 'full', onCategory, gallery, photos, picks, active, onActive, onToggle, sending, sent, onSend, sendError,
  employeeName, employeeGallery, onChangeEmployee, onCloseReview, photoUrl, Dialog, contactUrl, brand }) {
  const [favoritesOnly, setFavoritesOnly] = useState(false);
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
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const gridRef = useRef(null);
  const downloadRequest = useRef(null);
  const downloadObject = useRef(null);
  const downloadTimer = useRef(null);
  const current = photos[active] || photos[0];
  const cover = (gallery.photos || photos).find((photo) => photo.id === gallery.cover) || (gallery.photos || photos)[0];
  const coverId = gallery.cover?.startsWith('cover-') ? gallery.cover : cover?.id;
  const downloadMode = gallery.mode === 'download';
  const schoolSelection = gallery.collectionType === 'school' && !downloadMode;
  const visible = photos.map((photo, index) => ({ photo, index })).filter(({ photo }) => downloadMode || !favoritesOnly || picks.has(photo.id));
  const maxPicks = gallery.maxPicks;
  const extraPrice = gallery.extraPrice ?? 25;
  const extras = maxPicks ? Math.max(0, picks.size - maxPicks) : 0;
  const canDownload = downloadMode && gallery.downloadsEnabled === true;
  const originalAvailable = downloadScope === 'all'
    ? photos.length > 0 && photos.every((photo) => photo.downloadQuality === 'original')
    : current?.downloadQuality === 'original';
  const quality = downloadQuality === 'original' && originalAvailable ? 'original' : 'social';
  const downloadBusy = downloadState === 'busy';
  const selectionDisabled = sending || (employeeGallery && !employeeName?.trim());
  // A share link identifies the gallery only. Never copy the session or preview query.
  const shareUrl = `https://behnjproductions.ca/galerie/${encodeURIComponent(gallery.slug)}`;
  const move = useCallback((step) => {
    if (photos.length) onActive((active + step + photos.length) % photos.length);
  }, [active, photos.length, onActive]);
  const closeViewer = useCallback(() => { setViewer(null); setPlaying(false); }, []);
  const abortDownload = useCallback(() => {
    const controller = downloadRequest.current;
    downloadRequest.current = null;
    controller?.abort();
  }, []);
  const closePanel = useCallback(() => {
    abortDownload();
    setToolPanel(null); setCopyState(''); setDownloadState(''); setDownloadError('');
    setDownloadProgress({ done: 0, total: 0 });
  }, [abortDownload]);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = () => { setReducedMotion(Boolean(query?.matches)); if (query?.matches) setPlaying(false); };
    query?.addEventListener?.('change', change);
    return () => query?.removeEventListener?.('change', change);
  }, []);
  useEffect(() => {
    if (!viewer || !playing || photos.length < 2) return undefined;
    const interval = window.setInterval(() => move(1), 5000);
    return () => window.clearInterval(interval);
  }, [viewer, playing, photos.length, move]);
  useEffect(() => {
    if (sent === true) { closeViewer(); closePanel(); }
  }, [sent, closeViewer, closePanel]);
  useEffect(() => () => {
    abortDownload();
    window.clearTimeout(downloadTimer.current);
    if (downloadObject.current) URL.revokeObjectURL(downloadObject.current);
  }, [abortDownload]);

  const scrollToPhotos = () => gridRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  const openPanel = (panel) => {
    if (downloadRequest.current) return;
    closeViewer(); setCopyState(''); setDownloadState(''); setToolPanel(panel);
  };
  const setDownloadOptions = (scope, photo = current) => {
    if (downloadRequest.current) return;
    const hasOriginals = scope === 'all' ? photos.length > 0 && photos.every((item) => item.downloadQuality === 'original') : photo?.downloadQuality === 'original';
    setDownloadScope(scope); setDownloadQuality(hasOriginals ? 'original' : 'social');
    setDownloadState(''); setDownloadError(''); setDownloadProgress({ done: 0, total: 0 });
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
    if (downloadRequest.current) return;
    setToolPanel(null); setViewer('slideshow'); setPlaying(!reducedMotion && photos.length > 1);
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
          onProgress: (progress) => { if (isCurrentRequest()) setDownloadProgress(progress); },
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
  const cancelDownload = () => { abortDownload(); setDownloadState('cancelled'); };

  return <div className={`light-gallery${downloadMode ? ' light-gallery--download' : picks.size ? ' light-gallery--has-selection' : ''}`}>
    <section className="light-cover" aria-labelledby="light-gallery-title">
      {coverId && <img className="light-cover__photo" src={photoUrl(coverId, 'web')} alt="" fetchPriority="high" />}
      <div className="light-cover__brand">Behn J. Productions</div>
      <div className="light-cover__title">
        <p>{downloadMode ? 'Vos photos sont prêtes' : 'Votre galerie privée'}</p>
        <h1 id="light-gallery-title">{gallery.client || gallery.title}</h1>
        <span>Chaque détail compte</span>
      </div>
      <button className="light-cover__enter" type="button" onClick={scrollToPhotos}>{downloadMode ? 'Accéder à mes photos' : 'Découvrir les photos'} <CaretDown size={21} weight="thin" aria-hidden="true" /></button>
    </section>

    <header className="light-toolbar">
      <a className="light-toolbar__identity" href="#light-photographies" onClick={(event) => { event.preventDefault(); scrollToPhotos(); }}>
        <strong>{gallery.client || gallery.title}</strong><span>Behn J. Productions</span>
      </a>
      <nav className="light-toolbar__actions" aria-label="Outils de la galerie">
        <a className="light-store-link" href={`/boutique?galerie=${encodeURIComponent(gallery.slug)}#murs`} target="bjp-boutique">Boutique d’impression</a>
        <span className="light-toolbar__divider" aria-hidden="true" />
        <a className="light-icon" href={`/boutique?galerie=${encodeURIComponent(gallery.slug)}#boutique-top`} target="bjp-boutique" aria-label="Ouvrir le panier dans la boutique" title="Boutique et panier"><ShoppingCart size={24} weight="thin" /></a>
        {!downloadMode && <button className={`light-icon${favoritesOnly ? ' is-active' : ''}`} type="button" aria-label={`Afficher mes favoris, ${countLabel(picks.size)}`} aria-pressed={favoritesOnly} title="Mes favoris"
          onClick={() => { setFavoritesOnly((value) => !value); scrollToPhotos(); }}><Heart size={24} weight={favoritesOnly ? 'fill' : 'thin'} />{picks.size > 0 && <span className="light-icon__count">{picks.size}</span>}</button>}
        {canDownload && <button className="light-icon" type="button" onClick={() => openDownload('all')} disabled={!photos.length} aria-label="Télécharger toutes les photos" title="Tout télécharger"><DownloadSimple size={24} weight="thin" /></button>}
        <button className="light-icon" type="button" onClick={() => openPanel('share')} aria-label="Partager la galerie" title="Partager"><ShareFat size={24} weight="thin" /></button>
        <button className="light-icon" type="button" onClick={openSlideshow} disabled={!photos.length} aria-label="Ouvrir le diaporama" title="Diaporama"><Play size={24} weight="thin" /></button>
      </nav>
    </header>

    <main className="light-main" id="light-photographies" ref={gridRef}>
      {gallery.draft && <p className="light-package">Aperçu privé — cette galerie n’est pas encore publiée.</p>}
      {!schoolSelection && <nav className="light-categories" aria-label="Catégories de photos">
        {PHOTO_CATEGORIES.map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => onCategory?.(item.id)}>{item.label}<span>{categoryPhotos(gallery.photos || photos, item.id).length}</span></button>)}
      </nav>}
      <div className="light-collection-heading">
        <div><h2>{downloadMode ? 'Vos photos à télécharger' : favoritesOnly ? 'Mes favoris' : 'Photographies'}</h2><p>{downloadMode ? `${countLabel(photos.length)} · À conserver et à partager` : favoritesOnly ? `${countLabel(visible.length)} dans cette catégorie` : `${countLabel(photos.length)} · Vos souvenirs, à votre rythme`}</p></div>
        {downloadMode ? canDownload && photos.length > 0 && <button className="light-button light-download-all" type="button" onClick={() => openDownload('all')}><DownloadSimple size={19} weight="thin" /> Télécharger toutes les photos</button>
          : favoritesOnly ? <button className="light-text-button" type="button" onClick={() => setFavoritesOnly(false)}>Toutes les photos <ArrowRight size={17} weight="light" /></button>
            : <span className="light-collection-heading__hint"><Heart size={17} weight="thin" /> Un cœur pour vos coups de cœur</span>}
      </div>
      {!downloadMode && employeeGallery && <div className="light-employee"><p>Sélection de <strong>{employeeName}</strong></p><button className="light-text-button" type="button" disabled={sending} onClick={onChangeEmployee}>Changer d’employé</button></div>}
      {!downloadMode && maxPicks > 0 && <p className="light-package">{countLabel(maxPicks)} incluse{maxPicks > 1 ? 's' : ''} · {extraPrice} $ CAD par photo supplémentaire</p>}
      {visible.length ? <div className="light-photo-grid">
        {visible.map(({ photo, index }) => <article className="light-photo" key={photo.id}>
          <button className="light-photo__open" type="button" onClick={() => { onActive(index); setViewer('photo'); setPlaying(false); }} aria-label={`Agrandir la photo ${index + 1}`}>
            <img src={photoUrl(photo.id, 'web')} alt={`Photo ${index + 1} de ${gallery.client || gallery.title}`} width={photo.w || photo.width || undefined} height={photo.h || photo.height || undefined} loading="lazy" decoding="async" />
          </button>
          {downloadMode ? canDownload && <button className="light-photo__heart" type="button" onClick={() => { onActive(index); openDownload('single', photo); }} aria-label={`Télécharger la photo ${index + 1}`}><DownloadSimple size={22} weight="light" /></button>
            : <button className={`light-photo__heart${picks.has(photo.id) ? ' is-selected' : ''}`} type="button" disabled={selectionDisabled} onClick={() => onToggle(photo.id)}
              aria-label={`${picks.has(photo.id) ? 'Retirer' : 'Ajouter'} la photo ${index + 1} ${picks.has(photo.id) ? 'des' : 'aux'} favoris`} aria-pressed={picks.has(photo.id)}><Heart size={22} weight={picks.has(photo.id) ? 'fill' : 'light'} /></button>}
          {schoolSelection && photo.filename && <span className="light-photo__code">Code : {photo.filename}</span>}
        </article>)}
      </div> : <div className="light-empty">
        {favoritesOnly ? <Heart size={35} weight="thin" /> : <ImageSquare size={35} weight="thin" />}
        <h3>{favoritesOnly ? 'Vos coups de cœur commencent ici.' : 'Vos photos arrivent bientôt.'}</h3>
        <p>{favoritesOnly ? 'Touchez le cœur sur une photo pour la retrouver dans votre sélection.' : 'Revenez dans cette galerie pour les découvrir.'}</p>
        {favoritesOnly && <button className="light-button" type="button" onClick={() => setFavoritesOnly(false)}>Découvrir les photos <ArrowRight size={18} /></button>}
      </div>}
      <footer className="light-footer"><p>Behn J. Productions</p><span>Chaque détail compte</span><a href={contactUrl}>Une question? Écrivez-nous</a></footer>
    </main>

    {!downloadMode && picks.size > 0 && <aside className="light-selection" aria-label="Confirmer votre sélection">
      <div className="light-selection__count"><Heart size={25} weight="thin" aria-hidden="true" /><div><p role="status" aria-live="polite">{countLabel(picks.size)} sélectionnée{picks.size > 1 ? 's' : ''}{maxPicks ? ` / ${maxPicks} incluse${maxPicks > 1 ? 's' : ''}` : ''}</p>
        {extras > 0 && <span>+{extras} supplémentaire{extras > 1 ? 's' : ''} · {extras * extraPrice} $ CAD</span>}
        {sent && sent !== true && <span><Check size={12} /> Sélection déjà envoyée · vous pouvez la modifier</span>}
      </div></div>
      <div className="light-selection__action">{sendError && <p className="light-error" role="alert">{sendError}</p>}
        <button className="light-button" type="button" disabled={selectionDisabled} onClick={onSend}>{sending ? 'Envoi…' : employeeGallery ? (sent ? 'Envoyer ma sélection modifiée' : 'Confirmer ma sélection') : (sent ? 'Renvoyer ma sélection' : 'Envoyer ma sélection')}<ArrowRight size={19} weight="light" /></button>
      </div>
    </aside>}

    {viewer && current && sent !== true && <Dialog className="light-overlay light-overlay--viewer" label={viewer === 'slideshow' ? 'Diaporama de votre galerie' : 'Photo agrandie'} onClose={closeViewer} onMove={move}>
      <div className="light-viewer__top"><span>{gallery.client || gallery.title}{schoolSelection && current.filename && <small style={{ display: 'block', marginTop: 4 }}>Code : {current.filename}</small>}</span><button className="light-icon" type="button" onClick={closeViewer} aria-label="Fermer la photo"><X size={27} weight="thin" /></button></div>
      <div className="light-viewer__image"><img src={photoUrl(current.id, 'web')} alt={`Photo ${active + 1} de ${gallery.client || gallery.title}`} /></div>
      <div className="light-viewer__controls">
        <button className="light-icon" type="button" onClick={() => move(-1)} disabled={photos.length < 2} aria-label="Photo précédente"><CaretLeft size={26} weight="thin" /></button>
        <span className="light-viewer__count" aria-live={playing ? 'off' : 'polite'}>{active + 1} / {photos.length}</span>
        <button className="light-icon" type="button" onClick={() => move(1)} disabled={photos.length < 2} aria-label="Photo suivante"><CaretRight size={26} weight="thin" /></button>
        <span className="light-toolbar__divider" aria-hidden="true" />
        <button className="light-icon" type="button" onClick={() => setPlaying((value) => !value)} disabled={photos.length < 2} aria-label={playing ? 'Mettre le diaporama en pause' : 'Lire le diaporama'}>{playing ? <Pause size={22} weight="thin" /> : <Play size={22} weight="thin" />}</button>
        {!downloadMode && <button className={`light-icon${picks.has(current.id) ? ' is-active' : ''}`} type="button" disabled={selectionDisabled} onClick={() => onToggle(current.id)} aria-label={picks.has(current.id) ? 'Retirer cette photo des favoris' : 'Ajouter cette photo aux favoris'} aria-pressed={picks.has(current.id)}><Heart size={23} weight={picks.has(current.id) ? 'fill' : 'thin'} /></button>}
        {canDownload && <button className="light-icon" type="button" onClick={() => openDownload('single')} aria-label="Télécharger cette photo"><DownloadSimple size={23} weight="thin" /></button>}
      </div>
    </Dialog>}

    {toolPanel && sent !== true && <Dialog className="light-overlay light-overlay--panel" labelledBy="light-panel-title" onClose={closePanel}>
      <button className="light-icon light-panel__close" type="button" onClick={closePanel} aria-label="Fermer"><X size={25} weight="thin" /></button>
      {toolPanel === 'share' ? <>
        <ShareFat className="light-panel__symbol" size={30} weight="thin" /><h2 id="light-panel-title">Partager ces souvenirs</h2>
        <p>Copiez le lien de votre galerie. Si un mot de passe vous a été remis, il reste nécessaire pour accéder à la galerie.</p>
        <label className="light-share-field"><span>Lien de la galerie</span><input type="text" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>
        <button className="light-button" type="button" onClick={copyLink}>{copyState === 'copied' ? <><Check size={18} /> Lien copié</> : <><Copy size={18} weight="light" /> Copier le lien</>}</button>
        <p className={copyState === 'failed' ? 'light-error' : 'light-status'} role="status">{copyState === 'failed' ? 'Copie impossible. Sélectionnez le lien ci-dessus pour le copier.' : copyState === 'copied' ? 'Le lien est prêt à partager.' : ''}</p>
      </> : <>
        <DownloadSimple className="light-panel__symbol" size={31} weight="thin" /><h2 id="light-panel-title">Vos photos, avec vous</h2>
        {canDownload && current ? <><p>{downloadScope === 'all' ? `Retrouvez toutes les photos de la catégorie ${PHOTO_CATEGORIES.find((item) => item.id === category)?.label || 'FULL SIZE'} dans un seul fichier ZIP.` : 'Enregistrez cette photo sur votre appareil pour la garder et la partager.'}</p>
          {gallery.downloadEmailRequired && <div className="light-download-contact">
            <label>Courriel<input type="email" autoComplete="email" maxLength={254} value={downloadEmail} disabled={downloadBusy} onChange={e=>setDownloadEmail(e.target.value)} required /></label>
            <p>Votre courriel est transmis à Behn J. Productions pour enregistrer votre demande de téléchargement. Il ne vous inscrit pas à des communications promotionnelles.</p>
          </div>}
          <fieldset className="light-download-scope" disabled={downloadBusy}>
            <legend>Photos à enregistrer</legend>
            <label><input type="radio" name="download-scope" value="all" checked={downloadScope === 'all'} onChange={() => setDownloadOptions('all')} /><span>Toutes les photos <small>({photos.length})</small></span></label>
            <label><input type="radio" name="download-scope" value="single" checked={downloadScope === 'single'} onChange={() => setDownloadOptions('single')} /><span>Cette photo</span></label>
          </fieldset>
          {downloadScope === 'all' ? <div className="light-download-summary"><DownloadSimple size={25} weight="thin" /><span>{countLabel(photos.length)}<small>Un fichier ZIP</small></span></div>
            : <div className="light-download-photo"><img src={photoUrl(current.id)} alt="" /><span>{photoName(current, active)}<small>Photo {active + 1} sur {photos.length}</small></span></div>}
          <fieldset className="light-download-quality" disabled={downloadBusy}>
            <legend>Choisissez la qualité</legend>
            <label className={originalAvailable ? '' : 'is-unavailable'}><input type="radio" name="download-quality" value="original" checked={quality === 'original'} disabled={!originalAvailable} onChange={() => { setDownloadQuality('original'); setDownloadState(''); }} /><span>Taille originale<small>Fichiers livrés, pleine résolution</small></span></label>
            <label><input type="radio" name="download-quality" value="social" checked={quality === 'social'} onChange={() => { setDownloadQuality('social'); setDownloadState(''); }} /><span>Version web<small>JPG légers · jusqu’à 2 000 pixels</small></span></label>
          </fieldset>
          {!originalAvailable && <p className="light-download-note">{downloadScope === 'all' ? 'Les fichiers en taille originale ne sont pas encore disponibles pour toutes les photos. Vous pouvez télécharger la version web.' : 'Le fichier en taille originale n’est pas disponible pour cette photo. La version web reste accessible.'}</p>}
          {downloadBusy && <div className="light-download-progress">
            <progress value={downloadProgress.done} max={downloadProgress.total || 1} aria-label="Préparation des photos" />
            <p role="status">{downloadProgress.done} / {downloadProgress.total} photo{downloadProgress.total > 1 ? 's' : ''} préparée{downloadProgress.total > 1 ? 's' : ''}{downloadScope === 'all' && downloadProgress.done === downloadProgress.total ? ' · Création du ZIP…' : '…'}</p>
          </div>}
          <button className="light-button" type="button" onClick={downloadPhotos} disabled={downloadBusy}><ArrowDown size={18} weight="light" />{downloadBusy ? 'Préparation…' : downloadScope === 'all' ? 'Télécharger toutes les photos (.zip)' : 'Télécharger cette photo'}</button>
          {downloadBusy && <button className="light-download-cancel light-text-button" type="button" onClick={cancelDownload}>Annuler</button>}
          <p className={downloadState === 'failed' ? 'light-error' : 'light-status'} role="status">{downloadState === 'failed' ? downloadError || 'Le téléchargement a échoué. Aucun fichier n’a été téléchargé. Réessayez ou écrivez-nous.' : downloadState === 'saved' ? 'Votre fichier ZIP a été enregistré.' : downloadState === 'done' ? 'Le téléchargement a été lancé.' : downloadState === 'cancelled' ? 'Préparation annulée. Aucun fichier n’a été téléchargé.' : ''}</p>
          {downloadScope === 'all' && (downloadState === 'done' || downloadState === 'saved') && <div className="light-download-review">
            <div className="light-download-review__stars" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={16} weight="fill" />)}</div>
            <h3>Un petit mot avant de partir?</h3>
            <p>Votre avis Google nous aiderait beaucoup. Ça prend une minute et ça fait une vraie différence pour une entreprise d’ici.</p>
            <a className="light-button" href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">Laisser un avis Google <ArrowRight size={18} weight="light" /></a>
          </div>}
          {downloadScope === 'single' && <div className="light-download-nav"><button className="light-text-button" type="button" disabled={downloadBusy || photos.length < 2} onClick={() => moveDownloadPhoto(-1)}><CaretLeft size={18} /> Précédente</button><span>{active + 1} / {photos.length}</span><button className="light-text-button" type="button" disabled={downloadBusy || photos.length < 2} onClick={() => moveDownloadPhoto(1)}>Suivante <CaretRight size={18} /></button></div>}
        </> : <><p>Vos photos finales seront disponibles après la confirmation de votre sélection et leur préparation.</p><p>En attendant, choisissez vos coups de cœur dans la galerie.</p><a className="light-button" href={contactUrl}>Une question? Écrivez-nous <ArrowRight size={18} weight="light" /></a></>}
      </>}
    </Dialog>}

    {!downloadMode && sent === true && <Dialog className="light-overlay light-overlay--panel" labelledBy="light-success-title" onClose={onCloseReview}>
      <button className="light-icon light-panel__close" type="button" onClick={onCloseReview} aria-label="Fermer"><X size={25} weight="thin" /></button>
      <Check className="light-panel__symbol" size={34} weight="thin" /><p className="light-panel__eyebrow">Sélection reçue</p>
      <h2 id="light-success-title">{employeeName ? `Merci, ${employeeName}!` : 'Merci! C’est noté.'}</h2>
      <p>Votre sélection de {countLabel(picks.size)} a bien été enregistrée.</p>
      {extras > 0 && <p>{extras} photo{extras > 1 ? 's' : ''} supplémentaire{extras > 1 ? 's' : ''} · {extras * extraPrice} $ CAD s’ajouteront à votre facture.</p>}
      <button className="light-button" type="button" onClick={onCloseReview}>Revenir à ma galerie <ArrowRight size={18} weight="light" /></button>
      <a className="light-panel__contact" href={contactUrl}>{brand?.email || 'Nous écrire'}</a>
    </Dialog>}
  </div>;
}
