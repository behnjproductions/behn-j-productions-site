import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FacebookLogo, InstagramLogo, List, X } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import { ContactForm, PrivacyModal } from './ContactForm.jsx';

const NAV = [['Accueil', 'accueil']];

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function CTAButton({ children, secondary = false, onClick, href }) {
  const content = <><span>{children}</span><ArrowRight size={18} weight="bold" aria-hidden="true" /></>;
  return href ? (
    <a className={`button ${secondary ? 'button--secondary' : ''}`} href={href} target="_blank" rel="noreferrer">{content}</a>
  ) : (
    <button className={`button ${secondary ? 'button--secondary' : ''}`} type="button" onClick={onClick}>{content}</button>
  );
}

function Header({ onOpenContact }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={() => scrollToSection('accueil')} aria-label="Retour à l'accueil">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
      </button>
      <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
        {NAV.map(([label, id]) => <button key={id} type="button" onClick={() => { scrollToSection(id); setMenuOpen(false); }}>{label}</button>)}
        <a href="/services" onClick={() => setMenuOpen(false)}>Services</a>
        <button type="button" onClick={() => { scrollToSection('seances'); setMenuOpen(false); }}>Séances</button>
        <a href="/a-propos" onClick={() => setMenuOpen(false)}>À propos</a>
        <a href="/contact" onClick={() => setMenuOpen(false)}>Contact</a>
      </nav>
      <div className="header-actions">
        <a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a>
        <button className="header-cta" type="button" onClick={onOpenContact}>Nous contacter</button>
      </div>
      <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
        {menuOpen ? <X size={26} /> : <List size={28} />}
      </button>
    </header>
  );
}

const SESSIONS = [
  { id: 'maternite', name: 'Maternité', price: 175, duration: '45 minutes', photos: 8, img: '/assets/sessions/maternite.jpg' },
  { id: 'bebe', name: 'Bébé / nouveau-né', price: 175, duration: '45 minutes', photos: 8, img: '/assets/sessions/bebe.jpg' },
  { id: 'famille', name: 'Famille', price: 175, duration: '45 minutes', photos: 8, img: '/assets/sessions/famille.jpg' },
  { id: 'anniversaire', name: 'Anniversaire', price: 175, duration: '45 minutes', photos: 8, img: '/assets/sessions/anniversaire.jpg' },
  { id: 'finissants', name: 'Bal de finissants', price: 250, duration: '30 minutes', photos: 15, img: '/assets/sessions/finissants.jpg', note: 'Le lieu et les poses sont choisis à l’avance avec vous, afin d’optimiser chaque minute de la séance.' },
];

function SessionsModal({ open, onClose, onBook }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => { if (!open) setSelected(null); }, [open]);
  if (!open) return null;
  const session = SESSIONS.find((s) => s.id === selected);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal sessions-modal" role="dialog" aria-modal="true" aria-labelledby="sessions-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>

        {!session ? <>
          <p className="eyebrow">Choisis ton moment</p>
          <h2 id="sessions-title" className="legal-title">Explorer nos séances.</h2>
          <p className="modal-intro">Un aperçu du tarif et du style. Clique sur une séance pour voir tous les détails.</p>
          <div className="sessions-grid">
            {SESSIONS.map((s) => (
              <button key={s.id} type="button" className="session-card" onClick={() => setSelected(s.id)}>
                <img src={s.img} alt={s.name} />
                <span className="session-card__name">{s.name}</span>
                <span className="session-card__price">À partir de {s.price} $</span>
              </button>
            ))}
          </div>
        </> : <div className="session-detail">
          <button className="session-back" type="button" onClick={() => setSelected(null)}><ArrowLeft size={18} /> Toutes les séances</button>
          <img src={session.img} alt={session.name} />
          <h2 className="legal-title">{session.name}</h2>
          <p className="session-detail__price">{session.price} $ — séance unique</p>
          <ul className="session-detail__list">
            <li>{session.photos} photos retouchées</li>
            <li>Séance d’environ {session.duration}</li>
            <li>Galerie privée en ligne</li>
          </ul>
          {session.note && <p className="session-detail__note">{session.note}</p>}
          <button className="button" type="button" onClick={() => onBook(session.name)}>Réserver cette séance <ArrowRight size={18} /></button>
        </div>}
      </section>
    </div>
  );
}

