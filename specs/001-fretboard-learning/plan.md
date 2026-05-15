# Implementation Plan — Learning Fretboard

## Architecture

**Frontend-only plugin** (no `routes.py`). Single file: `screen.js`. No `screen.html` — DOM is built imperatively.

**Lifecycle**:
1. Load: `screen.js` evaluated once (guarded by `__slopsmithFretboardLearningHooksInstalled`).
2. Wrap `window.playSong` so the mode selector is re-injected and the canvas refreshed on every song open.
3. Listen to `song:ready` to recompute the dynamic max-fret and re-trigger scale detection.
4. Mode selector `<select>` calls `_fbSetMode(mode)` on change; selection is persisted to `localStorage`.
5. On any visible mode (Frets / Notes / Scales): create absolute-positioned canvas inside `#player`, insert before `#player-controls`. Add a sibling ✕ dismiss button.
6. `_fbDraw` runs as a `requestAnimationFrame` loop while the canvas exists.
7. On mode `off` or dismiss: cancel rAF, remove canvas + dismiss button.

**State** (module-scope):
- `_fbMode` — current mode: `'off' | 'classic' | 'notes' | 'scales'`.
- `_fbCanvas`, `_fbCtx`, `_fbDismissBtn`, `_fbRafId` — DOM/render refs.
- `_fbMaxFret` — computed from the arrangement's note set (min 12).
- `_tonal` — cached Tonal.js module (loaded lazily on first Scales activation).
- `_fbDetectedScale`, `_fbScalePositions`, `_fbScaleLoading` — scale detection state.

## Modes

| Mode | Dropdown label | Active-note label | Trailing fade | Scale overlay |
|---|---|---|---|---|
| `off` | No fretboard | — | — | — |
| `classic` | Frets | Fret number | None | No |
| `notes` | Notes | Note name (e.g. G#) | 10 s | No |
| `scales` | Scales | Note name | 10 s | Yes (auto-detected) |

## Drawing Pipeline (per rAF frame)

1. Clear canvas.
2. Draw fret lines, nut, dot markers, string lines, fret numbers, string name labels.
3. If Scales: draw dim scale-position dots (`_fbDrawScaleDots`); tonic positions get a ring and higher opacity. Render "Detecting scale…" or detected scale name in the header.
4. Collect active notes via `_fbGetActiveNotes(t, notes, chords, fadeOut)`.
5. For each active note, call `_fbDrawNoteDot` — fret-number dot in classic mode, note-name dot in notes/scales.

## Scale Detection

Triggered on `song:ready` and on switch to Scales mode:
1. Collect all pitch classes from `highway.getNotes()` + `highway.getChords()`.
2. Lazy-load `@tonaljs/tonal` from `esm.sh`.
3. Run `Scale.detect(pitchClasses)` — take the first candidate, fall back to `"C chromatic"`.
4. Build a `Map<rsString, Set<fret>>` of every fret position in the detected scale across the full fretboard. Used by `_fbDrawScaleDots`.

## Integration Points (Slopsmith core)

| Surface | How used |
|---|---|
| `window.playSong` | Hooked once to re-inject the mode selector and refresh the canvas |
| `window.slopsmith.on('song:ready')` | Recompute max-fret; re-trigger scale detection |
| `highway.getTime()` | Per-frame current playback position |
| `highway.getNotes()` | Per-frame note list (sorted by time) |
| `highway.getChords()` | Per-frame chord list |
| `highway.getSongInfo()` | Tuning, capo, arrangement name for note-name calculation |
| `highway.getStringCount()` | Adapts string count for bass and extended-range charts |
| `#player` DOM | Canvas and dismiss-button mount point |
| `#player-controls` DOM | Mode selector mount point + canvas position anchor |

## File Map

| Path | Purpose |
|---|---|
| `plugin.json` | Manifest (id: `learning-fretboard`, name: `Learning Fretboard`) |
| `screen.js` | Mode selector, canvas lifecycle, draw pipeline, scale detection |
| `README.md` | Installation and mode descriptions |

## Tech Stack

- Vanilla JS, Canvas 2D.
- [Tonal.js](https://github.com/tonaljs/tonal) via `esm.sh` (lazy, Scales mode only).
- No other external libraries.
- Tailwind classes for mode selector styling (inherited from core stylesheet).

## Out-of-Plan / Won't Build

- Microphone / pitch detection / scoring.
- Manual scale selection (auto-detect only).
- Splitscreen-aware factory (legacy overlay pattern).
- Multiple simultaneous overlays.
