import { ArrowUpRight, Bell, CheckCircle, Cloud, EnvelopeSimple, FacebookLogo, Folder, Gear, InstagramLogo, NotePencil, PaperPlaneTilt, Stack, Tag, CalendarBlank } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import './systemes-ia.css';

const CONTACT_IA = '/contact?type=Syst%C3%A8mes%20IA#formulaire';

const STEPS = [
  ['01', 'On échange', 'En 30 minutes, vous m’expliquez la tâche : ce qui la déclenche, les étapes, le temps qu’elle vous prend.'],
  ['02', 'Je construis', 'Je conçois votre automatisation sur mesure, je la teste avec vos vrais cas et je la mets en place.'],
  ['03', 'Vous gagnez du temps', 'Votre système fonctionne au quotidien. Un suivi mensuel l’ajuste quand vos besoins changent.'],
];

function HeroFlow() {
  return (
    <div className="iax-flow" aria-hidden="true">
      <svg className="iax-ring" viewBox="0 0 520 520">
        <defs>
          <linearGradient id="iax-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
            <stop offset=".35" stopColor="#ff2b1c" stopOpacity=".9" />
            <stop offset=".7" stopColor="#3a0602" stopOpacity=".6" />
            <stop offset="1" stopColor="#ffffff" stopOpacity=".4" />
          </linearGradient>
          <filter id="iax-blur"><feGaussianBlur stdDeviation="14" /></filter>
        </defs>
        <ellipse cx="260" cy="260" rx="215" ry="120" transform="rotate(-32 260 260)" fill="none" stroke="#ff2b1c" strokeOpacity=".55" strokeWidth="34" filter="url(#iax-blur)" />
        <ellipse cx="260" cy="260" rx="215" ry="120" transform="rotate(-32 260 260)" fill="none" stroke="url(#iax-glass)" strokeWidth="26" />
        <ellipse cx="260" cy="260" rx="215" ry="120" transform="rotate(-32 260 260)" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        <ellipse cx="260" cy="260" rx="190" ry="150" transform="rotate(48 260 260)" fill="none" stroke="url(#iax-glass)" strokeWidth="18" strokeOpacity=".75" />
        <ellipse cx="260" cy="260" rx="190" ry="150" transform="rotate(48 260 260)" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1" />
      </svg>
      <div className="iax-card iax-card--1"><EnvelopeSimple size={24} /><span>Nouveau courriel</span><i>•••</i></div>
      <div className="iax-link iax-link--1"><b /></div>
      <div className="iax-card iax-card--2"><Gear size={24} /><span>Traitement automatique</span></div>
      <div className="iax-link iax-link--2"><b /></div>
      <div className="iax-card iax-card--3"><NotePencil size={24} /><span>Réponse préparée</span><CheckCircle className="iax-check" size={24} weight="fill" /></div>
    </div>
  );
}

