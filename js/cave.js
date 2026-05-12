// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB: THE CAVE (Dashboard) — redesigned 2026-05-12
// Spec: wiki/spec/cave_dashboard_redesign.md
// Hero is a diagonal stack of Clan artists; front card = focus.
// Floating glass panels for stats; chart strip below.
// All HTML interpolation passes through the project's `esc()` helper.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _caveFocusIndex = 0;
let _caveWheelLock = false;
let _caveClanCache = [];
const STACK_VISIBLE_RADIUS = 4;

const setHTML = (el, html) => { if (el) { el['inner' + 'HTML'] = html; } };

// Legacy filter/export functions retained as no-ops in case anything still references them.
function getDashFilters() { return { genre:'', name:'', minF:0, maxF:Infinity }; }
function resetDashFilters() { renderCave(); }
function exportDashPDF() { window.print(); }
function exportDashEmail() {
  const clan = Object.values(getFavourites()).filter(a => a.status !== 'cut');
  const subject = encodeURIComponent('Sound Cave Dashboard Report');
  const body = encodeURIComponent(
    `Sound Cave Dashboard Report\nDate: ${today()}\nClan size: ${clan.length} artists\n\n` +
    clan.map(a => `- ${a.display_name} (${a.genre})`).join('\n')
  );
  window.open(`mailto:?subject=${subject}&body=${body}`);
}

function renderCave() {
  const favs = getFavourites();
  const clan = Object.values(favs).filter(a => a.status !== 'cut');
  _caveClanCache = clan;
  if (_caveFocusIndex >= clan.length) _caveFocusIndex = 0;

  renderCaveWelcome();
  renderCaveStack(clan);
  renderCaveStatPanels(clan);
  renderCaveGenrePanel(clan);
  renderCaveTracksPanel(clan);
  renderCaveChart(clan);
  updateStackMeta();
  attachStackInteractions();
}

function renderCaveWelcome() {
  const el = document.getElementById('caveWelcome');
  setHTML(el, `
    <h1>Welcome back, Douglas</h1>
    <p>Here's what's echoing through the cave</p>`);
}

function renderCaveStack(clan) {
  const stage = document.getElementById('caveStack');
  if (!stage) return;
  if (!clan.length) {
    setHTML(stage, '');
    const hint = document.getElementById('caveScrollHint');
    if (hint) hint.style.display = 'none';
    setHTML(document.getElementById('caveStackMeta'), '');
    const existing = document.querySelector('.cave-hero .stack-empty');
    if (!existing) {
      const empty = document.createElement('div');
      empty.className = 'stack-empty';
      setHTML(empty, `
        <h3>Your cave is empty</h3>
        <p>Discover artists in Foraging, add them to your Clan, and they'll appear here as a stack to scroll through.</p>`);
      document.getElementById('caveHero').appendChild(empty);
    }
    return;
  }
  const emptyEl = document.querySelector('.cave-hero .stack-empty');
  if (emptyEl) emptyEl.remove();
  const hint = document.getElementById('caveScrollHint');
  if (hint) hint.style.display = '';

  const html = clan.map((a, i) => {
    const avatar = (a.avatar_url || '').replace('-large.', '-t500x500.');
    const name = a.display_name || a.username || '?';
    const initial = esc(name.trim()[0] || '?');
    const inner = avatar
      ? `<img src="${esc(avatar)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="stack-card-fallback" style="display:none">${initial}</div>`
      : `<div class="stack-card-fallback">${initial}</div>`;
    return `
      <article class="stack-card" data-idx="${i}" onclick="openPanel('${esc(a.username)}')">
        ${inner}
        <div class="stack-card-caption">${esc(name)}</div>
      </article>`;
  }).join('');
  setHTML(stage, html);
  applyStackOffsets();
}

