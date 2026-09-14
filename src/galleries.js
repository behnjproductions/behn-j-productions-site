// Données de démonstration. À terme, ce fichier sera remplacé par un appel
// à l'API qui lit les galeries stockées sur Cloudflare R2.
export const DEMO_GALLERY = {
  slug: 'demo',
  client: 'Famille Tremblay',
  title: 'Séance famille',
  date: '12 septembre 2026',
  cover: '/assets/portfolio/mariage-ceremonie.jpg',
  maxPicks: 15,
  photos: [
    { id: 'p01', src: '/assets/portfolio/scolaire-diplomee-uqac.jpg' },
    { id: 'p02', src: '/assets/portfolio/scolaire-finissante-bibliotheque.jpg' },
    { id: 'p03', src: '/assets/portfolio/scolaire-portrait-finissante.jpg' },
    { id: 'p04', src: '/assets/portfolio/scolaire-rentree.jpg' },
    { id: 'p05', src: '/assets/portfolio/corporatif-portrait-studio.jpg' },
    { id: 'p06', src: '/assets/portfolio/corporatif-portrait-fond-sable.jpg' },
    { id: 'p07', src: '/assets/portfolio/mariage-ceremonie.jpg' },
    { id: 'p08', src: '/assets/portfolio/culture-aines-innus.jpg' },
    { id: 'p09', src: '/assets/portfolio/culture-danse-amazigh.jpg' },
    { id: 'p10', src: '/assets/portfolio/culture-guitariste.jpg' },
    { id: 'p11', src: '/assets/portfolio/culture-teueikan.jpg' },
    { id: 'p12', src: '/assets/portfolio/sport-cheer-solo.jpg' },
  ],
};
