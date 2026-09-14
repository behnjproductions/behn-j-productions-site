// Protection du panneau d'administration par authentification HTTP Basic.
// Le mot de passe vit dans la variable d'environnement ADMIN_PASSWORD, côté
// serveur : il n'apparaît ni dans le dépôt, ni dans le code envoyé au
// navigateur. Une page bloquée ici n'est jamais servie au visiteur.

export default async (request, context) => {
  const expected = Netlify.env.get('ADMIN_PASSWORD');

  // Tant qu'aucun mot de passe n'est configuré, la page reste fermée :
  // mieux vaut un panneau inaccessible qu'un panneau ouvert à tous.
  if (!expected) {
    return new Response(
      'Panneau non configuré. Définissez la variable ADMIN_PASSWORD dans Netlify.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(header.slice(6)); } catch { decoded = ''; }
    const password = decoded.slice(decoded.indexOf(':') + 1);
    // Comparaison à temps constant : ne révèle pas le mot de passe
    // caractère par caractère à quelqu'un qui mesure le temps de réponse.
    if (safeEqual(password, expected)) return context.next();
  }

  return new Response('Accès réservé.', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="Behn J. Productions — administration", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8',
    },
  });
};

function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

export const config = { path: '/admin' };
