# Galeries client — infrastructure

Les galeries privées de Behn J. Productions reposent sur deux morceaux :

| Morceau | Où | Rôle |
|---|---|---|
| Le site (React) | Netlify — `behnjproductions.ca` | Les pages `/galerie/<client>` et `/admin` |
| L'API (ce dossier) | Cloudflare Worker — `bjp-galeries` | Photos (R2), données (D1), mots de passe, courriels |

Netlify relaie `/api/*` vers le Worker (règle dans `public/_redirects`). Pour le
client, tout se passe sur `behnjproductions.ca` : il ne voit jamais Cloudflare.

## Ce qui est déjà créé dans Cloudflare

- Bucket R2 **bjp-galeries** — les photos (version web + vignette, en JPEG)
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

## Le flux, du côté du photographe

1. `/admin` → **Nouvelle collection** : nom du client, date, mot de passe,
   nombre de photos incluses. L'adresse `\<client\>` est proposée automatiquement.
2. Glisser les photos. Elles sont réduites **sur l'ordinateur** (2000 px pour la
   vue web, 700 px pour la vignette) avant d'être envoyées : les originaux ne
   quittent jamais la machine et R2 reste léger.
3. Choisir la photo de couverture (l'étoile), puis **Publier**.
4. Copier le lien et l'envoyer au client avec son mot de passe.
5. Quand le client envoie sa sélection : un courriel arrive à
   `contact@behnjphoto.com` et la liste apparaît dans la collection, avec un
   bouton pour la copier ou la télécharger en `.txt`.

Tant qu'une collection est en **brouillon**, elle est invisible pour tout le
monde sauf pour une session administrateur — l'aperçu est donc sans risque.
