// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FIREPIT — CONTENT PRODUCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let firepitMode = 'forge';
let forgeGeneratedContent = '';
let forgeGeneratedImageUrl = '';
let forgeApiUrl = localStorage.getItem('sc_api_url') || 'http://localhost:8000';

// Reference images uploaded for the current generation (base64 data URLs).
let _forgeRefImages = [];
const REF_IMAGES_MAX_COUNT = 5;
const REF_IMAGES_MAX_BYTES = 5 * 1024 * 1024; // 5MB per image

// Which content types should auto-generate an image alongside the text.
const OUTPUT_MEDIA = {
  social_post:     'image',
  social_carousel: 'image',
  social_short:    'image',
  event_promo:     'image',
  lineup_poster:   'image',
  artist_bio:      'none',
  press_release:   'none',
};

// Forge content types — slim set focused on Meta + TikTok + Reddit.
// Captions are auto-generated inside the social types; no standalone "caption" type.
const CONTENT_TYPES = {
  social_post:     { label:'Post',                  icon:'', iconKey:'carousel',     fields:['artist','freeform'], maxLength:2200 },
  social_carousel: { label:'Carousel',              icon:'', iconKey:'carousel',     fields:['artist','freeform'], maxLength:2200 },
  social_short:    { label:'Short',                 icon:'', iconKey:'lineup',       fields:['artist','freeform'], maxLength:2200 },
  event_promo:     { label:'Event Promotion',       icon:'', iconKey:'event_promo',  fields:['event','artist','freeform'] },
  lineup_poster:   { label:'Lineup Poster',         icon:'', iconKey:'lineup',       fields:['event','artist_list','freeform'] },
  artist_bio:      { label:'Artist Spotlight / Bio', icon:'', iconKey:'artist_bio',   fields:['artist','freeform'] },
  press_release:   { label:'Press Release',         icon:'', iconKey:'press_release',fields:['artist','release','event','freeform'] },
};

// Stash storage moved from localStorage to Supabase via /api/stash backend proxy.
// Render functions stay sync by reading from this in-memory cache, hydrated on
// renderFirepit(). Mutations update the cache optimistically and POST/DELETE to
// the API in the background.
// TODO(phase-B): drop DEV_USER_ID gating in content_api.py and pass real auth JWT.
let _stashCache = [];

function getContentLibrary() { return _stashCache; }

// Map server row -> UI item shape used by renderStash, editStashItem, etc.
function _stashRowToItem(row) {
  const m = row.metadata || {};
  return {
    id: row.id,
    type: m.type || 'social_post',
    label: m.label,
    icon: m.icon,
    content: row.content || '',
    imageUrl: row.media_url || null,
    context: m.context || {},
    status: m.status || 'draft',
    created: row.created_at,
    modified: row.created_at,
  };
}

async function loadStash() {
  try {
    const r = await scAuth.authedFetch(`${forgeApiUrl}/api/stash`);
    if (!r.ok) throw new Error(`stash GET ${r.status}`);
    const j = await r.json();
    _stashCache = (j.items || []).map(_stashRowToItem);
  } catch (e) {
    console.warn('stash load failed', e);
    _stashCache = [];
  }
  await migrateLocalStorageStash();
}

async function migrateLocalStorageStash() {
  const raw = localStorage.getItem('sc_content_library');
  if (!raw) return;
  let legacy;
  try { legacy = JSON.parse(raw); } catch { localStorage.removeItem('sc_content_library'); return; }
  if (!Array.isArray(legacy) || !legacy.length) {
    localStorage.removeItem('sc_content_library');
    return;
  }
  console.log(`migrating ${legacy.length} legacy Stash items to Supabase`);
  for (const item of legacy) {
    try {
      const r = await scAuth.authedFetch(`${forgeApiUrl}/api/stash`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          type: item.type,
          label: item.label,
          icon: item.icon,
          content: item.content,
          imageUrl: item.imageUrl,
          context: item.context,
          status: item.status || 'draft',
        }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j.item) _stashCache.unshift(_stashRowToItem(j.item));
      }
    } catch (e) { console.warn('migrate item failed', e); }
  }
  localStorage.removeItem('sc_content_library');
}

function setFirepitMode(mode, btn) {
  firepitMode = mode;
  document.querySelectorAll('.firepit-mode').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  ['forge','stash','trailmap'].forEach(m => {
    const el = document.getElementById(`firepit-${m}`);
    if (el) el.style.display = m === mode ? 'block' : 'none';
  });
  if (mode === 'stash') renderStash();
  if (mode === 'trailmap' && typeof renderTrailMap === 'function') renderTrailMap();
}

