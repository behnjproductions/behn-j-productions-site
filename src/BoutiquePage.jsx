import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FacebookLogo, InstagramLogo } from '@phosphor-icons/react';
import { BRAND } from './brand.js';

const A = '/assets/boutique/';

const CADRES = [
  { id: 'c57', w: 5, h: 7, label: '5 × 7 po', note: 'Avec passe-partout', price: 40 },
  { id: 'c810', w: 8, h: 10, label: '8 × 10 po', note: 'Sans passe-partout', price: 45 },
  { id: 'c810p', w: 8, h: 10, label: '8 × 10 po', note: 'Avec passe-partout', price: 58 },
  { id: 'c1114', w: 11, h: 14, label: '11 × 14 po', note: 'Mural', price: 68 },
];

const TOILES = [
  { id: 't1212', w: 12, h: 12, label: '12 × 12 po', note: 'Carré', price: 135 },
  { id: 't1216', w: 12, h: 16, label: '12 × 16 po', note: 'Le plus demandé', price: 170 },
  { id: 't1624', w: 16, h: 24, label: '16 × 24 po', note: 'Pièce maîtresse', price: 210 },
  { id: 't2436', w: 24, h: 36, label: '24 × 36 po', note: 'Effet galerie', price: 265 },
];

const FRAMES = [
  { id: 'noir', label: 'Noir', col: '#1A1A1A' },
  { id: 'blanc', label: 'Blanc', col: '#F2EEE8' },
  { id: 'noyer', label: 'Noyer', col: '#6B4226' },
];

const OBJETS = {
  maison: [
    ['Cadre acrylique deux faces', 'Deux photos dos à dos, tenues par des aimants. 2,5 × 3,5 po.', 30, 'cadre-acrylique'],
    ['Aide-mémoire aimanté', '8 × 10 po pour le frigo, livré avec son crayon effaçable.', 35, 'aide-memoire'],
    ['Casse-tête 8 × 10 po', '60 morceaux, livré dans sa pochette.', 32, 'casse-tete'],
    ['Sous-verres (jeu de 2)', '4 × 4 po, base de liège, surface résistante aux liquides.', 28, 'sous-verres'],
  ],
  emporter: [
    ['Gobelet isotherme 20 oz', 'Acier inoxydable double paroi, couvercle étanche.', 49, 'gobelet'],
    ['Tasse en céramique 11 oz', 'Intérieur et anse en rouge, bleu ou noir.', 32, 'tasse'],
    ['Porte-clés Prestige', 'Métal, fini sublimation saturé.', 24, 'porte-cles'],
  ],
  collect: [
    ['Jeu de 52 cartes', 'Photo pleine grandeur au dos de chaque carte.', 48, 'cartes52'],
    ['Photo aimantée 8 × 10 po', 'Vrai papier photo aimanté.', 18, 'photo-aimantee'],
    ['Transfert sur bois 8 × 10 po', 'Plaque de bois avec chevalet inclus.', 42, 'bois'],
  ],
  deco: [
    ['Boule de Noël en céramique', '3 po de diamètre, photo ronde, imprimé à l’endos.', 26, 'boule'],
    ['Ornement flocon ou bonhomme de neige', 'Photo au recto et au verso, ruban rouge fourni.', 16, 'flocon'],
    ['Globe enneigé', '3,25 po, deux photos dos à dos, base noire ou argent.', 26, 'globe'],
  ],
  cartes: [
    ['Cartes de souhaits 5 × 7 — 25 cartes', 'Pliées, enveloppes incluses.', 140, 'cartes-voeux'],
    ['Cartes de souhaits 5 × 7 — 10 cartes', 'Pliées, enveloppes incluses.', 68, 'cartes-voeux'],
    ['Étiquettes cadeaux — 8 étiquettes', '1,75 × 2,5 po sur une planche 5 × 7.', 12, 'etiquettes'],
  ],
  cal: [
    ['Calendrier 8 × 10 po', '12 mois sur papier photo, plus de 15 modèles.', 20, null],
    ['Calendrier aimanté 15 mois', '8,5 × 11 po, bandes aimantées à l’endos.', 32, 'cal-aimante'],
    ['Calendrier de bureau', '12 mois sur support de bois, 4 × 6 po.', 34, 'cal-bureau'],
  ],
};

