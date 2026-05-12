# Persistent Sound Toggle — UI spec

**References:** existing splash `.cave-sound-toggle` (top-right `{SOUND OFF/ON}` chip)
**Mood/feel:** continuous with the splash — KVS-style mono bracket chip, dim by default, glows accent when ON. Quiet, unobtrusive, always reachable.
**Hero moment:** flip it on once, hear the drone wherever you are in the app, the logo pulses to the actual audio waveform.
**Anti-examples:** browser-style volume sliders, iOS-style speaker icons, anything skeumorphic.
**Constraints:** desktop-first (matches rest of app shell). Dark theme only. Token-driven (no hardcoded values).

## Build notes (2026-05-12)

- Audio file: `audio/cave_drone.mp3` — Sci-Fi Drone Engine Loop by steaq (Freesound, converted from WAV → 61KB MP3 via ffmpeg).
- Loops automatically. Volume fixed at 0.35.
- Two physical buttons sharing one state:
  - `#caveSoundToggle` — top-right of splash (existing)
  - `#appSoundToggle` — header row in app shell, before `.account`
- State persisted in `localStorage` key `sc_sound_on` (`"1"` / `"0"`).
- Default: OFF on first visit (browsers block autoplay anyway).
- **Logo pulse driver:** when audio is ON, `requestAnimationFrame` reads `AnalyserNode.getByteTimeDomainData()`, computes RMS, writes to `--cave-pulse` CSS var. When OFF or audio fails to load, falls back to the existing 12s LFO clock so visuals still breathe.
- Fallback: if `audio/cave_drone.mp3` 404s or fails to decode, the synth drone path still runs — visuals + audio both keep working.
