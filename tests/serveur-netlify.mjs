// Petit serveur qui imite les règles de public/_redirects, pour vérifier en
// local ce que Netlify fera en production : /api relayé vers le Worker,
// /galerie/* et /admin servis par galerie.html, le reste par index.html.
//
//   node tests/serveur-netlify.mjs   (après `npm run build`)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const RACINE = 'dist/client';
const API = process.env.API || 'http://127.0.0.1:8787';
const PORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

async function fichier(p) {
  try {
    const s = await stat(p);
    return s.isFile() ? p : null;
  } catch { return null; }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 1. /api/* → le Worker
  if (url.pathname.startsWith('/api/')) {
    // Le corps est lu en entier : le relayer en flux fait trébucher fetch sur
    // les en-têtes de longueur, et une requête d'essai est toujours petite.
    const morceaux = [];
    for await (const m of req) morceaux.push(m);
    const corps = Buffer.concat(morceaux);

    const entetes = { ...req.headers };
    for (const k of ['host', 'connection', 'content-length', 'accept-encoding']) delete entetes[k];

    try {
      const amont = await fetch(API + url.pathname + url.search, {
        method: req.method,
        headers: entetes,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : corps,
        redirect: 'manual',
      });
      const sortie = Object.fromEntries(amont.headers);
      delete sortie['content-encoding'];
      delete sortie['content-length'];
      res.writeHead(amont.status, sortie);
      res.end(Buffer.from(await amont.arrayBuffer()));
    } catch (e) {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `Worker injoignable : ${e.message}` }));
    }
    return;
  }

  // Ce serveur simule le routage, pas la réception des formulaires Netlify.
  if (!['GET', 'HEAD'].includes(req.method)) {
    req.resume();
    res.writeHead(405, {
      'content-type': 'application/json; charset=utf-8',
      allow: 'GET, HEAD',
    });
    res.end(JSON.stringify({ error: 'Envoi de formulaire indisponible sur ce serveur local.' }));
    return;
  }

  // 2. Un vrai fichier du build
  const direct = await fichier(path.join(RACINE, url.pathname));
  if (direct) {
    res.writeHead(200, { 'content-type': TYPES[path.extname(direct)] || 'application/octet-stream' });
    res.end(await readFile(direct));
    return;
  }

  // 3. Les règles de repli, dans l'ordre du fichier _redirects
  const page = url.pathname.startsWith('/galerie/') || url.pathname === '/admin'
    ? 'galerie.html'
    : 'index.html';
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(await readFile(path.join(RACINE, page)));
}).listen(PORT, '127.0.0.1', () => console.log(`Serveur d'essai sur http://127.0.0.1:${PORT}`));
