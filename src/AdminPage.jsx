import { PHOTO_CATEGORIES, categoryPhotos } from './gallery-categories.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, CaretLeft, Check, Copy, DownloadSimple, EnvelopeSimple, Image as ImageIcon, Lock,
  MagnifyingGlass, Plus, SignOut, Star, Trash, UploadSimple, Warning, X,
} from '@phosphor-icons/react';
import { api, clearSession, photoUrl, prepareImage, saveSession, useSession } from './api.js';
import './admin-cinema.css';

const SESSION_TYPES = ['Mariage', 'Corporatif', 'Famille', 'Maternité', 'Nouveau-né', 'Portrait', 'Couple', 'Événement', 'Scolaire', 'Immobilier'];

function SessionTitle({ value, onChange, disabled = false }) {
  const [custom, setCustom] = useState(() => Boolean(value && !SESSION_TYPES.includes(value)));
  return <div className="adm-session-title">
    <label><span>Titre de la séance <small>facultatif</small></span>
      <select value={custom ? 'custom' : value} disabled={disabled} onChange={(event) => {
        const next = event.target.value;
        setCustom(next === 'custom');
        onChange({ target: { value: next === 'custom' ? '' : next } });
      }}>
        <option value="">Choisir un type de séance</option>
        {SESSION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        <option value="custom">Autre — titre personnalisé</option>
      </select>
    </label>
    {custom && <label>Titre personnalisé
      <input value={value} onChange={onChange} disabled={disabled} placeholder="p. ex. : Mariage au Vieux-Quai" />
    </label>}
  </div>;
}

const WEB_SIDE = 2000;   // côté le plus long de la version web
const THUMB_SIDE = 700;  // côté le plus long de la vignette
const ORIGINAL_MAX_BYTES = 75 * 1024 * 1024;
const DOWNLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Certains navigateurs (et certains exports macOS/Windows) ne remplissent pas
// file.type pour un JPEG ou un PNG pourtant valide : on retombe sur
// l'extension du nom de fichier avant de refuser l'envoi.
const DOWNLOAD_EXT_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
function resolvedDownloadType(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return DOWNLOAD_TYPES.has(file.type) ? file.type : DOWNLOAD_EXT_TYPES[ext] || null;
}

function downloadFileIssue(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const type = resolvedDownloadType(file);
  if (!type) return `n'est pas reconnu comme JPEG, PNG ou WebP (format détecté : ${file.type || 'inconnu, à partir de .' + (ext || '?')})`;
  if (!file.size) return 'est vide';
  if (file.size > ORIGINAL_MAX_BYTES) return `pèse ${(file.size / (1024 * 1024)).toFixed(1)} Mo, la limite est de 75 Mo`;
  return null;
}

const modeLabel = (mode) => mode === 'download' ? 'Pour télécharger' : 'Pour sélectionner';

function GalleryMode({ value, onChange, collectionType, onTypeChange, disabled = false }) {
  const school = collectionType === 'school';
  const chooseMode = (event) => {
    onTypeChange({ target: { value: 'standard' } });
    onChange(event);
  };
  const choices = (nested = false) => <div className="adm-mode-choice__options">
    {['selection', 'download'].map((mode) => <label key={mode} className={(nested || !school) && value === mode ? 'is-selected' : ''}>
      <input type="radio" name={nested ? 'school-mode' : 'collection-experience'} value={mode} checked={(nested || !school) && value === mode} onChange={nested ? onChange : chooseMode} />
      <span><strong>{modeLabel(mode)}</strong><span>{mode === 'selection' ? 'Le client choisit ses photos et confirme sa sélection.' : 'Le client télécharge les photos livrées, sans envoyer de sélection.'}</span></span>
    </label>)}
    {!nested && <label className={school ? 'is-selected' : ''}>
      <input type="radio" name="collection-experience" value="school" checked={school} onChange={onTypeChange} />
      <span><strong>École</strong><span>Une collection scolaire pour sélectionner ou télécharger les photos.</span></span>
    </label>}
  </div>;
  return <fieldset className="adm-mode-choice" disabled={disabled}>
    <legend>Que doit faire le client?</legend>
    {choices()}
    {school && <fieldset className="adm-mode-choice adm-school-choice"><legend>École — choisissez l’expérience</legend>{choices(true)}</fieldset>}
    {value === 'download' && <p className="adm-hint">Toutes les photos de cette galerie seront accessibles au téléchargement.</p>}
  </fieldset>;
}

function WebCopiesNotice({ count }) {
  if (!count) return null;
  return <p className="adm-download-notice"><Warning size={18} /><span>{count} photo{count > 1 ? 's' : ''} {count > 1 ? 'ont seulement une version web' : 'a seulement une version web'} (2 000 px maximum). Cette version sera proposée au téléchargement. Ajoutez les fichiers finaux pour livrer leur pleine résolution.</span></p>;
}

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
    <div className="admin-cinema adm-login">
      <header className="adm-login__masthead">
        <a className="adm-wordmark" href="/">BEHN J. PRODUCTIONS</a>
        <span className="adm-studio-label">Espace studio</span>
      </header>
      <main className="adm-login__layout">
        <div className="adm-login__intro">
          <p className="adm-eyebrow">L’art de livrer vos images</p>
          <h1>Votre regard.<br /><em>Votre studio.</em></h1>
          <p>Un espace pour vos collections,<br />et les instants qui comptent.</p>
          <span className="adm-login__signature">Photographie &amp; films</span>
        </div>
        <form className="adm-login__panel" onSubmit={submit}>
          <div className="adm-login__icon" aria-hidden="true"><Lock size={21} weight="light" /></div>
          <p className="adm-eyebrow">Accès privé</p>
          <h2>Bienvenue au studio.</h2>
          <p className="adm-login__description">Retrouvez vos galeries et les sélections de vos clients.</p>
          <label>Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe" autoFocus autoComplete="current-password" required />
          </label>
          {error && <p className="adm-error" role="alert">{error}</p>}
          <button className="adm-primary" type="submit" disabled={busy || !password}>
            {busy ? 'Vérification…' : 'Entrer dans le studio'} <ArrowRight size={20} />
          </button>
        </form>
      </main>
      <footer className="adm-login__footer"><span>Behn J. Productions</span><span>Administration des galeries</span></footer>
    </div>
  );
}

