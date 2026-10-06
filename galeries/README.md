# Galeries client — infrastructure

Les galeries privées de Behn J. Productions reposent sur deux morceaux :

| Morceau | Où | Rôle |
|---|---|---|
| Le site (React) | Netlify — `behnjproductions.ca` | Les pages `/galerie/<client>` et `/admin` |
| L'API (ce dossier) | Cloudflare Worker — `bjp-galeries` | Photos (R2), données (D1), mots de passe, courriels |

Netlify relaie `/api/*` vers le Worker (règle dans `public/_redirects`). Pour le
client, tout se passe sur `behnjproductions.ca` : il ne voit jamais Cloudflare.

## Ce qui est déjà créé dans Cloudflare

- Bucket R2 **bjp-galeries** — les photos (version web + vignette en JPEG;
  fichiers finaux originaux pour les nouveaux téléversements dans les trois catégories)
- Base D1 **bjp-galeries-db** — tables `collections`, `photos`, `selections`,
  `login_attempts` (voir `schema.sql`)

Les photos ne sont jamais publiques : le Worker les sert une par une, seulement
si la session du client (ou la session administrateur) est valide.

## Première mise en ligne

Depuis le dossier du dépôt, dans le Terminal :

```bash
# 1. Déployer le Worker (wrangler ouvre le navigateur pour la connexion Cloudflare)
npm run galeries:deploy

# 2. Les trois secrets (jamais dans le dépôt)
npx wrangler@4 secret put ADMIN_PASSWORD  -c galeries/wrangler.jsonc
npx wrangler@4 secret put SESSION_SECRET  -c galeries/wrangler.jsonc
npx wrangler@4 secret put RESEND_API_KEY  -c galeries/wrangler.jsonc
```

- `ADMIN_PASSWORD` : le mot de passe du panneau `/admin`.
- `SESSION_SECRET` : une longue suite de caractères au hasard, jamais réutilisée
  ailleurs. Elle signe les sessions; la changer déconnecte tout le monde.
- `RESEND_API_KEY` : la clé Resend déjà utilisée pour la facturation. Sans elle,
  les sélections sont quand même enregistrées, mais aucun courriel ne part.

L'adresse du Worker doit rester `bjp-galeries.behnjedy.workers.dev` : c'est
celle inscrite dans `public/_redirects`.

## Travailler en local

```bash
npm run galeries:dev   # l'API, sur le port 8787, avec un R2 et un D1 locaux
npm run dev            # le site, sur le port 5173, qui relaie /api vers 8787
npm run galeries:test  # le parcours complet en vrai navigateur (ordinateur + cellulaire)
```

Le fichier `galeries/.dev.vars` porte les secrets de développement (il est
ignoré par git). La première fois :

```bash
npx wrangler@4 d1 execute bjp-galeries-db --local --file galeries/schema.sql -c galeries/wrangler.jsonc
```

## Mise à jour d’une base existante : modes de galerie

Appliquer **une seule fois** `migrations/0001_gallery_modes.sql` avant de
déployer le nouveau Worker. `schema.sql` sert à créer une base neuve; ses
`CREATE TABLE IF NOT EXISTS` ne mettent pas à jour les tables existantes.
La migration ajoute `collections.mode` (par défaut `selection`) et
`photos.original_key`; elle ne modifie aucune sélection enregistrée.

Ordre de mise en ligne : vérifier une sauvegarde D1, appliquer la migration,
déployer le Worker en conservant ses variables, puis publier le site.
Netlify publie le site automatiquement après un envoi sur `main`; la migration
D1 et le déploiement du Worker sont distincts et ne sont pas automatiques.
En cas de retour à l’ancienne version du Worker, conserver les colonnes ajoutées.
Ne pas supprimer de données pour revenir en arrière.

Le mode se règle par collection et s’applique dès l’enregistrement.
`selection` conserve le flux de choix existant et refuse le téléchargement
officiel. `download` refuse les nouvelles sélections et autorise le
téléchargement de chaque fichier par `/api/photo/:id/download`, avec les mêmes
contrôles d’accès que les photos. Les images affichées dans un navigateur
restent enregistrables par ce navigateur; le mode sélection n’est pas un DRM.
Les anciennes sélections restent visibles dans l’administration.

Les nouveaux fichiers finaux sont conservés dans les trois catégories, dans
les deux modes (JPEG, PNG ou WebP, 75 Mo maximum). Un changement de mode ne
reconstitue pas les originaux des photos existantes : leur version web reste
téléchargeable et est identifiée comme telle dans l’interface.

La nouvelle présentation claire reste un aperçu explicite `?apercu=clair`
pour les galeries de sélection. Le mode téléchargement utilise cette
présentation directement. Cette modification est préparée localement;
sa présence dans le dépôt ne signifie pas qu’elle est publiée.

## Le flux, du côté du photographe

1. `/admin` → **Nouvelle collection** : nom du client, date, mode **Pour
   sélectionner** ou **Pour télécharger**, mot de passe et, pour la sélection,
   nombre de photos incluses. L'adresse `\<client\>` est proposée automatiquement.
2. Glisser les photos. Elles sont réduites **sur l'ordinateur** (2000 px pour la
   vue web, 700 px pour la vignette) avant d'être envoyées. Dans chaque catégorie, le fichier final
   original est aussi envoyé sans transformation; le téléchargement reste
   réservé aux collections en mode téléchargement.
3. Choisir la photo de couverture (l'étoile), puis **Publier**.
4. Copier le lien et l'envoyer au client avec son mot de passe.
5. Quand le client envoie sa sélection : un courriel arrive à
   `contact@behnjphoto.com` et la liste apparaît dans la collection, avec un
   bouton pour la copier ou la télécharger en `.txt`.

Tant qu'une collection est en **brouillon**, elle est invisible pour tout le
monde sauf pour une session administrateur — l'aperçu est donc sans risque.

## Catégories indépendantes dans une collection

FULL SIZE, RÉSEAUX SOCIAUX et NOIR & BLANC contiennent des photos indépendantes;
aucun appariement n’est nécessaire. Les identifiants des favoris restent
communs à la collection et la couverture reste indépendante du filtre.
Les téléchargements individuels et ZIP utilisent uniquement la catégorie active.

Avant de déployer cette version du Worker, sauvegarder D1 puis appliquer une
seule fois `migrations/0002_photo_categories.sql`. Cette migration ajoute
`photos.category` et un index; toutes les anciennes photos deviennent `full`,
sans modification des fichiers, identifiants ou sélections. Déployer ensuite
le Worker avec ses variables existantes, puis publier le site depuis `main`.
Conserver la colonne lors d’un retour à l’ancienne version.

## Collections scolaires

Appliquer une seule fois `migrations/0003_school_collections.sql` avant le déploiement. Le type `school` est indépendant du mode `selection` ou `download`; les collections existantes restent `standard`. Dans la création et les réglages, choisir École affiche les deux modes scolaires.
