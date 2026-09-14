import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CaretLeft, CaretRight, Check, Heart, Star, X } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import { DEMO_GALLERY } from './galleries.js';

// Lien d'avis Google — à remplacer par celui de la fiche
// (business.google.com > Read Reviews > Get more reviews)
const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=REMPLACER';

function readStore(k) { try { return window.localStorage.getItem(k); } catch { return null; } }
function writeStore(k, v) { try { window.localStorage.setItem(k, v); } catch { /* navigation privée */ } }

export function GaleriePage() {
  const gallery = DEMO_GALLERY;
  const storeKey = `bjp-picks-${gallery.slug}`;
  const promptKey = `bjp-avis-${gallery.slug}`;

  const [picks, setPicks] = useState(() => {
    const saved = readStore(storeKey);
    return new Set(saved ? JSON.parse(saved) : []);
  });
  const [lightbox, setLightbox] = useState(null);
  const [sent, setSent] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => { writeStore(storeKey, JSON.stringify([...picks])); }, [picks, storeKey]);

  // L'invitation à laisser un avis s'affiche après l'envoi de la sélection : le
  // client vient de terminer sa tâche et lit l'écran comme une étape du
  // processus. Elle est proposée à tout le monde, sans demander de note au
  // préalable — filtrer selon la note attendue est interdit par Google.
  const closeReview = useCallback(() => {
    setSent('fermé');
    writeStore(promptKey, 'vu');
  }, [promptKey]);

  const toggle = (id) => setPicks((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else if (!gallery.maxPicks || next.size < gallery.maxPicks) next.add(id);
    return next;
  });

  const move = useCallback((step) => setLightbox((cur) => (cur === null ? cur
    : (cur + step + gallery.photos.length) % gallery.photos.length)), [gallery.photos.length]);

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

  const current = lightbox === null ? null : gallery.photos[lightbox];
  const atLimit = gallery.maxPicks && picks.size >= gallery.maxPicks;
  const showGrid = () => gridRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="gal">
      {/* Couverture en deux volets */}
      <header className="gal-cover">
        <div className="gal-cover__panel">
          <p className="gal-cover__brand">Behn J. Productions</p>
          <h1>{gallery.client}</h1>
          <p className="gal-cover__date">{gallery.date}</p>
          <button type="button" className="gal-cover__cta" onClick={showGrid}>Afficher la galerie</button>
        </div>
        <div className="gal-cover__media"><img src={gallery.cover} alt="" /></div>
      </header>

      {/* Barre de titre collante */}
      <div className="gal-head">
        <div className="gal-head__id">
          <strong>{gallery.client}</strong>
          <span>{gallery.title} · {gallery.date}</span>
        </div>
        <p className="gal-head__hint">Touchez le <Heart size={14} weight="fill" /> sur vos photos préférées.</p>
      </div>

      {/* Grille */}
      <main className="gal-grid" ref={gridRef} aria-label="Vos photos">
        {gallery.photos.map((photo, index) => {
          const chosen = picks.has(photo.id);
          return (
            <figure key={photo.id} className={chosen ? 'is-chosen' : ''}>
              <button type="button" className="gal-zoom" onClick={() => setLightbox(index)}
                aria-label={`Agrandir la photo ${index + 1}`}>
                <img src={photo.src} alt={`Photo ${index + 1}`} loading="lazy" decoding="async" />
              </button>
              <button type="button" className="gal-heart" onClick={() => toggle(photo.id)}
                aria-pressed={chosen} disabled={!chosen && atLimit}
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
        <span><strong>{picks.size}</strong> photo{picks.size > 1 ? 's' : ''} choisie{picks.size > 1 ? 's' : ''}{gallery.maxPicks ? ` sur ${gallery.maxPicks}` : ''}</span>
        <button className="gal-send" type="button" disabled={picks.size === 0 || Boolean(sent)} onClick={() => setSent(true)}>
          {sent ? <>Sélection envoyée <Check size={18} weight="bold" /></> : <>Envoyer ma sélection <ArrowRight size={18} weight="bold" /></>}
        </button>
      </div>

      {current && (
        <div className="gal-light" role="dialog" aria-modal="true" aria-label="Photo agrandie" onMouseDown={() => setLightbox(null)}>
          <button className="gal-light__close" type="button" onClick={() => setLightbox(null)} aria-label="Fermer"><X size={26} /></button>
          <button className="gal-light__nav gal-light__nav--prev" type="button"
            onMouseDown={(e) => { e.stopPropagation(); move(-1); }} aria-label="Photo précédente"><CaretLeft size={28} /></button>
          <img src={current.src} alt="" onMouseDown={(e) => e.stopPropagation()} />
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