async function renderFirepit() {
  updateForgeFields();
  await loadStash();
  updateStashCount();
  populateStashTypeFilter();
  if (firepitMode === 'stash') renderStash();
  checkApiStatus();
}

function updateForgeFields() {
  const type = document.getElementById('forgeContentType').value;
  const ct = CONTENT_TYPES[type];
  if (!ct) return;
  const container = document.getElementById('forgeDynamicFields');
  const favs = getFavourites();
  const artists = Object.entries(favs).filter(([,a]) => a.status !== 'cut').map(([u,a]) => ({username:u, name:a.display_name||u}));
  let html = '';

  if (ct.fields.includes('artist')) {
    html += `<div class="forge-input-group">
      <label class="forge-label">Artist</label>
      <select class="input" id="forgeArtist">
        <option value="">Select artist...</option>
        ${artists.map(a => `<option value="${esc(a.username)}">${esc(a.name)}</option>`).join('')}
        <option value="__custom">Custom (type below)</option>
      </select>
    </div>`;
  }
  if (ct.fields.includes('artist_list')) {
    html += `<div class="forge-input-group">
      <label class="forge-label">Artists (lineup)</label>
      <textarea class="input" id="forgeArtistList" rows="2" placeholder="One artist per line, or comma-separated"></textarea>
    </div>`;
  }
  if (ct.fields.includes('event')) {
    html += `<div class="forge-input-group">
      <label class="forge-label">Event</label>
      <input class="input" id="forgeEvent" placeholder="Event name, venue, date...">
    </div>`;
  }
  if (ct.fields.includes('release')) {
    html += `<div class="forge-input-group">
      <label class="forge-label">Release</label>
      <input class="input" id="forgeRelease" placeholder="Track/EP/album title, catalogue number...">
    </div>`;
  }
  container.innerHTML = html;
  updateCharCount();
}

function updateCharCount() {
  const type = document.getElementById('forgeContentType').value;
  const ct = CONTENT_TYPES[type];
  const el = document.getElementById('forgeCharCount');
  if (!ct || !ct.maxLength) { el.textContent = ''; return; }
  const len = forgeGeneratedContent.length;
  if (len === 0) { el.textContent = `Max ${ct.maxLength.toLocaleString()} chars`; return; }
  el.textContent = `${len.toLocaleString()} / ${ct.maxLength.toLocaleString()}`;
  el.classList.toggle('over', len > ct.maxLength);
}

async function checkApiStatus() {
  const el = document.getElementById('apiStatus');
  try {
    const r = await fetch(`${forgeApiUrl}/api/health`, {method:'GET', signal: AbortSignal.timeout(3000)});
    if (r.ok) { el.textContent = '🟢 Connected'; el.style.color = 'var(--green)'; }
    else { el.textContent = '🔴 Error'; el.style.color = 'var(--red)'; }
  } catch(e) {
    el.textContent = '⚫ Not running'; el.style.color = 'var(--muted)';
  }
}

function gatherForgeContext() {
  const type = document.getElementById('forgeContentType').value;
  const ct = CONTENT_TYPES[type];
  const ctx = { content_type: type };

  if (ct.fields.includes('artist')) {
    const sel = document.getElementById('forgeArtist');
    if (sel) {
      ctx.artist_username = sel.value === '__custom' ? '' : sel.value;
      if (ctx.artist_username) {
        const favs = getFavourites();
        const a = favs[ctx.artist_username];
        if (a) ctx.artist_data = { name: a.display_name, genre: a.genre, followers: a.snapshots?.slice(-1)[0]?.followers };
      }
    }
  }
  if (ct.fields.includes('artist_list')) {
    const el = document.getElementById('forgeArtistList');
    if (el) ctx.artist_list = el.value;
  }
  if (ct.fields.includes('event')) {
    const el = document.getElementById('forgeEvent');
    if (el) ctx.event = el.value;
  }
  if (ct.fields.includes('release')) {
    const el = document.getElementById('forgeRelease');
    if (el) ctx.release = el.value;
  }
  ctx.freeform = document.getElementById('forgeFreeform')?.value || '';
  ctx.voice = document.getElementById('forgeVoice')?.value || 'underground';
  if (_forgeRefImages.length) ctx.reference_images = _forgeRefImages.slice();
  return ctx;
}