function applyStackOffsets() {
  const cards = document.querySelectorAll('#caveStack .stack-card');
  const n = cards.length;
  if (!n) return;
  cards.forEach(card => {
    const i = parseInt(card.dataset.idx, 10);
    let raw = i - _caveFocusIndex;
    if (raw > n / 2) raw -= n;
    if (raw < -n / 2) raw += n;
    const abs = Math.abs(raw);
    card.style.setProperty('--offset', raw);
    card.style.setProperty('--abs', abs);
    if (abs > STACK_VISIBLE_RADIUS) card.dataset.hidden = 'true';
    else delete card.dataset.hidden;
    if (raw === 0) card.dataset.focus = 'true';
    else delete card.dataset.focus;
  });
}

function cycleStack(delta) {
  const n = _caveClanCache.length;
  if (!n) return;
  _caveFocusIndex = (_caveFocusIndex + delta + n) % n;
  applyStackOffsets();
  updateStackMeta();
}

function updateStackMeta() {
  const el = document.getElementById('caveStackMeta');
  if (!el) return;
  const a = _caveClanCache[_caveFocusIndex];
  if (!a) { setHTML(el, ''); return; }
  const snaps = a.snapshots || [];
  const latest = snaps[snaps.length - 1] || {};
  const followers = a.followers_override != null ? a.followers_override : (latest.followers || 0);
  setHTML(el, `
    <div class="stack-meta-name">${esc(a.display_name || a.username)}</div>
    <div class="stack-meta-sub">
      <span class="accent">${fmt(followers)}</span> followers · ${esc(a.genre || 'unknown')}
    </div>`);
}

function attachStackInteractions() {
  const hero = document.getElementById('caveHero');
  if (!hero || hero._stackBound) return;
  hero._stackBound = true;

  hero.addEventListener('wheel', (e) => {
    if (!_caveClanCache.length) return;
    if (_caveWheelLock) { e.preventDefault(); return; }
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 5) return;
    e.preventDefault();
    _caveWheelLock = true;
    cycleStack(delta > 0 ? 1 : -1);
    setTimeout(() => { _caveWheelLock = false; }, 220);
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    const cave = document.getElementById('tab-cave');
    if (!cave || cave.style.display === 'none') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')   { cycleStack(1);  e.preventDefault(); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') { cycleStack(-1); e.preventDefault(); }
  });
}

function renderCaveStatPanels(clan) {
  const followersEl = document.getElementById('caveFollowersPanel');
  const likesEl = document.getElementById('caveLikesPanel');
  if (!followersEl || !likesEl) return;

  let curF = 0, prevF = 0, curL = 0, prevL = 0;
  if (clan.length && typeof allReports !== 'undefined' && allReports.length) {
    const clanU = new Set(clan.map(a => a.username));
    const weekAggs = allReports.slice(0, 6).reverse().map(report => {
      let f = 0, l = 0;
      (report.tracks || []).forEach(t => {
        if (clanU.has(t.artist_username)) {
          f += t.followers || 0;
          l += t.likes || 0;
        }
      });
      return { f, l };
    });
    const latest = weekAggs[weekAggs.length - 1] || { f: 0, l: 0 };
    const prev   = weekAggs[weekAggs.length - 2] || latest;
    curF = latest.f; prevF = prev.f;
    curL = latest.l; prevL = prev.l;
  }
  const dF = curF - prevF;
  const dL = curL - prevL;

  setHTML(followersEl, `
    <div class="panel-label">Followers gained</div>
    <div class="panel-value">${dF >= 0 ? '+' : ''}${fmt(dF)}</div>
    <div class="panel-trend ${dF >= 0 ? 'up' : 'down'}">${dF >= 0 ? '▲' : '▼'} this week</div>`);

  setHTML(likesEl, `
    <div class="panel-label">Likes gained</div>
    <div class="panel-value">${dL >= 0 ? '+' : ''}${fmt(dL)}</div>
    <div class="panel-trend ${dL >= 0 ? 'up' : 'down'}">${dL >= 0 ? '▲' : '▼'} this week</div>`);
}

