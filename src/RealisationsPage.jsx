import { useEffect, useState } from 'react';
import { ArrowRight, FacebookLogo, InstagramLogo } from '@phosphor-icons/react';
import { BRAND } from './brand.js';

// Chaque entrée : { src, alt }. Remplacer par la sélection finale —
// 6 à 10 images par catégorie, en haute résolution, sans filigrane.
const CATEGORIES = [
  {
    id: 'mariages',
    label: 'Mariages',
    lead: 'L’émotion vraie d’une journée qui ne se rejoue pas.',
    photos: [
      { src: '/assets/hero-mariage.jpg', alt: 'Couple de mariés dans une lumière dorée' },
      { src: '/assets/photo-mariage.jpg', alt: 'Mariés au coucher du soleil sur la Côte-Nord' },
      { src: '/assets/about-intro/portrait-emotion.webp', alt: 'Moment de complicité capté pendant la réception' },
    ],
  },
  {
    id: 'corporatif',
    label: 'Corporatif',
    lead: 'Des portraits et des événements qui donnent un visage à votre organisation.',
    photos: [
      { src: '/assets/hero-corporatif.jpg', alt: 'Portrait corporatif en studio' },
      { src: '/assets/photo-corporatif.jpg', alt: 'Portrait professionnel sur fond coloré' },
      { src: '/assets/about-intro/cote-nord-audience.webp', alt: 'Public réuni lors d’un événement d’entreprise' },
    ],
  },
  {
    id: 'scolaire',
    label: 'Scolaire',
    lead: 'Des sourires d’aujourd’hui pour les souvenirs de demain.',
    photos: [
      { src: '/assets/school-premium.jpg', alt: 'Portraits scolaires naturels et joyeux' },
      { src: '/assets/about-intro/enfance-famille.webp', alt: 'Portrait de trois enfants réunis' },
      { src: '/assets/sessions/finissants.jpg', alt: 'Portrait de bal de finissants' },
    ],
  },
  {
    id: 'culture',
    label: 'Culture et communautés',
    lead: 'Les gens d’ici, leurs traditions et leur musique.',
    photos: [
      { src: '/assets/about-intro/culture-innu.webp', alt: 'Portrait culturel d’une mère et de son enfant en régalia' },
      { src: '/assets/photo-evenement.jpg', alt: 'Performance culturelle sur scène au Africa Fest Sept-Îles' },
      { src: '/assets/about-intro/concert-live.webp', alt: 'Artiste sur scène pendant un spectacle' },
      { src: '/assets/services-hero.jpg', alt: 'Moment de complicité capté sur scène' },
    ],
  },
];

export function RealisationsPage() {
  const [active, setActive] = useState('tout');

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [active]);

  const shown = active === 'tout' ? CATEGORIES : CATEGORIES.filter((c) => c.id === active);

  return (
    <div className="site-shell realisations-page">
      <header className="site-header about-header">
        <a className="brand" href="/" aria-label="Retour à l’accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
        <nav className="about-nav" aria-label="Navigation principale"><a href="/">Retour à l’accueil</a></nav>
        <div className="header-actions"><a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a><a className="header-cta" href="/contact">Nous contacter</a></div>
      </header>

      <main className="about-main">
        <div className="services-band services-band--page" data-reveal>
          <img src="/assets/photo-mariage.jpg" alt="Mariage photographié par Behn J. Productions" />
          <div className="services-band__shade" />
          <div className="services-band__content">
            <p className="eyebrow">Mariages · Corporatif · Scolaire · Culture</p>
            <h1>Réalisations</h1>
            <p>Un aperçu de ce que nous créons sur la Côte-Nord.</p>
          </div>
        </div>

        <nav className="gallery-filter" aria-label="Filtrer par catégorie">
          <button type="button" className={active === 'tout' ? 'is-active' : ''} onClick={() => setActive('tout')} aria-pressed={active === 'tout'}>Tout</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={active === c.id ? 'is-active' : ''} onClick={() => setActive(c.id)} aria-pressed={active === c.id}>{c.label}</button>
          ))}
        </nav>

        {shown.map((c) => (
          <section className="gallery-block" id={c.id} key={c.id} aria-labelledby={`cat-${c.id}`}>
            <div className="gallery-block__head" data-reveal>
              <h2 id={`cat-${c.id}`}>{c.label}</h2>
              <p>{c.lead}</p>
            </div>
            <div className="gallery-grid">
              {c.photos.map((p) => (
                <figure key={p.src} data-reveal>
                  <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
                </figure>
              ))}
            </div>
          </section>
        ))}

        <section className="about-closing">
          <p>Chaque détail compte.</p>
          <h2>Votre histoire<br />mérite d’être racontée<span>.</span></h2>
          <a className="button" href="/contact">Parlons de votre projet <ArrowRight size={18} weight="bold" /></a>
        </section>
      </main>

      <footer className="footer">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div><strong>Sept-Îles · Québec</strong><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div>
        <div className="footer-links"><a href="/">Accueil</a><a href="/services">Services</a><a href="/realisations">Réalisations</a><a href="/#seances">Séances</a><a href="/a-propos">À propos</a><a href="/contact">Contact</a></div>
        <div className="socials" aria-label="Réseaux sociaux"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a></div>
      </footer>
    </div>
  );
}

export default RealisationsPage;
