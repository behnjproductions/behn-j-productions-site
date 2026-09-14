import { useEffect, useState } from 'react';
import { ArrowRight, X } from '@phosphor-icons/react';
import { BRAND } from './brand.js';

export function ContactForm({ prefillType, onOpenPrivacy, resetKey }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSent(false);
    setSending(false);
    setError('');
  }, [resetKey]);

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

  if (sent) {
    return (
      <div className="success-state">
        <p className="eyebrow">Demande envoyée</p><h2>Merci. Votre histoire est déjà en mouvement.</h2>
        <p>Votre demande a bien été transmise à Behn J. Productions. Nous vous répondrons dans les meilleurs délais.</p>
        <button className="button" type="button" onClick={() => setSent(false)}>Envoyer une autre demande <ArrowRight size={18} /></button>
      </div>
    );
  }

  return (
    <form name="project-contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={handleSubmit}>
      <input type="hidden" name="form-name" value="project-contact" />
      <p hidden><label>Ne pas remplir : <input name="bot-field" /></label></p>
      <label>Votre nom ou entreprise<input name="name" required placeholder="Nom complet ou entreprise" /></label>
      <label>Votre courriel<input name="email" type="email" required placeholder="vous@exemple.ca" /></label>
      <label>Votre téléphone (optionnel)<input name="phone" type="tel" placeholder="514 000-0000" /></label>
      <label>Date envisagée (optionnel)<input name="date" type="date" /></label>
      <label>Type de projet<select name="type" defaultValue={prefillType || ''} required><option value="" disabled>Choisir un service</option><option>Corporatif / Institutionnel</option><option>Mariage</option><option>Événement</option><option>Vidéo</option><option>Diffusion web</option><option>Design graphique</option><option>École</option><option>Maternité</option><option>Bébé / nouveau-né</option><option>Famille</option><option>Anniversaire</option><option>Bal de finissants</option></select></label>
      <label>Parlez-moi de votre idée<textarea name="message" required rows="4" placeholder="Lieu, ambiance et ce que vous souhaitez créer…" /></label>
      <div className="privacy-consent">
        <input id="privacy-consent" name="privacy-consent" type="checkbox" value="accepted" required />
        <label htmlFor="privacy-consent">J’ai lu et j’accepte la <button type="button" onClick={onOpenPrivacy}>Politique de confidentialité</button>. J’autorise Behn J. Productions à utiliser les renseignements fournis uniquement pour répondre à ma demande.</label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button modal-submit" type="submit" disabled={sending}>{sending ? 'Envoi en cours…' : 'Envoyer ma demande'} {!sending && <ArrowRight size={18} weight="bold" />}</button>
    </form>
  );
}

export function PrivacyModal({ open, onClose }) {
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