function ProjectModal({ open, onClose, onOpenPrivacy, prefillType }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>
        <p className="eyebrow">Votre histoire commence ici</p>
        <h2 id="modal-title">Parlons de votre projet.</h2>
        <p className="modal-intro">Quelques lignes suffisent. Je vous répondrai avec une proposition claire et humaine.</p>
        <ContactForm prefillType={prefillType} onOpenPrivacy={onOpenPrivacy} resetKey={open} />
      </section>
    </div>
  );
}

export function App() {
  const [contactOpen, setContactOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [prefillType, setPrefillType] = useState('');

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    if (els.length === 0) return undefined;
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -80px 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="site-shell">
      <Header onOpenContact={() => setContactOpen(true)} />
      <main>
        <section id="accueil" className="hero">
          <div className="hero__media" aria-label="Mariage, portrait corporatif et événement captés par Behn J. Productions">
            <img src="/assets/hero-mariage.jpg" alt="Mariage photographié par Behn J. Productions" />
            <img src="/assets/hero-corporatif.jpg" alt="Portrait corporatif réalisé par Behn J. Productions" />
            <img src="/assets/hero-evenement.jpg" alt="Événement photographié par Behn J. Productions" />
          </div>
          <div className="hero__shade" />
          <div className="hero__content"><p className="eyebrow">Sept-Îles · Côte-Nord</p><h1>Chaque détail<br />compte<span>.</span></h1><p className="hero__lead">Photographie <i /> Vidéo <i /> Diffusion web</p><div className="hero__actions"><CTAButton onClick={() => setContactOpen(true)}>Commencer mon projet</CTAButton><a className="showreel" href={BRAND.facebook} target="_blank" rel="noreferrer"><FacebookLogo size={20} weight="fill" /> Voir nos réalisations</a></div></div>
          <p className="hero__manifesto">Des gens d’ici.<br />Des lieux d’ici.<br />Des histoires<br />en mouvement.</p>
          <button className="hero__scroll" type="button" onClick={() => scrollToSection('photographie')}>Découvrir <span /></button>
        </section>

        <section id="photographie" className="chapter chapter--photo">
          <div className="chapter__number" data-reveal><strong>01</strong><span>Émotions authentiques.<br />Images intemporelles.</span></div>
          <div className="chapter__heading" data-reveal><p className="eyebrow">L'art de saisir l'essentiel</p><h2>Photographie</h2><p>Des moments vrais, cadrés avec intention.</p></div>
          <div className="photo-triptych">
            {[
              ['Corporatif', '/assets/photo-corporatif.jpg', 'Portrait corporatif haut de gamme'],
              ['Mariages', '/assets/photo-mariage.jpg', 'Couple de mariés dans une lumière dorée'],
              ['Événements', '/assets/photo-evenement.jpg', 'Performance culturelle sur scène'],
            ].map(([label, src, alt], i) => (
              <button key={label} type="button" data-reveal style={{ transitionDelay: `${i * 0.12}s` }} onClick={() => setContactOpen(true)}>
                <img className="photo-triptych__image" src={src} alt={alt} />
                <span className="photo-triptych__label"><span>{label}</span><ArrowRight /></span>
              </button>
            ))}
          </div>
        </section>

        <section id="services" className="services-intro" data-reveal>
          <p>Behn J. Productions transforme vos idées en images concrètes. Établis à Sept-Îles et attachés à la Côte-Nord, nous mettons le même soin dans chaque mandat : photographie, vidéo, création de sites web et design graphique. Familles, entreprises, écoles, artistes et organisations — chaque projet est l’occasion de raconter ce qui se passe vraiment ici, avec une approche humaine, un regard cinématographique et une attention portée à ce que les autres ne voient pas toujours.</p>
          <a className="button" href="/services">Découvrir tous nos services <ArrowRight size={18} weight="bold" /></a>
        </section>

        <div className="services-band" data-reveal>
          <img src="/assets/services-hero.jpg" alt="Moment de complicité capté sur scène par Behn J. Productions" />
          <div className="services-band__shade" />
          <div className="services-band__content">
            <p className="eyebrow">Photographie · Vidéo · Sites web · Design</p>
            <h2>Nos services</h2>
            <p>Découvrez tout ce qu’on peut créer pour vous.</p>
            <a className="button" href="/services">Voir nos services <ArrowRight size={18} weight="bold" /></a>
          </div>
        </div>

        <div className="band-divider" aria-hidden="true" />

        <section id="seances" className="sessions-teaser" data-reveal>
          <p className="eyebrow">Choisis ton moment. Je m’occupe du reste.</p>
          <h2>Séances photo.</h2>
          <p>Maternité, bébé, famille, anniversaire ou bal de finissants — des séances simples à réserver, avec un tarif clair dès le départ.</p>
          <div className="sessions-teaser__actions">
            <CTAButton onClick={() => { setPrefillType(''); setContactOpen(true); }}>Réserver en ligne</CTAButton>
            <button className="sessions-teaser__explore" type="button" onClick={() => setSessionsOpen(true)}>Explorer nos séances <ArrowRight size={18} /></button>
          </div>
        </section>

        <section className="trust" data-reveal><blockquote><p>« Bon photographe. Il a vraiment pris le temps avec moi pour essayer plusieurs poses. »</p><footer>— Jesse Robitaille, avis Google ★★★★★</footer></blockquote><div className="local-pride"><span>Fiers de la Côte-Nord</span><strong>Nos gens.<br />Nos paysages.<br />Notre lumière.</strong></div></section>

        <section className="client-trust" aria-labelledby="client-trust-title" data-reveal>
          <div className="client-trust__intro">
            <p className="eyebrow">Ils nous font confiance</p>
            <h2 id="client-trust-title">Des relations bâties<br />sur la confiance.</h2>
            <p>Quelques organisations avec lesquelles nous avons eu le privilège de travailler.</p>
          </div>
          <div className="client-trust__names" aria-label="Organisations clientes">
            <span>ITUM</span>
            <span>Ville de Sept-Îles</span>
            <span className="client-trust__chamber"><strong>Chambre de commerce</strong><small>Sept-Îles / Port-Cartier</small></span>
            <span>Rio Tinto</span>
            <span>Métal 7</span>
          </div>
        </section>

        <section id="contact" className="closing" data-reveal><img src="/assets/coast-footer.jpg" alt="Photographe au coucher du soleil sur la Côte-Nord" /><div className="closing__shade" /><div className="closing__content"><p>Chaque détail compte.</p><h2>Votre histoire<br />commence ici<span>.</span></h2><CTAButton onClick={() => setContactOpen(true)}>Commencer mon projet</CTAButton></div></section>
      </main>

      <footer className="footer"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /><div><strong>Sept-Îles · Québec</strong><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div><div className="footer-links"><a href="/services">Services</a><button onClick={() => scrollToSection('seances')}>Séances</button><a href="/a-propos">À propos</a><a href="/contact">Contact</a><button className="footer-privacy" onClick={() => setPrivacyOpen(true)}>Confidentialité</button></div><div className="socials" aria-label="Réseaux sociaux"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a></div></footer>
      <ProjectModal open={contactOpen} onClose={() => setContactOpen(false)} onOpenPrivacy={() => setPrivacyOpen(true)} prefillType={prefillType} />
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} onBook={(name) => { setSessionsOpen(false); setPrefillType(name); setContactOpen(true); }} />
    </div>
  );
}

export default App;
