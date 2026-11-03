import { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, ChatCircleDots, StarFour, ArrowLeft, ArrowRight, FacebookLogo, InstagramLogo, List, X } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import { ContactForm, PrivacyModal } from './ContactForm.jsx';
import { useDialog } from './useDialog.js';

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

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggleRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeMenu = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setMenuOpen(false);
      menuToggleRef.current?.focus();
    };
    window.addEventListener('keydown', closeMenu);
    return () => window.removeEventListener('keydown', closeMenu);
  }, [menuOpen]);
  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={() => { scrollToSection('accueil'); setMenuOpen(false); }} aria-label="Retour à l'accueil">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
      </button>
      <nav id="home-main-navigation" className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
        {NAV.map(([label, id]) => <button key={id} type="button" onClick={() => { scrollToSection(id); setMenuOpen(false); }}>{label}</button>)}
        <a href="/services" onClick={() => setMenuOpen(false)}>Services</a>
        <a href="/systemes-ia" onClick={() => setMenuOpen(false)}>Systèmes IA</a>
        <a href="/realisations" onClick={() => setMenuOpen(false)}>Réalisations</a>
        <a href="/boutique" onClick={() => setMenuOpen(false)}>Boutique</a>
        <a href="/a-propos" onClick={() => setMenuOpen(false)}>À propos</a>
        <a href="#formulaire" onClick={() => setMenuOpen(false)}>Contact</a>
      </nav>
      <div className="header-actions">
        <a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a>
        <a className="header-cta" href="#formulaire">Nous contacter</a>
      </div>
      <button className="menu-toggle" type="button" ref={menuToggleRef} aria-expanded={menuOpen} aria-controls="home-main-navigation" onClick={() => setMenuOpen((isOpen) => !isOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
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
  const dialogRef = useDialog(open, onClose);
  useEffect(() => {
    if (open) dialogRef.current?.querySelector('#sessions-title')?.focus({ preventScroll: true });
  }, [open, selected, dialogRef]);
  useEffect(() => { if (!open) setSelected(null); }, [open]);
  if (!open) return null;
  const session = SESSIONS.find((s) => s.id === selected);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal sessions-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sessions-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>

        {!session ? <>
          <p className="eyebrow">Choisis ton moment</p>
          <h2 id="sessions-title" tabIndex={-1} className="legal-title">Explorer nos séances.</h2>
          <p className="modal-intro">Un aperçu du tarif et du style. Clique sur une séance pour voir tous les détails.</p>
          <div className="sessions-grid">
            {SESSIONS.map((s) => (
              <button key={s.id} type="button" className="session-card" onClick={() => setSelected(s.id)}>
                <img src={s.img} alt={s.name} loading="lazy" decoding="async" />
                <span className="session-card__name">{s.name}</span>
                <span className="session-card__price">À partir de {s.price} $</span>
              </button>
            ))}
          </div>
        </> : <div className="session-detail">
          <button className="session-back" type="button" onClick={() => setSelected(null)}><ArrowLeft size={18} /> Toutes les séances</button>
          <img src={session.img} alt={session.name} loading="lazy" decoding="async" />
          <h2 id="sessions-title" tabIndex={-1} className="legal-title">{session.name}</h2>
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
  const dialogRef = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>
        <p className="eyebrow">Votre histoire commence ici</p>
        <h2 id="modal-title">Parlons de votre projet.</h2>
        <p className="modal-intro">Quelques lignes suffisent. Je vous répondrai avec une proposition claire et humaine.</p>
        <ContactForm prefillType={prefillType} onOpenPrivacy={onOpenPrivacy} resetKey={open} />
      </section>
    </div>
  );
}

function ChristmasAmbience() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = 0.65;
    const removeListeners = () => {
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('keydown', startOnInteraction);
    };
    const start = () => audio.play().then(() => { setPlaying(true); removeListeners(); }).catch(() => {});
    const startOnInteraction = (event) => {
      if (event.target.closest?.('.noel-ambience')) return;
      start();
    };
    audio.addEventListener('playing', removeListeners);
    document.addEventListener('click', startOnInteraction);
    document.addEventListener('keydown', startOnInteraction);
    start();
    return () => { removeListeners(); audio.removeEventListener('playing', removeListeners); audio.pause(); };
  }, []);
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio.paused) { audio.pause(); setPlaying(false); }
    else { try { await audio.play(); setPlaying(true); } catch { setPlaying(false); } }
  };
  return <div className="noel-ambience"><audio ref={audioRef} src="/assets/jingle-bells-carillon.wav" autoPlay loop preload="auto" onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} /><button type="button" onClick={toggle} aria-pressed={playing}>{playing ? '♫ Couper la musique' : '♪ Activer l’ambiance de Noël'}</button></div>;
}