async function generateContent(variation) {
  const ctx = gatherForgeContext();
  if (variation) ctx.variation = variation;

  const outputArea = document.getElementById('forgeOutputArea');
  const actionsEl = document.getElementById('forgeActions');
  outputArea.innerHTML = `<div class="forge-loading" style="border:1px dashed var(--border);border-radius:8px">
    <span>Generating<span class="dot">.</span><span class="dot" style="animation-delay:0.2s">.</span><span class="dot" style="animation-delay:0.4s">.</span></span>
  </div>`;
  actionsEl.style.display = 'none';

  try {
    const r = await scAuth.authedFetch(`${forgeApiUrl}/api/generate`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(ctx)
    });
    if (r.status === 402) {
      const j = await r.json().catch(() => ({}));
      throw new Error(`Insufficient credits — this generation costs ${j.cost || 1}.`);
    }
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    const data = await r.json();
    forgeGeneratedContent = data.content || '';
    if (typeof data.credits_balance === 'number') updateCreditsDisplay(data.credits_balance);
    outputArea.innerHTML = `<textarea class="forge-output" id="forgeOutputText" oninput="forgeGeneratedContent=this.value;updateCharCount()">${esc(forgeGeneratedContent)}</textarea>`;
    actionsEl.style.display = 'block';
    updateCharCount();
    // Trigger image gen after text is ready (sequential — image prompt uses the text)
    if (OUTPUT_MEDIA[ctx.content_type] === 'image') generateImage(ctx);
    else document.getElementById('forgeImageArea').style.display = 'none';
  } catch(e) {
    outputArea.innerHTML = `<div class="forge-loading" style="border:1px dashed var(--border);border-radius:8px;flex-direction:column;gap:8px">
      <span style="font-family:var(--font-mono);color:var(--color-accent);font-weight:600">!</span>
      <span style="color:var(--red)">${e.message}</span>
      <span style="color:var(--muted);font-size:11px">Make sure content_api.py is running: <code>python content_api.py</code></span>
    </div>`;
  }
}

// Defined in app.js initAccount; safe shim so generation calls don't blow up
// if the dropdown hasn't hydrated yet.
function updateCreditsDisplay(n) {
  const el = document.getElementById('accountCredits');
  if (el) el.textContent = n;
}

function generateVariation(type) { generateContent(type); }

// ── Reference image upload ──────────────────────────────────
function handleRefImagesChange(event) {
  const errEl = document.getElementById('forgeRefImagesError');
  errEl.style.display = 'none';
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  if (_forgeRefImages.length + files.length > REF_IMAGES_MAX_COUNT) {
    errEl.textContent = `Max ${REF_IMAGES_MAX_COUNT} images.`;
    errEl.style.display = 'block';
    event.target.value = '';
    return;
  }
  const oversized = files.find(f => f.size > REF_IMAGES_MAX_BYTES);
  if (oversized) {
    errEl.textContent = `"${oversized.name}" is over 5MB.`;
    errEl.style.display = 'block';
    event.target.value = '';
    return;
  }
  Promise.all(files.map(readFileAsDataURL))
    .then(dataUrls => {
      _forgeRefImages = _forgeRefImages.concat(dataUrls);
      renderRefImageThumbs();
      event.target.value = '';
    })
    .catch(err => {
      errEl.textContent = `Read failed: ${err.message}`;
      errEl.style.display = 'block';
    });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('read error'));
    r.readAsDataURL(file);
  });
}