const DEMO = [`${A}apercu-1.jpg`, `${A}apercu-2.jpg`];

const PREP = 10;
const SHIP = 12;
const SHIP_FREE = 150;
const PPI = 392 / 69; // le modèle mesure 5 pi 9 po
const EYE = 47; // hauteur du centre du cadre, en pouces

const money = (n) => `${n.toFixed(2).replace('.', ',')} $`;
const rateFor = (q) => (q >= 5 ? 0.1 : q >= 3 ? 0.05 : 0);

function Frame({ size, colour, photo, demo, ppi, showLabel = true }) {
  const src = photo || demo || DEMO[0];
  const w = Math.round(size.w * ppi);
  const h = Math.round(size.h * ppi);
  return (
    <div className="bq-frame-wrap" style={{ marginBottom: Math.round(EYE * ppi - h / 2) }}>
      <div className="bq-dim bq-dim-w"><span>{size.w} po</span></div>
      <div className="bq-dim bq-dim-h"><span>{size.h} po</span></div>
      <div className="bq-frame" style={{ '--bq-frame-col': colour.col, width: w, height: h }}>
        <div className="bq-face" style={{ backgroundImage: `url(${src})` }}>
          {showLabel && false && <span>{size.label.replace(' po', '')}</span>}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ row, onPick }) {
  const [name, desc, price, img] = row;
  const [added, setAdded] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className="bq-pcard"
      onClick={() => {
        onPick({ name, desc, price, img });
        setAdded(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), 1200);
      }}
    >
      {img && <img className="bq-pthumb" src={`${A}${img}.jpg`} alt="" loading="lazy" decoding="async" />}
      <span className="bq-ptxt"><b>{name}</b><em>{desc}</em></span>
      <span className="bq-p bq-num">{added ? 'Choisi' : `${price} $`}</span>
    </button>
  );
}

