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
      { src: '/assets/portfolio/mariage-ceremonie.jpg', pos: '50% 38%', alt: 'Mariés joue contre joue sous l’arche florale' },
      { src: '/assets/portfolio/mariage-bouquet.jpg', alt: 'Bouquets levés par le cortège pendant la réception', wide: true },
      { src: '/assets/hero-mariage.jpg', alt: 'Couple de mariés dans une lumière dorée' },
      { src: '/assets/photo-mariage.jpg', alt: 'Mariés au coucher du soleil sur la Côte-Nord' },
    ],
  },
  {
    id: 'corporatif',
    label: 'Corporatif',
    lead: 'Des portraits et des événements qui donnent un visage à votre organisation.',
    photos: [
      { src: '/assets/portfolio/corporatif-portrait-studio.jpg', alt: 'Portrait professionnel en studio sur fond sombre' },
      { src: '/assets/portfolio/corporatif-portrait-fond-sable.jpg', alt: 'Portrait professionnel sur fond sable' },
      { src: '/assets/hero-corporatif.jpg', alt: 'Portrait corporatif en studio' },
      { src: '/assets/photo-corporatif.jpg', alt: 'Portrait professionnel sur fond coloré' },
      { src: '/assets/about-intro/cote-nord-audience.webp', alt: 'Public réuni lors d’un événement d’entreprise', wide: true },
    ],
  },
  {
    id: 'scolaire',
    label: 'Scolaire et sportif',
    lead: 'Finissants, portraits d’élèves et équipes sportives, du studio au plateau.',
    photos: [
      { src: '/assets/portfolio/scolaire-diplomee-uqac.jpg', alt: 'Diplômée de l’UQAC en toge, avec broderie florale et boucles perlées' },
      { src: '/assets/portfolio/scolaire-finissante-bibliotheque.jpg', alt: 'Finissante tenant son mortier devant une bibliothèque' },
      { src: '/assets/portfolio/scolaire-portrait-finissante.jpg', alt: 'Portrait de finissante en studio' },
      { src: '/assets/portfolio/scolaire-rentree.jpg', pos: '50% 6%', alt: 'Portrait de rentrée scolaire sur fond vert' },
      { src: '/assets/portfolio/sport-cheer-solo.jpg', alt: 'Portrait de cheerleading en lumière néon' },
      { src: '/assets/portfolio/sport-course.jpg', pos: '50% 32%', alt: 'Coureurs franchissant le parcours lors d’une course sur route' },
      { src: '/assets/school-premium.jpg', alt: 'Portraits scolaires naturels et joyeux', wide: true },
    ],
  },
  {
    id: 'culture',
    label: 'Culture et communautés',
    lead: 'Les gens d’ici, leurs traditions et leur musique.',
    photos: [
      { src: '/assets/portfolio/culture-aines-innus.jpg', alt: 'Aînés innus en tenue traditionnelle lors d’une cérémonie' },
      { src: '/assets/portfolio/culture-teueikan.jpg', alt: 'Aîné au teueikan devant un montage de perches' },
      { src: '/assets/portfolio/culture-guitariste.jpg', alt: 'Guitariste sur scène sous les projecteurs' },
      { src: '/assets/portfolio/culture-danse-amazigh.jpg', pos: '50% 34%', alt: 'Danseuse en tenue traditionnelle amazighe' },
      { src: '/assets/portfolio/culture-chanteuse.jpg', alt: 'Chanteuse en plein spectacle sur scène extérieure' },
      { src: '/assets/portfolio/culture-mocassins.jpg', alt: 'Homme présentant une paire de mocassins perlés', wide: true },
      { src: '/assets/portfolio/culture-scene-acrobate.jpg', alt: 'Artiste en performance sur scène devant le public', wide: true },
      { src: '/assets/about-intro/culture-innu.webp', alt: 'Portrait culturel d’une mère et de son enfant en régalia' },
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
        <div className="header-actions"><a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a><a className="header-cta" href="/contact#formulaire">Nous contacter</a></div>
      </header>

      <main className="about-main">
        <div className="services-band services-band--page" data-reveal>
          <img src="/assets/portfolio/culture-aines-innus.jpg" alt="Aînés innus en tenue traditionnelle" />
          <div className="services-band__shade" />
          <div className="services-band__content">
            <p className="eyebrow">Mariages · Corporatif · Scolaire et sportif · Culture</p>
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
                <figure key={p.src} className={p.wide ? 'is-wide' : undefined} data-reveal>
                  <img src={p.src} alt={p.alt} style={p.pos ? { objectPosition: p.pos } : undefined} loading="lazy" decoding="async" />
                </figure>
              ))}
            </div>
          </section>
        ))}

        <section className="about-closing">
          <p>Chaque détail compte.</p>
          <h2>Votre histoire<br />mérite d’être racontée<span>.</span></h2>
          <a className="button" href="/contact#formulaire">Parlons de votre projet <ArrowRight size={18} weight="bold" /></a>
        </section>
      </main>

      <footer className="footer">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div><strong>Sept-Îles · Québec</strong><a href="/contact#formulaire">{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div>
        <div className="footer-links"><a href="/">Accueil</a><a href="/services">Services</a><a href="/realisations">Réalisations</a><a href="/boutique">Boutique</a><a href="/#seances">Séances</a><a href="/a-propos">À propos</a><a href="/contact#formulaire">Contact</a></div>
        <div className="socials" aria-label="Réseaux sociaux"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a></div>
      </footer>
    </div>
  );
}

export default RealisationsPage;
