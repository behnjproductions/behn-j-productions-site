import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowsOut, CaretLeft, CaretRight, Check, Heart, ImageSquare, Lock, Star, X } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import { api, photoUrl, saveSession, useSession } from './api.js';
import './galerie-cinema.css';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CQkeWPsjYGSdEBM/review';
const GALLERY_CONTACT_URL = '/contact?type=Question%20sur%20ma%20galerie#formulaire';
const number = (value) => String(value).padStart(2, '0');
function displayName(value = '') {
  if (value !== value.toLocaleUpperCase('fr-CA')) return value;
  return value.toLocaleLowerCase('fr-CA').replace(/(^|[\s’'-])(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('fr-CA'));
}
function readStore(key) { try { return window.localStorage.getItem(key); } catch { return null; } }
function writeStore(key, value) { try { window.localStorage.setItem(key, value); } catch { /* navigation privée */ } }
function readPicks(key) {
  try { const value = JSON.parse(readStore(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Masthead() {
  return <header className="cinema-masthead">
    <span className="cinema-masthead__brand">Behn J. Productions</span>
    <span className="cinema-masthead__rule" aria-hidden="true" />
    <span className="cinema-masthead__private">Galerie privée</span>
  </header>;
}

// Each mounted dialog owns its focus and restores it to the opening control.
function CinemaDialog({ children, onClose, onMove, labelledBy, label, className = '' }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  const moveRef = useRef(onMove);
  closeRef.current = onClose;
  moveRef.current = onMove;
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('button, a[href], input')?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (moveRef.current && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault(); moveRef.current(event.key === 'ArrowRight' ? 1 : -1);
      }
      if (event.key !== 'Tab') return;
      const controls = [...(panel.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') || [])];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); panel.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, []);
  return <div className={`cinema-overlay ${className}`} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="cinema-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={label} tabIndex={-1}>
      {children}
    </section>
  </div>;
}

function LockScreen({ gallery, onOpen }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await api(`/galerie/${gallery.slug}/session`, { method: 'POST', body: JSON.stringify({ password }) });
      saveSession(`g:${gallery.slug}`, data.token); await onOpen();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="cinema-gallery cinema-gallery--portal">
    <Masthead />
    <main className="cinema-portal">
      <div className="cinema-portal__intro">
        <p className="cinema-eyebrow">Un espace, juste pour vous</p>
        <h1>{displayName(gallery.client)}</h1>
        <p className="cinema-tagline">Chaque détail compte</p>
      </div>
      <form className="cinema-access" onSubmit={submit}>
        <Lock size={28} weight="light" aria-hidden="true" />
        <h2>Bienvenue dans votre galerie.</h2>
        <p>Entrez le mot de passe reçu par courriel pour découvrir vos photos et composer votre sélection.</p>
        <label className="cinema-field"><span>Mot de passe</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus />
        </label>
        {error && <p className="cinema-error" role="alert">{error}</p>}
        <button className="cinema-send" type="submit" disabled={busy || !password}>
          {busy ? 'Vérification…' : <>Ouvrir ma galerie <ArrowRight size={22} weight="light" /></>}
        </button>
        <p className="cinema-access__help">Mot de passe égaré? <a href={GALLERY_CONTACT_URL}>Écrivez-nous</a> · <a href={BRAND.phoneHref}>{BRAND.phone}</a></p>
      </form>
    </main>
  </div>;
}

export function GaleriePage() {
  const slug = (window.location.pathname.split('/')[2] || '').trim();
  useSession(`g:${slug}`);
  const [gallery, setGallery] = useState(null);
  const [state, setState] = useState('chargement');
  const [picks, setPicks] = useState(() => new Set());
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const thumbRefs = useRef([]);
  const filmstripRef = useRef(null);
  const storeKey = `bjp-picks-${slug}`;
  const load = useCallback(async () => {
    if (!slug) { setState('absente'); return; }
    try {
      const data = await api(`/galerie/${slug}`);
      setGallery(data);
      if (data.locked) { setState('verrouillée'); return; }
      const validIds = new Set((data.photos || []).map((photo) => photo.id));
      const initial = Array.isArray(data.submitted?.ids) ? data.submitted.ids : readPicks(storeKey);
      setPicks(new Set(initial.filter((id) => validIds.has(id))));
      setSent(data.submitted ? 'déjà' : false);
      const coverIndex = (data.photos || []).findIndex((photo) => photo.id === data.cover);
      setActive(coverIndex >= 0 ? coverIndex : 0);
      setState('prête');
    } catch (err) {
      if (err.status === 404 && err.data?.locked) { setGallery(err.data); setState('verrouillée'); return; }
      setState('absente');
    }
  }, [slug, storeKey]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (state === 'prête') writeStore(storeKey, JSON.stringify([...picks])); }, [picks, state, storeKey]);
  const photos = gallery?.photos || [];
  const current = photos[active];
  const maxPicks = gallery?.maxPicks;
  const extraPrice = gallery?.extraPrice ?? 25;
  const extras = maxPicks ? Math.max(0, picks.size - maxPicks) : 0;
  const move = useCallback((step) => {
    if (photos.length) setActive((index) => (index + step + photos.length) % photos.length);
  }, [photos.length]);
  useEffect(() => {
    const strip = filmstripRef.current;
    const thumb = thumbRefs.current[active];
    if (!strip || !thumb) return;
    // Scroll only the filmstrip, so choosing a photo never moves the page.
    const left = thumb.offsetLeft;
    const right = left + thumb.offsetWidth;
    if (left < strip.scrollLeft || right > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left - (strip.clientWidth - thumb.offsetWidth) / 2), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }, [active, state]);
  const toggle = (photoId) => {
    if (sending || !photos.some((photo) => photo.id === photoId)) return;
    setPicks((previous) => { const next = new Set(previous); if (next.has(photoId)) next.delete(photoId); else next.add(photoId); return next; });
  };
  const closeReview = useCallback(() => setSent('fermé'), []);
  const closeExpanded = useCallback(() => setExpanded(false), []);
  const send = async () => {
    if (sending || !picks.size) return;
    setSending(true); setSendError('');
    try {
      await api(`/galerie/${slug}/selection`, { method: 'POST', body: JSON.stringify({ photoIds: [...picks] }) });
      setSent(true);
    } catch (err) { setSendError(err.message); }
    finally { setSending(false); }
  };

  if (state === 'chargement') return <div className="cinema-gallery cinema-gallery--portal"><Masthead />
    <main className="cinema-wait" role="status"><p className="cinema-eyebrow">Votre galerie privée</p><h1>Un instant…</h1><p>Ouverture de la galerie</p></main>
  </div>;
  if (state === 'absente') return <div className="cinema-gallery cinema-gallery--portal"><Masthead />
    <main className="cinema-wait"><p className="cinema-eyebrow">Behn J. Productions</p><h1>Galerie introuvable</h1>
      <p>Ce lien n’est plus actif ou l’adresse est incomplète. Écrivez-moi et je vous renvoie le bon lien.</p>
      <p><a href={BRAND.phoneHref}>{BRAND.phone}</a> · <a href={GALLERY_CONTACT_URL}>{BRAND.email}</a></p>
    </main>
  </div>;
  if (state === 'verrouillée') return <LockScreen gallery={gallery} onOpen={load} />;

  const dateLabel = formatDate(gallery.date);
  const selected = current ? picks.has(current.id) : false;
  return <div className="cinema-gallery">
    <Masthead />
    {gallery.draft && <p className="cinema-draft">Aperçu privé — cette galerie n’est pas encore publiée.</p>}
    <main className="cinema-main">
      <section className="cinema-stage" aria-labelledby="cinema-client">
        <div className="cinema-story">
          <p className="cinema-eyebrow">{[gallery.title, dateLabel].filter(Boolean).join(' · ') || 'Votre galerie privée'}</p>
          <h1 id="cinema-client">{displayName(gallery.client)}</h1>
          <p className="cinema-tagline">Chaque détail compte</p>
          <div className="cinema-package">
            <p>{maxPicks ? `${maxPicks} photo${maxPicks > 1 ? 's incluses' : ' incluse'}` : 'Vos photos, votre sélection'}</p>
            <span>{maxPicks ? `${extraPrice} $ CAD par photo supplémentaire` : 'Choisissez toutes les photos que vous aimez.'}</span>
          </div>
        </div>
        <div className="cinema-viewer" onKeyDown={(event) => {
          if (!expanded && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
        }}>
          {current ? <>
            <button type="button" className="cinema-image" onClick={() => setExpanded(true)} aria-label={`Agrandir la photo ${active + 1} de ${gallery.client}`}>
              <img key={current.id} src={photoUrl(current.id, 'web')} alt={`Photo ${active + 1} de ${gallery.client}`} decoding="async" fetchPriority="high" />
              <span className="cinema-image__zoom"><ArrowsOut size={19} weight="light" aria-hidden="true" /><span>Agrandir</span></span>
            </button>
            <div className="cinema-controls">
              <p className="cinema-counter" aria-live="polite" aria-atomic="true"><strong>{number(active + 1)}</strong><span>/ {number(photos.length)}</span><span className="cinema-sr"> photos</span></p>
              <div className="cinema-controls__arrows">
                <button className="cinema-circle" type="button" onClick={() => move(-1)} disabled={photos.length < 2} aria-label="Photo précédente"><CaretLeft size={24} weight="light" /></button>
                <button className="cinema-circle" type="button" onClick={() => move(1)} disabled={photos.length < 2} aria-label="Photo suivante"><CaretRight size={24} weight="light" /></button>
              </div>
              <button type="button" className={`cinema-pick ${selected ? 'is-selected' : ''}`} onClick={() => toggle(current.id)} disabled={sending} aria-pressed={selected}>
                <Heart size={33} weight={selected ? 'fill' : 'light'} /><span>{selected ? 'Photo sélectionnée' : 'Choisir cette photo'}</span>
              </button>
            </div>
          </> : <div className="cinema-empty"><ImageSquare size={40} weight="thin" /><h2>À venir</h2><p>Vos photos arrivent bientôt.</p></div>}
        </div>
      </section>
      {photos.length > 0 && <section className="cinema-film" aria-label="Parcourir vos photos">
        <div className="cinema-film__strip" ref={filmstripRef}>
          {photos.map((photo, index) => <button key={photo.id} type="button" ref={(node) => { thumbRefs.current[index] = node; }}
            className={`cinema-thumb ${index === active ? 'is-active' : ''} ${picks.has(photo.id) ? 'is-selected' : ''}`}
            onClick={() => setActive(index)} aria-current={index === active ? 'true' : undefined}
            aria-label={`Afficher la photo ${index + 1}${picks.has(photo.id) ? ', sélectionnée' : ''}`}
            onKeyDown={(event) => {
              if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? photos.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + photos.length) % photos.length;
              setActive(next); thumbRefs.current[next]?.focus({ preventScroll: true });
            }}>
            <span className="cinema-thumb__image"><img src={photoUrl(photo.id)} alt="" loading={index < 8 ? 'eager' : 'lazy'} decoding="async" />
              {picks.has(photo.id) && <span className="cinema-thumb__selected"><Heart size={13} weight="fill" aria-hidden="true" /></span>}
            </span><span className="cinema-thumb__number">{number(index + 1)}</span>
          </button>)}
        </div>
        <p className="cinema-film__hint">Parcourez les photos, choisissez vos préférées avec le cœur, puis envoyez votre sélection.</p>
      </section>}
      <footer className="cinema-footer"><p>Une question? <a href={BRAND.phoneHref}>{BRAND.phone}</a> <span aria-hidden="true">·</span> <a href={GALLERY_CONTACT_URL}>{BRAND.email}</a></p></footer>
    </main>
    <div className="cinema-selection">
      <div className="cinema-selection__count" role="status" aria-live="polite" aria-atomic="true">
        <Heart className="cinema-selection__heart" size={36} weight="light" aria-hidden="true" />
        <div><p><strong>{picks.size}{maxPicks ? ` / ${maxPicks}` : ''}</strong> photo{picks.size > 1 ? 's' : ''} sélectionnée{picks.size > 1 ? 's' : ''}</p>
          {extras > 0 && <span className="cinema-selection__extra">+{extras} supplémentaire{extras > 1 ? 's' : ''} · {extras * extraPrice} $ CAD</span>}
          {sent && sent !== true && <span className="cinema-selection__saved"><Check size={12} /> Sélection déjà envoyée · vous pouvez la modifier</span>}
        </div>
      </div>
      <div className="cinema-selection__action">
        {sendError && <p className="cinema-error" role="alert">{sendError}</p>}
        <button className="cinema-send" type="button" disabled={!picks.size || sending} onClick={send}>
          {sending ? 'Envoi…' : <>{sent ? 'Renvoyer ma sélection' : 'Envoyer ma sélection'} <ArrowRight size={25} weight="light" /></>}
        </button>
      </div>
      <span className="cinema-selection__signature">Behn J. Productions</span>
    </div>
    {expanded && current && <CinemaDialog onClose={closeExpanded} onMove={move} label="Photo agrandie" className="cinema-overlay--photo">
      <button className="cinema-close" type="button" onClick={closeExpanded} aria-label="Fermer la photo agrandie"><X size={26} weight="light" /></button>
      <div className="cinema-expanded__image"><img src={photoUrl(current.id, 'web')} alt={`Photo ${active + 1} de ${gallery.client}`} /></div>
      <div className="cinema-expanded__controls">
        <button className="cinema-circle" type="button" onClick={() => move(-1)} disabled={photos.length < 2} aria-label="Photo précédente"><CaretLeft size={24} weight="light" /></button>
        <span className="cinema-expanded__count" aria-live="polite">{number(active + 1)} / {number(photos.length)}</span>
        <button className="cinema-circle" type="button" onClick={() => move(1)} disabled={photos.length < 2} aria-label="Photo suivante"><CaretRight size={24} weight="light" /></button>
        <button className={`cinema-pick ${selected ? 'is-selected' : ''}`} type="button" onClick={() => toggle(current.id)} disabled={sending} aria-pressed={selected}>
          <Heart size={26} weight={selected ? 'fill' : 'light'} /><span>{selected ? 'Photo sélectionnée' : 'Choisir cette photo'}</span>
        </button>
      </div>
    </CinemaDialog>}
    {sent === true && <CinemaDialog onClose={closeReview} labelledBy="cinema-merci-title" className="cinema-overlay--thanks">
      <button className="cinema-close" type="button" onClick={closeReview} aria-label="Fermer"><X size={24} weight="light" /></button>
      <div className="cinema-thanks__check" aria-hidden="true"><Check size={26} weight="light" /></div>
      <p className="cinema-eyebrow">Sélection reçue</p><h2 id="cinema-merci-title">Merci! C’est noté.</h2>
      <p className="cinema-thanks__lead">{picks.size === 1 ? 'Votre photo est' : `Vos ${picks.size} photos sont`} entre mes mains. Je vous reviens avec les images finales sous peu.</p>
      {extras > 0 && <p className="cinema-thanks__extra">Dont {extras} au-delà de votre forfait : {extras * extraPrice} $ CAD s’ajouteront à votre facture.</p>}
      <div className="cinema-thanks__review">
        <div className="cinema-thanks__stars" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={17} weight="fill" />)}</div>
        <h3>Un petit mot avant de partir?</h3>
        <p>Votre avis Google nous aiderait beaucoup. Ça prend une minute et ça fait une vraie différence pour une entreprise d’ici.</p>
        <a className="cinema-send" href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">Laisser un avis Google <ArrowRight size={20} weight="light" /></a>
        <button className="cinema-thanks__later" type="button" onClick={closeReview}>Une autre fois</button>
      </div>
    </CinemaDialog>}
  </div>;
}

export default GaleriePage;
