const FAILURE_MESSAGE = 'Impossible de confirmer l’envoi. Réessayez dans quelques instants.';
const REQUIRED_FIELDS = ['name', 'email', 'type', 'message'];
const TRIMMED_FIELDS = [...REQUIRED_FIELDS, 'phone'];

function abortError() {
  const error = new Error('L’envoi a été interrompu. Réessayez dans quelques instants.');
  error.name = 'AbortError';
  return error;
}

function isAppShell(html) {
  const hasRoot = /<div\b[^>]*\sid\s*=\s*(?:"root"|'root'|root(?=[\s>]))[^>]*>/i.test(html);
  if (!hasRoot) return false;

  const hasViteClient = /\/@(?:vite\/client|react-refresh)\b/.test(html);
  const scripts = html.match(/<script\b[^>]*>/gi) || [];
  const hasAppModule = scripts.some((script) => (
    /\stype\s*=\s*(?:"module"|'module'|module(?=[\s>]))/i.test(script)
    && /\ssrc\s*=\s*["']\/(?:assets\/[^"']+\.m?js|src\/main\.[jt]sx?)(?:[?#][^"']*)?["']/i.test(script)
  ));
  return hasViteClient || hasAppModule;
}

export async function submitContact(formData, { signal, fetcher = fetch } = {}) {
  const body = new URLSearchParams(formData);
  for (const field of TRIMMED_FIELDS) {
    const value = formData.get(field);
    if (typeof value === 'string') body.set(field, value.trim());
    else body.delete(field);
  }
  body.set('form-name', 'project-contact');

  if (REQUIRED_FIELDS.some((field) => !body.get(field))) {
    throw new Error('Indiquez votre nom, votre courriel, le type de projet et votre message.');
  }
  if (formData.get('privacy-consent') !== 'accepted') {
    throw new Error('Veuillez accepter la politique de confidentialité avant l’envoi.');
  }
  if (signal?.aborted) throw abortError();

  try {
    const response = await fetcher('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal,
    });
    if (!response.ok) throw new Error(FAILURE_MESSAGE);

    // Netlify returns HTML on success. Only reject our app's static fallback.
    const html = await response.text();
    if (signal?.aborted) throw abortError();
    if (isAppShell(html)) throw new Error(FAILURE_MESSAGE);
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw abortError();
    throw new Error(FAILURE_MESSAGE);
  }
}
