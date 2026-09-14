import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaretLeft, Check, Copy, DownloadSimple, Image as ImageIcon, Lock, MagnifyingGlass,
  Plus, SignOut, Star, Trash, UploadSimple, X,
} from '@phosphor-icons/react';
import { api, clearSession, photoUrl, prepareImage, saveSession, useSession } from './api.js';

const WEB_SIDE = 2000;   // côté le plus long de la version web
const THUMB_SIDE = 700;  // côté le plus long de la vignette

const slugify = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function formatDate(value) {
  if (!value) return 'Sans date';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = (text, tag) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(''), 1800);
    });
  };
  return [copied, copy];
}

/* ------------------------------------------------------------- connexion --- */

function Login({ onIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/admin/session', { method: 'POST', body: JSON.stringify({ password }) });
      saveSession('admin', data.token);
      onIn();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-login__panel" onSubmit={submit}>
        <img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" />
        <div className="adm-login__icon" aria-hidden="true"><Lock size={22} /></div>
        <h1>Administration</h1>
        <label>Mot de passe
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoFocus autoComplete="current-password" required />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-primary" type="submit" disabled={busy || !password}>
          {busy ? 'Vérification…' : 'Entrer'}
        </button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- la liste --- */

function CollectionList({ collections, onOpen, onNew, onDelete, query, setQuery }) {
  const shown = collections.filter((c) => `${c.client} ${c.title || ''}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <div className="adm-topbar">
        <h1>Collections</h1>
        <label className="adm-search">
          <MagnifyingGlass size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" aria-label="Rechercher une collection" />
        </label>
        <button className="adm-primary" type="button" onClick={onNew}><Plus size={17} weight="bold" /> Nouvelle collection</button>
      </div>

      {shown.length === 0 ? (
        <div className="adm-empty">
          <ImageIcon size={40} />
          <p>{collections.length === 0 ? 'Aucune collection pour l’instant.' : 'Aucun résultat.'}</p>
          {collections.length === 0 && <button className="adm-primary" type="button" onClick={onNew}><Plus size={17} weight="bold" /> Créer la première</button>}
        </div>
      ) : (
        <div className="adm-grid">
          {shown.map((c) => (
            <article className="adm-card" key={c.id}>
              <div className="adm-card__media">
                <button type="button" className="adm-card__cover" onClick={() => onOpen(c.slug)}>
                  {c.cover ? <img src={photoUrl(c.cover)} alt="" /> : <span className="adm-card__blank"><ImageIcon size={28} /></span>}
                </button>
                <button type="button" className="adm-card__del" onClick={() => onDelete(c)}
                  aria-label={`Supprimer la galerie de ${c.client}`} title="Supprimer cette galerie">
                  <Trash size={15} />
                </button>
              </div>
              <h2>{c.client}</h2>
              <p>
                <i className={c.status === 'publié' ? 'is-live' : ''} />
                {c.photoCount} photo{c.photoCount === 1 ? '' : 's'} · {c.status}
                {c.selectionCount > 0 && <strong className="adm-card__flag"> · sélection reçue</strong>}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------- création --- */

function NewCollection({ onCancel, onCreate }) {
  const [form, setForm] = useState({ client: '', title: '', eventDate: '', password: '', maxPicks: '', extraPrice: '25' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const slug = slugify(form.client);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreate(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="adm-form-wrap">
      <button className="adm-back" type="button" onClick={onCancel}><CaretLeft size={18} /> Retour</button>
      <h1>Créer une nouvelle collection</h1>
      <form className="adm-form" onSubmit={submit}>
        <label>Nom du client
          <input value={form.client} onChange={set('client')} placeholder="p. ex. : Jessie et Ryan" required autoFocus />
        </label>
        {slug && <p className="adm-hint">Adresse de la galerie : <code>behnjproductions.ca/galerie/{slug}</code></p>}
        <label>Titre de la séance <small>facultatif</small>
          <input value={form.title} onChange={set('title')} placeholder="p. ex. : Mariage au Vieux-Quai" />
        </label>
        <label>Date de l’événement
          <input type="date" value={form.eventDate} onChange={set('eventDate')} />
        </label>
        <label>Mot de passe de la galerie
          <input value={form.password} onChange={set('password')} placeholder="Laissez vide pour une galerie sans mot de passe" />
        </label>
        <label>Nombre de photos incluses <small>facultatif</small>
          <input type="number" min="1" value={form.maxPicks} onChange={set('maxPicks')} placeholder="p. ex. : 15" />
        </label>
        <label>Prix par photo supplémentaire ($ CAD)
          <input type="number" min="0" value={form.extraPrice} onChange={set('extraPrice')} placeholder="25" />
        </label>
        <p className="adm-hint">Le client peut dépasser le forfait; chaque photo en plus lui est facturée à ce prix, et le total apparaît dans le courriel de sélection.</p>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-primary" type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer la collection'}</button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- éditeur --- */

function Editor({ slug, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState(null); // { done, total }
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [copied, copy] = useCopy();
  const inputRef = useRef(null);

  const reload = useCallback(async () => {
    try { setData(await api(`/admin/collections/${slug}`)); } catch (err) { setError(err.message); }
  }, [slug]);
  useEffect(() => { reload(); }, [reload]);

  const patch = async (body) => {
    try {
      const { collection } = await api(`/admin/collections/${slug}`, { method: 'PATCH', body: JSON.stringify(body) });
      setData((d) => ({ ...d, collection }));
      onChanged(collection);
      return collection;
    } catch (err) { setError(err.message); return null; }
  };

  const addFiles = useCallback(async (files) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setError('');
    setUpload({ done: 0, total: images.length });

    for (let i = 0; i < images.length; i += 1) {
      const file = images[i];
      try {
        const web = await prepareImage(file, WEB_SIDE, 0.82);
        const thumb = await prepareImage(file, THUMB_SIDE, 0.75);
        const form = new FormData();
        form.append('filename', file.name);
        form.append('width', String(web.width));
        form.append('height', String(web.height));
        form.append('web', web.blob, 'web.jpg');
        form.append('thumb', thumb.blob, 'thumb.jpg');
        await api(`/admin/collections/${slug}/photos`, { method: 'POST', body: form });
      } catch (err) {
        setError(`${file.name} : ${err.message}`);
      }
      setUpload({ done: i + 1, total: images.length });
    }

    setUpload(null);
    reload();
  }, [slug, reload]);

  const removePhoto = async (photo) => {
    if (!window.confirm(`Retirer ${photo.filename || 'cette photo'} de la galerie?`)) return;
    try {
      await api(`/admin/photos/${photo.id}`, { method: 'DELETE' });
      reload();
    } catch (err) { setError(err.message); }
  };

  const removeCollection = async () => {
    const c = data.collection;
    if (!window.confirm(`Supprimer définitivement la galerie de ${c.client} et ses ${data.photos.length} photos?`)) return;
    try {
      await api(`/admin/collections/${slug}`, { method: 'DELETE' });
      onBack(true);
    } catch (err) { setError(err.message); }
  };

  if (!data) return <p className="adm-empty">{error || 'Chargement…'}</p>;

  const c = data.collection;
  const link = `${window.location.origin}/galerie/${c.slug}`;
  const selection = data.selections[0];

  return (
    <div className="adm-editor">
      <div className="adm-editor__bar">
        <button className="adm-back" type="button" onClick={() => onBack(false)}><CaretLeft size={18} /> Collections</button>
        <div className="adm-editor__title">
          <h1>{c.client}</h1>
          <span>{[c.title, formatDate(c.date)].filter(Boolean).join(' · ')}</span>
        </div>
        <span className={`adm-tag ${c.status === 'publié' ? 'is-live' : ''}`}>{c.status}</span>
        <div className="adm-editor__actions">
          <a className="adm-ghost" href={`/galerie/${c.slug}`} target="_blank" rel="noreferrer">Aperçu</a>
          <button className="adm-ghost" type="button" onClick={() => setSettings((s) => !s)}>Réglages</button>
          <button className="adm-primary" type="button"
            onClick={() => patch({ status: c.status === 'publié' ? 'brouillon' : 'publié' })}>
            {c.status === 'publié' ? 'Dépublier' : 'Publier'}
          </button>
        </div>
      </div>

      {error && <p className="adm-error" role="alert">{error}</p>}

      <div className="adm-editor__body">
        {/* Lien à envoyer au client */}
        <div className="adm-link">
          <div>
            <span className="adm-link__label">Lien à envoyer au client</span>
            <code>{link}</code>
          </div>
          <button className="adm-ghost" type="button" onClick={() => copy(link, 'lien')}>
            {copied === 'lien' ? <><Check size={16} weight="bold" /> Copié</> : <><Copy size={16} /> Copier</>}
          </button>
          <span className="adm-link__lock">
            {c.hasPassword ? <><Lock size={14} /> protégée par mot de passe</> : 'sans mot de passe'}
          </span>
        </div>

        {settings && <Settings collection={c} onSave={patch} onDelete={removeCollection} />}

        {selection && <Selection selection={selection} collection={c} copied={copied} copy={copy} />}

        <h2>Photos <small>{data.photos.length}</small></h2>

        <div className={`adm-drop ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
          <UploadSimple size={34} />
          <p><strong>Glissez vos photos ici</strong></p>
          <p className="adm-hint">Elles sont réduites sur votre ordinateur avant l’envoi : les originaux restent chez vous.</p>
          <button className="adm-ghost" type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(upload)}>
            Choisir depuis l’ordinateur
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          {upload && (
            <div className="adm-progress">
              <div className="adm-progress__bar"><i style={{ width: `${(upload.done / upload.total) * 100}%` }} /></div>
              <span>{upload.done} / {upload.total} photos envoyées</span>
            </div>
          )}
        </div>

        {data.photos.length > 0 && (
          <div className="adm-photos">
            {data.photos.map((p) => (
              <figure key={p.id} className={c.cover === p.id ? 'is-cover' : ''}>
                <img src={photoUrl(p.id)} alt="" loading="lazy" />
                <button type="button" className="adm-photos__del" onClick={() => removePhoto(p)}
                  aria-label={`Retirer ${p.filename || 'la photo'}`}><X size={14} weight="bold" /></button>
                <button type="button" className="adm-photos__cover" onClick={() => patch({ cover: p.id })}
                  aria-label="Choisir comme couverture" title="Photo de couverture">
                  <Star size={14} weight={c.cover === p.id ? 'fill' : 'regular'} />
                </button>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- réglages --- */

function Settings({ collection, onSave, onDelete }) {
  const [form, setForm] = useState({
    client: collection.client,
    title: collection.title || '',
    eventDate: collection.date || '',
    slug: collection.slug,
    maxPicks: collection.maxPicks || '',
    extraPrice: collection.extraPrice ?? 25,
    password: '',
  });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const body = {
      client: form.client, title: form.title, eventDate: form.eventDate,
      slug: form.slug, maxPicks: form.maxPicks, extraPrice: form.extraPrice,
    };
    if (form.password.trim()) body.password = form.password.trim();
    if (await onSave(body)) {
      setSaved(true);
      setForm((f) => ({ ...f, password: '' }));
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <form className="adm-settings" onSubmit={submit}>
      <div className="adm-settings__row">
        <label>Nom du client<input value={form.client} onChange={set('client')} required /></label>
        <label>Titre<input value={form.title} onChange={set('title')} /></label>
      </div>
      <div className="adm-settings__row">
        <label>Date<input type="date" value={form.eventDate} onChange={set('eventDate')} /></label>
        <label>Adresse (slug)<input value={form.slug} onChange={set('slug')} /></label>
      </div>
      <div className="adm-settings__row">
        <label>Photos incluses<input type="number" min="1" value={form.maxPicks} onChange={set('maxPicks')} /></label>
        <label>Prix par photo supplémentaire ($)<input type="number" min="0" value={form.extraPrice} onChange={set('extraPrice')} /></label>
      </div>
      <div className="adm-settings__row">
        <label>Nouveau mot de passe
          <input value={form.password} onChange={set('password')}
            placeholder={collection.hasPassword ? 'Laisser vide pour ne pas changer' : 'Aucun mot de passe'} />
        </label>
      </div>
      <div className="adm-settings__foot">
        <button className="adm-primary" type="submit">{saved ? 'Enregistré' : 'Enregistrer'}</button>
        {collection.hasPassword && (
          <button className="adm-ghost" type="button" onClick={() => onSave({ password: '' })}>Retirer le mot de passe</button>
        )}
        <button className="adm-danger" type="button" onClick={onDelete}><Trash size={16} /> Supprimer la galerie</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------- sélection --- */

function Selection({ selection, collection, copied, copy }) {
  const client = collection.client;
  const names = selection.photos.map((p) => p.filename).join('\n');
  const included = collection.maxPicks || 0;
  const price = collection.extraPrice ?? 25;
  const extras = included ? Math.max(0, selection.photos.length - included) : 0;

  const download = () => {
    const blob = new Blob([names], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selection-${slugify(client)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="adm-selection">
      <header>
        <h2>Sélection du client <small>{selection.photos.length} photos</small></h2>
        <div>
          <button className="adm-ghost" type="button" onClick={() => copy(names, 'sel')}>
            {copied === 'sel' ? <><Check size={16} weight="bold" /> Copié</> : <><Copy size={16} /> Copier la liste</>}
          </button>
          <button className="adm-ghost" type="button" onClick={download}><DownloadSimple size={16} /> Télécharger</button>
        </div>
      </header>
      {extras > 0 && (
        <p className="adm-selection__extra">
          {extras} photo{extras > 1 ? 's' : ''} au-delà du forfait de {included} —
          {' '}{extras} × {price} $ = <strong>{extras * price} $ CAD à facturer</strong>
        </p>
      )}
      {selection.note && <p className="adm-selection__note">« {selection.note} »</p>}
      <ul className="adm-selection__list">
        {selection.photos.map((p) => <li key={p.id}>{p.filename}</li>)}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- coquille --- */

export function AdminPage() {
  useSession('admin');
  const [session, setSession] = useState('inconnue'); // inconnue | absente | ouverte
  const [collections, setCollections] = useState([]);
  const [view, setView] = useState({ name: 'list' });
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    const { collections: list } = await api('/admin/collections');
    setCollections(list);
  }, []);

  const enter = useCallback(async () => {
    try {
      await refresh();
      setSession('ouverte');
    } catch { setSession('absente'); }
  }, [refresh]);

  useEffect(() => { enter(); }, [enter]);

  if (session === 'inconnue') return <p className="adm-empty">Chargement…</p>;
  if (session === 'absente') return <Login onIn={enter} />;

  const create = async (form) => {
    const { collection } = await api('/admin/collections', { method: 'POST', body: JSON.stringify(form) });
    setCollections((prev) => [collection, ...prev]);
    setView({ name: 'editor', slug: collection.slug });
  };

  const remove = async (c) => {
    if (!window.confirm(`Supprimer définitivement la galerie de ${c.client} et ses ${c.photoCount} photos?\n\nCette action est irréversible.`)) return;
    try {
      await api(`/admin/collections/${c.slug}`, { method: 'DELETE' });
      setCollections((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      window.alert(`Impossible de supprimer : ${err.message}`);
    }
  };

  const logout = async () => {
    await api('/admin/session', { method: 'DELETE' }).catch(() => {});
    clearSession('admin');
    setSession('absente');
  };

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></div>
        <nav aria-label="Sections">
          <button type="button" className="is-active" onClick={() => { setView({ name: 'list' }); refresh(); }}>
            <ImageIcon size={19} /> Collections
          </button>
        </nav>
        <div className="adm-side__foot">
          <a className="adm-side__home" href="/">← Voir le site</a>
          <button className="adm-side__out" type="button" onClick={logout}><SignOut size={16} /> Se déconnecter</button>
        </div>
      </aside>

      <main className="adm-main">
        {view.name === 'list' && (
          <CollectionList collections={collections} query={query} setQuery={setQuery}
            onNew={() => setView({ name: 'new' })} onOpen={(slug) => setView({ name: 'editor', slug })}
            onDelete={remove} />
        )}
        {view.name === 'new' && <NewCollection onCancel={() => setView({ name: 'list' })} onCreate={create} />}
        {view.name === 'editor' && (
          <Editor slug={view.slug}
            onBack={() => { setView({ name: 'list' }); refresh(); }}
            onChanged={(collection) => {
              setCollections((prev) => prev.map((c) => (c.id === collection.id ? { ...c, ...collection } : c)));
              if (collection.slug !== view.slug) setView({ name: 'editor', slug: collection.slug });
            }} />
        )}
      </main>
    </div>
  );
}

export default AdminPage;
