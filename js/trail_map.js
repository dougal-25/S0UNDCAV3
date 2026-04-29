// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRAIL MAP — content calendar
// Pure frontend, mock data via localStorage.
// TODO: replace mock store with /api/scheduled-posts (Stream 1 Phase G)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TRAIL_STORE_KEY = 'sc_scheduled_posts';
const PLATFORMS = [
  { id: 'ig',       label: 'Instagram' },
  { id: 'tiktok',   label: 'TikTok' },
  { id: 'x',        label: 'X' },
  { id: 'linkedin', label: 'LinkedIn' },
];

let trailView = 'month';                    // 'month' | 'week'
let trailAnchor = startOfDay(new Date());   // any date in the visible period
let trailStashOpen = false;
let trailEditingId = null;                  // id of scheduled_post being edited in modal

// ── Storage ──────────────────────────────────────────────
function getScheduled()  { return JSON.parse(localStorage.getItem(TRAIL_STORE_KEY) || '[]'); }
function saveScheduled(d){ localStorage.setItem(TRAIL_STORE_KEY, JSON.stringify(d)); }

function newScheduledPost(stash_item_id, dateISO) {
  return {
    id: 'sp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    stash_item_id,
    scheduled_for: dateISO,
    platforms: ['ig'],
    status: 'scheduled',
    error_message: null,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  };
}

// ── Date helpers ─────────────────────────────────────────
function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d) {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7;        // 0 = Mon
  x.setDate(x.getDate() - dow);
  return x;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}
