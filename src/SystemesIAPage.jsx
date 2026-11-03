import { ArrowUpRight, Bell, CheckCircle, Cloud, EnvelopeSimple, FacebookLogo, Folder, Gear, InstagramLogo, NotePencil, PaperPlaneTilt, Stack, Tag, CalendarBlank } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { BellRinging, CalendarCheck, ChatCircleDots, ClipboardText, Clock, Database, FilePdf, Images, Lightning, Microphone, Receipt, Robot, Star } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import './systemes-ia.css';

const CONTACT_IA = '/contact?type=Syst%C3%A8mes%20IA#formulaire';

const STEPS = [
  ['01', 'On échange', 'En 30 minutes, vous m’expliquez la tâche : ce qui la déclenche, les étapes, le temps qu’elle vous prend.'],
  ['02', 'Je construis', 'Je conçois votre automatisation sur mesure, je la teste avec vos vrais cas et je la mets en place.'],
  ['03', 'Vous gagnez du temps', 'Votre système fonctionne au quotidien. Un suivi mensuel l’ajuste quand vos besoins changent.'],
];

const CASES = [
  {
    who: 'Coach ou thérapeute',
    problem: 'Je passe mes soirées à répondre aux mêmes questions et à fixer des rendez-vous.',
    name: 'Assistant de rendez-vous',
    steps: [[ChatCircleDots, 'Un client écrit', 'Courriel, formulaire ou message'], [Robot, 'Le système répond', 'Tarifs, disponibilités, lien de réservation'], [CalendarCheck, 'Rendez-vous confirmé', 'Ajouté au calendrier, rappel la veille']],
    gain: '5 h',
  },
  {
    who: 'Entrepreneur en rénovation',
    problem: 'Mes soumissions partent trois jours après la visite. Le client a déjà signé ailleurs.',
    name: 'Soumission express',
    steps: [[Microphone, 'Note vocale après la visite', '2 minutes dans le camion'], [Robot, 'Soumission rédigée', 'À vos prix, avec vos conditions'], [FilePdf, 'PDF prêt à envoyer', 'Relance automatique 3 jours plus tard']],
    gain: '4 h',
  },
  {
    who: 'PME de services',
    problem: 'Les factures impayées s’accumulent et je n’ose pas relancer.',
    name: 'Suivi des paiements',
    steps: [[Receipt, 'Vérification chaque matin', 'Factures échues repérées'], [Robot, 'Relance courtoise', 'Personnalisée, dans votre ton'], [BellRinging, 'Alerte au besoin', 'Un client dépasse 30 jours : vous êtes avisé']],
    gain: '3 h',
  },
  {
    who: 'Photographe ou créatif',
    problem: 'Livrer les photos, gérer les sélections et demander des avis me prend des heures.',
    name: 'Galerie client automatique',
    steps: [[Images, 'Galerie en ligne', 'Le client choisit ses photos'], [Robot, 'Sélection traitée', 'Liste prête pour la retouche, extras calculés'], [Star, 'Avis Google demandé', 'Au bon moment, sans y penser']],
    gain: '6 h',
    ours: true,
  },
  {
    who: 'Commerce local',
    problem: 'On me pose les mêmes questions sur Facebook et Instagram toute la journée.',
    name: 'Réponses aux messages',
    steps: [[ChatCircleDots, 'Message reçu', 'Heures, prix, disponibilité'], [Robot, 'Réponse immédiate', 'Avec les bonnes informations'], [Lightning, 'Cas complexe transféré', 'Vous gérez seulement ce qui compte']],
    gain: '5 h',
  },
  {
    who: 'Bureau et administration',
    problem: 'Je recopie les mêmes informations d’un formulaire dans trois outils différents.',
    name: 'Saisie automatique',
    steps: [[ClipboardText, 'Formulaire rempli', 'Par le client ou l’équipe'], [Robot, 'Données vérifiées', 'Erreurs et oublis signalés'], [Database, 'Tout est à jour', 'Fiche client, tableau et dossier créés']],
    gain: '3 h',
  },
];

