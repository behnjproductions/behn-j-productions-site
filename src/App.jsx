import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FacebookLogo, InstagramLogo, List, Play, X, YoutubeLogo } from '@phosphor-icons/react';

const BRAND = {
  email: 'contact@behnjphoto.com',
  phone: '514 458-4730',
  phoneHref: 'tel:+15144584730',
  schoolPortal: 'https://behnjphotos.ca',
  facebook: 'https://www.facebook.com/share/1P2sLfxUaz/?mibextid=wwXIfr',
};

const NAV = [
  ['Accueil', 'accueil'], ['Photographie', 'photographie'], ['Vidéo', 'video'],
  ['Diffusion web', 'diffusion'], ['Écoles', 'ecoles'], ['Séances', 'seances'], ['Contact', 'contact'],
];

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
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) {
      setSent(false);
      setSending(false);
      setError('');
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('form-name', 'project-contact');

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString(),
      });
      if (!response.ok) throw new Error('Envoi impossible');
      setSent(true);
    } catch {
      setError("Un problème est survenu. Réessayez ou écrivez-nous à contact@behnjphoto.com.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>
        {!sent ? <>
          <p className="eyebrow">Votre histoire commence ici</p>
          <h2 id="modal-title">Parlons de votre projet.</h2>
          <p className="modal-intro">Quelques lignes suffisent. Je vous répondrai avec une proposition claire et humaine.</p>
          <form name="project-contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit}>
            <input type="hidden" name="form-name" value="project-contact" />
            <p hidden><label>Ne pas remplir : <input name="bot-field" /></label></p>
            <label>Votre nom ou entreprise<input name="name" required placeholder="Nom complet ou entreprise" /></label>
            <label>Votre courriel<input name="email" type="email" required placeholder="vous@exemple.ca" /></label>
            <label>Votre téléphone (optionnel)<input name="phone" type="tel" placeholder="514 000-0000" /></label>
            <label>Date envisagée (optionnel)<input name="date" type="date" /></label>
            <label>Type de projet<select name="type" defaultValue={prefillType || ''} required><option value="" disabled>Choisir un service</option><option>Corporatif / Institutionnel</option><option>Mariage</option><option>Événement</option><option>Vidéo</option><option>Diffusion web</option><option>École</option><option>Maternité</option><option>Bébé / nouveau-né</option><option>Famille</option><option>Anniversaire</option><option>Bal de finissants</option></select></label>
            <label>Parlez-moi de votre idée<textarea name="message" required rows="4" placeholder="Lieu, ambiance et ce que vous souhaitez créer…" /></label>
            <div className="privacy-consent">
              <input id="privacy-consent" name="privacy-consent" type="checkbox" value="accepted" required />
              <label htmlFor="privacy-consent">J’ai lu et j’accepte la <button type="button" onClick={onOpenPrivacy}>Politique de confidentialité</button>. J’autorise Behn J. Productions à utiliser les renseignements fournis uniquement pour répondre à ma demande.</label>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button modal-submit" type="submit" disabled={sending}>{sending ? 'Envoi en cours…' : 'Envoyer ma demande'} {!sending && <ArrowRight size={18} weight="bold" />}</button>
          </form>
        </> : <div className="success-state">
          <p className="eyebrow">Demande envoyée</p><h2>Merci. Votre histoire est déjà en mouvement.</h2>
          <p>Votre demande a bien été transmise à Behn J. Productions. Nous vous répondrons dans les meilleurs délais.</p>
          <button className="button" type="button" onClick={onClose}>Continuer la visite <ArrowRight size={18} /></button>
        </div>}
      </section>
    </div>
  );
}

function PrivacyModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop privacy-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer la politique de confidentialité"><X size={24} /></button>
        <p className="eyebrow">Protection de vos renseignements</p>
        <h2 id="privacy-title">Politique de confidentialité</h2>
        <p className="privacy-modal__updated">Dernière mise à jour : 11 septembre 2026</p>

        <div className="privacy-modal__content">
          <section><h3>Notre engagement</h3><p>Behn J. Productions respecte votre vie privée et protège les renseignements personnels qui lui sont confiés, conformément aux lois applicables au Québec et au Canada.</p></section>
          <section><h3>Renseignements recueillis</h3><p>Lorsque vous utilisez notre formulaire, nous pouvons recueillir votre nom ou celui de votre entreprise, votre adresse courriel, votre numéro de téléphone, la date envisagée, le type de service et les renseignements contenus dans votre message.</p></section>
          <section><h3>Pourquoi nous les utilisons</h3><p>Ces renseignements servent uniquement à répondre à votre demande, préparer une proposition, planifier le service demandé et assurer le suivi de notre relation avec vous.</p></section>
          <section><h3>Conservation et communication</h3><p>Nous conservons les renseignements seulement pendant la durée nécessaire aux fins indiquées et à nos obligations administratives ou légales. Nous ne vendons ni ne louons vos renseignements. Ils peuvent être traités par nos fournisseurs technologiques uniquement lorsque cela est nécessaire au fonctionnement du site et du formulaire.</p></section>
          <section><h3>Vos droits</h3><p>Vous pouvez demander l’accès à vos renseignements, leur rectification ou le retrait de votre consentement, sous réserve des obligations légales applicables.</p></section>
          <section><h3>Nous joindre</h3><p>Pour toute question ou demande liée à la confidentialité, communiquez avec la personne responsable de la protection des renseignements personnels chez Behn J. Productions :</p><p><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a><br /><a href={BRAND.phoneHref}>{BRAND.phone}</a></p></section>
        </div>
        <button className="button privacy-modal__close" type="button" onClick={onClose}>Fermer <X size={18} /></button>
      </section>
    </div>
  );
}

