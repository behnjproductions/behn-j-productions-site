import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FacebookLogo, InstagramLogo, List, Play, X } from '@phosphor-icons/react';

const BRAND = {
    email: 'contact@behnjphoto.com',
    phone: '514 458-4730',
    phoneHref: 'tel:+15144584730',
    schoolPortal: 'https://behnjphotos.ca',
    facebook: 'https://www.facebook.com/share/1P2sLfxUaz/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/behnjproductions',
};

const NAV = [
    ['Accueil', 'accueil'], ['Photographie', 'photographie'], ['Vidéo', 'video'],
    ['Diffusion web', 'diffusion'], ['Écoles', 'ecoles'], ['Séances', 'seances'], ['Contact', 'contact'],
  ];

function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function CTAButton({ children, secondary = false, onClick, href }) {
    const content = <><span>{children}</span>span><ArrowRight size={18} weight="bold" aria-hidden="true" /></>>;
    return href ? (
          <a className={`button ${secondary ? 'button--secondary' : ''}`} href={href} target="_blank" rel="noreferrer">{content}</a>a>
        ) : (
          <button className={`button ${secondary ? 'button--secondary' : ''}`} type="button" onClick={onClick}>{content}</button>button>
        );
}

function Header({ onOpenContact }) {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
          <header className="site-header">
                <button className="brand" type="button" onClick={() => scrollToSection('accueil')} aria-label="Retour à l'accueil">
                        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
                </button>button>
                <nav className={`main-nav ${menuOpen ? 'main-nav--open' : ''}`} aria-label="Navigation principale">
                  {NAV.map(([label, id]) => <button key={id} type="button" onClick={() => { scrollToSection(id); setMenuOpen(false); }}>{label}</button>button>)}
                </nav>nav>
                <div className="header-actions">
                        <a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a>a>
                        <button className="header-cta" type="button" onClick={onOpenContact}>Nous contacter</button>button>
                </div>div>
                <button className="menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
                  {menuOpen ? <X size={26} /> : <List size={28} />}
                </button>button>
          </header>header>
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
                        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>button>
                
                  {!session ? <>
                            <p className="eyebrow">Choisis ton moment</p>p>
                            <h2 id="sessions-title" className="legal-title">Explorer nos séances.</h2>h2>
                            <p className="modal-intro">Un aperçu du tarif et du style. Clique sur une séance pour voir tous les détails.</p>p>
                            <div className="sessions-grid">
                              {SESSIONS.map((s) => (
                          <button key={s.id} type="button" className="session-card" onClick={() => setSelected(s.id)}>
                                          <img src={s.img} alt={s.name} />
                                          <span className="session-card__name">{s.name}</span>span>
                                          <span className="session-card__price">À partir de {s.price} $</span>span>
                          </button>button>
                        ))}
                            </div>div>
                  </>> : <div className="session-detail">
                            <button className="session-back" type="button" onClick={() => setSelected(null)}><ArrowLeft size={18} /> Toutes les séances</button>button>
                            <img src={session.img} alt={session.name} />
                            <h2 className="legal-title">{session.name}</h2>h2>
                            <p className="session-detail__price">{session.price} $ — séance unique</p>p>
                            <ul className="session-detail__list">
                                        <li>{session.photos} photos retouchées</li>li>
                                        <li>Séance d’environ {session.duration}</li>li>
                                        <li>Galerie privée en ligne</li>li>
                            </ul>ul>
                    {session.note && <p className="session-detail__note">{session.note}</p>p>}
                            <button className="button" type="button" onClick={() => onBook(session.name)}>Réserver cette séance <ArrowRight size={18} /></button>button>
                  </div>div>}
                </section>section>
          </div>div>
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
                        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={24} /></button>button>
                  {!sent ? <>
                            <p className="eyebrow">Votre histoire commence ici</p>p>
                            <h2 id="modal-title">Parlons de votre projet.</h2>h2>
                            <p className="modal-intro">Quelques lignes suffisent. Je vous répondrai avec une proposition claire et humaine.</p>p>
                            <form name="project-contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit}>
                                        <input type="hidden" name="form-name" value="project-contact" />
                                        <p hidden><label>Ne pas remplir : <input name="bot-field" /></label>label></p>p>
                                        <label>Votre nom ou entreprise<input name="name" required placeholder="Nom complet ou entreprise" /></label>label>
                                        <label>Votre courriel<input name="email" type="email" required placeholder="vous@exemple.ca" /></label>label>
                                        <label>Votre téléphone (optionnel)<input name="phone" type="tel" placeholder="514 000-0000" /></label>label>
                                        <label>Date envisagée (optionnel)<input name="date" type="date" /></label>label>
                                        <label>Type de projet<select name="type" defaultValue={prefillType || ''} required><option value="" disabled>Choisir un service</option>option><option>Corporatif / Institutionnel</option>option><option>Mariage</option>option><option>Événement</option>option><option>Vidéo</option>option><option>Diffusion web</option>option><option>École</option>option><option>Maternité</option>option><option>Bébé / nouveau-né</option>option><option>Famille</option>option><option>Anniversaire</option>option><option>Bal de finissants</option>option></select>select></label>label>
                                        <label>Parlez-moi de votre idée<textarea name="message" required rows="4" placeholder="Lieu, ambiance et ce que vous souhaitez créer…" /></label>label>
                                        <div className="privacy-consent">
                                                      <input id="privacy-consent" name="privacy-consent" type="checkbox" value="accepted" required />
                                                      <label htmlFor="privacy-consent">J’ai lu et j’accepte la <button type="button" onClick={onOpenPrivacy}>Politique de confidentialité</button>button>. J’autorise Behn J. Productions à utiliser les renseignements fournis uniquement pour répondre à ma demande.</label>label>
                                        </div>div>
                              {error && <p className="form-error" role="alert">{error}</p>p>}
                                        <button className="button modal-submit" type="submit" disabled={sending}>{sending ? 'Envoi en cours…' : 'Envoyer ma demande'} {!sending && <ArrowRight size={18} weight="bold" />}</button>button>
                            </form>form>
                  </>> : <div className="success-state">
                            <p className="eyebrow">Demande envoyée</p>p><h2>Merci. Votre histoire est déjà en mouvement.</h2>h2>
                            <p>Votre demande a bien été transmise à Behn J. Productions. Nous vous répondrons dans les meilleurs délais.</p>p>
                            <button className="button" type="button" onClick={onClose}>Continuer la visite <ArrowRight size={18} /></button>button>
                  </div>div>}
                </section>section>
          </div>div>
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
                        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer la politique de confidentialité"><X size={24} /></button>button>
                        <p className="eyebrow">Protection de vos renseignements</p>p>
                        <h2 id="privacy-title">Politique de confidentialité</h2>h2>
                        <p className="privacy-modal__updated">Dernière mise à jour : 11 septembre 2026</p>p>
                
                        <div className="privacy-modal__content">
                                  <section><h3>Notre engagement</h3>h3><p>Behn J. Productions respecte votre vie privée et protège les renseignements personnels qui lui sont confiés, conformément aux lois applicables au Québec et au Canada.</p>p></section>section>
                                  <section><h3>Renseignements recueillis</h3>h3><p>Lorsque vous utilisez notre formulaire, nous pouvons recueillir votre nom ou celui de votre entreprise, votre adresse courriel, votre numéro de téléphone, la date envisagée, le type de service et les renseignements contenus dans votre message.</p>p></section>section>
                                  <section><h3>Pourquoi nous les utilisons</h3>h3><p>Ces renseignements servent uniquement à répondre à votre demande, préparer une proposition, planifier le service demandé et assurer le suivi de notre relation avec vous.</p>p></section>section>
                                  <section><h3>Conservation et communication</h3>h3><p>Nous conservons les renseignements seulement pendant la durée nécessaire aux fins indiquées et à nos obligations administratives ou légales. Nous ne vendons ni ne louons vos renseignements. Ils peuvent être traités par nos fournisseurs technologiques uniquement lorsque cela est nécessaire au fonctionnement du site et du formulaire.</p>p></section>section>
                                  <section><h3>Vos droits</h3>h3><p>Vous pouvez demander l’accès à vos renseignements, leur rectification ou le retrait de votre consentement, sous réserve des obligations légales applicables.</p>p></section>section></></></>