export function BoutiquePage() {
  const [family, setFamily] = useState('cadre');
  const [size, setSize] = useState(CADRES[1]);
  const [colour, setColour] = useState(FRAMES[0]);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState({ url: null, name: null });
  const [demoIndex, setDemoIndex] = useState(0);
  const [galRef, setGalRef] = useState('');
  const [cart, setCart] = useState([]);
  const [pending, setPending] = useState(null);
  const [pendingQty, setPendingQty] = useState(1);
  const [pendingRef, setPendingRef] = useState('');
  const [recap, setRecap] = useState(null);
  const fileRef = useRef(null);
  const cartRef = useRef(null);

  const list = family === 'cadre' ? CADRES : TOILES;

  const chooseFamily = (f) => {
    setFamily(f);
    setSize(f === 'cadre' ? CADRES[1] : TOILES[1]);
  };

  const quote = useMemo(() => {
    const base = size.price * qty;
    const rate = rateFor(qty);
    const disc = base * rate;
    const prints = base - disc;
    const ship = prints >= SHIP_FREE ? 0 : SHIP;
    return { base, rate, disc, prints, ship, total: prints + PREP + ship };
  }, [size, qty]);

  const totals = useMemo(() => {
    const printsQty = cart.filter((i) => i.print).reduce((a, i) => a + i.qty, 0);
    const printsBase = cart.filter((i) => i.print).reduce((a, i) => a + i.price * i.qty, 0);
    const objets = cart.filter((i) => !i.print).reduce((a, i) => a + i.price * i.qty, 0);
    const rate = rateFor(printsQty);
    const disc = printsBase * rate;
    const prints = printsBase - disc;
    const prep = printsQty ? PREP : 0;
    const ship = cart.length ? (prints + objets >= SHIP_FREE ? 0 : SHIP) : 0;
    return { rate, disc, prints, objets, prep, ship, total: prints + objets + prep + ship };
  }, [cart]);

  const units = cart.reduce((a, i) => a + i.qty, 0);

  const addItem = (name, price, n, isPrint = false) => {
    setCart((prev) => {
      const found = prev.find((i) => i.name === name);
      if (found) return prev.map((i) => (i === found ? { ...i, qty: Math.min(30, i.qty + n) } : i));
      return [...prev, { name, price, qty: n, print: isPrint }];
    });
    setRecap(null);
  };

  const goToCart = () => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const addPrint = () => {
    const ref = galRef.trim() || photo.name || '';
    const label = `${family === 'cadre' ? 'Cadre ' : 'Toile '}${size.label}${family === 'cadre' ? ` — ${size.note.toLowerCase()}` : ''} — cadre ${colour.label.toLowerCase()}${ref ? ` — photo : ${ref}` : ''}`;
    addItem(label, size.price, qty, true);
    goToCart();
  };

  const onFile = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto({ url: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };

  const confirmPending = () => {
    if (pending) {
      const suffix = pendingRef.trim() ? ` — photo : ${pendingRef.trim()}` : '';
      addItem(pending.name + suffix, pending.price, pendingQty);
    }
    setPending(null);
    goToCart();
  };

  useEffect(() => {
    if (!pending) return undefined;
    const close = (event) => { if (event.key === 'Escape') setPending(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [pending]);

  const buildRecap = () => {
    const lines = cart.map((i) => `${i.qty} × ${i.name} — ${money(i.price * i.qty)}`);
    const body = [
      ...lines,
      totals.rate ? `Rabais de quantité : −${money(totals.disc)}` : null,
      totals.prep ? `Préparation et épreuve : ${money(totals.prep)}` : null,
      `Livraison : ${totals.ship ? money(totals.ship) : 'offerte'}`,
      '',
      `Total : ${money(totals.total)}`,
      '',
      'Numéros des photos choisies : ',
    ].filter((l) => l !== null).join('\n');
    setRecap({ lines, body });
  };

  const openPending = (p) => { setPending(p); setPendingQty(1); setPendingRef(''); };

  return (
    <div className="site-shell boutique-page">
      <header className="site-header about-header">
        <a className="brand" href="/" aria-label="Retour à l’accueil"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></a>
        <nav className="about-nav" aria-label="Navigation principale"><a href="/">Retour à l’accueil</a></nav>
        <div className="header-actions">
          <a className="header-phone" href={BRAND.phoneHref}>{BRAND.phone}</a>
          <a className="header-cta" href="/contact#formulaire">Nous contacter</a>
        </div>
      </header>

      <main>
        {/* ---------- héros ---------- */}
        <section className="bq-hero" id="boutique-top">
          <div className="bq-wrap bq-hero-grid">
            <div className="bq-hero-text">
              <p className="bq-eyebrow bq-eyebrow--light">Tirages et objets</p>
              <h1>Vos photos.<br />Sur vos murs.</h1>
              <p className="bq-lede">Cadres fabriqués au Québec, toiles grand format et objets souvenirs — tous faits à partir de vos images, préparés et épreuvés un par un.</p>
              <div className="bq-cta-row">
                <a className="bq-btn" href="#murs">Composer mon tirage</a>
                <a className="bq-btn bq-btn--ghost" href="#objets">Voir les objets</a>
              </div>
            </div>

            <div className="bq-scene-box">
              <div className="bq-scene-floor" />
              <div className="bq-scene">
                <img className="bq-person" src={`${A}modele-echelle.png`} alt="Personne de 5 pi 9 po, pour l’échelle" width="135" height="392" />
                <Frame size={size} colour={colour} photo={photo.url} demo={DEMO[demoIndex]} ppi={PPI} />
              </div>
              {!photo.url && (
                <button type="button" className="bq-demo-swap" onClick={() => setDemoIndex((i) => (i + 1) % DEMO.length)}>
                  Voir une autre photo
                </button>
              )}
              <p className="bq-scene-cap">À l’échelle réelle — personne de 5 pi 9 po</p>
            </div>

            <div className="bq-cart" ref={cartRef}>
              <h3>Ma commande</h3>
              {cart.length === 0 ? (
                <p className="bq-cart-empty">Votre commande est vide. Composez un tirage ou ajoutez un objet souvenir plus bas — le total s’affichera ici.</p>
              ) : (
                <>
                  <table>
                    <thead><tr><th>Article</th><th className="bq-r">Qté</th><th className="bq-r">Montant</th><th /></tr></thead>
                    <tbody>
                      {cart.map((item, index) => (
                        <tr key={item.name}>
                          <td>{item.name}</td>
                          <td className="bq-r bq-num">{item.qty}</td>
                          <td className="bq-r bq-num">{money(item.price * item.qty)}</td>
                          <td className="bq-r">
                            <button type="button" className="bq-rm" onClick={() => setCart((p) => p.filter((_, i) => i !== index))}>Retirer</button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={2} style={{ color: 'var(--bq-muted)' }}>
                          {totals.rate ? <>Rabais de quantité (−{Math.round(totals.rate * 100)} %)<br /></> : null}
                          {totals.prep ? <>Préparation et épreuve<br /></> : null}
                          Livraison
                        </td>
                        <td className="bq-r bq-num" style={{ color: 'var(--bq-muted)' }}>
                          {totals.rate ? <>−{money(totals.disc)}<br /></> : null}
                          {totals.prep ? <>{money(totals.prep)}<br /></> : null}
                          {totals.ship ? money(totals.ship) : 'offerte'}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
              <div className="bq-cartfoot">
                <div>
                  <p className="bq-eyebrow" style={{ marginBottom: 6 }}>Total</p>
                  <div className="bq-grand bq-num">{money(totals.total)}</div>
                </div>
                <button className="bq-btn bq-btn--solid" type="button" disabled={!cart.length} onClick={buildRecap}>Envoyer ma commande</button>
              </div>
              {recap && (
                <div className="bq-recap">
                  <b>Votre récapitulatif</b><br />
                  {recap.lines.map((l) => <span key={l}>{l}<br /></span>)}
                  {totals.rate ? <>Rabais de quantité : −{money(totals.disc)}<br /></> : null}
                  {totals.prep ? <>Préparation et épreuve : {money(totals.prep)}<br /></> : null}
                  Livraison : {totals.ship ? money(totals.ship) : 'offerte'}<br />
                  <b>Total : {money(totals.total)}</b><br /><br />
                  <a href={`mailto:${BRAND.email}?subject=${encodeURIComponent('Commande — Boutique Behn J.')}&body=${encodeURIComponent(recap.body)}`}>Envoyer par courriel →</a>
                  {' · '}
                  <a href={BRAND.phoneHref}>Appeler le {BRAND.phone}</a>
                  <br />
                  <span style={{ fontSize: 12 }}>Joignez vos images au courriel (ou indiquez le numéro des photos de votre galerie) — je vous renvoie une épreuve avant l’impression.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------- vos murs ---------- */}
        <section className="bq-band" id="murs">
          <div className="bq-wrap">
            <div className="bq-murs-head">
              <div>
                <p className="bq-eyebrow">Vos murs</p>
                <h2>Choisissez le format,<br />voyez-le sur le mur.</h2>
                <p className="bq-lede2">Deux familles : des cadres classiques avec verre et passe-partout, conçus et fabriqués au Québec, et des toiles tendues grand format montées sur châssis de bois. L’impression, le montage et l’emballage sont compris.</p>
              </div>
              <div>
                <div className={`bq-trio${family === 'toile' ? ' bq-trio--toile' : ''}`}>
                  {FRAMES.map((f) => (
                    <button key={f.id} type="button" className="bq-triobtn" aria-pressed={f.id === colour.id} aria-label={`Cadre ${f.label.toLowerCase()}`} onClick={() => setColour(f)}>
                      <span className="bq-tf" style={{ '--bq-tc': f.col }}><span style={{ backgroundImage: `url(${photo.url || DEMO[demoIndex]})`, backgroundSize: 'cover', backgroundPosition: 'center 20%' }} /></span>
                      <span className="bq-cap">{f.label}</span>
                    </button>
                  ))}
                </div>
                <p className="bq-trio-note">Trois couleurs de cadre, sur les quatre formats{family === 'toile' ? ' de toile' : ''}.</p>
              </div>
            </div>

            <div className="bq-config">
              <div>
                <div className="bq-group">
                  <p className="bq-lbl">Type de pièce</p>
                  <div className="bq-tabs">
                    <button type="button" aria-pressed={family === 'cadre'} onClick={() => chooseFamily('cadre')}>Cadre classique</button>
                    <button type="button" aria-pressed={family === 'toile'} onClick={() => chooseFamily('toile')}>Toile encadrée</button>
                  </div>
                </div>

                <div className="bq-group">
                  <p className="bq-lbl">Format</p>
                  <div className="bq-sizes">
                    {list.map((s) => (
                      <button key={s.id} type="button" className="bq-opt" aria-pressed={s.id === size.id} onClick={() => setSize(s)}>
                        <span><b>{s.label}</b><em>{s.note}</em></span>
                        <span className="bq-p bq-num">{s.price} $</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bq-group">
                  <p className="bq-lbl">Couleur du cadre</p>
                  <div className="bq-swatches">
                    {FRAMES.map((f) => (
                      <button key={f.id} type="button" className="bq-sw" aria-pressed={f.id === colour.id} onClick={() => setColour(f)}>
                        <i style={{ background: f.col }} />{f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bq-group">
                  <p className="bq-lbl">Votre photo</p>
                  <div className="bq-photo-pick">
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                    <button type="button" className="bq-pickbtn" onClick={() => fileRef.current?.click()}>Choisir une image</button>
                    <span className="bq-pickname">{photo.name || 'Aucune image choisie'}</span>
                    {photo.url && (
                      <button type="button" className="bq-pickclear" onClick={() => { setPhoto({ url: null, name: null }); if (fileRef.current) fileRef.current.value = ''; }}>Retirer</button>
                    )}
                  </div>
                  <label className="bq-gal-lbl" htmlFor="bq-galref">ou le numéro de la photo dans votre galerie</label>
                  <input id="bq-galref" className="bq-galinput" type="text" placeholder="Ex. : IMG-0428" autoComplete="off" value={galRef} onChange={(e) => setGalRef(e.target.value)} />
                  <p className="bq-pickhint">Les photos affichées sont des exemples. L’aperçu est indicatif : je recadre et calibre chaque image avant l’impression, et vous approuvez une épreuve.</p>
                </div>

                <div className="bq-group">
                  <p className="bq-lbl">Quantité</p>
                  <div className="bq-qty">
                    <button type="button" aria-label="Retirer une pièce" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                    <input type="number" min="1" max="30" inputMode="numeric" aria-label="Quantité" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
                    <button type="button" aria-label="Ajouter une pièce" onClick={() => setQty((q) => Math.min(30, q + 1))}>+</button>
                  </div>
                </div>
              </div>

              <div className="bq-sticky">
                <div className="bq-mini-scene">
                  <Frame size={size} colour={colour} photo={photo.url} demo={DEMO[demoIndex]} ppi={132 / Math.max(size.w, size.h)} showLabel={false} />
                </div>
                <div className="bq-summary">
                  <div className="bq-row">
                    <span>{family === 'cadre' ? 'Cadre ' : 'Toile '}{size.label} × {qty}</span>
                    <b className="bq-num">{money(quote.base)}</b>
                  </div>
                  {quote.rate > 0 && (
                    <div className="bq-row bq-row--save">
                      <span>Rabais de quantité (−{Math.round(quote.rate * 100)} %)</span>
                      <b className="bq-num">−{money(quote.disc)}</b>
                    </div>
                  )}
                  <div className="bq-row"><span>Préparation et épreuve</span><b className="bq-num">{money(PREP)}</b></div>
                  <div className="bq-row"><span>Livraison</span><b className="bq-num">{quote.ship ? money(quote.ship) : 'offerte'}</b></div>
                  <div className="bq-tot"><span>Total</span><span className="bq-v bq-num">{money(quote.total)}</span></div>
                  <button className="bq-btn bq-btn--solid" type="button" style={{ width: '100%', marginTop: 16 }} onClick={addPrint}>Ajouter à ma commande</button>
                  <p className="bq-hint">
                    {quote.ship === 0 ? 'Livraison incluse. Cueillette possible au studio.' : `Encore ${money(SHIP_FREE - quote.prints)} de tirages pour la livraison offerte.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- objets ---------- */}
        <section className="bq-band bq-band--dark" id="objets" style={{ paddingBottom: 0 }}>
          <div className="bq-wrap">
            <p className="bq-eyebrow bq-eyebrow--light">Objets souvenirs</p>
            <h2>Ce qu’on offre,<br />ce qu’on garde.</h2>
            <p className="bq-lede2">De petits objets du quotidien qui portent votre photo. Ce sont eux qu’on offre aux grands-parents et qu’on retrouve avec plaisir des années plus tard.</p>
          </div>
          <div className="bq-objets-body">
            <div className="bq-wrap">
              {[['À la maison', OBJETS.maison], ['À emporter', OBJETS.emporter], ['À collectionner', OBJETS.collect]].map(([title, rows]) => (
                <div key={title}>
                  <p className="bq-subhead">{title}</p>
                  <div className="bq-pgrid">
                    {rows.map((row) => <ProductCard key={row[0]} row={row} onPick={openPending} />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- fêtes ---------- */}
        <section className="bq-band" id="fetes">
          <div className="bq-wrap">
            <p className="bq-eyebrow">Temps des Fêtes</p>
            <h2>Les commandes des Fêtes<br />se préparent tôt.</h2>
            <p className="bq-lede2">Chaque article est produit sur mesure à partir de vos photos. Les commandes sont regroupées en une seule production : après la date limite, la livraison avant Noël n’est plus garantie.</p>
            <p className="bq-subhead" style={{ marginTop: 26 }}>Date limite — 15 novembre</p>
            {[['Décorations', OBJETS.deco], ['Cartes et papeterie', OBJETS.cartes], ['Calendriers', OBJETS.cal]].map(([title, rows]) => (
              <div key={title}>
                <p className="bq-subhead">{title}</p>
                <div className="bq-pgrid">
                  {rows.map((row) => <ProductCard key={row[0]} row={row} onPick={openPending} />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- commander ---------- */}
        <section className="bq-band" id="commander" style={{ background: 'var(--bq-sand)' }}>
          <div className="bq-wrap">
            <p className="bq-eyebrow">Commander</p>
            <h2>Simple, du premier clic<br />au souvenir.</h2>
            <div className="bq-steps">
              <div>
                {[
                  ['Choisissez vos images', 'Dans votre galerie en ligne, notez le numéro des photos qui vous intéressent.'],
                  ['Composez votre commande', 'Ajoutez les formats et les articles ici, puis envoyez-moi le récapitulatif.'],
                  ['Approuvez l’épreuve', 'Je prépare chaque fichier — recadrage, couleurs, résolution — et vous validez avant la production.'],
                  ['Recevez vos pièces', '10 à 14 jours ouvrables. Livraison à Sept-Îles ou cueillette au studio.'],
                ].map(([title, text], i) => (
                  <div className="bq-step" key={title}>
                    <div className="bq-n">{i + 1}</div>
                    <div><h3>{title}</h3><p>{text}</p></div>
                  </div>
                ))}
              </div>
              <dl className="bq-facts">
                {[
                  ['Préparation des fichiers', '10 $ par image, offerte pour toute photo provenant d’une séance Behn J. Productions.'],
                  ['Livraison', 'Comprise dès 150 $ de tirages. Sous ce montant : 12 $. Cueillette possible au 416, av. Iberville.'],
                  ['Rabais de quantité', '5 % dès 3 pièces, 10 % dès 5 pièces dans une même commande.'],
                  ['Paiement', '50 % à la commande, solde à la livraison. Virement Interac, carte ou comptant.'],
                  ['Garantie', 'Un article abîmé, mal imprimé ou non conforme à l’épreuve approuvée est repris sans frais.'],
                ].map(([term, text]) => (
                  <div className="bq-fact" key={term}><dt>{term}</dt><dd>{text}</dd></div>
                ))}
              </dl>
            </div>
            <p style={{ marginTop: 34 }}>
              <a className="bq-btn bq-btn--quiet" href="#boutique-top">Revenir à ma commande <ArrowRight size={18} weight="bold" /></a>
            </p>
          </div>
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
          <a href="/">Accueil</a>
          <a href="/services">Services</a>
          <a href="/realisations">Réalisations</a>
          <a href="/boutique">Boutique</a>
          <a href="/a-propos">À propos</a>
          <a href="/contact#formulaire">Contact</a>
        </div>
        <div className="socials" aria-label="Réseaux sociaux">
          <a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramLogo /></a>
          <a href={BRAND.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo /></a>
        </div>
      </footer>

      {/* barre fixe sur téléphone */}
      {cart.length > 0 && (
        <div className="bq-mobar">
          <div>
            <span>Ma commande</span>
            <strong className="bq-num">{money(totals.total)}</strong>
          </div>
          <button className="bq-btn bq-btn--solid" type="button" onClick={goToCart}>Voir {units}</button>
        </div>
      )}

      {/* confirmation */}
      {pending && (
        <div className="bq-modal" role="presentation">
          <div className="bq-modal-back" onMouseDown={() => setPending(null)} />
          <div className="bq-modal-card" role="dialog" aria-modal="true" aria-labelledby="bq-modal-title">
            {pending.img && <img className="bq-modal-img" src={`${A}${pending.img}.jpg`} alt="" />}
            <p className="bq-eyebrow">Ajouter à ma commande</p>
            <h3 id="bq-modal-title">{pending.name}</h3>
            <p className="bq-modal-desc">{pending.desc}</p>
            <label className="bq-gal-lbl" htmlFor="bq-mref">Numéro de la photo dans votre galerie (facultatif)</label>
            <input id="bq-mref" className="bq-galinput" type="text" placeholder="Ex. : IMG-0428" autoComplete="off" value={pendingRef} onChange={(e) => setPendingRef(e.target.value)} />
            <div className="bq-modal-row">
              <div className="bq-qty">
                <button type="button" aria-label="Retirer" onClick={() => setPendingQty((q) => Math.max(1, q - 1))}>−</button>
                <input type="number" min="1" max="30" inputMode="numeric" aria-label="Quantité" value={pendingQty} onChange={(e) => setPendingQty(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
                <button type="button" aria-label="Ajouter" onClick={() => setPendingQty((q) => Math.min(30, q + 1))}>+</button>
              </div>
              <span className="bq-modal-price bq-num">{money(pending.price * pendingQty)}</span>
            </div>
            <div className="bq-modal-actions">
              <button className="bq-btn bq-btn--quiet" type="button" onClick={() => setPending(null)}>Annuler</button>
              <button className="bq-btn bq-btn--solid" type="button" onClick={confirmPending}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