export function App() {
  const [contactOpen, setContactOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [prefillType, setPrefillType] = useState('');
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
          <div className="chapter__number"><strong>01</strong><span>Émotions authentiques.<br />Images intemporelles.</span></div>
          <div className="chapter__heading"><p className="eyebrow">L'art de saisir l'essentiel</p><h2>Photographie</h2><p>Des moments vrais, cadrés avec intention.</p></div>
          <div className="photo-triptych">
            {[
              ['Corporatif', '/assets/photo-corporatif.jpg', 'Portrait corporatif haut de gamme'],
              ['Mariages', '/assets/photo-mariage.jpg', 'Couple de mariés dans une lumière dorée'],
              ['Événements', '/assets/photo-evenement.jpg', 'Performance culturelle sur scène'],
            ].map(([label, src, alt]) => (
              <button key={label} type="button" onClick={() => setContactOpen(true)}>
                <img className="photo-triptych__image" src={src} alt={alt} />
                <span className="photo-triptych__label"><span>{label}</span><ArrowRight /></span>
              </button>
            ))}
          </div>
        </section>

        <section id="video" className="chapter chapter--media">
          <img src="/assets/video-premium.jpg" alt="Production vidéo professionnelle en studio" /><div className="media-shade" />
          <div className="chapter__number"><strong>02</strong><span>Des histoires<br />qui font bouger.</span></div>
          <div className="media-copy"><p className="eyebrow">Production · Réalisation · Drone</p><h2>Vidéo</h2><p>Plus que des vidéos.<br />Des émotions en mouvement.</p><CTAButton secondary href={BRAND.facebook}>Voir nos réalisations</CTAButton></div>
        </section>

        <section id="diffusion" className="chapter chapter--media chapter--diffusion">
          <img src="/assets/diffusion-web-premium.jpg" alt="Régie professionnelle de diffusion web en direct" /><div className="media-shade" />
          <div className="chapter__number"><strong>03</strong><span>Une plus grande<br />portée pour vos histoires.</span></div>
          <div className="media-copy"><p className="eyebrow">Création · Stratégie · Réseaux sociaux</p><h2>Diffusion web</h2><p>Vos images. Plus loin.<br />Sur toutes les plateformes.</p><CTAButton secondary onClick={() => setContactOpen(true)}>Stratégie et diffusion</CTAButton></div>
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

        <section id="ecoles" className="school-feature">
          <img src="/assets/school-premium.jpg" alt="Portraits scolaires naturels et joyeux" /><div className="school-feature__wash" /><div className="school-feature__number">04</div>
          <div className="school-feature__content"><p className="eyebrow eyebrow--dark">Pour les écoles et les parents</p><h2>Écoles</h2><p>Des sourires d’aujourd’hui<br />pour les souvenirs de demain.</p><CTAButton href={BRAND.schoolPortal}>Ouvrir l’espace scolaire</CTAButton></div>
        </section>

        <section id="seances" className="sessions-teaser">
          <p className="eyebrow">Choisis ton moment. Je m’occupe du reste.</p>
          <h2>Séances photo.</h2>
          <p>Maternité, bébé, famille, anniversaire ou bal de finissants — des séances simples à réserver, avec un tarif clair dès le départ.</p>
          <div className="sessions-teaser__actions">
            <CTAButton onClick={() => { setPrefillType(''); setContactOpen(true); }}>Réserver en ligne</CTAButton>
            <button className="sessions-teaser__explore" type="button" onClick={() => setSessionsOpen(true)}>Explorer nos séances <ArrowRight size={18} /></button>
          </div>
        </section>

        <section className="trust"><blockquote><p>« Bon photographe. Il a vraiment pris le temps avec moi pour essayer plusieurs poses. »</p><footer>— Jesse Robitaille, avis Google ★★★★★</footer></blockquote><div className="local-pride"><span>Fiers de la Côte-Nord</span><strong>Nos gens.<br />Nos paysages.<br />Notre lumière.</strong></div></section>

        <section className="client-trust" aria-labelledby="client-trust-title">
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

        <section id="contact" className="closing"><img src="/assets/coast-footer.jpg" alt="Photographe au coucher du soleil sur la Côte-Nord" /><div className="closing__shade" /><div className="closing__content"><p>Chaque détail compte.</p><h2>Votre histoire<br />commence ici<span>.</span></h2><CTAButton onClick={() => setContactOpen(true)}>Commencer mon projet</CTAButton></div></section>
      </main>

      <footer className="footer"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /><div><strong>Sept-Îles · Québec</strong><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div><div className="footer-links"><button onClick={() => scrollToSection('photographie')}>Photographie</button><button onClick={() => scrollToSection('video')}>Vidéo</button><button onClick={() => scrollToSection('diffusion')}>Diffusion web</button><button onClick={() => scrollToSection('ecoles')}>Écoles</button><button onClick={() => scrollToSection('contact')}>Contact</button><button className="footer-privacy" onClick={() => setPrivacyOpen(true)}>Confidentialité</button></div><div className="socials" aria-label="Réseaux sociaux"><a href="#instagram" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a><a href="#youtube" aria-label="YouTube"><YoutubeLogo /></a></div></footer>
      <ProjectModal open={contactOpen} onClose={() => setContactOpen(false)} onOpenPrivacy={() => setPrivacyOpen(true)} prefillType={prefillType} />
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <SessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} onBook={(name) => { setSessionsOpen(false); setPrefillType(name); setContactOpen(true); }} />
    </div>
  );
}

export default App;
