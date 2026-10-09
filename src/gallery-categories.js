export const PHOTO_CATEGORIES = [
  { id: 'full', label: 'FULL SIZE — RETOUCHE DE BASE', description: 'Originaux finaux en pleine résolution · Retouche de base' },
  { id: 'advanced', label: 'FULL SIZE — RETOUCHE AVANCÉE', description: 'Originaux finaux en pleine résolution · Retouche avancée' },
  { id: 'social', label: 'RÉSEAUX SOCIAUX', description: 'Images optimisées pour les réseaux sociaux et le web' },
  { id: 'bw', label: 'NOIR & BLANC', description: 'Versions finales en noir et blanc' },
];
export const photoCategory = (photo) => PHOTO_CATEGORIES.some(({ id }) => id === photo.category) ? photo.category : 'full';
export const categoryPhotos = (photos, category) => photos.filter((photo) => photoCategory(photo) === category);
