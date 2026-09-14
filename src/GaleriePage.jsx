import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CaretLeft, CaretRight, Check, Heart, Lock, Star, X } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import { api, photoUrl, saveSession, useSession } from './api.js';

// Lien direct vers la fiche Google de Behn J. Productions.
const GOOGLE_REVIEW_URL = 'https://g.page/r/CQkeWPsjYGSdEBM/review';

function readStore(k) { try { return window.localStorage.getItem(k); } catch { return null; } }
function writeStore(k, v) { try { window.localStorage.setItem(k, v); } catch { /* navigation privée */ } }

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ------------------------------------------------ écran de mot de passe --- */

function LockScreen({ gallery, onOpen }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api(`/galerie/${gallery.slug}/session`, { method: 'POST', body: JSON.stringify({ password }) });
      saveSession(`g:${gallery.slug}`, data.token);
      onOpen();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="gal-lock">
      <form className="gal-lock__panel" onSubmit={submit}>
        <p className="gal-cover__brand">Behn J. Productions</p>
        <div className="gal-lock__icon" aria-hidden="true"><Lock size={24} /></div>
        <h1>{gallery.client}</h1>
        <p className="gal-lock__lead">Cette galerie est privée. Entrez le mot de passe reçu par courriel.</p>
        <label className="gal-lock__field">
          <span>Mot de passe</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoFocus autoComplete="current-password" required />
        </label>
        {error && <p className="gal-lock__error" role="alert">{error}</p>}
        <button className="gal-send" type="submit" disabled={busy || !password}>
          {busy ? 'Vérification…' : <>Ouvrir ma galerie <ArrowRight size={18} weight="bold" /></>}
        </button>
        <p className="gal-lock__help">Mot de passe égaré? <a href={BRAND.phoneHref}>{BRAND.phone}</a></p>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------- la galerie --- */

export function GaleriePage() {
  const slug = (window.location.pathname.split('/')[2] || '').trim();
  useSession(`g:${slug}`);

  const [gallery, setGallery] = useState(null);
  const [state, setState] = useState('chargement'); // chargement | verrouillée | prête | absente
  const [picks, setPicks] = useState(() => new Set());
  const [lightbox, setLightbox] = useState(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const gridRef = useRef(null);

  const storeKey = `bjp-picks-${slug}`;
  const load = useCallback(async () => {
    if (!slug) { setState('absente'); return; }
    try {
      const data = await api(`/galerie/${slug}`);
      setGallery(data);
      if (data.locked) { setState('verrouillée'); return; }
      const saved = readStore(storeKey);
      const initial = data.submitted ? data.submitted.ids : (saved ? JSON.parse(saved) : []);
      setPicks(new Set(initial));
      if (data.submitted) setSent('déjà');
      setState('prête');
    } catch (err) {
      if (err.status === 404 && err.data && err.data.locked) { setGallery(err.data); setState('verrouillée'); return; }
      setState('absente');
    }
  }, [slug, storeKey]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (state === 'prête') writeStore(storeKey, JSON.stringify([...picks]));
  }, [picks, state, storeKey]);

  const photos = gallery?.photos || [];
  const maxPicks = gallery?.maxPicks;

  // Le forfait n'est pas un mur : le client peut choisir au-delà, chaque photo
  // supplémentaire lui est facturée et le total s'affiche pendant qu'il choisit.
  const toggle = (photoId) => setPicks((prev) => {
    const next = new Set(prev);
    if (next.has(photoId)) next.delete(photoId);
    else next.add(photoId);
    return next;
  });

  const move = useCallback((step) => setLightbox((cur) => (cur === null ? cur
    : (cur + step + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (lightbox === null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, move]);

  // L'invitation à laisser un avis s'affiche après l'envoi de la sélection : le
  // client vient de terminer sa tâche et lit l'écran comme une étape du
  // processus. Elle est proposée à tout le monde, sans demander de note au
  // préalable — filtrer selon la note attendue est interdit par Google.
  const closeReview = useCallback(() => setSent('fermé'), []);

  const send = async () => {
    setSending(true);
    setSendError('');
    try {
      await api(`/galerie/${slug}/selection`, {
        method: 'POST',
        body: JSON.stringify({ photoIds: [...picks] }),
      });
      setSent(true);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (state === 'chargement') {
    return <div className="gal-wait"><span className="gal-wait__dot" />Ouverture de la galerie…</div>;
  }

  if (state === 'absente') {
    return (
      <div className="gal-lock">
        <div className="gal-lock__panel">
          <p className="gal-cover__brand">Behn J. Productions</p>
          <h1>Galerie introuvable</h1>
          <p className="gal-lock__lead">Ce lien n’est plus actif ou l’adresse est incomplète. Écrivez-moi et je vous renvoie le bon lien.</p>
          <p className="gal-lock__help"><a href={BRAND.phoneHref}>{BRAND.phone}</a> · <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></p>
        </div>
      </div>
    );
  }

  if (state === 'verrouillée') return <LockScreen gallery={gallery} onOpen={load} />;

  const current = lightbox === null ? null : photos[lightbox];
  const showGrid = () => gridRef.current?.scrollIntoView({ behavior: 'smooth' });
  const dateLabel = formatDate(gallery.date);
  const extraPrice = gallery.extraPrice ?? 25;
  const extras = maxPicks ? Math.max(0, picks.size - maxPicks) : 0;

  return (
    <div className="gal">
      {gallery.draft && <p className="gal-draft">Aperçu privé — cette galerie n’est pas encore publiée.</p>}

      {/* Couverture en deux volets */}
      <header className="gal-cover">
        <div className="gal-cover__panel">
          <p className="gal-cover__brand">Behn J. Productions</p>
          <h1>{gallery.client}</h1>
          {dateLabel && <p className="gal-cover__date">{dateLabel}</p>}
          <button type="button" className="gal-cover__cta" onClick={showGrid}>Afficher la galerie</button>
        </div>
        <div className="gal-cover__media">
          {gallery.cover && <img src={photoUrl(gallery.cover, 'web')} alt="" />}
        </div>
      </header>

      {/* Barre de titre collante */}
      <div className="gal-head">
        <div className="gal-head__id">
          <strong>{gallery.client}</strong>
          <span>{[gallery.title, dateLabel].filter(Boolean).join(' · ')}</span>
        </div>
        <p className="gal-head__hint">Touchez le <Heart size={14} weight="fill" /> sur vos photos préférées.</p>
      </div>

      {/* Mode d'emploi */}
      <section className="gal-guide" ref={gridRef} aria-labelledby="guide-titre">
        <h2 id="guide-titre">Comment choisir vos photos</h2>
        <ol className="gal-guide__etapes">
          <li><b aria-hidden="true">1</b><span>Touchez le <Heart size={14} weight="fill" /> sur chaque photo que vous aimez.</span></li>
          <li><b aria-hidden="true">2</b><span>Touchez la photo elle-même pour l’agrandir et mieux comparer.</span></li>
          <li><b aria-hidden="true">3</b><span>Quand votre choix est fait, appuyez sur <strong>« Envoyer ma sélection »</strong>, en bas de l’écran.</span></li>
        </ol>
        {maxPicks ? (
          <p className="gal-guide__forfait">
            Votre forfait comprend <strong>{maxPicks} photos retouchées</strong>. Vous pouvez en choisir
            davantage si vous le souhaitez : chaque photo supplémentaire est de <strong>{extraPrice} $ CAD</strong>,
            ajoutée à votre facture.
          </p>
        ) : (
          <p className="gal-guide__forfait">Choisissez toutes les photos que vous aimez.</p>
        )}
      </section>

      {/* Grille */}
      <main className="gal-grid" aria-label="Vos photos">
        {photos.length === 0 && <p className="gal-vide">Les photos arrivent bientôt.</p>}
        {photos.map((photo, index) => {
          const chosen = picks.has(photo.id);
          return (
            <figure key={photo.id} className={chosen ? 'is-chosen' : ''}>
              <button type="button" className="gal-zoom" onClick={() => setLightbox(index)}
                aria-label={`Agrandir la photo ${index + 1}`}>
                <img src={photoUrl(photo.id)} alt={`Photo ${index + 1}`} loading="lazy" decoding="async" />
              </button>
              <button type="button" className="gal-heart" onClick={() => toggle(photo.id)}
                aria-pressed={chosen}
                aria-label={chosen ? `Retirer la photo ${index + 1}` : `Choisir la photo ${index + 1}`}>
                <Heart size={19} weight={chosen ? 'fill' : 'regular'} />
              </button>
            </figure>
          );
        })}
      </main>

      <footer className="gal-foot">
        <p>Une question? <a href={BRAND.phoneHref}>{BRAND.phone}</a> · <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></p>
      </footer>

      {/* Barre d'envoi */}
      <div className="gal-bar" role="status">
        <span>
          <strong>{picks.size}</strong> photo{picks.size > 1 ? 's' : ''} choisie{picks.size > 1 ? 's' : ''}
          {maxPicks ? ` sur ${maxPicks} incluses` : ''}
        </span>
        {extras > 0 && (
          <span className="gal-bar__extra">
            +{extras} supplémentaire{extras > 1 ? 's' : ''} · {extras * extraPrice} $ CAD
          </span>
        )}
        {sendError && <span className="gal-bar__error">{sendError}</span>}
        <button className="gal-send" type="button" disabled={picks.size === 0 || sending} onClick={send}>
          {sending ? 'Envoi…' : sent ? <>Renvoyer ma sélection <ArrowRight size={18} weight="bold" /></>
            : <>Envoyer ma sélection <ArrowRight size={18} weight="bold" /></>}
        </button>
      </div>

      {current && (
        <div className="gal-light" role="dialog" aria-modal="true" aria-label="Photo agrandie" onMouseDown={() => setLightbox(null)}>
          <button className="gal-light__close" type="button" onClick={() => setLightbox(null)} aria-label="Fermer"><X size={26} /></button>
          <button className="gal-light__nav gal-light__nav--prev" type="button"
            onMouseDown={(e) => { e.stopPropagation(); move(-1); }} aria-label="Photo précédente"><CaretLeft size={28} /></button>
          <img src={photoUrl(current.id, 'web')} alt="" onMouseDown={(e) => e.stopPropagation()} />
          <button className="gal-light__nav gal-light__nav--next" type="button"
            onMouseDown={(e) => { e.stopPropagation(); move(1); }} aria-label="Photo suivante"><CaretRight size={28} /></button>
          <button className={`gal-light__heart ${picks.has(current.id) ? 'is-on' : ''}`} type="button"
            onMouseDown={(e) => { e.stopPropagation(); toggle(current.id); }}
            aria-pressed={picks.has(current.id)} aria-label="Choisir cette photo">
            <Heart size={22} weight={picks.has(current.id) ? 'fill' : 'regular'} />
          </button>
        </div>
      )}

      {sent === true && (
        <div className="gal-merci" role="presentation" onMouseDown={closeReview}>
          <section className="gal-merci__panel" role="dialog" aria-modal="true" aria-labelledby="merci-titre"
            onMouseDown={(e) => e.stopPropagation()}>
            <button className="gal-merci__close" type="button" onClick={closeReview} aria-label="Fermer"><X size={22} /></button>
            <div className="gal-merci__check" aria-hidden="true"><Check size={28} weight="bold" /></div>
            <p className="gal-merci__eyebrow">Sélection reçue</p>
            <h2 id="merci-titre">Merci! C’est noté.</h2>
            <p className="gal-merci__lead">Vos {picks.size} photo{picks.size > 1 ? 's' : ''} sont entre mes mains. Je vous reviens avec les images finales sous peu.</p>
            {extras > 0 && (
              <p className="gal-merci__extra">
                Dont {extras} au-delà de votre forfait : {extras * extraPrice} $ CAD s’ajouteront à votre facture.
              </p>
            )}

            <div className="gal-merci__avis">
              <div className="gal-merci__stars" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={20} weight="fill" />)}
              </div>
              <h3>Un petit mot avant de partir?</h3>
              <p>Si votre expérience avec Behn J. Productions vous a plu, un avis Google nous aiderait beaucoup. Ça prend une minute et ça fait une vraie différence pour une entreprise d’ici.</p>
              <a className="gal-send" href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">
                Laisser un avis Google <ArrowRight size={18} weight="bold" />
              </a>
              <button className="gal-merci__later" type="button" onClick={closeReview}>Une autre fois</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default GaleriePage;