export function SystemesIAPage() {
  return (
    <div className="iax">
      <header className="iax-nav">
        <a className="iax-nav__brand" href="/" aria-label="Retour à l’accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
        <nav aria-label="Navigation principale">
          <a href="/services">Services</a>
          <a href="#methode">Méthode</a>
          <a className="iax-btn iax-btn--small" href={CONTACT_IA}>Parlons de votre projet</a>
        </nav>
      </header>

      <main>
        <section className="iax-hero">
          <div className="iax-hero__copy">
            <p className="iax-pill"><span />Automatisations sur mesure</p>
            <h1><span>Votre entreprise.</span> <span>En mode</span> <em>automatique.</em></h1>
            <p className="iax-hero__lead">Expliquez-moi une tâche en 30 minutes. Je vous livre une automatisation prête à fonctionner.</p>
            <a className="iax-btn" href={CONTACT_IA}>Réserver mon diagnostic <ArrowUpRight size={22} weight="bold" /></a>
            <p className="iax-hero__note">Des outils connectés. Un quotidien simplifié.</p>
          </div>
          <HeroFlow />
        </section>

        <section className="iax-bento" aria-labelledby="iax-bento-title">
          <h2 id="iax-bento-title" className="iax-rule">Moins de friction. Plus d’action.</h2>
          <div className="iax-bento__grid">
            <article className="iax-panel iax-panel--inbox">
              <h3>Vos courriels, déjà organisés.</h3>
              <p>Triez, résumez et préparez vos réponses.</p>
              <div className="iax-inbox" aria-hidden="true">
                <div className="iax-inbox__dots"><i /><i /><i /></div>
                <div className="iax-inbox__side"><span className="is-on"><EnvelopeSimple size={18} /></span><span><PaperPlaneTilt size={18} /></span><span><Folder size={18} /></span><span><Tag size={18} /></span></div>
                <div className="iax-inbox__list"><p>Boîte de réception</p><div className="is-on"><i /><b /><b /></div><div><i /><b /><b /></div><div><i /><b /><b /></div></div>
              </div>
            </article>
            <article className="iax-panel iax-panel--wide">
              <div><h3>Des relances au bon moment.</h3><p>Centralisez vos demandes et vos relances.</p></div>
              <div className="iax-cal" aria-hidden="true"><div className="iax-cal__rings"><i /><i /><i /><i /></div><div className="iax-cal__grid">{Array.from({ length: 12 }, (_, i) => <i key={i} className={i === 6 ? 'is-on' : ''} />)}</div><span className="iax-cal__bell"><Bell size={20} /></span></div>
            </article>
            <article className="iax-panel iax-panel--wide">
              <div><h3>Vos outils travaillent ensemble.</h3><p>Connectez vos outils à votre façon de travailler.</p></div>
              <div className="iax-net" aria-hidden="true">
                <svg viewBox="0 0 230 140"><path d="M44 36 H80 Q92 36 92 50 V60 M44 104 H80 Q92 104 92 90 V80 M186 36 H150 Q138 36 138 50 V60 M186 104 H150 Q138 104 138 90 V80" fill="none" stroke="#ff2b1c" strokeWidth="2" /></svg>
                <span style={{ left: 0, top: 14 }}><EnvelopeSimple size={20} /></span>
                <span style={{ left: 0, top: 82 }}><CalendarBlank size={20} /></span>
                <span style={{ right: 0, top: 14 }}><Stack size={20} /></span>
                <span style={{ right: 0, top: 82 }}><Cloud size={20} /></span>
                <span className="iax-net__hub"><Gear size={28} /></span>
              </div>
            </article>
          </div>
        </section>

        <section id="methode" className="iax-steps" aria-label="La méthode en trois étapes">
          <ol>
            {STEPS.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
        </section>

        <section className="iax-final">
          <svg className="iax-wave" viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="iax-wave-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#ff2b1c" stopOpacity="0" /><stop offset=".55" stopColor="#ff2b1c" stopOpacity=".9" /><stop offset="1" stopColor="#9f1204" stopOpacity=".2" /></linearGradient><filter id="iax-wave-b"><feGaussianBlur stdDeviation="10" /></filter></defs>
            <path d="M120 400 C 360 330, 520 260, 800 40" fill="none" stroke="url(#iax-wave-g)" strokeWidth="60" filter="url(#iax-wave-b)" />
            <path d="M160 400 C 400 330, 560 250, 800 80" fill="none" stroke="#ff6a5c" strokeOpacity=".7" strokeWidth="2" />
          </svg>
          <h2>Et si cette tâche se faisait toute seule ?</h2>
          <a className="iax-btn" href={CONTACT_IA}>Parlons de votre projet <ArrowUpRight size={22} weight="bold" /></a>
        </section>
      </main>

      <footer className="iax-footer">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div><strong>Sept-Îles, Québec</strong><a href="/contact#formulaire">{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div>
        <div className="iax-footer__links"><a href="/">Accueil</a><a href="/services">Services</a><a href="/realisations">Réalisations</a><a href="/a-propos">À propos</a><a href="/contact#formulaire">Contact</a></div>
        <div className="iax-footer__social"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo size={20} /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo size={20} /></a></div>
      </footer>
    </div>
  );
}

export default SystemesIAPage;
