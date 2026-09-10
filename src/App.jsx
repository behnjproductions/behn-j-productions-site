import { useEffect, useState } from 'react';
import { ArrowRight, FacebookLogo, InstagramLogo, List, Play, X, YoutubeLogo } from '@phosphor-icons/react';

const BRAND = {
  email: 'contact@behnjphoto.com',
  schoolPortal: 'https://behnjphotos.ca',
  facebook: 'https://www.facebook.com/share/1P2sLfxUaz/?mibextid=wwXIfr',
};

const NAV = [
  ['Accueil', 'accueil'], ['Photographie', 'photographie'], ['Vidéo', 'video'],
  ['Diffusion web', 'diffusion'], ['Écoles', 'ecoles'], ['Contact', 'contact'],
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
      <button className="header-cta" type="button" onClick={onOpenContact}>Parler de mon projet</button>
      <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
        {menuOpen ? <X size={26} /> : <List size={28} />}
      </button>
    </header>
  );
}

function ProjectModal({ open, onClose }) {
  const [sent, setSent] = useState(false);
  useEffect(() => { if (!open) setSent(false); }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>
        {!sent ? <>
          <p className="eyebrow">Votre histoire commence ici</p>
          <h2 id="modal-title">Parlons de votre projet.</h2>
          <p className="modal-intro">Quelques lignes suffisent. Je vous répondrai avec une proposition claire et humaine.</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const subject = `Projet ${form.get('type')} — ${form.get('name')}`;
            const body = `Nom : ${form.get('name')}\nCourriel : ${form.get('email')}\nService : ${form.get('type')}\n\n${form.get('message')}`;
            window.location.href = `mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            setSent(true);
          }}>
            <label>Votre nom<input name="name" required placeholder="Nom complet" /></label>
            <label>Votre courriel<input name="email" type="email" required placeholder="vous@exemple.ca" /></label>
            <label>Type de projet<select name="type" defaultValue=""><option value="" disabled>Choisir un service</option><option>Photographie corporative</option><option>Mariage</option><option>Événement</option><option>Vidéo</option><option>Diffusion web</option><option>École</option></select></label>
            <label>Parlez-moi de votre idée<textarea name="message" required rows="4" placeholder="Date, lieu, ambiance et ce que vous souhaitez créer…" /></label>
            <button className="button modal-submit" type="submit">Envoyer ma demande <ArrowRight size={18} weight="bold" /></button>
          </form>
        </> : <div className="success-state">
          <p className="eyebrow">Message reçu</p><h2>Merci. Votre histoire est déjà en mouvement.</h2>
          <p>Votre application courriel s’est ouverte avec votre demande déjà préparée. Il ne reste qu’à l’envoyer à {BRAND.email}.</p>
          <button className="button" type="button" onClick={onClose}>Continuer la visite <ArrowRight size={18} /></button>
        </div>}
      </section>
    </div>
  );
}

export function App() {
  const [contactOpen, setContactOpen] = useState(false);
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
          <div className="hero__content"><p className="eyebrow">Sept-Îles · Côte-Nord</p><h1>Des images<br />qui se vivent<span>.</span></h1><p className="hero__lead">Photographie <i /> Vidéo <i /> Diffusion web</p><div className="hero__actions"><CTAButton onClick={() => setContactOpen(true)}>Commencer mon projet</CTAButton><a className="showreel" href={BRAND.facebook} target="_blank" rel="noreferrer"><FacebookLogo size={20} weight="fill" /> Voir nos réalisations</a></div></div>
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
        </section>

        <section id="ecoles" className="school-feature">
          <img src="/assets/school-premium.jpg" alt="Portraits scolaires naturels et joyeux" /><div className="school-feature__wash" /><div className="school-feature__number">04</div>
          <div className="school-feature__content"><p className="eyebrow eyebrow--dark">Pour les écoles et les parents</p><h2>Écoles</h2><p>Des sourires d’aujourd’hui<br />pour les souvenirs de demain.</p><CTAButton href={BRAND.schoolPortal}>Ouvrir l’espace scolaire</CTAButton></div>
        </section>

        <section className="trust"><blockquote><p>« Un regard humain, une présence rassurante et des images qui racontent vraiment notre histoire. »</p><footer>— Une expérience pensée pour les gens d’ici</footer></blockquote><div className="local-pride"><span>Fiers de la Côte-Nord</span><strong>Nos gens.<br />Nos paysages.<br />Notre lumière.</strong></div></section>

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

        <section id="contact" className="closing"><img src="/assets/coast-footer.png" alt="Photographe au coucher du soleil sur la Côte-Nord" /><div className="closing__shade" /><div className="closing__content"><p>Chaque détail compte.</p><h2>Votre histoire<br />commence ici<span>.</span></h2><CTAButton onClick={() => setContactOpen(true)}>Commencer mon projet</CTAButton></div></section>
      </main>

      <footer className="footer"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /><div><strong>Sept-Îles · Québec</strong><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></div><div className="footer-links"><button onClick={() => scrollToSection('photographie')}>Photographie</button><button onClick={() => scrollToSection('video')}>Vidéo</button><button onClick={() => scrollToSection('ecoles')}>Écoles</button></div><div className="socials" aria-label="Réseaux sociaux"><a href="#instagram" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a><a href="#youtube" aria-label="YouTube"><YoutubeLogo /></a></div></footer>
      <ProjectModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}

export default App;
