import { useCallback, useEffect, useRef, useState } from 'react';
import { CaretLeft, DotsThree, Image as ImageIcon, MagnifyingGlass, Plus, UploadSimple, X } from '@phosphor-icons/react';

const STORE = 'bjp-collections';

function load() {
  try { return JSON.parse(window.localStorage.getItem(STORE) || '[]'); } catch { return []; }
}
function save(list) {
  try { window.localStorage.setItem(STORE, JSON.stringify(list)); } catch { /* navigation privée */ }
}
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'collection';

function formatDate(iso) {
  if (!iso) return 'Sans date';
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- Liste des collections ---------- */
function CollectionList({ collections, onOpen, onNew, query, setQuery }) {
  const shown = collections.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
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
              <button type="button" className="adm-card__cover" onClick={() => onOpen(c.id)}>
                {c.cover ? <img src={c.cover} alt="" /> : <span className="adm-card__blank"><ImageIcon size={28} /></span>}
                <span className="adm-card__more" aria-hidden="true"><DotsThree size={20} weight="bold" /></span>
              </button>
              <h2>{c.name}</h2>
              <p><i className={c.status === 'publié' ? 'is-live' : ''} />{c.photos.length} élément{c.photos.length === 1 ? '' : 's'} · {c.status}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Formulaire de création ---------- */
function NewCollection({ onCancel, onCreate }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [watermark, setWatermark] = useState('Aucun filigrane');

  return (
    <div className="adm-form-wrap">
      <button className="adm-back" type="button" onClick={onCancel}><CaretLeft size={18} /> Retour</button>
      <h1>Créer une nouvelle collection</h1>
      <form className="adm-form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate({ name: name.trim(), date, watermark }); }}>
        <label>Nom de la collection
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="p. ex. : Jessie et Ryan" required autoFocus />
        </label>
        <label>Date de l’événement
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>Filigrane
          <select value={watermark} onChange={(e) => setWatermark(e.target.value)}>
            <option>Aucun filigrane</option>
            <option>Behn J. Productions — coin</option>
            <option>Behn J. Productions — centre</option>
          </select>
        </label>
        <button className="adm-primary" type="submit">Créer la collection</button>
      </form>
    </div>
  );
}

/* ---------- Éditeur d'une collection ---------- */
function Editor({ collection, onBack, onChange }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((files) => {
    const images = [...files].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    const added = images.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      // Aperçu local uniquement : l'URL disparaît au rechargement tant que
      // le stockage R2 n'est pas branché.
      src: URL.createObjectURL(f),
      pending: true,
    }));
    onChange({ ...collection, photos: [...collection.photos, ...added] });
  }, [collection, onChange]);

  const removePhoto = (id) => onChange({ ...collection, photos: collection.photos.filter((p) => p.id !== id) });

  return (
    <div className="adm-editor">
      <div className="adm-editor__bar">
        <button className="adm-back" type="button" onClick={onBack}><CaretLeft size={18} /> Collections</button>
        <div className="adm-editor__title">
          <h1>{collection.name}</h1>
          <span>{formatDate(collection.date)}</span>
        </div>
        <span className={`adm-tag ${collection.status === 'publié' ? 'is-live' : ''}`}>{collection.status}</span>
        <div className="adm-editor__actions">
          <a className="adm-ghost" href="/galerie" target="_blank" rel="noreferrer">Aperçu</a>
          <button className="adm-primary" type="button"
            onClick={() => onChange({ ...collection, status: collection.status === 'publié' ? 'brouillon' : 'publié' })}>
            {collection.status === 'publié' ? 'Dépublier' : 'Publier'}
          </button>
        </div>
      </div>

      <div className="adm-editor__body">
        <h2>Photos <small>{collection.photos.length}</small></h2>

        <div className={`adm-drop ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
          <UploadSimple size={34} />
          <p><strong>Glissez vos photos ici</strong></p>
          <button className="adm-ghost" type="button" onClick={() => inputRef.current?.click()}>Choisir depuis l’ordinateur</button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        {collection.photos.length > 0 && (
          <div className="adm-photos">
            {collection.photos.map((p) => (
              <figure key={p.id}>
                <img src={p.src} alt="" />
                <button type="button" onClick={() => removePhoto(p.id)} aria-label={`Retirer ${p.name}`}><X size={14} weight="bold" /></button>
                {p.pending && <span className="adm-photos__pending">non enregistrée</span>}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Coquille ---------- */
export function AdminPage() {
  const [collections, setCollections] = useState(load);
  const [view, setView] = useState({ name: 'list' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    // On ne conserve pas les aperçus locaux : leurs URL ne survivent pas au rechargement.
    save(collections.map((c) => ({ ...c, photos: c.photos.filter((p) => !p.pending) })));
  }, [collections]);

  const create = ({ name, date, watermark }) => {
    const item = { id: `${Date.now()}`, slug: slugify(name), name, date, watermark, status: 'brouillon', cover: null, photos: [] };
    setCollections((prev) => [item, ...prev]);
    setView({ name: 'editor', id: item.id });
  };

  const update = (next) => setCollections((prev) => prev.map((c) => (c.id === next.id
    ? { ...next, cover: next.photos[0]?.src || null } : c)));

  const current = view.name === 'editor' ? collections.find((c) => c.id === view.id) : null;

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand"><img src="/assets/behn-j-logo-transparent.png" alt="Behn J. Productions" /></div>
        <nav aria-label="Sections">
          <button type="button" className="is-active"><ImageIcon size={19} /> Collections</button>
        </nav>
        <a className="adm-side__home" href="/">← Voir le site</a>
      </aside>

      <main className="adm-main">
        {view.name === 'list' && (
          <CollectionList collections={collections} query={query} setQuery={setQuery}
            onNew={() => setView({ name: 'new' })} onOpen={(id) => setView({ name: 'editor', id })} />
        )}
        {view.name === 'new' && <NewCollection onCancel={() => setView({ name: 'list' })} onCreate={create} />}
        {view.name === 'editor' && current && (
          <Editor collection={current} onBack={() => setView({ name: 'list' })} onChange={update} />
        )}
        {view.name === 'editor' && !current && <p className="adm-empty">Collection introuvable.</p>}
      </main>
    </div>
  );
}

export default AdminPage;