function fmtPeriod(date, view) {
  if (view === 'week') {
    const s = startOfWeek(date);
    const e = addDays(s, 6);
    const sM = s.toLocaleDateString('en-GB', { month: 'short' });
    const eM = e.toLocaleDateString('en-GB', { month: 'short' });
    if (sM === eM) return `${s.getDate()}–${e.getDate()} ${sM} ${e.getFullYear()}`;
    return `${s.getDate()} ${sM} – ${e.getDate()} ${eM} ${e.getFullYear()}`;
  }
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
function isoForCellDefault(date) {
  // Default scheduled time = 12:00 local on the dropped date
  const x = new Date(date);
  x.setHours(12, 0, 0, 0);
  return x.toISOString();
}
function localInputValue(iso) {
  // Convert ISO to value usable by <input type="datetime-local">
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Stash (read-only here; sourced from Firepit's cache) ──
function getTrailStash() {
  // Stream 1 hydrates _stashCache from /api/stash; fall back to legacy
  // localStorage so this view still renders if firepit.js hasn't loaded yet.
  if (typeof getContentLibrary === 'function') return getContentLibrary();
  return JSON.parse(localStorage.getItem('sc_content_library') || '[]');
}

// ── Render ───────────────────────────────────────────────
function renderTrailMap() {
  document.getElementById('trailPeriod').textContent = fmtPeriod(trailAnchor, trailView);
  document.querySelectorAll('.trail-view-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.view === trailView);
  });
  if (trailView === 'month') renderTrailMonth();
  else renderTrailWeek();
  renderTrailStashDrawer();
  updateTrailStashCount();
}

function renderTrailMonth() {
  const grid = document.getElementById('trailGrid');
  const first = startOfMonth(trailAnchor);
  const gridStart = startOfWeek(first);
  // 6 weeks always, so grid is stable height
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push(d);
  }
  const today = startOfDay(new Date());
  const monthIdx = first.getMonth();
  const scheduled = getScheduled();
  const stash = getTrailStash();

  grid.className = 'trail-grid';
  grid.innerHTML = `
    <div class="trail-weekdays">
      ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="trail-weekday">${d}</div>`).join('')}
    </div>
    <div class="trail-month-grid">
      ${cells.map(d => trailCellHTML(d, monthIdx, today, scheduled, stash, false)).join('')}
    </div>`;
  attachCellHandlers();
}

function renderTrailWeek() {
  const grid = document.getElementById('trailGrid');
  const start = startOfWeek(trailAnchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = startOfDay(new Date());
  const scheduled = getScheduled();
  const stash = getTrailStash();

  grid.className = 'trail-grid';
  grid.innerHTML = `
    <div class="trail-weekdays">
      ${days.map(d => `<div class="trail-weekday">${d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>`).join('')}
    </div>
    <div class="trail-week-grid">
      ${days.map(d => trailCellHTML(d, d.getMonth(), today, scheduled, stash, true)).join('')}
    </div>`;
  attachCellHandlers();
}

function trailCellHTML(date, currentMonth, today, scheduled, stash, isWeek) {
  const inMonth = date.getMonth() === currentMonth;
  const isToday = isSameDay(date, today);
  const dayPosts = scheduled
    .filter(p => isSameDay(new Date(p.scheduled_for), date))
    .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));

  const dateLabel = isWeek
    ? `<span class="trail-weekday-num">${date.getDate()}</span>`
    : `<span class="trail-date">${date.getDate()}</span>`;

  const visible = isWeek ? dayPosts : dayPosts.slice(0, 3);
  const hidden = isWeek ? 0 : Math.max(0, dayPosts.length - 3);

  const pills = visible.map(p => trailPillHTML(p, stash)).join('');
  const more = hidden ? `<div class="trail-more" data-date="${date.toISOString()}">+${hidden} more</div>` : '';

  return `<div class="trail-cell ${inMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}"
                data-date="${date.toISOString()}">
    ${dateLabel}
    <div class="trail-cell-pills">${pills}${more}</div>
  </div>`;
}

function trailPillHTML(post, stash) {
  const item = stash.find(s => s.id === post.stash_item_id);
  const ico = item?.icon || '📝';
  const title = item ? (item.label || item.type) : '(missing stash item)';
  const dots = post.platforms.map(() => `<span class="dot"></span>`).join('');
  return `<div class="trail-pill ${post.status}" data-id="${post.id}">
    <span class="ico">${ico}</span>
    <span class="title">${esc(title)}</span>
    <span class="dots">${dots}</span>
  </div>`;
}

// ── Stash drawer ─────────────────────────────────────────
function renderTrailStashDrawer() {
  const drawer = document.getElementById('trailStashDrawer');
  drawer.classList.toggle('open', trailStashOpen);
  if (!trailStashOpen) return;

  const stash = getTrailStash().filter(i => i.status !== 'archived');
  const list = document.getElementById('trailStashList');
  if (!stash.length) {
    list.innerHTML = `<div class="trail-stash-empty">No content in your Stash yet.<br>Generate something in the Forge first.</div>`;
    return;
  }
  list.innerHTML = stash.map(item => {
    const preview = (item.content || '').slice(0, 80).replace(/\n/g, ' ');
    const thumb = item.imageUrl
      ? `<img class="thumb" src="${item.imageUrl}" alt="">`
      : `<div class="thumb placeholder">${item.icon || '📝'}</div>`;
    return `<div class="trail-stash-card" draggable="true" data-id="${item.id}">
      ${thumb}
      <div class="info">
        <div class="type">${esc(item.label || item.type)}</div>
        <div class="preview">${esc(preview)}</div>
      </div>
    </div>`;
  }).join('');
  attachStashDragHandlers();
}

function updateTrailStashCount() {
  const el = document.getElementById('trailStashCount');
  if (!el) return;
  const n = getTrailStash().filter(i => i.status !== 'archived').length;
  el.textContent = n;
  el.style.display = n ? '' : 'none';
}

// ── Drag & drop ──────────────────────────────────────────
let dragStashId = null;

function attachStashDragHandlers() {
  document.querySelectorAll('.trail-stash-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragStashId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', dragStashId);
    });
    card.addEventListener('dragend', () => {
      dragStashId = null;
      card.classList.remove('dragging');
    });
  });
}

function attachCellHandlers() {
  document.querySelectorAll('.trail-cell').forEach(cell => {
    cell.addEventListener('dragover', e => {
      e.preventDefault();
      cell.classList.add('dragging');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('dragging'));
    cell.addEventListener('drop', e => {
      e.preventDefault();
      cell.classList.remove('dragging');
      const stashId = dragStashId || e.dataTransfer.getData('text/plain');
      if (!stashId) return;
      const dateISO = isoForCellDefault(new Date(cell.dataset.date));
      const post = newScheduledPost(stashId, dateISO);
      const all = getScheduled();
      all.push(post);
      saveScheduled(all);
      renderTrailMap();
      // Open modal pre-filled so user can pick platforms/time
      openTrailModal(post.id);
    });
  });
  document.querySelectorAll('.trail-pill').forEach(pill => {
    pill.addEventListener('click', () => openTrailModal(pill.dataset.id));
  });
}

// ── Modal ────────────────────────────────────────────────
function openTrailModal(id) {
  trailEditingId = id;
  const all = getScheduled();
  const post = all.find(p => p.id === id);
  if (!post) return;
  const stash = getTrailStash();
  const item = stash.find(s => s.id === post.stash_item_id);

  document.getElementById('trailModalContent').textContent = item ? (item.content || '') : '(stash item missing)';
  document.getElementById('trailModalDateTime').value = localInputValue(post.scheduled_for);

  // Platform pills
  const wrap = document.getElementById('trailModalPlatforms');
  wrap.innerHTML = PLATFORMS.map(p => `
    <button type="button" class="trail-platform-pill ${post.platforms.includes(p.id) ? 'selected' : ''}" data-platform="${p.id}">
      ${esc(p.label)}
    </button>`).join('');
  wrap.querySelectorAll('.trail-platform-pill').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });

  // Status
  const statusWrap = document.getElementById('trailModalStatus');
  statusWrap.innerHTML = ['scheduled','posted','failed'].map(s => `
    <button type="button" class="trail-status-pill ${post.status === s ? 'selected' : ''}" data-status="${s}">${s}</button>
  `).join('');
  statusWrap.querySelectorAll('.trail-status-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      statusWrap.querySelectorAll('.trail-status-pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  document.getElementById('trailModalOverlay').classList.add('open');
}

function closeTrailModal() {
  document.getElementById('trailModalOverlay').classList.remove('open');
  trailEditingId = null;
}

function saveTrailModal() {
  const id = trailEditingId;
  if (!id) return;
  const all = getScheduled();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return;

  const dtVal = document.getElementById('trailModalDateTime').value;
  const platforms = [...document.querySelectorAll('#trailModalPlatforms .trail-platform-pill.selected')]
    .map(b => b.dataset.platform);
  const status = document.querySelector('#trailModalStatus .trail-status-pill.selected')?.dataset.status || 'scheduled';

  if (dtVal) all[idx].scheduled_for = new Date(dtVal).toISOString();
  all[idx].platforms = platforms.length ? platforms : ['ig'];
  all[idx].status = status;
  all[idx].modified_at = new Date().toISOString();

  saveScheduled(all);
  closeTrailModal();
  renderTrailMap();
}

function deleteTrailModal() {
  const id = trailEditingId;
  if (!id) return;
  const all = getScheduled().filter(p => p.id !== id);
  saveScheduled(all);
  closeTrailModal();
  renderTrailMap();
}

// ── Toolbar actions ──────────────────────────────────────
function trailNav(dir) {
  if (trailView === 'month') trailAnchor = addMonths(trailAnchor, dir);
  else trailAnchor = addDays(trailAnchor, dir * 7);
  renderTrailMap();
}
function trailToday() { trailAnchor = startOfDay(new Date()); renderTrailMap(); }
function trailSetView(v) { trailView = v; renderTrailMap(); }
function trailToggleStash() { trailStashOpen = !trailStashOpen; renderTrailMap(); }
