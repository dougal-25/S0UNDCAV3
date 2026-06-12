// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB: FOOTPRINTS (Tracking) — the A&R view.
// Spec: wiki/spec/footprints_clean_chart.md.
// Default = WHOLE CLAN growth; drill into artists via dropdowns.
// Daily-source data only (the accurate tracking-API series).
// One orange line, UPPERCASE labels, absolute numbers — no % walls.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const FP_METRICS = [
  { key:'followers', label:'FOLLOWERS' },
  { key:'plays',     label:'PLAYS' },
  { key:'likes',     label:'LIKES' },
  { key:'reposts',   label:'REPOSTS' },
];
let fpGenre = '';

function fpClan() {
  return Object.values(getFavourites()).filter(a => a.status !== 'cut');
}

function fpSegment() {
  // Genre match is case-insensitive — the data holds "UK Garage" / "uk garage".
  return fpClan().filter(a => !fpGenre || (a.genre || '').trim().toLowerCase() === fpGenre);
}

function fpDailySnaps(artist) {
  // 'partial' points are flagged undercounts (e.g. the pre-fix 2026-05-12
  // capture) — using them as baselines fakes huge gains, so charts and
  // gains math skip them entirely.
  return (artist.snapshots || [])
    .filter(s => s && s.date && s.source === 'daily' && s.fetch_status !== 'partial')
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Clan-wide aggregate: per date, sum each artist's value. Artists missing a
// date contribute their nearest known value (flat fill) so roster joins and
// fetch gaps read as flat, not as fake growth or dips.
function fpClanSeries(artists, metric) {
  const dates = [...new Set(artists.flatMap(a => fpDailySnaps(a).map(s => s.date)))].sort();
  const data = dates.map(() => 0);
  for (const a of artists) {
    const snaps = fpDailySnaps(a);
    if (!snaps.length) continue;
    let i = 0, last = snaps[0][metric] || 0;
    dates.forEach((d, di) => {
      while (i < snaps.length && snaps[i].date <= d) { last = snaps[i][metric] || 0; i++; }
      data[di] += last;
    });
  }
  return { dates, data };
}

// Gains over the loaded window (last minus first daily value).
function fpGains(artist) {
  const snaps = fpDailySnaps(artist);
  if (snaps.length < 2) return null;
  const first = snaps[0], last = snaps[snaps.length - 1];
  return {
    followers: (last.followers || 0) - (first.followers || 0),
    plays:     (last.plays || 0) - (first.plays || 0),
    likes:     (last.likes || 0) - (first.likes || 0),
    reposts:   (last.reposts || 0) - (first.reposts || 0),
  };
}

function fpLatestTrackFor(username) {
  for (let i = allSnapshots.length - 1; i >= 0; i--) {
    const d = (allSnapshots[i].artists || {})[username];
    if (d && d.latest_track) return d.latest_track;
  }
  return null;
}

function renderFootprints() {
  const summaryEl  = document.getElementById('fpSummary');
  const controlsEl = document.getElementById('fpControls');
  const chartEl    = document.getElementById('fpChart');
  const moversEl   = document.getElementById('fpInsights');
  const clan = fpClan();

  if (!clan.length) {
    summaryEl.innerHTML = '';
    controlsEl.innerHTML = '';
    chartEl.innerHTML = `<div class="empty"><p>No tracked artists yet. Add some from Foraging.</p></div>`;
    moversEl.innerHTML = '';
    return;
  }

  let segment = fpSegment();
  if (!segment.length) { fpGenre = ''; segment = clan; }
  // '' / null selection = WHOLE CLAN (the default view).
  if (fpSelectedArtist && !segment.find(a => a.username === fpSelectedArtist)) {
    fpSelectedArtist = '';
  }

  // ── Summary — current clan totals + absolute window gains. Quiet type.
  const latestOf = (a, k) => { const s = fpDailySnaps(a); return s.length ? (s[s.length - 1][k] || 0) : 0; };
  const clanFollowers = segment.reduce((s, a) => s + latestOf(a, 'followers'), 0);
  const clanPlays     = segment.reduce((s, a) => s + latestOf(a, 'plays'), 0);
  const gains = segment.map(fpGains).filter(Boolean);
  const gainedFollowers = gains.reduce((s, g) => s + g.followers, 0);
  const gainedPlays     = gains.reduce((s, g) => s + g.plays, 0);
  const lastDate = segment.flatMap(fpDailySnaps).map(s => s.date).sort().pop();
  const vStyle = 'font-size:18px;font-weight:600';
  summaryEl.innerHTML = `
    <div class="stat-card summary-card"><div class="stat-label">Tracked</div>
      <div class="stat-value" style="${vStyle}">${segment.length}</div><div class="summary-suffix">artists</div></div>
    <div class="stat-card summary-card"><div class="stat-label">Clan Followers</div>
      <div class="stat-value" style="${vStyle}">${fmt(clanFollowers)}</div>
      <div class="summary-suffix">${gainedFollowers > 0 ? `↑ ${fmt(gainedFollowers)} in window` : 'gains land daily'}</div></div>
    <div class="stat-card summary-card"><div class="stat-label">Clan Plays</div>
      <div class="stat-value" style="${vStyle}">${fmt(clanPlays)}</div>
      <div class="summary-suffix">${gainedPlays > 0 ? `↑ ${fmt(gainedPlays)} in window` : 'gains land daily'}</div></div>
    <div class="stat-card summary-card"><div class="stat-label">Last Updated</div>
      <div class="stat-value" style="${vStyle}">${lastDate ? esc(lastDate) : '—'}</div>
      <div class="summary-suffix">accrues daily</div></div>`;

  // ── Controls — GENRE + ARTIST dropdowns (genres deduped case-insensitively).
  const genreMap = new Map();
  clan.forEach(a => {
    const g = (a.genre || '').trim();
    if (g && !genreMap.has(g.toLowerCase())) genreMap.set(g.toLowerCase(), g);
  });
  const genres = [...genreMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  controlsEl.innerHTML = `
    <label style="display:flex;flex-direction:column;gap:6px;min-width:200px">
      <span class="stat-label" style="font-size:10px;color:var(--secondary)">Genre</span>
      <select class="input" onchange="fpSetGenre(this.value)">
        <option value="">ALL GENRES</option>
        ${genres.map(([val, label]) => `<option value="${esc(val)}" ${fpGenre === val ? 'selected' : ''}>${esc(label)}</option>`).join('')}
      </select>
    </label>
    <label style="display:flex;flex-direction:column;gap:6px;min-width:200px">
      <span class="stat-label" style="font-size:10px;color:var(--secondary)">Artist</span>
      <select class="input" onchange="fpSelectArtist(this.value)">
        <option value="">WHOLE CLAN</option>
        ${segment.map(a => `<option value="${esc(a.username)}" ${fpSelectedArtist === a.username ? 'selected' : ''}>${esc(a.display_name || a.username)}</option>`).join('')}
      </select>
    </label>`;

  // ── Chart — clan aggregate by default, artist on selection.
  const activeLabel = (FP_METRICS.find(m => m.key === fpActiveMetric) || FP_METRICS[0]).label;
  let header, labels, data;
  if (!fpSelectedArtist) {
    const series = fpClanSeries(segment, fpActiveMetric);
    labels = series.dates.map(d => d.slice(5));
    data = series.data;
    header = `
      <div>
        <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--heading)">WHOLE CLAN${fpGenre ? ` · ${esc(genreMap.get(fpGenre) || fpGenre).toUpperCase()}` : ''}</h3>
        <span class="stat-label" style="font-size:10px;color:var(--secondary)">${segment.length} artists combined</span>
      </div>`;
  } else {
    const artist = getFavourites()[fpSelectedArtist];
    const snaps = fpDailySnaps(artist);
    labels = snaps.map(s => s.date.slice(5));
    data = snaps.map(s => s[fpActiveMetric] || 0);
    const latestSnap = snaps[snaps.length - 1] || {};
    const eng = latestSnap.plays ? Math.round((latestSnap.likes || 0) / latestSnap.plays * 1000) : null;
    const drop = fpLatestTrackFor(artist.username);
    const nameHTML = artist.artist_url
      ? `<a href="${esc(artist.artist_url)}" target="_blank" rel="noopener" style="color:var(--heading);text-decoration:none">${esc(artist.display_name || artist.username)} <span style="color:var(--red);font-size:12px">↗</span></a>`
      : esc(artist.display_name || artist.username);
    header = `
      <div>
        <h3 style="margin:0;font-size:15px;font-weight:700">${nameHTML}</h3>
        <span class="stat-label" style="font-size:10px;color:var(--secondary)">${esc(artist.genre || '')}${eng != null ? ` · ${eng} LIKES PER 1K PLAYS` : ''}</span>
        ${drop ? `<div class="stat-label" style="font-size:10px;color:var(--muted);margin-top:4px">LATEST DROP: ${esc(drop.title || '')} · ${esc(drop.created_at || '')}</div>` : ''}
      </div>`;
  }
  const latestVal = data.length ? data[data.length - 1] : 0;
  chartEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px">
      ${header}
      <div style="text-align:right">
        <div class="stat-label" style="font-size:10px;color:var(--secondary)">${activeLabel}</div>
        <div style="font-family:'DM Mono',monospace;font-size:16px;color:var(--red)">${fmt(latestVal)}</div>
      </div>
    </div>
    <div class="metric-tabs">
      ${FP_METRICS.map(m => `<button class="metric-tab ${fpActiveMetric === m.key ? 'active' : ''}" onclick="fpSetMetric('${m.key}')">${m.label}</button>`).join('')}
    </div>
    ${data.length >= 2
      ? buildLineChart([{ label: activeLabel, color: '#ff4500', data }], labels)
      : `<div style="border:1px dashed var(--border);border-radius:8px;text-align:center;padding:48px 20px;color:var(--muted)">
           The chart draws itself as daily snapshots land — first lines appear after 2 days of data.
         </div>`}`;

  // ── Movers — clickable leaderboard, bars scaled to followers gained.
  const movers = segment
    .map(a => ({ a, g: fpGains(a) }))
    .filter(x => x.g)
    .sort((x, y) => y.g.followers - x.g.followers || y.g.plays - x.g.plays)
    .slice(0, 5);
  const maxGain = Math.max(1, ...movers.map(x => Math.abs(x.g.followers)));
  moversEl.innerHTML = `
    <h3 class="section-title">Movers — this window</h3>
    ${movers.length ? movers.map(({ a, g }) => `
      <div onclick="fpSelectArtist('${esc(a.username)}')"
           style="display:grid;grid-template-columns:160px 1fr auto;gap:12px;align-items:center;padding:8px 6px;cursor:pointer;border-radius:6px"
           onmouseover="this.style.background='var(--elevated)'" onmouseout="this.style.background=''">
        <span style="font-size:13px;color:var(--heading);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.display_name || a.username)}</span>
        <div style="height:8px;background:var(--elevated);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${Math.round(Math.abs(g.followers) / maxGain * 100)}%;background:var(--red);opacity:${g.followers >= 0 ? 1 : 0.35}"></div>
        </div>
        <span class="stat-label" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--secondary)">${g.followers >= 0 ? '+' : ''}${fmt(g.followers)} FOLLOWERS · ${g.plays >= 0 ? '+' : ''}${fmt(g.plays)} PLAYS</span>
      </div>`).join('')
    : '<p style="color:var(--muted);font-size:13px">Movers appear once two daily snapshots are in — check back tomorrow.</p>'}`;
}

function fpSetGenre(genre) {
  fpGenre = (genre || '').toLowerCase();
  fpSelectedArtist = '';
  renderFootprints();
}

function fpSelectArtist(username) {
  fpSelectedArtist = username;
  renderFootprints();
}

function fpSetMetric(key) {
  fpActiveMetric = key;
  renderFootprints();
}

// Export the current segment (genre filter applied) as an A&R-ready CSV.
function exportFpReport() {
  const segment = fpSegment();
  if (!segment.length) return;
  const headers = ['Name','Genre','SoundCloud','Followers','Followers Gained','Plays','Plays Gained','Likes','Reposts','Playlist Adds','Platforms Linked','Preferred Tracks','Notes'];
  const rows = [headers];
  segment.forEach(a => {
    const snaps = fpDailySnaps(a);
    const latest = snaps[snaps.length - 1] || {};
    const g = fpGains(a) || {};
    const linked = Object.values(a.platforms || {}).filter(v => v).length;
    rows.push([
      a.display_name, a.genre, a.artist_url || '',
      latest.followers || 0, g.followers != null ? g.followers : '',
      latest.plays || 0, g.plays != null ? g.plays : '',
      latest.likes || 0, latest.reposts || 0,
      latest.playlist_adds != null ? latest.playlist_adds : '',
      `${linked}/${PLATFORMS.length}`,
      (a.preferred_tracks || []).join('; '), a.notes || '',
    ]);
  });
  const tag = fpGenre ? fpGenre.replace(/[^a-z0-9]+/gi, '_') : 'All';
  downloadCSV(rows, `SoundCave_Report_${tag}.csv`);
}