// Build thumbs via DOM methods (no innerHTML with dynamic content).
function renderRefImageThumbs() {
  const wrap = document.getElementById('forgeRefImagesPreview');
  if (!wrap) return;
  wrap.replaceChildren();
  _forgeRefImages.forEach((src, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `ref ${i + 1}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.setAttribute('aria-label', 'Remove');
    btn.addEventListener('click', () => removeRefImage(i));
    thumb.appendChild(img);
    thumb.appendChild(btn);
    wrap.appendChild(thumb);
  });
}

function removeRefImage(i) {
  _forgeRefImages.splice(i, 1);
  renderRefImageThumbs();
}

async function generateImage(ctx) {
  const imgArea = document.getElementById('forgeImageArea');
  imgArea.style.display = 'block';
  imgArea.innerHTML = `<div class="forge-image-loading">
    <div class="forge-image-skeleton"></div>
    <span>Generating image<span class="dot">.</span><span class="dot" style="animation-delay:0.2s">.</span><span class="dot" style="animation-delay:0.4s">.</span></span>
  </div>`;

  const body = { ...ctx };
  if (forgeGeneratedContent) body.generated_text = forgeGeneratedContent;

  try {
    const r = await scAuth.authedFetch(`${forgeApiUrl}/api/generate-image`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if (r.status === 402) {
      const j = await r.json().catch(() => ({}));
      throw new Error(`Insufficient credits — this image costs ${j.cost || 5}.`);
    }
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Image API error: ${r.status}`);
    }
    const data = await r.json();
    // image_url is now a fully-qualified Supabase Storage URL (Phase A migration).
    forgeGeneratedImageUrl = data.image_url;
    if (typeof data.credits_balance === 'number') updateCreditsDisplay(data.credits_balance);

    imgArea.innerHTML = `<img src="${forgeGeneratedImageUrl}" class="forge-image-preview" alt="Generated image">
      <div class="forge-image-meta">
        ${data.dimensions.width}x${data.dimensions.height} | ${data.provider}/${data.model}
      </div>`;

    document.getElementById('btnRegenImage').style.display = '';
    document.getElementById('btnDownloadImage').style.display = '';
  } catch(e) {
    imgArea.innerHTML = `<div class="forge-image-loading" style="flex-direction:column;gap:8px">
      <span style="font-family:var(--font-mono);color:var(--color-accent);font-weight:600">!</span>
      <span style="color:var(--red);font-size:12px">${e.message}</span>
      <span style="color:var(--muted);font-size:11px">Check FAL_KEY / REPLICATE_API_TOKEN in .env</span>
    </div>`;
  }
}

async function regenerateImage() {
  const ctx = gatherForgeContext();
  await generateImage(ctx);
}

function downloadForgeImage() {
  if (!forgeGeneratedImageUrl) return;
  const a = document.createElement('a');
  a.href = forgeGeneratedImageUrl;
  a.download = `soundcave_${Date.now()}.png`;
  a.click();
}

async function copyForgeOutput() {
  try {
    await navigator.clipboard.writeText(forgeGeneratedContent);
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = orig, 1500);
  } catch(e) {}
}

async function saveToStash() {
  if (!forgeGeneratedContent) return;
  const type = document.getElementById('forgeContentType').value;
  const ct = CONTENT_TYPES[type];
  const btn = event.target;
  const orig = btn.innerHTML;
  btn.innerHTML = '⏳ Saving…';
  try {
    const r = await scAuth.authedFetch(`${forgeApiUrl}/api/stash`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        type,
        label: ct ? ct.label : type,
        icon: ct ? ct.icon : '📝',
        content: forgeGeneratedContent,
        imageUrl: forgeGeneratedImageUrl || null,
        context: gatherForgeContext(),
        status: 'draft',
      }),
    });
    if (!r.ok) throw new Error(`stash POST ${r.status}`);
    const j = await r.json();
    if (j.item) _stashCache.unshift(_stashRowToItem(j.item));
    updateStashCount();
    btn.innerHTML = '✅ Saved!';
  } catch (e) {
    console.error('saveToStash failed', e);
    btn.innerHTML = '❌ Failed';
  }
  setTimeout(() => btn.innerHTML = orig, 1500);
}

function updateStashCount() {
  const lib = getContentLibrary();
  const el = document.getElementById('stashCount');
  if (el) el.textContent = lib.length || '';
  const fp = document.getElementById('firepitCount');
  if (fp) fp.textContent = lib.filter(i => i.status === 'draft').length || '';
}

function populateStashTypeFilter() {
  const sel = document.getElementById('stashTypeFilter');
  if (!sel) return;
  const types = new Set(getContentLibrary().map(i => i.type));
  const existing = sel.value;
  sel.innerHTML = '<option value="">All types</option>' +
    [...types].map(t => {
      const ct = CONTENT_TYPES[t];
      return `<option value="${t}">${ct ? ct.label : t}</option>`;
    }).join('');
  sel.value = existing;
}

