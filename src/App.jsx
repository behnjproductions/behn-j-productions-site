import { useEffect, useRef, useState } from 'react';
import { ArrowRight, List, X } from '@phosphor-icons/react';
import { ContactForm, PrivacyModal } from './ContactForm.jsx';
import './home-editorial.css';

const links = [['Services', '/services'], ['Systèmes IA', '/systemes-ia'], ['Réalisations', '/realisations'], ['Boutique', '/boutique'], ['À propos', '/a-propos']];
const services = [
  { title: 'Photographie', image: '/assets/photo-mariage.jpg', alt: 'Un instant de complicité photographié lors d’un mariage', description: 'Portraits, reportages et projets sur mesure.', href: '/services#photographie' },
  { title: 'Films & événements', image: '/assets/hero-evenement.jpg', alt: 'Un artiste sur scène pendant un événement', description: 'Captation, production et diffusion de vos moments marquants.', href: '/services#video' },
  { title: 'Design & expériences web', image: '/assets/design-premium.jpg', alt: 'Création visuelle et expérience numérique', description: 'Identité visuelle, sites web et contenus créatifs qui vous distinguent.', href: '/services#design' },
];

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuRef.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);
  return <div className="lux-home">
    <a className="lux-skip" href="#accueil">Aller au contenu</a>
    <header className="lux-header">
      <a className="lux-brand" href="/" aria-label="Behn J. Productions — Accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
      <nav id="lux-navigation" className={menuOpen ? 'lux-nav is-open' : 'lux-nav'} aria-label="Navigation principale">
        {links.map(([title, href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{title}</a>)}
        <a className="lux-mobile-contact" href="#formulaire" onClick={() => setMenuOpen(false)}>Parlons de votre projet</a>
      </nav>
      <a className="lux-header-contact" href="#formulaire">Parlons de votre projet</a>
      <button ref={menuRef} className="lux-menu" type="button" aria-expanded={menuOpen} aria-controls="lux-navigation" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={26}/> : <List size={26}/>}</button>
    </header>
    <main>
      <section id="accueil" className="lux-hero" aria-labelledby="lux-title">
        <img className="lux-hero-photo" src="/assets/noel-famille.jpg" alt="Deux proches enlacés dans la lumière dorée de Noël" fetchPriority="high" />
        <div className="lux-hero-copy">
          <p className="lux-eyebrow">Behn J. Productions — Sept-Îles</p>
          <h1 id="lux-title">Les instants passent.<br/>L’émotion demeure.</h1>
          <p className="lux-hero-services">Photographie · Films · Création digitale</p>
          <a className="lux-button" href="#services">Découvrir notre univers <ArrowRight size={21} aria-hidden="true"/></a>
        </div>
      </section>
      <a id="noel" className="lux-christmas" href="#formulaire" aria-label="Portraits de Noël aux Galeries Montagnaises, du 10 au 13 décembre 2026, dès 10 h. Sans réservation.">
        <img src="/assets/noel-pine.png" alt="" aria-hidden="true"/>
        <span className="lux-christmas-title">Les portraits<br/>de Noël</span>
        <span className="lux-christmas-place">Galeries Montagnaises</span>
        <span className="lux-christmas-date">10–13 décembre 2026 · Dès 10 h<small>Sans réservation</small></span>
      </a>
      <section id="services" className="lux-services" aria-labelledby="lux-services-title">
        <p className="lux-eyebrow">Nos services</p>
        <div className="lux-services-intro"><h2 id="lux-services-title">Des histoires qui méritent<br/>d’être vues.</h2><p>De la photographie au film, en passant par la création numérique, nous donnons vie à vos idées avec sensibilité, authenticité et une attention au détail sans compromis.</p></div>
        <div className="lux-service-grid">{services.map((service, i) => <article className="lux-service" key={service.title}>
          <a className="lux-service-image" href={service.href}><img src={service.image} alt={service.alt} loading="lazy" decoding="async"/></a>
          <span className="lux-service-number">0{i+1}</span><h3><a href={service.href}>{service.title}</a></h3><p>{service.description}</p>
          <a className="lux-text-link" href={service.href}>En savoir plus <ArrowRight size={18} aria-hidden="true"/></a>
        </article>)}</div>
      </section>
      <section id="formulaire" className="lux-contact" aria-labelledby="lux-contact-title">
        <div className="lux-contact-intro"><h2 id="lux-contact-title">Parlons de votre projet.</h2></div>
        <ContactForm onOpenPrivacy={() => setPrivacyOpen(true)} resetKey="home-contact" />
      </section>
    </main>
    <footer className="lux-footer"><a href="/" aria-label="Behn J. Productions — Accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions"/></a><p>Photographie · Films · Création digitale <span>—</span> Sept-Îles</p><button type="button" onClick={() => setPrivacyOpen(true)}>Confidentialité</button></footer>
    <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)}/>
  </div>;
}
export default App;