export function App() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
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
      <Header />
      <main>
        <section id="accueil" className="christmas-feature christmas-feature--hero" aria-labelledby="christmas-title">
          <div className="noel-festive-layer" aria-hidden="true">
            <img className="noel-pine" src="/assets/noel-pine.png" alt="" />
            <div className="noel-snow">{Array.from({length:26},(_,i)=><i key={i} style={{'--x':`${(i*37+9)%100}%`,'--size':`${3+i%4}px`,'--duration':`${9+i%7}s`,'--delay':`${-i*.73}s`}} />)}</div>
          </div>
          <span id="noel" className="noel-anchor" aria-hidden="true" /><ChristmasAmbience />
          <div className="christmas-feature__copy">
            <p className="eyebrow"><StarFour weight="fill" size={22} aria-hidden="true" />Behn J. Productions présente</p>
            <h1 id="christmas-title"><em>La magie de Noël</em><strong>aux Galeries Montagnaises</strong></h1>
            <ul className="christmas-feature__details">
              <li className="noel-location"><MapPin weight="fill" size={30} aria-hidden="true" /><strong>Sept-Îles</strong></li>
              <li className="christmas-feature__date" aria-label="Du 10 au 13 décembre 2026"><div className="noel-date-range" aria-hidden="true"><div className="noel-date-card"><img src="/assets/noel-hat.png" alt="" /><span>Du</span><strong>10</strong></div><div className="noel-date-card noel-date-card--end"><img src="/assets/noel-hat.png" alt="" /><span>au</span><strong>13</strong></div></div><span className="noel-date-month" aria-hidden="true">décembre 2026</span></li>
              <li className="noel-time"><Clock size={32} aria-hidden="true" /><span>Dès <strong>10 h</strong></span></li>
            </ul>
            <p className="christmas-feature__badge"><StarFour size={24} weight="fill" aria-hidden="true" />Aucune réservation nécessaire !</p>
            <a className="christmas-feature__contact" href="#formulaire" onClick={() => setPrefillType('Famille')}><ChatCircleDots size={26} aria-hidden="true" />Écrivez-moi pour plus d’infos <ArrowRight size={22} /></a>
          </div>
          <figure className="christmas-feature__photo"><img src="/assets/noel-famille.jpg" alt="Deux proches enlacés devant un décor de Noël aux lumières dorées" loading="lazy" decoding="async" /></figure>
        </section>

        <section id="services" className="services-band" aria-labelledby="home-services-title" data-reveal>
          <img src="/assets/services-hero.jpg" alt="Moment de complicité capté sur scène par Behn J. Productions" loading="lazy" decoding="async" />
          <div className="services-band__shade" />
          <div className="services-band__content">
            <p className="eyebrow">Photographie · Vidéo · Sites web · Design</p>
            <h2 id="home-services-title">Nos services</h2>
            <p>Découvrez tout ce qu’on peut créer pour vous.</p>
            <a className="button" href="/services">Voir nos services <ArrowRight size={18} weight="bold" /></a>
          </div>
        </section>

        <section id="contact" className="home-contact" aria-labelledby="home-contact-title">
          <div id="formulaire" className="contact-form-card">
            <p className="eyebrow">Parlons de votre projet</p>
            <h2 id="home-contact-title">Contactez-nous</h2>
            <ContactForm prefillType={prefillType} onOpenPrivacy={() => setPrivacyOpen(true)} resetKey="home-contact" />
          </div>
        </section>
        <figure id="photo-finale" className="home-wedding-finale">
          <img src="/assets/portfolio/mariage-cortege.jpg" alt="Les mariés et tout leur cortège réunis dans une scène joyeuse en forêt" loading="lazy" decoding="async" />
        </figure>
      </main>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}

export default App;