function renderStash() {
  const lib = getContentLibrary();
  const search = (document.getElementById('stashSearch')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('stashTypeFilter')?.value || '';
  const statusFilter = document.getElementById('stashStatusFilter')?.value || '';

  let items = lib;
  if (search) items = items.filter(i => i.content.toLowerCase().includes(search) || (i.label||'').toLowerCase().includes(search));
  if (typeFilter) items = items.filter(i => i.type === typeFilter);
  if (statusFilter) items = items.filter(i => i.status === statusFilter);

  const el = document.getElementById('stashList');
  if (!items.length) {
    el.innerHTML = `<div class="empty"><div class="ico">📦</div><p>${lib.length ? 'No content matches your filters.' : 'Your stash is empty. Generate content in the Forge and save it here.'}</p></div>`;
    return;
  }
  el.innerHTML = items.map(item => {
    const preview = item.content.slice(0, 100).replace(/\n/g, ' ');
    const date = new Date(item.created).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
    const thumb = item.imageUrl ? `<img src="${item.imageUrl}" class="stash-thumb" alt="">` : '';
    return `<div class="stash-item">
      ${thumb}
      <div class="stash-info">
        <div class="stash-type">${item.label || item.type}</div>
        <div class="stash-preview">${esc(preview)}</div>
        <div class="stash-date">${date}</div>
      </div>
      <span class="stash-status ${item.status}">${item.status}</span>
      <div class="stash-actions">
        <button class="action-btn" onclick="editStashItem('${item.id}')" title="Edit in Forge"><span class="icon">✏️</span></button>
        <button class="action-btn" onclick="copyStashItem('${item.id}')" title="Copy"><span class="icon">📋</span></button>
        <button class="action-btn" onclick="deleteStashItem('${item.id}')" title="Delete"><span class="icon">🗑️</span></button>
      </div>
    </div>`;
  }).join('');
}

function editStashItem(id) {
  const lib = getContentLibrary();
  const item = lib.find(i => i.id === id);
  if (!item) return;
  setFirepitMode('forge', document.querySelector('.firepit-mode'));
  document.getElementById('forgeContentType').value = item.type;
  updateForgeFields();
  const ctx = item.context || {};
  if (ctx.artist_username) { const el = document.getElementById('forgeArtist'); if (el) el.value = ctx.artist_username; }
  if (ctx.event) { const el = document.getElementById('forgeEvent'); if (el) el.value = ctx.event; }
  if (ctx.release) { const el = document.getElementById('forgeRelease'); if (el) el.value = ctx.release; }
  if (ctx.artist_list) { const el = document.getElementById('forgeArtistList'); if (el) el.value = ctx.artist_list; }
  if (ctx.freeform) document.getElementById('forgeFreeform').value = ctx.freeform;
  forgeGeneratedContent = item.content;
  forgeGeneratedImageUrl = item.imageUrl || '';
  document.getElementById('forgeOutputArea').innerHTML = `<textarea class="forge-output" id="forgeOutputText" oninput="forgeGeneratedContent=this.value;updateCharCount()">${esc(item.content)}</textarea>`;
  document.getElementById('forgeActions').style.display = 'block';
  // Restore image if present
  const imgArea = document.getElementById('forgeImageArea');
  if (forgeGeneratedImageUrl) {
    imgArea.style.display = 'block';
    imgArea.innerHTML = `<img src="${forgeGeneratedImageUrl}" class="forge-image-preview" alt="Generated image">`;
    document.getElementById('btnRegenImage').style.display = '';
    document.getElementById('btnDownloadImage').style.display = '';
  } else {
    imgArea.style.display = 'none';
    imgArea.innerHTML = '';
  }
  updateCharCount();
}

async function copyStashItem(id) {
  const lib = getContentLibrary();
  const item = lib.find(i => i.id === id);
  if (!item) return;
  try { await navigator.clipboard.writeText(item.content); } catch(e) {}
}

async function deleteStashItem(id) {
  _stashCache = _stashCache.filter(i => i.id !== id);
  renderStash();
  updateStashCount();
  try {
    await scAuth.authedFetch(`${forgeApiUrl}/api/stash/${id}`, { method: 'DELETE' });
  } catch (e) { console.warn('stash delete failed', e); }
}

// ── Content-type picker (custom button grid) ──────────
// Replaces the native <select> so we can render bespoke SVG icons
// (browser <option> elements can't host SVGs). Hidden input keeps
// the .value get/set API the rest of firepit.js depends on.
document.addEventListener('DOMContentLoaded', () => {
  const picker = document.getElementById('forgePicker');
  if (!picker) return;
  const hidden = document.getElementById('forgeContentType');
  picker.querySelectorAll('.forge-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.forge-picker-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hidden.value = btn.dataset.value;
      hidden.dispatchEvent(new Event('change'));
    });
  });
});
