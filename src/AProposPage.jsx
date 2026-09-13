import { FacebookLogo, InstagramLogo } from '@phosphor-icons/react';
import { BRAND } from './brand.js';

export function AProposPage() {
    return (
          <div className="site-shell about-page">
                <header className="site-header">
                        <a className="brand" href="/" aria-label="Retour à l'accueil">
                                  <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
                        </a>
                        <nav className="main-nav">
                                  <a href="/">Accueil</a>
                        </nav>
                        <div className="header-actions">
                                  <a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a>
                                  <a className="header-cta" href={`mailto:${BRAND.email}`}>Nous contacter</a>
                        </div>
                </header>
          
                <main className="about-main">
                        <section className="about-hero">
                                  <div className="about-hero__text">
                                              <p className="eyebrow">À propos</p>
                                              <h1>Une caméra, une passion,<br />une histoire à raconter.</h1>
                                  </div>
                                  <div className="about-hero__photo">
                                              <img src="/assets/about/about-portrait.webp" alt="Portrait de Behn, fondateur de Behn J. Productions" />
                                  </div>
                        </section>

                          <section className="about-block">
                                    <div className="about-block__photo">
                                                <img src="/assets/about/about-origin.webp" alt="Behn avec son premier sac de matériel photo" />
                                    </div>
                                    <div className="about-block__text">
                                                <p>Tout a commencé en 2011, à La Vega, en République dominicaine. À cette époque, je faisais partie d’un groupe d’artistes. Nous créions des chansons et réalisions différents projets, mais nous n’avions personne pour photographier nos moments ni produire nos vidéos.</p>
                                                <p>Mon père possédait une petite caméra Flip. Je l’ai prise entre mes mains et j’ai commencé, simplement par nécessité, à photographier et à filmer notre univers. Très rapidement, j’ai découvert quelque chose qui allait transformer ma vie : le plaisir de raconter une histoire à travers une image.</p>
                                                <p>Au début, je ne cherchais pas à en faire un métier. Je créais par passion. Puis, au fil du temps, les demandes ont commencé à arriver :</p>
                                                <p className="about-block__quote">« J’ai aimé la vidéo que tu as réalisée. Pourrais-tu photographier ma fille? Mon fils? Ma famille? »</p>
                                                <p>Ces demandes m’ont fait comprendre que mon regard avait une valeur et que cette passion pouvait devenir une véritable profession.</p>
                                    </div>
                          </section>
                
                        <section className="about-block about-block--reverse">
                                  <div className="about-block__photo">
                                              <img src="/assets/about/about-craft.webp" alt="Behn préparant son équipement photo et vidéo" />
                                  </div>
                                  <div className="about-block__text">
                                              <p>En 2013, j’ai fondé ma première entreprise, Cede Films. Ce fut le début officiel de mon parcours comme créateur d’images, entre photographie, vidéo et production audiovisuelle.</p>
                                              <p>En 2024, une nouvelle page s’est ouverte au Canada. Avec ma femme, nous avons décidé de restructurer le projet, de lui donner une nouvelle identité et de bâtir une entreprise à l’image de notre vision. C’est ainsi qu’est née Behn J Productions.</p>
                                  </div>
                        </section>
                
                        <section className="about-block">
                                  <div className="about-block__photo">
                                              <img src="/assets/about/about-production.webp" alt="Behn en tournage vidéo avec caméra et trépied" />
                                  </div>
                                  <div className="about-block__text">
                                              <p>Aujourd’hui établi à Sept-Îles, je réalise des projets photographiques, vidéographiques et de diffusion en direct pour les familles, les entreprises, les écoles, les artistes, les organisations et les communautés de la Côte-Nord.</p>
                                              <p>Mais derrière chaque service, ma mission demeure la même : comprendre l’histoire de chaque personne, saisir ce qui ne se répète pas et créer des images capables de traverser le temps.</p>
                                  </div>
                        </section>
                
                        <section className="about-block about-block--reverse">
                                  <div className="about-block__photo">
                                              <img src="/assets/about/about-action.webp" alt="Behn en pleine action lors d’un événement en direct" />
                                  </div>
                                  <div className="about-block__text">
                                              <p>Parce qu’une grande image ne dépend pas uniquement de la caméra. Elle naît de la confiance, de l’émotion et de l’attention portée à ce que les autres ne voient pas toujours.</p>
                                  </div>
                        </section>
                
                        <section className="about-closing">
                                  <p className="about-closing__line">Chaque détail compte.</p>
                                  <h2>Vous avez une histoire à raconter?</h2>
                                  <p>Créons ensemble les images qui lui donneront vie.</p>
                                  <a className="button" href={`mailto:${BRAND.email}`}>Nous écrire</a>
                        </section>
                </main>
          
                <footer className="footer">
                        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
                        <div>
                                  <strong>Sept-Îles · Québec</strong>
                                  <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
                                  <a href={BRAND.phoneHref}>{BRAND.phone}</a>
                        </div>
                        <div className="footer-links">
                                  <a href="/">Retour à l’accueil</a>
                        </div>
                        <div className="socials" aria-label="Réseaux sociaux">
                                  <a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a>
                                  <a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a>
                        </div>
                </footer>
          </div>
        );
}

export default AProposPage;