function Cases() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const ref = useRef(null);
  useEffect(() => {
    if (!auto || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % CASES.length), 7000);
    return () => window.clearInterval(timer);
  }, [auto]);
  const choose = (index) => { setAuto(false); setActive(index); };
  const item = CASES[active];
  return (
    <section id="exemples" className="iax-cases" aria-labelledby="iax-cases-title" ref={ref}>
      <h2 id="iax-cases-title" data-anim>Un problème réel. Un système qui le règle.</h2>
      <p className="iax-cases__intro" data-anim>Choisissez une situation qui vous ressemble.</p>
      <div className="iax-cases__layout" data-anim>
        <div className="iax-cases__list" role="tablist" aria-label="Exemples de problèmes">
          {CASES.map((entry, index) => (
            <button key={entry.name} type="button" role="tab" id={`iax-tab-${index}`} aria-selected={index === active} aria-controls="iax-case-panel" className={index === active ? 'is-active' : ''} onClick={() => choose(index)}>
              <span>{entry.who}</span>
              « {entry.problem} »
              {index === active && auto && <i className="iax-cases__timer" />}
            </button>
          ))}
        </div>
        <div className="iax-case" id="iax-case-panel" role="tabpanel" aria-labelledby={`iax-tab-${active}`} key={active}>
          <p className="iax-case__label">Le système</p>
          <h3>{item.name}{item.ours && <em>Utilisé chez Behn J.</em>}</h3>
          <ol className="iax-case__flow">
            {item.steps.map(([Icon, title, detail], index) => (
              <li key={title} style={{ '--i': index }}>
                <span className="iax-case__icon"><Icon size={26} /></span>
                <div><strong>{title}</strong><p>{detail}</p></div>
              </li>
            ))}
          </ol>
          <div className="iax-case__gain">
            <Clock size={30} />
            <p><strong>{item.gain}</strong> par semaine récupérées<span>Estimation selon le volume de votre entreprise</span></p>
            <a className="iax-btn iax-btn--small" href={CONTACT_IA}>J’ai un problème semblable <ArrowUpRight size={18} weight="bold" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFlow() {
  return (
    <div className="iax-flow" aria-hidden="true"><div className="iax-flow__tilt">
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
        <g className="iax-ring__a"><ellipse cx="260" cy="260" rx="215" ry="120" transform="rotate(-32 260 260)" fill="none" stroke="#ff2b1c" strokeOpacity=".55" strokeWidth="34" filter="url(#iax-blur)" />
        <ellipse cx="260" cy="260" rx="215" ry="120" transform="rotate(-32 260 260)" fill="none" stroke="url(#iax-glass)" strokeWidth="26" />
        <ellipse cx="260" cy="260" rx="215" ry="120" transform="rotate(-32 260 260)" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" /></g><g className="iax-ring__b">
        <ellipse cx="260" cy="260" rx="190" ry="150" transform="rotate(48 260 260)" fill="none" stroke="url(#iax-glass)" strokeWidth="18" strokeOpacity=".75" />
        <ellipse cx="260" cy="260" rx="190" ry="150" transform="rotate(48 260 260)" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1" /></g>
      </svg>
      <div className="iax-card iax-card--1"><EnvelopeSimple size={24} /><span>Nouveau courriel</span><i>•••</i></div>
      <div className="iax-link iax-link--1"><b /></div>
      <div className="iax-card iax-card--2"><Gear size={24} /><span>Traitement automatique</span></div>
      <div className="iax-link iax-link--2"><b /></div>
      <div className="iax-card iax-card--3"><NotePencil size={24} /><span>Réponse préparée</span><CheckCircle className="iax-check" size={24} weight="fill" /></div>
    </div></div>
  );
}

export function SystemesIAPage() {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.classList.add('iax--anim');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); observer.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    root.querySelectorAll('[data-anim]').forEach((el) => observer.observe(el));
    const hero = root.querySelector('.iax-hero');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const move = (event) => {
      const box = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
      hero.style.setProperty('--my', ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
    };
    if (hero && !reduce) hero.addEventListener('pointermove', move);
    return () => { observer.disconnect(); hero?.removeEventListener('pointermove', move); };
  }, []);

  return (
    <div className="site-shell iax" ref={rootRef}>
      <header className="site-header about-header">
        <a className="brand" href="/" aria-label="Retour à l’accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
        <nav className="about-nav iax-subnav" aria-label="Navigation principale"><a href="/">Accueil</a><a href="/services">Services</a><a href="#exemples">Exemples</a><a href="#methode">Méthode</a></nav>
        <div className="header-actions"><a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a><a className="header-cta" href={CONTACT_IA}>Parlons de votre projet</a></div>
      </header>

      <main className="iax-main">
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
          <h2 id="iax-bento-title" className="iax-rule" data-anim>Moins de friction. Plus d’action.</h2>
          <div className="iax-bento__grid">
            <article className="iax-panel iax-panel--inbox" data-anim>
              <h3>Vos courriels, déjà organisés.</h3>
              <p>Triez, résumez et préparez vos réponses.</p>
              <div className="iax-inbox" aria-hidden="true">
                <div className="iax-inbox__dots"><i /><i /><i /></div>
                <div className="iax-inbox__side"><span className="is-on"><EnvelopeSimple size={18} /></span><span><PaperPlaneTilt size={18} /></span><span><Folder size={18} /></span><span><Tag size={18} /></span></div>
                <div className="iax-inbox__list"><p>Boîte de réception</p><div className="iax-row"><i /><b /><b /></div><div className="iax-row"><i /><b /><b /></div><div className="iax-row"><i /><b /><b /></div></div>
              </div>
            </article>
            <article className="iax-panel iax-panel--wide" data-anim>
              <div><h3>Des relances au bon moment.</h3><p>Centralisez vos demandes et vos relances.</p></div>
              <div className="iax-cal" aria-hidden="true"><div className="iax-cal__rings"><i /><i /><i /><i /></div><div className="iax-cal__grid">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--d': `${i * 0.45}s` }} />)}</div><span className="iax-cal__bell"><Bell size={20} /></span></div>
            </article>
            <article className="iax-panel iax-panel--wide" data-anim>
              <div><h3>Vos outils travaillent ensemble.</h3><p>Connectez vos outils à votre façon de travailler.</p></div>
              <div className="iax-net" aria-hidden="true">
                <svg viewBox="0 0 230 140"><path d="M44 36 H80 Q92 36 92 50 V60 M44 104 H80 Q92 104 92 90 V80 M186 36 H150 Q138 36 138 50 V60 M186 104 H150 Q138 104 138 90 V80" fill="none" stroke="#ff2b1c" strokeOpacity=".45" strokeWidth="2" /><path className="iax-net__flow" d="M44 36 H80 Q92 36 92 50 V60 M44 104 H80 Q92 104 92 90 V80 M186 36 H150 Q138 36 138 50 V60 M186 104 H150 Q138 104 138 90 V80" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></svg>
                <span style={{ left: 0, top: 14 }}><EnvelopeSimple size={20} /></span>
                <span style={{ left: 0, top: 82 }}><CalendarBlank size={20} /></span>
                <span style={{ right: 0, top: 14 }}><Stack size={20} /></span>
                <span style={{ right: 0, top: 82 }}><Cloud size={20} /></span>
                <span className="iax-net__hub"><Gear size={28} /></span>
              </div>
            </article>
          </div>
        </section>

        <Cases />

        <section id="methode" className="iax-steps" aria-label="La méthode en trois étapes">
          <ol data-anim>
            {STEPS.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
        </section>

        <section className="iax-final">
          <svg className="iax-wave" viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="iax-wave-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#ff2b1c" stopOpacity="0" /><stop offset=".55" stopColor="#ff2b1c" stopOpacity=".9" /><stop offset="1" stopColor="#9f1204" stopOpacity=".2" /></linearGradient><filter id="iax-wave-b"><feGaussianBlur stdDeviation="10" /></filter></defs>
            <path d="M120 400 C 360 330, 520 260, 800 40" fill="none" stroke="url(#iax-wave-g)" strokeWidth="60" filter="url(#iax-wave-b)" />
            <path d="M160 400 C 400 330, 560 250, 800 80" fill="none" stroke="#ff6a5c" strokeOpacity=".7" strokeWidth="2" />
          </svg>
          <h2 data-anim>Et si cette tâche se faisait toute seule ?</h2>
          <a className="iax-btn" href={CONTACT_IA}>Parlons de votre projet <ArrowUpRight size={22} weight="bold" /></a>
        </section>
      </main>

      <footer className="footer">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div><strong>Sept-Îles · Québec</strong><a href="/contact#formulaire">{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div>
        <div className="footer-links"><a href="/">Accueil</a><a href="/services">Services</a><a href="/systemes-ia">Systèmes IA</a><a href="/realisations">Réalisations</a><a href="/boutique">Boutique</a><a href="/a-propos">À propos</a><a href="/contact#formulaire">Contact</a></div>
        <div className="socials" aria-label="Réseaux sociaux"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a></div>
      </footer>
    </div>
  );
}

export default SystemesIAPage;
