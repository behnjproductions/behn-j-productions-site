import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FacebookLogo, InstagramLogo } from '@phosphor-icons/react';
import { BRAND } from './brand.js';

const SLIDES = [
  { src: '/assets/about/about-action.webp', alt: 'Behn J photographiant un événement sur scène', label: 'En action' },
  { src: '/assets/about/about-origin.webp', alt: 'Behn J avec son sac de photographie', label: 'La passion' },
  { src: '/assets/about/about-production.webp', alt: 'Behn J en production photo et vidéo', label: 'Sur le terrain' },
];

export function AProposPage() {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const interval = window.setInterval(() => setSlide((current) => (current + 1) % SLIDES.length), 5200);
    return () => window.clearInterval(interval);
  }, [paused]);

  const changeSlide = (direction) => setSlide((current) => (current + direction + SLIDES.length) % SLIDES.length);

  return (
    <div className="site-shell about-page">
      <header className="site-header about-header">
        <a className="brand" href="/" aria-label="Retour à l'accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
        <nav className="about-nav" aria-label="Navigation principale"><a href="/">Retour à l’accueil</a></nav>
        <div className="header-actions"><a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a><a className="header-cta" href="/contact">Nous contacter</a></div>
      </header>

      <main className="about-main">
        <section className="about-intro" aria-labelledby="about-intro-title">
          <div className="about-intro__hero">
            <img
              src="/assets/about-intro/cote-nord-audience.webp"
              alt="Public réuni lors d’un événement sur la Côte-Nord"
              loading="eager"
            />
            <div className="about-intro__shade" />
            <p>Photographie · Vidéo · Diffusion web</p>
            <h1 id="about-intro-title">À propos</h1>
          </div>

          <div className="about-intro__statement">
            <p><strong>Behn J. Productions</strong> est une entreprise créative établie sur la Côte-Nord, spécialisée en photographie, vidéo et diffusion web.</p>
            <p>De Sept-Îles à l’ensemble de la région, nous créons des images authentiques pour les familles, les entreprises, les écoles, les artistes et les organisations.</p>
            <p>Une approche humaine. Un regard cinématographique. Une attention portée à ce que les autres ne voient pas toujours.</p>
            <span>Chaque détail compte.</span>
          </div>

          <div id="about-intro-gallery" className="about-intro__gallery" aria-label="Behn J. Productions en chiffres">
            <figure><img src="/assets/about-intro/portrait-emotion.webp" alt="Moment de complicité capté pendant un événement" loading="lazy" /><figcaption>13+ années d’expérience</figcaption></figure>
            <figure><img src="/assets/about-intro/culture-innu.webp" alt="Portrait culturel d’une mère et de son enfant" loading="lazy" /><figcaption>200+ clients accompagnés</figcaption></figure>
            <figure><img src="/assets/about-intro/concert-live.webp" alt="Artistes sur scène pendant un spectacle" loading="lazy" /><figcaption>Des centaines de projets réalisés</figcaption></figure>
            <figure><img src="/assets/about-intro/enfance-famille.webp" alt="Portrait de trois enfants réunis" loading="lazy" /><figcaption>Plusieurs communautés visitées</figcaption></figure>
          </div>
        </section>

        <section className="about-story">
          <div className="about-story__copy">
            <p className="eyebrow">À propos de Behn J</p>
            <h2>Une caméra.<br /><span>Une passion.</span><br />Une histoire.</h2>
            <div className="about-story__text">
              <p>Tout a commencé en 2011, à La Vega, en République dominicaine. Avec notre groupe d’artistes, nous avions des chansons et des idées, mais personne pour les mettre en images. Mon père avait une petite caméra Flip. Je l’ai prise pour photographier et filmer le groupe — et j’ai découvert une passion.</p>
              <p>Au début, je créais simplement par plaisir. Puis des gens ont commencé à me dire : « J’aime tes images. Peux-tu photographier ma fille, mon fils, ma famille? » J’ai alors compris que cette passion pouvait devenir un métier.</p>
              <p>En 2013, j’ai fondé ma première entreprise, Cede Films. En 2024, avec l’appui essentiel de mon épouse, nous avons restructuré cette aventure au Canada pour lui donner un nouveau nom : <strong>Behn J. Productions.</strong></p>
              <p>Aujourd’hui, à Sept-Îles, j’accompagne familles, entreprises, écoles, artistes et organisations en photographie, vidéo et diffusion web. Mon approche reste la même : créer un climat de confiance, capter l’émotion vraie et soigner chaque détail.</p>
            </div>
            <ol className="about-timeline" aria-label="Parcours de Behn J">
              <li><strong>2011</strong><span>La Vega<br />Le déclic</span></li>
              <li><strong>2013</strong><span>Cede Films<br />La fondation</span></li>
              <li><strong>2024</strong><span>Canada<br />Behn J. Productions</span></li>
            </ol>
            <a className="button" href={`mailto:${BRAND.email}`}>Parlons de votre projet <ArrowRight size={18} weight="bold" /></a>
          </div>

          <div className="about-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} aria-label="Behn J au fil des années">
            <div className="about-carousel__frames" aria-live="polite">
              {SLIDES.map((item, index) => (
                <figure className={index === slide ? 'is-active' : ''} key={item.src} aria-hidden={index !== slide}>
                  <img src={item.src} alt={index === slide ? item.alt : ''} loading={index === 0 ? 'eager' : 'lazy'} />
                  <figcaption><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</figcaption>
                </figure>
              ))}
            </div>
            <div className="about-carousel__controls">
              <button type="button" onClick={() => changeSlide(-1)} aria-label="Photo précédente"><ArrowLeft size={21} /></button>
              <div className="about-carousel__dots" role="group" aria-label="Choisir une photo">
                {SLIDES.map((item, index) => <button key={item.src} type="button" className={index === slide ? 'is-active' : ''} onClick={() => setSlide(index)} aria-label={`Afficher la photo ${index + 1}`} aria-current={index === slide ? 'true' : undefined} />)}
              </div>
              <button type="button" onClick={() => changeSlide(1)} aria-label="Photo suivante"><ArrowRight size={21} /></button>
            </div>
          </div>
        </section>

        <section className="about-team" aria-labelledby="about-team-title">
          <div className="about-team__heading">
            <p className="eyebrow">Les visages derrière chaque projet</p>
            <h2 id="about-team-title">Notre <span>équipe</span></h2>
            <p>Trois regards, une même exigence : créer avec humanité, précision et passion.</p>
          </div>

          <div className="about-team__grid">
            <article className="team-member" tabIndex={0}>
              <figure><img src="/assets/team/behn-j.webp" alt="Behn Jedy, directeur de production" loading="lazy" />
                <figcaption className="team-member__bio"><strong>Directeur de production</strong><span>Fondateur de Behn J. Productions, il supervise chaque mandat de la planification à la livraison. Il est aussi derrière la caméra, en photo comme en vidéo.</span></figcaption>
              </figure>
              <div className="team-member__identity"><h3>Behn Jedy</h3><p>Directeur de production</p></div>
            </article>
            <article className="team-member" tabIndex={0}>
              <figure><img src="/assets/team/danysa-regis-labbe.webp" alt="Danysa Régis-Labbé, directrice adjointe" loading="lazy" />
                <figcaption className="team-member__bio"><strong>Directrice adjointe</strong><span>Elle coordonne les projets et le lien avec la clientèle, de la première rencontre jusqu’à la remise des images.</span></figcaption>
              </figure>
              <div className="team-member__identity"><h3>Danysa Régis-Labbé</h3><p>Directrice adjointe</p></div>
            </article>
            <article className="team-member" tabIndex={0}>
              <figure><img src="/assets/team/leon-nyeningabo.webp" alt="Léon Nyeningabo, assistant photographe" loading="lazy" />
                <figcaption className="team-member__bio"><strong>Assistant photographe</strong><span>Il assiste sur le terrain en photo et en vidéo : éclairage, matériel et captation lors des mandats.</span></figcaption>
              </figure>
              <div className="team-member__identity"><h3>Léon Nyeningabo</h3><p>Assistant photographe</p></div>
            </article>
          </div>
        </section>

        <section className="about-closing">
          <p>Chaque détail compte.</p>
          <h2>Votre histoire<br />mérite d’être racontée<span>.</span></h2>
          <a className="button" href={`mailto:${BRAND.email}`}>Créer ensemble <ArrowRight size={18} weight="bold" /></a>
        </section>
      </main>

      <footer className="footer">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div><strong>Sept-Îles · Québec</strong><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div>
        <div className="footer-links"><a href="/">Accueil</a><a href="/#photographie">Photographie</a><a href="/#ecoles">Écoles</a><a href="/#contact">Contact</a></div>
        <div className="socials" aria-label="Réseaux sociaux"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a></div>
      </footer>
    </div>
  );
}

export default AProposPage;