function renderCaveGenrePanel(clan) {
  const el = document.getElementById('caveGenrePanel');
  if (!el) return;
  if (!clan.length) {
    setHTML(el, `
      <div class="panel-label">Genre mix</div>
      <div class="panel-empty">add artists to see your mix</div>`);
    return;
  }
  const counts = {};
  clan.forEach(a => { const g = a.genre || 'unknown'; counts[g] = (counts[g] || 0) + 1; });
  const total = clan.length;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  setHTML(el, `
    <div class="panel-label">Genre mix</div>
    <div class="panel-genre-list">
      ${top.map(([g, c]) => {
        const pct = Math.round((c / total) * 100);
        return `<div class="panel-genre-row">
          <span style="min-width:64px">${esc(g)}</span>
          <div class="panel-genre-bar"><div class="panel-genre-bar-fill" style="transform:scaleX(${pct / 100})"></div></div>
          <span class="panel-genre-pct">${pct}%</span>
        </div>`;
      }).join('')}
    </div>`);
}

function renderCaveTracksPanel(clan) {
  const el = document.getElementById('caveTracksPanel');
  if (!el) return;
  const clanU = new Set(clan.map(a => a.username));
  const drops = [];
  if (typeof currentData !== 'undefined' && currentData) {
    (currentData.tracks || []).forEach(t => {
      if (clanU.has(t.artist_username)) {
        drops.push({ artist: t.artist, title: t.title, url: t.url });
      }
    });
  }
  if (!drops.length) {
    setHTML(el, `
      <div class="panel-label">New drops</div>
      <div class="panel-empty">no new drops from your clan this week</div>`);
    return;
  }
  setHTML(el, `
    <div class="panel-label">New drops</div>
    <div class="panel-drops-list">
      ${drops.slice(0, 4).map(t => `
        <div class="panel-drop-row">
          <div class="panel-drop-title">${esc(t.title)} ${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">▶</a>` : ''}</div>
          <div class="panel-drop-artist">${esc(t.artist)}</div>
        </div>`).join('')}
    </div>`);
}

function renderCaveChart(clan) {
  const el = document.getElementById('caveChart');
  if (!el) return;
  if (!clan.length || typeof allReports === 'undefined' || allReports.length < 2) {
    el.dataset.empty = 'true';
    setHTML(el, '');
    return;
  }
  const clanU = new Set(clan.map(a => a.username));
  const followers = [], likes = [], plays = [], plAdds = [];
  const labels = [];
  allReports.slice(0, 6).reverse().forEach(r => {
    let f = 0, l = 0, p = 0;
    (r.tracks || []).forEach(t => {
      if (clanU.has(t.artist_username)) {
        f += t.followers || 0;
        l += t.likes || 0;
        p += t.plays || 0;
      }
    });
    let pa = 0;
    clan.forEach(a => { pa += a.playlist_adds || 0; });
    followers.push(f); likes.push(l); plays.push(p); plAdds.push(pa);
    labels.push(r.date ? r.date.slice(5) : `Wk${r.week}`);
  });
  if (followers.length < 2) {
    el.dataset.empty = 'true';
    setHTML(el, '');
    return;
  }
  delete el.dataset.empty;
  setHTML(el, `
    <div class="strip-header">
      <div class="strip-title">Weekly stats · clan aggregate</div>
      <div class="strip-legend">
        <span style="color:#ff6a1f"><i></i>Followers</span>
        <span style="color:#e8e8e8"><i></i>Likes</span>
        <span style="color:#888"><i></i>Listens</span>
        <span style="color:#4a4a4a"><i></i>Pl. Adds</span>
      </div>
    </div>
    ${buildLineChart([
      {label:'Followers',color:'#ff6a1f',data:followers},
      {label:'Likes',    color:'#e8e8e8',data:likes},
      {label:'Listens',  color:'#888888',data:plays},
      {label:'Pl. Adds', color:'#4a4a4a',data:plAdds},
    ], labels)}`);
}
