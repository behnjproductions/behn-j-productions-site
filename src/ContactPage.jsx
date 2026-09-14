import { useEffect, useState } from 'react';
import { ArrowRight, EnvelopeSimple, FacebookLogo, InstagramLogo, MapPin, Phone } from '@phosphor-icons/react';
import { BRAND } from './brand.js';
import { ContactForm, PrivacyModal } from './ContactForm.jsx';

export function ContactPage() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="site-shell contact-page">
      <header className="site-header about-header">
        <a className="brand" href="/" aria-label="Retour à l’accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
        <nav className="about-nav" aria-label="Navigation principale"><a href="/">Retour à l’accueil</a></nav>
        <div className="header-actions"><a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a><a className="header-cta" href="#formulaire">Nous écrire</a></div>
      </header>

      <main className="about-main">
        <div className="services-band services-band--page" data-reveal>
          <img src="/assets/coast-footer.jpg" alt="Côte-Nord au coucher du soleil" />
          <div className="services-band__shade" />
          <div className="services-band__content">
            <p className="eyebrow">Sept-Îles · Côte-Nord</p>
            <h1>Contact</h1>
            <p>Racontez-nous votre projet. Nous répondons à chaque demande.</p>
          </div>
        </div>

        <section className="contact-layout">
          <div className="contact-form-card" id="formulaire" data-reveal>
            <p className="eyebrow">Votre histoire commence ici</p>
            <h3>Parlons de votre projet.</h3>
            <p className="modal-intro">Quelques lignes suffisent. Je vous répondrai avec une proposition claire et humaine.</p>
            <ContactForm onOpenPrivacy={() => setPrivacyOpen(true)} />
          </div>

          <aside className="contact-details" data-reveal>
            <p className="eyebrow">Nous joindre directement</p>
            <ul>
              <li><Phone size={20} weight="bold" /><div><strong>Téléphone</strong><a href={BRAND.phoneHref}>{BRAND.phone}</a></div></li>
              <li><EnvelopeSimple size={20} weight="bold" /><div><strong>Courriel</strong><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a></div></li>
              <li><MapPin size={20} weight="bold" /><div><strong>Studio</strong><span>416 Av. Iberville<br />Sept-Îles (Québec) G4R 2E2</span></div></li>
            </ul>
            <div className="contact-details__socials">
              <p className="eyebrow">Nous suivre</p>
              <div className="socials">
                <a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a>
                <a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a>
              </div>
            </div>
            <p className="contact-details__note">Nous desservons Sept-Îles et l’ensemble de la Côte-Nord. Pour les mandats à l’extérieur de la région, écrivez-nous : nous trouverons une formule adaptée.</p>
          </aside>
        </section>

        <section className="about-closing">
          <p>Chaque détail compte.</p>
          <h2>Votre histoire<br />mérite d’être racontée<span>.</span></h2>
          <a className="button" href="/services">Voir nos services <ArrowRight size={18} weight="bold" /></a>
        </section>
      </main>

      <footer className="footer">
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div><strong>Sept-Îles · Québec</strong><a href={`mailto:${BRAND.email}`}>{BRAND.email}</a><a href={BRAND.phoneHref}>{BRAND.phone}</a></div>
        <div className="footer-links"><a href="/">Accueil</a><a href="/services">Services</a><a href="/realisations">Réalisations</a><a href="/#seances">Séances</a><a href="/a-propos">À propos</a><a href="/contact">Contact</a><button className="footer-privacy" onClick={() => setPrivacyOpen(true)}>Confidentialité</button></div>
        <div className="socials" aria-label="Réseaux sociaux"><a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a><a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a></div>
      </footer>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
}

export default ContactPage;
