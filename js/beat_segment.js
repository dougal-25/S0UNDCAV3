// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BEAT SEGMENT PICKER — upload a track, scrub the waveform, drag a window
// onto the bit you want. That segment scores the composite video.
// (wiki/spec/forge_beat_segment.md — the slick build of firepit_beat.md's
//  manual clip-picker.) Emits one value to makeBeatVideo: audio_start_seconds.
//
// Pure vanilla — Web Audio API decodes the file to peaks drawn on a <canvas>;
// a drag-window with a box-shadow "spotlight" dims everything outside it (no
// per-frame canvas redraw). Preview auditions ONLY the window via a plain
// <audio> element with an animated playhead. No audio library.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BEAT_PEAK_BUCKETS = 480;   // resolution-independent peak array (resize-safe)
const BEAT_BAR_STEP = 3;         // px per bar (2px bar + 1px gap)

let _beatPeaks = null;           // Float32Array(BEAT_PEAK_BUCKETS) of 0..1 heights
let _beatDur = 0;                // track length, seconds
let _beatClipLen = 10;           // selection window length, seconds (= composite duration)
let _beatStart = 0;              // selected start, seconds
let _beatAudioCtx = null;        // reused AudioContext (decode only)
let _beatObjUrl = null;          // object URL for the preview <audio>
let _beatPreviewRAF = null;

function _beatCtx() {
  _beatAudioCtx = _beatAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
  return _beatAudioCtx;
}

