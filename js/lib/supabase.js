// Sound Cave — Supabase client + auth helpers (Phase B).
// Loaded as a classic <script> in index.html. Exposes window.scAuth.
//
// Loads SDK from CDN, fetches public config from /api/config, then exposes:
//   scAuth.ready              - Promise<void> resolved once client is initialised
//   scAuth.client             - the supabase-js client
//   scAuth.session()          - Promise<Session|null>
//   scAuth.user()             - Promise<User|null>
//   scAuth.token()            - Promise<string|null>  (current access JWT)
//   scAuth.signInWithEmail(e) - calls signInWithOtp; returns {error?: string}
//   scAuth.signOut()          - signs out + reloads page
//   scAuth.onChange(cb)       - subscribes to auth state changes
(function () {
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  const apiBase = (typeof localStorage !== 'undefined' && localStorage.getItem('sc_api_url')) || 'http://localhost:8000';

  let client = null;
  const subscribers = new Set();

  async function init() {
    const [{ createClient }, cfg] = await Promise.all([
      import(SDK_URL),
      fetch(`${apiBase}/api/config`).then(r => r.json()),
    ]);
    client = createClient(cfg.supabase_url, cfg.supabase_anon_key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    client.auth.onAuthStateChange((event, session) => {
      subscribers.forEach(cb => { try { cb(event, session); } catch (e) { console.error(e); } });
    });
    return client;
  }

  const ready = init().catch(err => {
    console.error('scAuth init failed', err);
    throw err;
  });

  async function session() {
    await ready;
    const { data } = await client.auth.getSession();
    return data.session;
  }

  async function user() {
    const s = await session();
    return s ? s.user : null;
  }

  async function token() {
    const s = await session();
    return s ? s.access_token : null;
  }

  async function signInWithEmail(email) {
    await ready;
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    return error ? { error: error.message } : {};
  }

  async function signOut() {
    await ready;
    await client.auth.signOut();
    sessionStorage.removeItem('sc_splash_done');
    window.location.reload();
  }

  function onChange(cb) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }

  // Convenience: authed fetch that auto-attaches the JWT.
  async function authedFetch(url, opts = {}) {
    const t = await token();
    const headers = new Headers(opts.headers || {});
    if (t) headers.set('Authorization', `Bearer ${t}`);
    return fetch(url, { ...opts, headers });
  }

  window.scAuth = {
    get ready() { return ready; },
    get client() { return client; },
    session, user, token, signInWithEmail, signOut, onChange, authedFetch,
  };
})();
