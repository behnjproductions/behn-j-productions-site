import { useEffect, useState } from 'react';
import { ArrowRight, FacebookLogo, InstagramLogo } from '@phosphor-icons/react';
import { BRAND } from './brand.js';

export function ServicesPage() {
  const [revealRoot, setRevealRoot] = useState(null);

  useEffect(() => {
    const targets = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach((el) => observer.observe(el));
    setRevealRoot(true);
    return () => observer.disconnect();
  }, []);

  const openContact = (type) => { window.location.href = `/contact?type=${encodeURIComponent(type)}#formulaire`; };

  return (
    <div className="site-shell services-page" data-ready={revealRoot ? 'true' : 'false'}>
      <header className="site-header about-header">
        <a className="brand" href="/" aria-label="Retour à l’accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
        <nav className="about-nav" aria-label="Navigation principale"><a href="/">Retour à l’accueil</a></nav>
        <div className="header-actions"><a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a><a className="header-cta" href="/contact#formulaire">Nous contacter</a></div>
      </header>

      <main className="about-main">
        <div className="services-band services-band--page" data-reveal>
          <img src="/assets/services-hero.jpg" alt="Moment de complicité capté sur scène par Behn J. Productions" />
          <div className="services-band__shade" />
          <div className="services-band__content">
            <p className="eyebrow">Photographie · Vidéo · Sites web · Design</p>
            <h1>Nos services</h1>
            <p>Découvrez tout ce qu’on peut créer pour vous.</p>
            <a className="button" href="/contact#formulaire">Commencer mon projet <ArrowRight size={18} weight="bold" /></a>
          </div>
        </div>

    <section id="photographie" className="chapter chapter--photo">
    <div className="chapter__number" data-reveal><strong>01</strong><span>Émotions authentiques.<br />Images intemporelles.</span></div>
    <div className="chapter__heading" data-reveal><p className="eyebrow">L'art de saisir l'essentiel</p><h2>Photographie</h2><p>Des moments vrais, cadrés avec intention.</p></div>
    <div className="photo-triptych">
    {[
    ['Corporatif', '/assets/photo-corporatif.jpg', 'Portrait corporatif haut de gamme', 'Corporatif / Institutionnel'],
    ['Mariages', '/assets/photo-mariage.jpg', 'Couple de mariés dans une lumière dorée', 'Mariage'],
    ['Événements', '/assets/photo-evenement.jpg', 'Performance culturelle sur scène', 'Événement'],
    ].map(([label, src, alt, type], i) => (
    <button key={label} type="button" data-reveal style={{ transitionDelay: `${i * 0.12}s` }} onClick={() => openContact(type)}>
    <img className="photo-triptych__image" src={src} alt={alt} loading="lazy" decoding="async" />
    <span className="photo-triptych__label"><span>{label}</span><ArrowRight /></span>
    </button>
    ))}
    </div>
    </section>

    <section id="video" className="chapter chapter--media" data-reveal>
    <img src="/assets/video-premium.jpg" alt="Production vidéo professionnelle en studio" loading="lazy" decoding="async" /><div className="media-shade" />
    <div className="chapter__number"><strong>02</strong><span>Des histoires<br />qui font bouger.</span></div>
    <div className="media-copy"><p className="eyebrow">Production · Réalisation · Drone</p><h2>Vidéo</h2><p>Plus que des vidéos.<br />Des émotions en mouvement.</p><a className="button button--secondary" href="/realisations">Voir nos réalisations <ArrowRight size={18} weight="bold" /></a></div>
    </section>

    <div className="chapter-pair">
    <section id="diffusion" className="chapter chapter--media chapter--diffusion" data-reveal>
    <img src="/assets/diffusion-web-premium.jpg" alt="Régie professionnelle de diffusion web en direct" loading="lazy" decoding="async" /><div className="media-shade" />
    <div className="chapter__number"><strong>03</strong><span>Une plus grande<br />portée pour vos histoires.</span></div>
    <div className="media-copy"><p className="eyebrow">Création · Stratégie · Réseaux sociaux</p><h2>Diffusion web</h2><p>Vos images. Plus loin.<br />Sur toutes les plateformes.</p><a className="button button--secondary" href="/contact?type=Diffusion%20web#formulaire">Stratégie et diffusion <ArrowRight size={18} weight="bold" /></a></div>
    <aside className="media-markets" aria-label="Événements disponibles en diffusion en direct">
    <p>Diffusion en direct</p>
    <ol>
    <li><span>01</span>Colloques, congrès et conférences</li>
    <li><span>02</span>Jeux sportifs, tournois et championnats</li>
    <li><span>03</span>Assemblées générales et rencontres communautaires</li>
    <li><span>04</span>Conseils municipaux et consultations publiques</li>
    </ol>
    </aside>
    </section>

    <section id="design" className="chapter chapter--media chapter--design" data-reveal>
    <img src="/assets/design-premium.jpg" alt="Création d’un site web et de contenus graphiques en atelier" loading="lazy" decoding="async" /><div className="media-shade" />
    <div className="chapter__number"><strong>04</strong><span>Un site qui travaille<br />pour vous.</span></div>
    <div className="media-copy"><p className="eyebrow">Création web · Design graphique · Identité visuelle</p><h2>Sites web</h2><p>Un site qui vous ressemble,<br />pensé pour être trouvé.</p><p className="media-copy__proof">Ce site en est un exemple : conçu, écrit et mis en ligne par notre équipe.</p><a className="button button--secondary" href="/contact?type=Sites%20web#formulaire">Créer mon site <ArrowRight size={18} weight="bold" /></a></div>
    <aside className="media-markets" aria-label="Services de création web et de design">
    <p>Ce que nous créons</p>
    <ol>
    <li><span>01</span>Sites web vitrines et pages de destination</li>
    <li><span>02</span>Identité visuelle, logos et chartes graphiques</li>
    <li><span>03</span>Affiches, dépliants et cartes d’affaires</li>
    <li><span>04</span>Habillage de réseaux sociaux et infolettres</li>
    </ol>
    </aside>
    </section>
    </div>

    <section id="ecoles" className="school-feature" data-reveal>
    <img src="/assets/school-premium.jpg" alt="Portraits scolaires naturels et joyeux" loading="lazy" decoding="async" /><div className="school-feature__wash" /><div className="school-feature__number">05</div>
    <div className="school-feature__content"><p className="eyebrow eyebrow--dark">Pour les écoles et les parents</p><h2>Écoles</h2><p>Des sourires d’aujourd’hui<br />pour les souvenirs de demain.</p><a className="button" href={BRAND.schoolPortal}>Ouvrir l’espace scolaire <ArrowRight size={18} weight="bold" /></a></div>
    </section>

        <section className="about-closing">
          <p>Chaque détail compte.</p>
          <h2>Votre histoire<br />mérite d’être racontée<span>.</span></h2>
          <a className="button" href="/contact#formulaire">Créer ensemble <ArrowRight size={18} weight="bold" /></a>
        </section>
      </main>

      <footer className="footer">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div><strong>Sept-Îles · Québec</strong><a href="/contact#formulaire">{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div>
        <div className="footer-links"><a href="/">Accueil</a><a href="/services">Services</a><a href="/realisations">Réalisations</a><a href="/#seances">Séances</a><a href="/a-propos">À propos</a><a href="/contact#formulaire">Contact</a></div>
        <div className="socials" aria-label="Réseaux sociaux"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a></div>
      </footer>
    </div>
  );
}

export default ServicesPage;