/* --------------------------------------------------------------- la liste --- */

function CollectionList({ collections, onOpen, onNew, onDelete, query, setQuery }) {
  const shown = collections.filter((c) => `${c.client} ${c.title || ''}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <header className="adm-overview">
        <div>
          <p className="adm-eyebrow">Votre espace de création</p>
          <h1>Les collections<span>.</span></h1>
          <p className="adm-overview__lead">Vos images. Leur histoire.</p>
        </div>
        <button className="adm-primary" type="button" onClick={onNew}><Plus size={18} /> Nouvelle collection</button>
      </header>
      <div className="adm-topbar">
        <p className="adm-collection-count">Toutes les collections <span>{String(collections.length).padStart(2, '0')}</span></p>
        <label className="adm-search">
          <MagnifyingGlass size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une collection" aria-label="Rechercher une collection" />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="adm-empty">
          <ImageIcon size={40} />
          <p>{collections.length === 0 ? 'Aucune collection pour l’instant.' : 'Aucun résultat.'}</p>
          {collections.length === 0 && <button className="adm-primary" type="button" onClick={onNew}><Plus size={17} weight="bold" /> Créer la première</button>}
        </div>
      ) : (
        <div className="adm-grid">
          {shown.map((c, index) => (
            <article className="adm-card" key={c.id}>
              <div className="adm-card__media">
                <button type="button" className="adm-card__cover" onClick={() => onOpen(c.slug)} aria-label={`Ouvrir la collection de ${c.client}`}>
                  {c.cover ? <img src={photoUrl(c.cover)} alt="" loading="lazy" /> : <span className="adm-card__blank"><ImageIcon size={40} weight="thin" /><span>Votre prochaine histoire</span></span>}
                  <span className="adm-card__open">Ouvrir la collection <ArrowUpRight size={20} /></span>
                </button>
                <button type="button" className="adm-card__del" onClick={() => onDelete(c)}
                  aria-label={`Supprimer la galerie de ${c.client}`} title="Supprimer cette galerie">
                  <Trash size={15} />
                </button>
              </div>
              <div className="adm-card__details">
                <div className="adm-card__meta"><span>{String(index + 1).padStart(2, '0')}</span><span>{c.photoCount} photo{c.photoCount === 1 ? '' : 's'}</span><span className={`adm-tag ${c.status === 'publié' ? 'is-live' : ''}`}>{c.status}</span></div>
                <h2><button type="button" onClick={() => onOpen(c.slug)}>{c.client}<ArrowUpRight size={22} weight="light" /></button></h2>
                <p>{c.title || 'Collection privée'}{c.selectionCount > 0 && <strong className="adm-card__flag"><Check size={13} /> Sélection reçue</strong>}</p>
                <span className="adm-mode-badge">{c.collectionType === 'school' ? 'École · ' : ''}{modeLabel(c.mode)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------- création --- */

function NewCollection({ onCancel, onCreate }) {
  const [form, setForm] = useState({ client: '', title: '', eventDate: '', password: '', collectionType: 'standard', mode: 'selection', maxPicks: '', extraPrice: '25' });
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
      <button className="adm-back" type="button" onClick={onCancel}><CaretLeft size={18} /> Collections</button>
      <header className="adm-form-heading">
        <p className="adm-eyebrow">Une nouvelle histoire</p>
        <h1>Créer une collection.</h1>
        <p>Préparez un espace personnel pour les images de votre client.</p>
      </header>
      <form className="adm-form" onSubmit={submit}>
        <fieldset className="adm-form-section">
          <legend><span>01</span> La séance</legend>
          <div className="adm-settings__row">
            <label>Nom du client
              <input value={form.client} onChange={set('client')} placeholder="p. ex. : Jessie et Ryan" required autoFocus />
            </label>
            <SessionTitle value={form.title} onChange={set('title')} disabled={busy} />
          </div>
          <label>Date de l’événement
            <input type="date" value={form.eventDate} onChange={set('eventDate')} />
          </label>
          {slug && <p className="adm-hint">Adresse de la galerie : <code>behnjproductions.ca/galerie/{slug}</code></p>}
        </fieldset>
        <fieldset className="adm-form-section">
          <legend><span>02</span> L’expérience client</legend>
          <GalleryMode collectionType={form.collectionType} onTypeChange={set('collectionType')} value={form.mode} onChange={set('mode')} disabled={busy} />
          <label>Mot de passe de la galerie
            <input value={form.password} onChange={set('password')} placeholder="Laissez vide pour un accès sans mot de passe" />
          </label>
          {form.mode === 'selection' && <><div className="adm-settings__row">
            <label><span>Nombre de photos incluses <small>facultatif</small></span>
              <input type="number" min="1" value={form.maxPicks} onChange={set('maxPicks')} placeholder="p. ex. : 15" />
            </label>
            <label>Photo supplémentaire ($ CAD)
              <input type="number" min="0" value={form.extraPrice} onChange={set('extraPrice')} placeholder="25" />
            </label>
          </div>
          <p className="adm-hint">Les photos choisies au-delà du forfait sont calculées à ce prix. Le total apparaît dans le courriel de sélection.</p></>}
        </fieldset>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <div className="adm-form__footer"><button className="adm-ghost" type="button" onClick={onCancel}>Annuler</button><button className="adm-primary" type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer la collection'}<ArrowRight size={19} /></button></div>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- éditeur --- */

function SchoolNavigator({ data, groupId, studentId, onGroup, onStudent, onCreate, busy }) {
  const [name, setName] = useState('');
  const group = data.groups?.find((g) => g.id === groupId);
  const student = data.students?.find((s) => s.id === studentId);
  const students = (data.students || []).filter((s) => s.groupId === groupId);
  const create = async (event) => {
    event.preventDefault();
    if (await onCreate(group ? 'students' : 'groups', name)) setName('');
  };
  return <section className="adm-school" aria-label="Organisation scolaire">
    <nav className="adm-school__breadcrumbs" aria-label="Navigation scolaire">
      <button className="adm-back" type="button" disabled={busy} onClick={() => { onGroup(null); onStudent(null); setName(''); }}>Tous les groupes</button>
      {group && <><span>›</span><button className="adm-back" type="button" disabled={busy} onClick={() => { onStudent(null); setName(''); }}>{group.name}</button></>}
      {student && <><span>›</span><span>{student.name}</span></>}
    </nav>
    <div className="adm-section-heading"><div><p className="adm-eyebrow">École · {student ? 'Les photos de l’élève' : group ? 'Les élèves du groupe' : 'Les groupes de la collection'}</p><h2>{student?.name || group?.name || 'Les groupes'}</h2></div></div>
    {student ? <button className="adm-ghost" type="button" disabled={busy} onClick={() => onStudent(null)}><CaretLeft size={17} /> Retour au groupe</button> : <>
      <form className="adm-school__create adm-settings" onSubmit={create}>
        <label>{group ? 'Nom de l’élève' : 'Nom du groupe'}<input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required disabled={busy} placeholder={group ? 'p. ex. : Ana Tremblay' : 'p. ex. : Groupe 101'} /></label>
        <button className="adm-primary" type="submit" disabled={busy || !name.trim()}><Plus size={17} /> {group ? 'Créer un élève' : 'Créer un groupe'}</button>
      </form>
      <div className="adm-school__cards">
        {(group ? students : data.groups || []).map((item) => <button className="adm-school__card" type="button" key={item.id} disabled={busy} onClick={() => { setName(''); group ? onStudent(item.id) : onGroup(item.id); }}>
          <strong>{item.name}</strong><span>{group ? `${data.photos.filter((p) => p.studentId === item.id).length} photo${data.photos.filter((p) => p.studentId === item.id).length === 1 ? '' : 's'}` : `${(data.students || []).filter((s) => s.groupId === item.id).length} élèves`}</span><span>{group ? 'Ouvrir l’élève →' : 'Ouvrir le groupe →'}</span>
        </button>)}
      </div>
      {(group ? students : data.groups || []).length === 0 && <p className="adm-hint">{group ? 'Créez le premier élève de ce groupe.' : 'Créez votre premier groupe, puis ajoutez ses élèves.'}</p>}
    </>}
  </section>;
}

function Editor({ slug, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState(null); // { done, total }
  const [saving, setSaving] = useState(false);
  const [proofProgress, setProofProgress] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [groupId, setGroupId] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [copied, copy] = useCopy();
  const inputRef = useRef({});
  const coverInputRef = useRef(null);
  const uploadRef = useRef(false);
  const savingRef = useRef(false);

  const reload = useCallback(async () => {
    try { setData(await api(`/admin/collections/${slug}`)); } catch (err) { setError(err.message); }
  }, [slug]);
  useEffect(() => { reload(); }, [reload]);

  const patch = async (body) => {
    if (uploadRef.current || savingRef.current) return null;
    savingRef.current = true;
    setSaving(true);
    try {
      const { collection } = await api(`/admin/collections/${slug}`, { method: 'PATCH', body: JSON.stringify(body) });
      setData((d) => ({ ...d, collection }));
      onChanged(collection);
      return collection;
    } catch (err) { setError(err.message); return null; }
    finally { savingRef.current = false; setSaving(false); }
  };

  const addFiles = useCallback(async (files, category = 'full') => {
    if (uploadRef.current || savingRef.current || !data) return;
    if (data.collection.collectionType === 'school' && !studentId) { setError('Ouvrez un élève avant d’ajouter des photos.'); return; }
    const images = [...files];
    if (!images.length) return;
    const downloadMode = true; // Preserve supplied final files in every category.
    if (downloadMode) {
      let invalidMessage = null;
      for (const file of images) {
        const issue = downloadFileIssue(file);
        if (issue) { invalidMessage = `${file.name} : ${issue}.`; break; }
      }
      if (invalidMessage) { setError(invalidMessage); return; }
    }
    uploadRef.current = true;
    setError('');
    setUpload({ done: 0, total: images.length, category });

    // Envoyer les photos en parallèle (par lots) plutôt qu'une à la fois : la
    // majorité du temps est passée à attendre le réseau, alors traiter plusieurs
    // fichiers en même temps utilise beaucoup mieux la connexion et accélère
    // nettement l'envoi de grandes séries de photos.
    const UPLOAD_CONCURRENCY = 3;
    let doneCount = 0;
    let nextIndex = 0;
    const uploadOne = async (file) => {
      try {
        const web = await prepareImage(file, WEB_SIDE, 0.82);
        const thumb = await prepareImage(file, THUMB_SIDE, 0.75);
        const form = new FormData();
        form.append('filename', file.name);
        form.append('category', category);
        if (data.collection.collectionType === 'school') form.append('studentId', studentId);
        form.append('width', String(web.width));
        form.append('height', String(web.height));
        form.append('web', web.blob, 'web.jpg');
        form.append('thumb', thumb.blob, 'thumb.jpg');
        if (downloadMode) {
          // Le navigateur ne rapporte pas toujours le bon type MIME (file.type)
          // même pour un JPEG/PNG/WebP valide : on renvoie le fichier avec le type
          // déduit de son extension, sinon le serveur le refuse malgré l'aperçu
          // qui, lui, se fie à l'extension.
          const correctedType = resolvedDownloadType(file);
          const original = correctedType && correctedType !== file.type
            ? new File([file], file.name, { type: correctedType })
            : file;
          form.append('original', original, file.name);
        }
        const result = await api(`/admin/collections/${slug}/photos`, { method: 'POST', body: form });
        if (data.collection.collectionType === 'school' && data.collection.mode !== 'download') {
          const proof = await prepareImage(file, 1200, 0.78, true);
          const proofForm = new FormData(); proofForm.append('proof', proof.blob, 'proof.jpg');
          await api(`/admin/collections/${slug}/proof/${result.photo.id}`, { method: 'POST', body: proofForm });
        }
      } catch (err) {
        setError(`${file.name} : ${err.message}`);
      }
      doneCount += 1;
      setUpload({ done: doneCount, total: images.length, category });
    };
    const worker = async () => {
      while (nextIndex < images.length) {
        const file = images[nextIndex];
        nextIndex += 1;
        await uploadOne(file);
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, images.length) }, worker));

    uploadRef.current = false;
    setUpload(null);
    reload();
  }, [slug, reload, data, studentId]);

  const protectPhotos = async () => {
    if (uploadRef.current || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      for (let i = 0; i < data.photos.length; i++) {
        const photo = data.photos[i]; setProofProgress(`${i + 1} / ${data.photos.length}`);
        const response = await fetch(photoUrl(photo.id, 'web'), { credentials: 'include' });
        if (!response.ok) throw new Error('Impossible de lire la photo.');
        const proof = await prepareImage(await response.blob(), 1200, 0.78, true);
        const form = new FormData(); form.append('proof', proof.blob, 'proof.jpg');
        await api(`/admin/collections/${slug}/proof/${photo.id}`, { method: 'POST', body: form });
      }
      setProofProgress(`${data.photos.length} photos protégées`);
    } catch (err) { setError(err.message); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const verifyProofs = async () => {
    if (uploadRef.current || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      const status = await api(`/admin/collections/${slug}/proof-status`);
      setProofProgress(`${status.protected} / ${status.total} photos protégées · ${status.missing} manquante(s)`);
    } catch (err) { setError(err.message); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const uploadCover = async (file) => {
    if (!file || uploadRef.current || savingRef.current) return;
    const issue = downloadFileIssue(file);
    if (issue) { setError(issue); return; }
    savingRef.current = true; setSaving(true); setError('');
    try {
      const image = await prepareImage(file, THUMB_SIDE, 0.85);
      const form = new FormData(); form.append('image', image.blob, 'cover.jpg');
      const { collection } = await api(`/admin/collections/${slug}/cover`, { method: 'POST', body: form });
      setData((d) => ({ ...d, collection: { ...d.collection, cover: collection.cover } }));
      onChanged(collection);
    } catch (err) { setError(err.message); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const createSchoolEntity = async (kind, name) => {
    if (uploadRef.current || savingRef.current) return false;
    savingRef.current = true;
    setSaving(true); setError('');
    try {
      const result = await api(`/admin/collections/${slug}/${kind}`, { method: 'POST', body: JSON.stringify({ name: name.trim(), ...(kind === 'students' ? { groupId } : {}) }) });
      await reload();
      if (kind === 'groups') { setGroupId(result.group.id); setStudentId(null); }
      else setStudentId(result.student.id);
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { savingRef.current = false; setSaving(false); }
  };

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
  const school = c.collectionType === 'school';
  const student = data.students?.find((s) => s.id === studentId);
  const visiblePhotos = school ? data.photos.filter((p) => p.studentId === studentId && studentId) : data.photos;
  const link = `${window.location.origin}/galerie/${student?.slug || c.slug}`;
  const preview = new URLSearchParams(window.location.search).get('apercu') === 'clair' ? '?apercu=clair' : '';
  const downloadMode = c.mode === 'download';
  const webPhotoCount = visiblePhotos.filter((p) => p.downloadQuality !== 'original').length;
  const selectionEntries = combineSelections(school ? data.selections.filter((s) => s.studentId === studentId && studentId) : data.selections, c.slug === 'metal-7');

  return (
    <div className="adm-editor">
      <div className="adm-editor__navigation">
        <button className="adm-back" type="button" onClick={() => onBack(false)}><CaretLeft size={18} /> Collections</button>
        <div className="adm-editor__actions">
          {(!school || student) && <a className="adm-ghost" href={`/galerie/${student?.slug || c.slug}${preview}`} target="_blank" rel="noreferrer">Voir la galerie <ArrowUpRight size={17} /></a>}
          <button className="adm-ghost" type="button" aria-expanded={settings} aria-controls="collection-settings" onClick={() => setSettings((s) => !s)}>Réglages</button>
          <button className="adm-primary" type="button" disabled={Boolean(upload) || saving}
            onClick={() => patch({ status: c.status === 'publié' ? 'brouillon' : 'publié' })}>
            {c.status === 'publié' ? 'Dépublier' : 'Publier la galerie'}
          </button>
        </div>
      </div>
      <header className="adm-editor__bar">
        <div className="adm-editor__title">
          <p className="adm-eyebrow">Collection privée</p>
          <h1>{c.client}</h1>
          <span>{[c.title, formatDate(c.date)].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="adm-editor__badges"><span className="adm-mode-badge">{c.collectionType === 'school' ? 'École · ' : ''}{modeLabel(c.mode)}</span><span className={`adm-tag ${c.status === 'publié' ? 'is-live' : ''}`}>{c.status}</span></div>
      </header>

      {error && <p className="adm-error" role="alert">{error}</p>}

      <div className="adm-editor__body">
        {/* Lien à envoyer au client */}
        {(!school || student) && <div className="adm-link">
          <div>
            <span className="adm-link__label">{school ? 'Lien privé de cet élève' : 'Lien à envoyer au client'}</span>
            <code>{link}</code>
          </div>
          <button className="adm-ghost" type="button" onClick={() => copy(link, 'lien')}>
            {copied === 'lien' ? <><Check size={16} weight="bold" /> Copié</> : <><Copy size={16} /> Copier</>}
          </button>
          <span className="adm-link__lock">
            {c.hasPassword ? <><Lock size={14} /> protégée par mot de passe</> : school ? 'À transmettre uniquement à la famille de cet élève' : 'sans mot de passe'}
          </span>
        </div>}

        <div className="adm-link">
          {c.cover && <img src={photoUrl(c.cover)} alt="Photo de couverture" style={{ width: 96, height: 72, objectFit: 'cover' }} />}
          <div><span className="adm-link__label">Photo de couverture de la collection</span><p className="adm-hint">Choisissez une image sur votre ordinateur.</p></div>
          <button className="adm-ghost" type="button" disabled={Boolean(upload) || saving} onClick={() => coverInputRef.current?.click()}><UploadSimple size={17} /> {saving ? 'Enregistrement…' : 'Choisir la couverture'}</button>
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { uploadCover(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        {school && !downloadMode && <div className="adm-link"><div><span className="adm-link__label">Protection des photos de sélection</span><p className="adm-hint">Barre rouge et texte incorporés. Les originaux restent conservés.</p><p role="status">{proofProgress}</p></div><button className="adm-ghost" type="button" disabled={Boolean(upload) || saving} onClick={protectPhotos}>Protéger toutes les photos</button><button className="adm-ghost" type="button" disabled={Boolean(upload) || saving} onClick={verifyProofs}>Vérifier la protection</button></div>}
        {school && <SchoolNavigator data={data} groupId={groupId} studentId={studentId} onGroup={setGroupId} onStudent={setStudentId} onCreate={createSchoolEntity} busy={Boolean(upload) || saving} />}
        {school && !student && data.photos.some((p) => !p.studentId) && <p className="adm-hint">Des photos anciennes sont conservées dans cette collection sans élève associé.</p>}

        {settings && <Settings collection={c} onSave={patch} onDelete={removeCollection} disabled={Boolean(upload) || saving} webPhotoCount={webPhotoCount} />}

        {downloadMode && !settings && <WebCopiesNotice count={webPhotoCount} />}

        {selectionEntries.length > 0 && <Selection entries={selectionEntries} collection={c} copied={copied} copy={copy} />}

        {(!school || student) && <><div className="adm-section-heading"><div><p className="adm-eyebrow">Les images de la collection</p><h2>La photothèque <small>{String(visiblePhotos.length).padStart(2, '0')}</small></h2></div>{!school && <p><Star size={14} /> L’étoile définit la photo de couverture.</p>}</div>

        {(downloadMode ? PHOTO_CATEGORIES : [{ id: 'full', label: 'PHOTOS À SÉLECTIONNER', description: 'Photos proposées au client pour faire son choix' }]).map((category) => <section key={category.id} className="adm-category" aria-label={category.label}>
          <div className="adm-section-heading"><div><h2>{category.label} <small>{(downloadMode ? categoryPhotos(visiblePhotos, category.id) : visiblePhotos).length}</small></h2><p>{category.description}</p></div></div>
        <div className={`adm-drop ${dragging === category.id ? 'is-dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(category.id); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files, category.id); }}>
          <div className="adm-drop__icon"><UploadSimple size={26} weight="light" /></div>
          <div className="adm-drop__copy"><p><strong>{downloadMode ? 'Ajoutez les images de cette histoire.' : 'Ajoutez les photos à sélectionner.'}</strong></p>
          <p className="adm-hint">Fichiers finaux conservés sans réduction. JPEG, PNG ou WebP · 75 Mo maximum par photo.</p></div>
          <button className="adm-ghost" type="button" onClick={() => inputRef.current[category.id]?.click()} disabled={Boolean(upload) || saving}>
            <Plus size={17} /> Ajouter des photos
          </button>
          <input ref={(node) => { inputRef.current[category.id] = node; }} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={Boolean(upload) || saving}
            onChange={(e) => { addFiles(e.target.files, category.id); e.target.value = ''; }} />
          {upload?.category === category.id && (
            <div className="adm-progress">
              <div className="adm-progress__bar"><i style={{ width: `${(upload.done / upload.total) * 100}%` }} /></div>
              <span>{upload.done} / {upload.total} photos envoyées</span>
            </div>
          )}
        </div>

        {(downloadMode ? categoryPhotos(visiblePhotos, category.id) : visiblePhotos).length > 0 && (
          <div className="adm-photos">
            {(downloadMode ? categoryPhotos(visiblePhotos, category.id) : visiblePhotos).map((p, index) => (
              <figure key={p.id} className={c.cover === p.id ? 'is-cover' : ''}>
                <img src={photoUrl(p.id, school && !downloadMode ? 'proof' : 'thumb')} alt={p.filename || `Photo ${index + 1}`} loading="lazy" />
                <figcaption><span>{String(index + 1).padStart(2, '0')}</span><span>{c.cover === p.id ? 'Couverture' : p.filename}</span></figcaption>
                <button type="button" className="adm-photos__del" onClick={() => removePhoto(p)}
                  aria-label={`Retirer ${p.filename || 'la photo'}`}><X size={14} weight="bold" /></button>
                {!school && <button type="button" className="adm-photos__cover" onClick={() => patch({ cover: p.id })}
                  aria-label={`Choisir ${p.filename || 'cette photo'} comme couverture`} aria-pressed={c.cover === p.id} title="Photo de couverture">
                  <Star size={14} weight={c.cover === p.id ? 'fill' : 'regular'} />
                </button>}
              </figure>
            ))}
          </div>
        )}
        </section>)}</>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- réglages --- */

function Settings({ collection, onSave, onDelete, disabled = false, webPhotoCount = 0 }) {
  const [form, setForm] = useState({
    client: collection.client,
    title: collection.title || '',
    eventDate: collection.date || '',
    slug: collection.slug,
    mode: collection.mode || 'selection',
    collectionType: collection.collectionType || 'standard',
    maxPicks: collection.maxPicks || '',
    extraPrice: collection.extraPrice ?? 25,
    password: '',
  });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (disabled) return;
    const body = {
      client: form.client, title: form.title, eventDate: form.eventDate,
      slug: form.slug, collectionType: form.collectionType, mode: form.mode, maxPicks: form.maxPicks, extraPrice: form.extraPrice,
    };
    if (form.password.trim()) body.password = form.password.trim();
    if (await onSave(body)) {
      setSaved(true);
      setForm((f) => ({ ...f, password: '' }));
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <form id="collection-settings" className="adm-settings" onSubmit={submit}>
      <header className="adm-settings__heading"><p className="adm-eyebrow">Les détails de la collection</p><h2>Réglages</h2></header>
      <GalleryMode collectionType={form.collectionType} onTypeChange={set('collectionType')} value={form.mode} onChange={set('mode')} disabled={disabled} />
      {form.mode !== (collection.mode || 'selection') && <p className="adm-hint" role="status">Enregistrez ce choix avant d’ajouter les photos. Il s’appliquera dès l’enregistrement à l’expérience du client.</p>}
      {form.mode === 'download' && <WebCopiesNotice count={webPhotoCount} />}
      <div className="adm-settings__row">
        <label>Nom du client<input value={form.client} onChange={set('client')} required /></label>
        <SessionTitle value={form.title} onChange={set('title')} disabled={disabled} />
      </div>
      <div className="adm-settings__row">
        <label>Date<input type="date" value={form.eventDate} onChange={set('eventDate')} /></label>
        <label>Adresse de la galerie<input value={form.slug} onChange={set('slug')} /></label>
      </div>
      {form.mode === 'selection' && <div className="adm-settings__row">
        <label>Photos incluses<input type="number" min="1" value={form.maxPicks} onChange={set('maxPicks')} /></label>
        <label>Photo supplémentaire ($ CAD)<input type="number" min="0" value={form.extraPrice} onChange={set('extraPrice')} /></label>
      </div>}
      <div className="adm-settings__row">
        <label>Nouveau mot de passe
          <input value={form.password} onChange={set('password')}
            placeholder={collection.hasPassword ? 'Laisser vide pour ne pas changer' : 'Aucun mot de passe'} />
        </label>
      </div>
      <div className="adm-settings__foot">
        <button className="adm-primary" type="submit" disabled={disabled}>{saved ? 'Enregistré' : 'Enregistrer'}</button>
        {collection.hasPassword && (
          <button className="adm-ghost" type="button" disabled={disabled} onClick={() => onSave({ password: '' })}>Retirer le mot de passe</button>
        )}
        <button className="adm-danger" type="button" disabled={disabled} onClick={onDelete}><Trash size={16} /> Supprimer la galerie</button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------- sélection --- */

// Une sélection reçue sans courriel est un piège : le choix du client dort dans
// le panneau sans que personne ne le sache. On affiche donc toujours l'état.
function MailState({ status }) {
  if (!status) {
    return (
      <p className="adm-selection__mail">
        <EnvelopeSimple size={15} /> État du courriel inconnu (sélection reçue avant cette vérification).
      </p>
    );
  }
  if (status === 'envoyé') {
    return (
      <p className="adm-selection__mail adm-selection__mail--ok">
        <Check size={15} weight="bold" /> Avis envoyé par courriel.
      </p>
    );
  }
  return (
    <p className="adm-selection__mail adm-selection__mail--warn">
      <Warning size={15} weight="bold" /> <strong>Le courriel n’est pas parti.</strong> {status}
    </p>
  );
}

// Une galerie a un seul client : ses envois se corrigent l'un l'autre, seul le
// plus récent compte. Une galerie à plusieurs personnes (Metal 7) est
// différente : chaque personne nommée garde son propre choix, et un nouvel
// envoi ne remplace que le sien, jamais celui de quelqu'un d'autre. Les envois
// reçus avant l'obligation du nom restent inclus, non identifiés.
function extractEmployeeName(note) {
  const m = /Nom et pr[ée]nom\s*:\s*([^\n]+)/i.exec(note || '');
  return m ? m[1].trim() : null;
}

function combineSelections(selections, multiPerson) {
  // Une seule cliente ou un seul client : ses envois se corrigent l'un
  // l'autre, seul le plus récent compte, exactement comme avant. Seule une
  // galerie à plusieurs personnes nommées (Metal 7) fusionne tous les envois.
  if (!multiPerson) {
    return selections.slice(0, 1).map((s) => ({ ...s, name: extractEmployeeName(s.note) }));
  }
  const seen = new Set();
  const entries = [];
  for (const s of selections) { // déjà du plus récent au plus ancien
    const name = extractEmployeeName(s.note);
    if (name) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue; // envoi plus ancien du même nom : ignoré
      seen.add(key);
    }
    entries.push({ ...s, name });
  }
  return entries;
}

function Selection({ entries, collection, copied, copy }) {
  const client = collection.client;
  const byPhoto = new Map();
  for (const entry of entries) {
    for (const p of entry.photos) {
      if (!byPhoto.has(p.id)) byPhoto.set(p.id, { ...p, names: [] });
      if (entry.name) byPhoto.get(p.id).names.push(entry.name);
    }
  }
  const photos = [...byPhoto.values()];
  const names = photos.map((p) => p.filename).join('\n');
  const lightroomNames = photos.map((p) => (p.filename || '').replace(/\.jpe?g$/i, '')).join('\n');
  const included = collection.maxPicks || 0;
  const price = collection.extraPrice ?? 25;
  const extras = included ? Math.max(0, photos.length - included) : 0;
  const contributors = entries.filter((e) => e.name).length;
  const anonymous = entries.length - contributors;
  const failedMail = entries.filter((e) => e.emailStatus && e.emailStatus !== 'envoyé').length;

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
        <div className="adm-selection__title">
          <p className="adm-eyebrow"><Check size={14} /> Sélection reçue</p>
          <h2>Le choix du client <small>{photos.length} photos</small></h2>
          {entries.length > 1 && (
            <p className="adm-selection__count">
              {contributors > 0 && `${contributors} personne${contributors > 1 ? 's' : ''} identifiée${contributors > 1 ? 's' : ''}`}
              {contributors > 0 && anonymous > 0 ? ' + ' : ''}
              {anonymous > 0 && `${anonymous} envoi${anonymous > 1 ? 's' : ''} sans nom (avant l'identification obligatoire)`}
            </p>
          )}
        </div>
        <div>
          <button className="adm-ghost" type="button" onClick={() => copy(lightroomNames, 'sel')}>
            {copied === 'sel' ? <><Check size={16} weight="bold" /> Copié</> : <><Copy size={16} /> Copier pour Lightroom</>}
          </button>
          <button className="adm-ghost" type="button" onClick={download}><DownloadSimple size={16} /> Télécharger</button>
        </div>
      </header>
      {entries.length === 1 ? (
        <>
          <MailState status={entries[0].emailStatus} />
          {entries[0].note && <p className="adm-selection__note">« {entries[0].note} »</p>}
        </>
      ) : failedMail > 0 && (
        <p className="adm-selection__mail adm-selection__mail--warn">
          <Warning size={15} weight="bold" /> <strong>{failedMail} avis courriel n'est (ou ne sont) pas parti(s).</strong> Vérifiez les envois un par un si besoin.
        </p>
      )}
      {extras > 0 && (
        <p className="adm-selection__extra">
          {extras} photo{extras > 1 ? 's' : ''} au-delà du forfait de {included} —
          {' '}{extras} × {price} $ = <strong>{extras * price} $ CAD à facturer</strong>
        </p>
      )}
      <ul className="adm-selection__list">
        {photos.map((p) => (
          <li key={p.id}>
            <img src={photoUrl(p.id)} alt="" loading="lazy" />
            <span>{p.filename}{p.names.length ? ` — ${p.names.join(', ')}` : ''}</span>
          </li>
        ))}
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

  if (session === 'inconnue') return <div className="admin-cinema adm-loading"><span className="adm-wordmark">BEHN J. PRODUCTIONS</span><p role="status">Ouverture du studio…</p></div>;
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
    <div className="adm admin-cinema">
      <header className="adm-side">
        <a className="adm-wordmark" href="/">BEHN J. PRODUCTIONS</a>
        <span className="adm-studio-label">Espace studio</span>
        <nav aria-label="Sections">
          <button type="button" className="is-active" onClick={() => { setView({ name: 'list' }); refresh(); }}>
            <ImageIcon size={19} /> Collections
          </button>
        </nav>
        <div className="adm-side__foot">
          <a className="adm-side__home" href="/">← Voir le site</a>
          <button className="adm-side__out" type="button" onClick={logout}><SignOut size={16} /> Se déconnecter</button>
        </div>
      </header>

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
      <footer className="adm-footer"><span>Behn J. Productions</span><span>Chaque détail compte.</span></footer>
    </div>
  );
}

export default AdminPage;
