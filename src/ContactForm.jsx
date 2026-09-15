import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, X } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import { submitContact } from './contactSubmission.js';
import { useDialog } from './useDialog.js';

export const CONTACT_TYPES = ['Corporatif / Institutionnel', 'Mariage', 'Événement', 'Vidéo', 'Diffusion web', 'Sites web', 'Design graphique', 'École', 'Maternité', 'Bébé / nouveau-né', 'Famille', 'Anniversaire', 'Bal de finissants', 'Question sur ma galerie', 'Autre demande'];

export function ContactForm({ prefillType, onOpenPrivacy, resetKey }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const successRef = useRef(null);
  const errorRef = useRef(null);
  const consentId = useId();
  const initialType = CONTACT_TYPES.includes(prefillType) ? prefillType : '';

  useEffect(() => {
    setSent(false);
    setSending(false);
    setError('');
    return () => { requestRef.current?.abort(); requestRef.current = null; };
  }, [resetKey]);

  useEffect(() => { if (sent) successRef.current?.focus(); }, [sent]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (requestRef.current) return;
    if (!event.currentTarget.reportValidity()) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setSending(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      await submitContact(formData, { signal: controller.signal });
      if (requestRef.current === controller) setSent(true);
    } catch (err) {
      if (requestRef.current === controller) {
        setError(controller.signal.aborted
          ? "L’envoi n’a pas pu être confirmé. Votre message est conservé ci-dessous. Vérifiez votre connexion avant de réessayer."
          : err.message || "L’envoi a échoué. Votre message est conservé : vous pouvez réessayer.");
      }
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) { requestRef.current = null; setSending(false); }
    }
  }

  if (sent) {
    return (
      <div className="success-state" ref={successRef} tabIndex={-1} role="status">
        <p className="eyebrow">Demande envoyée</p><h2>Merci. Votre histoire est déjà en mouvement.</h2>
        <p>Votre demande a bien été transmise à Behn J. Productions. Nous vous répondrons dans les meilleurs délais.</p>
        <button className="button" type="button" onClick={() => setSent(false)}>Envoyer une autre demande <ArrowRight size={18} /></button>
      </div>
    );
  }

  return (
    <form className="contact-form" name="project-contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" aria-busy={sending} onSubmit={handleSubmit}>
      <input type="hidden" name="form-name" value="project-contact" />
      <p hidden><label>Ne pas remplir : <input name="bot-field" tabIndex={-1} autoComplete="off" /></label></p>
      <label>Votre nom ou entreprise<input name="name" required maxLength={160} autoComplete="name" placeholder="Nom complet ou entreprise" /></label>
      <label>Votre courriel<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="vous@exemple.ca" /></label>
      <label>Votre téléphone (optionnel)<input name="phone" type="tel" maxLength={40} autoComplete="tel" placeholder="514 000-0000" /></label>
      <label>Date envisagée (optionnel)<input name="date" type="date" /></label>
      <label className="contact-field--wide">Type de projet<select name="type" defaultValue={initialType} required><option value="" disabled>Choisir un service ou une demande</option>{CONTACT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="contact-field--wide">Votre message<textarea name="message" required maxLength={10000} rows="5" placeholder="Parlez-nous de votre projet ou posez votre question…" /></label>
      <div className="privacy-consent">
        <input id={consentId} name="privacy-consent" type="checkbox" value="accepted" required />
        <label htmlFor={consentId}>J’ai lu et j’accepte la <button type="button" onClick={onOpenPrivacy}>Politique de confidentialité</button>. J’autorise Behn J. Productions à utiliser les renseignements fournis uniquement pour répondre à ma demande.</label>
      </div>
      {error && <p className="form-error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      <button className="button modal-submit" type="submit" disabled={sending}>{sending ? 'Envoi en cours…' : 'Envoyer ma demande'} {!sending && <ArrowRight size={18} weight="bold" />}</button>
    </form>
  );
}

export function PrivacyModal({ open, onClose }) {
  const dialogRef = useDialog(open, onClose);

  if (!open) return null;
  return (
    <div className="modal-backdrop privacy-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal privacy-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="privacy-title" onMouseDown={(event) => event.stopPropagation()}>
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
          <section><h3>Nous joindre</h3><p>Pour toute question ou demande liée à la confidentialité, communiquez avec la personne responsable de la protection des renseignements personnels chez Behn J. Productions :</p><p><a href="/contact?type=Autre%20demande#formulaire">Nous écrire depuis le site</a><br />{BRAND.email}<br /><a href={BRAND.phoneHref}>{BRAND.phone}</a></p></section>
        </div>
        <button className="button privacy-modal__close" type="button" onClick={onClose}>Fermer <X size={18} /></button>
      </section>
    </div>
  );
}