function _beatFmt(s) {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Decode the picked file and show the picker. Async; falls back gracefully if
// the browser can't decode (selection just stays hidden — the file still uploads).
async function beatSegmentInit(file) {
  const seg = document.getElementById('beatSegment');
  const errEl = document.getElementById('forgeBeatError');
  if (errEl) errEl.style.display = 'none';
  _beatStopPreview();
  if (!file) { if (seg) seg.style.display = 'none'; return; }
  try {
    const buf = await _beatCtx().decodeAudioData(await file.arrayBuffer());
    _beatDur = buf.duration;
    _beatClipLen = Math.min(10, _beatDur);
    _beatStart = 0;
    _beatPeaks = _beatComputePeaks(buf, BEAT_PEAK_BUCKETS);
    if (_beatObjUrl) URL.revokeObjectURL(_beatObjUrl);
    _beatObjUrl = URL.createObjectURL(file);
    const audio = document.getElementById('beatSegAudio');
    if (audio) audio.src = _beatObjUrl;
    if (seg) seg.style.display = 'block';
    // Panel was display:none → measure after a frame so clientWidth is real.
    requestAnimationFrame(() => { _beatDrawWave(); _beatLayout(); });
  } catch (e) {
    if (seg) seg.style.display = 'none';
    if (errEl) { errEl.textContent = `Couldn't read that audio (${e.message}). It'll still upload.`; errEl.style.display = 'block'; }
  }
}

// Max-abs over channel 0, bucketed. One pass, O(samples).
function _beatComputePeaks(buf, buckets) {
  const data = buf.getChannelData(0);
  const per = Math.max(1, Math.floor(data.length / buckets));
  const peaks = new Float32Array(buckets);
  let max = 0.0001;
  for (let b = 0; b < buckets; b++) {
    let peak = 0;
    const start = b * per;
    for (let i = 0; i < per; i++) {
      const v = Math.abs(data[start + i] || 0);
      if (v > peak) peak = v;
    }
    peaks[b] = peak;
    if (peak > max) max = peak;
  }
  for (let b = 0; b < buckets; b++) peaks[b] /= max;   // normalise to 0..1
  return peaks;
}

function _beatDrawWave() {
  const canvas = document.getElementById('beatWave');
  const wrap = document.getElementById('beatWaveWrap');
  if (!canvas || !wrap || !_beatPeaks) return;
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth, h = wrap.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#ff4500';
  const bars = Math.floor(w / BEAT_BAR_STEP);
  const mid = h / 2;
  for (let i = 0; i < bars; i++) {
    const peak = _beatPeaks[Math.floor((i / bars) * _beatPeaks.length)] || 0;
    const barH = Math.max(2, peak * (h - 6));
    ctx.fillRect(i * BEAT_BAR_STEP, mid - barH / 2, 2, barH);
  }
}

// Position the window + time label from _beatStart / _beatClipLen.
function _beatLayout() {
  const wrap = document.getElementById('beatWaveWrap');
  const win = document.getElementById('beatSegWindow');
  const time = document.getElementById('beatSegTime');
  if (!wrap || !win || !_beatDur) return;
  const w = wrap.clientWidth;
  const winW = Math.max(18, (_beatClipLen / _beatDur) * w);
  const maxLeft = w - winW;
  const left = Math.min(maxLeft, Math.max(0, (_beatStart / _beatDur) * w));
  win.style.width = winW + 'px';
  win.style.left = left + 'px';
  if (time) time.textContent = `${_beatFmt(_beatStart)} – ${_beatFmt(_beatStart + _beatClipLen)}`;
}

// ── Drag the window to pick the start ──────────────────────
function _beatPointerDown(e) {
  const wrap = document.getElementById('beatWaveWrap');
  const win = document.getElementById('beatSegWindow');
  if (!wrap || !win || !_beatDur) return;
  e.preventDefault();
  _beatStopPreview();
  const w = wrap.clientWidth;
  const winW = win.offsetWidth;
  const maxLeft = w - winW;
  const grab = e.clientX - win.offsetLeft;
  const onMove = (ev) => {
    const left = Math.min(maxLeft, Math.max(0, ev.clientX - grab));
    _beatStart = (left / w) * _beatDur;
    _beatLayout();
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

// ── Preview: audition ONLY the selected window, animated playhead ──
function beatSegmentPreview() {
  const audio = document.getElementById('beatSegAudio');
  const btn = document.getElementById('beatSegPlay');
  if (!audio || !_beatObjUrl) return;
  if (!audio.paused) { _beatStopPreview(); return; }
  audio.currentTime = _beatStart;
  audio.play().then(() => {
    if (btn) btn.textContent = '▮▮';
    const head = document.getElementById('beatSegPlayhead');
    const wrap = document.getElementById('beatWaveWrap');
    if (head) head.style.display = 'block';
    const tick = () => {
      if (audio.paused) return;
      if (audio.currentTime >= _beatStart + _beatClipLen) { _beatStopPreview(); return; }
      if (head && wrap) head.style.left = ((audio.currentTime / _beatDur) * wrap.clientWidth) + 'px';
      _beatPreviewRAF = requestAnimationFrame(tick);
    };
    _beatPreviewRAF = requestAnimationFrame(tick);
  }).catch(() => {});
}

function _beatStopPreview() {
  const audio = document.getElementById('beatSegAudio');
  const btn = document.getElementById('beatSegPlay');
  const head = document.getElementById('beatSegPlayhead');
  if (_beatPreviewRAF) { cancelAnimationFrame(_beatPreviewRAF); _beatPreviewRAF = null; }
  if (audio && !audio.paused) audio.pause();
  if (btn) btn.textContent = '▶';
  if (head) head.style.display = 'none';
}

// The one value makeBeatVideo reads. 2dp is plenty for an FFmpeg seek.
function beatSegmentStart() {
  return Math.round(_beatStart * 100) / 100;
}

// Tear down — called on CANCEL, after a successful forge, and on panel open.
function beatSegmentReset() {
  _beatStopPreview();
  _beatPeaks = null; _beatDur = 0; _beatStart = 0;
  if (_beatObjUrl) { URL.revokeObjectURL(_beatObjUrl); _beatObjUrl = null; }
  const audio = document.getElementById('beatSegAudio'); if (audio) audio.removeAttribute('src');
  const seg = document.getElementById('beatSegment'); if (seg) seg.style.display = 'none';
  const file = document.getElementById('forgeBeatFile'); if (file) file.value = '';
}

// Wire the drag handle + keep layout correct on resize.
document.addEventListener('DOMContentLoaded', () => {
  const win = document.getElementById('beatSegWindow');
  if (win) win.addEventListener('pointerdown', _beatPointerDown);
  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (_beatPeaks) { _beatDrawWave(); _beatLayout(); } }, 120);
  });
});
