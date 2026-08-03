// Sound Cave — Supabase client + auth helpers (Phase B).
// Loaded as a classic <script> in index.html. Exposes window.scAuth.
//
// Loads SDK from CDN, fetches public config from /api/config, then exposes:
//   scAuth.ready              - Promise<void> resolved once client is initialised
//   scAuth.client             - the supabase-js client
//   scAuth.session()          - Promise<Session|null>
//   scAuth.user()             - Promise<User|null>
//   scAuth.token()            - Promise<string|null>  (current access JWT)
//   scAuth.signInWithEmail(e)         - calls signInWithOtp; returns {error?: string}
//   scAuth.signInWithPassword(e, p)   - calls signInWithPassword; returns {error?: string}
//   scAuth.setPassword(p)             - calls updateUser({ password }); returns {error?: string}
//   scAuth.signOut()                  - signs out + reloads page
//   scAuth.onChange(cb)               - subscribes to auth state changes
(function () {
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  const apiBase = (typeof localStorage !== 'undefined' && localStorage.getItem('sc_api_url')) || 'http://localhost:8000';

  let client = null;
  const subscribers = new Set();

  // Hardcoded public Supabase config. Anon key is safe to expose — RLS is the
  // security layer. Avoids dependency on /api/config (Flask) when the frontend
  // is deployed on Vercel without the backend.
  const SUPABASE_URL = 'https://agmmdrqmjywggtsycsri.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbW1kcnFtanl3Z2d0c3ljc3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTIyMTYsImV4cCI6MjA5Mjk2ODIxNn0.-POHp0618Sz1Rd0yb1_cqPyNNtHqpzeCBvqJYCTeC_E';

  async function init() {
    const { createClient } = await import(SDK_URL);
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  // Fails soft to null (= "signed out") rather than throwing: callers all over
  // the app do `if (await scAuth.session())` without a catch, and a rejected
  // `ready` used to take the whole calling feature down with it.
  async function session() {
    try {
      await ready;
      const { data } = await client.auth.getSession();
      return data.session;
    } catch (err) {
      console.error('scAuth.session failed', err);
      return null;
    }
  }

  async function user() {
    const s = await session();
    return s ? s.user : null;
  }

  async function token() {
    const s = await session();
    return s ? s.access_token : null;
  }

  // Raw Supabase auth failures are useless to a user standing at the cave mouth:
  // a paused project, an offline laptop and a blocked CDN all read "Failed to
  // fetch". Worse, `await ready` *throws* when the SDK never loaded, which
  // escaped the callers and left the login button stuck on "{SENDING…}" with no
  // message at all. Every auth helper funnels through run() so it always
  // resolves to {error?: string}, never rejects, and says something actionable.
  function explain(raw) {
    const msg = (raw && raw.message) || String(raw || 'Unknown error');
    // supabase-js v2 also carries a stable `code` (e.g. over_email_send_rate_limit,
    // otp_disabled, invalid_credentials). Match on both, with underscores flattened
    // so one pattern covers the code and the prose form.
    const hay = `${msg} ${(raw && (raw.code || raw.name)) || ''}`.replace(/_/g, ' ');

    // Module-import failure must be tested BEFORE the generic network case —
    // "Failed to fetch dynamically imported module" matches both.
    if (/dynamically imported module|error loading|failed to resolve module/i.test(hay)) {
      return 'Login code failed to load (CDN blocked?). Disable any content blocker for this site and reload.';
    }
    // No response at all — network, DNS, CORS, or a paused Supabase project
    // (paused projects stop serving *.supabase.co entirely).
    if (/failed to fetch|load failed|networkerror|fetch failed|network request failed/i.test(hay)) {
      return 'Can’t reach the auth service. It may be paused or down — check your connection, then try again shortly.';
    }
    // Supabase's own errors, rewritten where the stock wording misleads.
    if (/rate limit/i.test(hay)) {
      return 'Too many login emails sent recently. Wait a few minutes and try again.';
    }
    if (/signups? not allowed|signup is disabled|otp disabled/i.test(hay)) {
      return 'No account for that email, and new signups are currently closed. Ask Doug for an invite.';
    }
    if (/invalid login credentials|invalid credentials/i.test(hay)) {
      return 'Wrong email or password. If you never set a password, use the magic link instead.';
    }
    if (/email not confirmed/i.test(hay)) {
      return 'Email not confirmed yet — click the link in your inbox first.';
    }
    return msg;
  }

  async function run(fn) {
    try {
      await ready;
      const { error } = await fn();
      return error ? { error: explain(error) } : {};
    } catch (err) {
      console.error('scAuth call failed', err);
      return { error: explain(err) };
    }
  }

  function redirectTo() {
    return window.location.origin + window.location.pathname;
  }

  async function signInWithEmail(email) {
    return run(() => client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } }));
  }

  async function signInWithPassword(email, password) {
    return run(() => client.auth.signInWithPassword({ email, password }));
  }

  async function sendPasswordReset(email) {
    return run(() => client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }));
  }

  async function setPassword(password) {
    return run(() => client.auth.updateUser({ password }));
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
    session, user, token, signInWithEmail, signInWithPassword, sendPasswordReset, setPassword, signOut, onChange, authedFetch,
  };
})();
