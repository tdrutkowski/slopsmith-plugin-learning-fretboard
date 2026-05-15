# Fretboard Learning Plugin — Fork Plan

## Current state

The fork lives in `plugins/fretboard-learning/screen.js`.

| Mode | What it does |
|------|-------------|
| **Classic** (original) | Shows the fret *number* inside each lit dot; dots fade over ~0.3 s |
| **Notes** (current fork) | Shows the note *letter* (C, D#, …) inside each lit dot; dots fade over 10 s |

The toggle is a single `<button>` injected into `#player-controls`. Clicking it switches between "off" and "notes mode".

---

## Goal

Replace the binary on/off button with a `<select>` that exposes four modes, and add a **Scales** mode that overlays every scale-degree note across the whole fretboard.

---

## Mode spec

| Value | Label | Behaviour |
|-------|-------|-----------|
| `off` | No fretboard | Canvas hidden, no rAF loop |
| `classic` | Classic fretboard | Dot = fret number, short fade (original behaviour) |
| `notes` | Notes | Dot = note letter, 10 s fade (current fork behaviour) |
| `scales` | Scales | All scale-degree positions shown dim; played notes light up with letter + glow |

---

## Step-by-step plan

### Step 1 — Replace button with `<select>`

**File:** `screen.js`

- Replace `_fbInjectButton` / `_fbToggle` with `_fbInjectSelect` / `_fbSetMode(mode)`.
- `<select id="fb-mode-select">` with four `<option>` values: `off`, `classic`, `notes`, `scales`.
- Persist chosen mode to `localStorage` key `fretboard-learning.mode`; restore on inject.
- On change: if switching to `off` → `_fbRemoveCanvas()`; otherwise → `_fbCreateCanvas()` (idempotent) and store mode.
- Style the `<select>` inline to match the existing Tailwind button aesthetic (dark background, small text, rounded). The dismiss `✕` button stays; clicking it sets select back to `off`.

**No other changes in this step** — the draw function will branch on mode in later steps.

---

### Step 2 — Split draw into Classic vs Notes paths

**File:** `screen.js`

Currently there is one draw path that always shows note letters. Introduce a `_fbMode` variable (mirrors the select value) and branch in `_fbDraw`:

```
if (_fbMode === 'classic')  → dot radius 7, fret number label, FB_FADE_OUT = 0.08 s window
if (_fbMode === 'notes')    → dot radius 14, note letter label, FB_FADE_OUT = 10 s
if (_fbMode === 'scales')   → handled in Step 3
```

Classic uses the original dot size (r=7) and the original short time window (80 ms ahead, no trailing fade). Notes keeps what the fork already has (r=14, 10 s fade). This makes the two live modes distinct and restores the original Classic feel.

---

### Step 3 — Inline scale detection (scale notes)

**File:** `screen.js`  
**No external dependencies** — detection is self-contained.

#### 3a. Scale catalogue

A `SCALE_CATALOG` constant lists 11 common guitar scale types (minor pentatonic, major pentatonic, blues, major, minor, dorian, mixolydian, phrygian, harmonic minor, lydian, locrian) as interval arrays from the root.

#### 3b. Detect the scale from the arrangement

`_fbDetectScale(pitchClasses)` scores every combination of root (12) × scale type (11) against the played pitch classes. Ranking: recall (fraction of played notes explained) → precision (fraction of scale notes actually played) → root was played. Returns `{ name, tonic, notes[] }` for the top result, or `null` if the input is empty.

If `songInfo.key` and `songInfo.scale` are present (forwarded from a sloppak manifest), `_fbScaleFromManifest` builds the result directly from those fields — no note analysis needed. This path takes priority over detection.

Re-detect whenever `song:ready` fires so the scale updates when the user switches arrangement mid-session. Detection is synchronous — no loading state needed.

#### 3c. Compute scale positions

Build a lookup `_fbScalePositions` once after detection:

```js
// Map: rsString → Set of fret numbers that produce a scale note
function _fbBuildScalePositions(scaleNotes, tuning, capo) { ... }
```

Iterate every string × fret (0..`_fbMaxFret`), compute the pitch class, check membership in `scaleNotes`. Result is a `Map<number, Set<number>>` (string → frets).

---

### Step 4 — Draw Scales mode

**File:** `screen.js`

Draw order (back to front):

1. **Background + grid** — same as existing modes.
2. **Dim scale dots** — for every `(string, fret)` in `_fbScalePositions`:
   - Small filled circle, string color at `globalAlpha = 0.25`.
   - Note letter inside at `globalAlpha = 0.35`.
   - Tonic notes get a slightly brighter dot (alpha 0.45) and a thin ring to distinguish them visually.
3. **Active (played) notes** — same logic as Notes mode (`_fbGetActiveNotes`), drawn on top:
   - Full brightness dot (r=14) with note letter, 10 s fade.
   - The dot "replaces" the dim scale dot beneath it because it's drawn after.

The tonic is identified as the note matching `_fbDetectScale().tonic`.

---

### Step 5 — Scale label HUD

Draw a small text label in the top-left corner of the canvas when Scales mode is active:

```
A minor pentatonic
```

Font: `12px sans-serif`, color `#aaa`, positioned at `(padL + 4, 4)`. Disappears when the canvas is off. This tells the player which scale was detected without requiring any extra UI.

---

### Step 6 — Wire `song:ready` for scale re-detection

```js
window.slopsmith.on('song:ready', () => {
    if (_fbMode !== 'scales') return;
    _fbComputeMaxFret();
    _fbTriggerScaleDetect();
});
```

Also call this path at the end of `_fbCreateCanvas` when mode is `scales` (handles switching mode after song is already loaded).

---

## File changes summary

| File | Changes |
|------|---------|
| `screen.js` | All logic — see steps above |
| `plugin.json` | No changes needed |

## Non-goals (out of scope for this plan)

- Manual scale override UI (user picks their own scale)
- Backend routes or persistent state
- Support for modes other than guitar/bass (no drum arrangements)
- Scale detection accuracy beyond what `Tonal.Scale.detect` gives for free

---

## Decisions

1. **No CDN** — Scale detection is a self-contained inline function; no network requests, works offline.
2. **Bass support** — Scales mode works for all arrangements. `_fbBuildScalePositions` uses `highway.getStringCount()` (not hardcoded 6), so 4-string bass arrangements get the correct positions.
3. **Accidentals** — Use sharps throughout (`C#`, `D#`, `F#`, `G#`, `A#`). `NOTE_NAMES` is the single source for all pitch-class ↔ name conversions.
