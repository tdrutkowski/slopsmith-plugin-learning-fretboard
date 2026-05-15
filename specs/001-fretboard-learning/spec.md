# Feature Specification: Learning Fretboard

**Plugin id**: `learning-fretboard`
**Status**: Shipped (v1.1.0)
**Type**: Player-overlay visualization (legacy `playSong` hook)
**Fork of**: [slopsmith-plugin-fretboard](https://github.com/byrongamatos/slopsmith-plugin-fretboard) — adds note names, trailing fade, and scale detection

## Summary

A horizontal fretboard overlay drawn below the highway. A mode selector in the player controls switches between four views: no overlay, fret-number dots (classic), note-name dots with a 10-second trailing fade, and a full scale-pattern overlay with auto-detected scale. Supports guitar and bass; fretboard width adapts to the arrangement's highest played fret.

## User Stories

### US1 — Choose a display mode (Priority: P1)

**Given** I'm playing a song on the highway,
**When** I open the mode dropdown in the player controls,
**Then** I can pick from "No fretboard", "Frets", "Notes", or "Scales", and the overlay switches immediately.

### US2 — See fret positions (Frets mode) (Priority: P1)

**Given** Frets mode is active,
**When** a note enters the ±80 ms active window,
**Then** a dot with the fret number lights up on the correct string/fret. The dot disappears when the window closes.

### US3 — Learn note names (Notes mode) (Priority: P1)

**Given** Notes mode is active,
**When** a note is played,
**Then** a dot labelled with the note name (e.g. "G#") appears at the correct position and fades over 10 seconds. Multiple notes accumulate so I can see which pitch classes recur.

### US4 — Visualise a scale pattern (Scales mode) (Priority: P1)

**Given** Scales mode is active,
**When** the song loads (or when I switch to this mode),
**Then** the plugin detects the scale from all played pitches, draws dim dots for every scale position across the fretboard (tonic notes ringed), and the detected scale name appears in the overlay header.

### US5 — Active notes in Scales mode (Priority: P2)

**Given** Scales mode is active,
**When** a note is played,
**Then** a bright note-name dot appears on top of the scale background, giving real-time position feedback against the scale pattern.

### US6 — Dismiss the overlay (Priority: P2)

**Given** the fretboard overlay is showing,
**When** I click the ✕ at the top-right of the overlay or switch the dropdown to "No fretboard",
**Then** the canvas and dismiss button are removed.

### US7 — Mode persists across page reloads (Priority: P2)

**Given** I selected a mode,
**When** I reload the page and open a song,
**Then** the same mode is restored automatically.

### US8 — Bass and extended-range support (Priority: P2)

**Given** I open a bass arrangement or an extended-range chart,
**When** the overlay is active,
**Then** the correct number of strings is displayed with appropriate open-string MIDI values for note name calculation.

## Functional Requirements

- **FR1**: Mode selector dropdown MUST be injected into `#player-controls` once per song open (idempotent on re-injection).
- **FR2**: Overlay canvas MUST be `pointer-events: none`; dismiss ✕ MUST be `pointer-events: auto`.
- **FR3**: Canvas height tracks player layout; fretboard width adapts dynamically to the arrangement's highest fret (minimum 12).
- **FR4**: Fret dot markers at positions 3/5/7/9/15/17/19/21 (single) and 12/24 (double).
- **FR5**: Active-note window is ±80 ms. In Frets mode, notes disappear when they leave this window. In Notes and Scales modes, notes fade over 10 seconds after the window closes.
- **FR6**: String colors MUST match Rocksmith convention (`FB_STRING_COLORS` for inactive, `FB_STRING_BRIGHT` for active).
- **FR7**: `screen.js` MUST be idempotent against re-eval — `playSong` wrap installed exactly once via `__slopsmithFretboardLearningHooksInstalled`.
- **FR8**: Plugin MUST NOT mutate highway state.
- **FR9**: Scale detection MUST be self-contained (no CDN dependency). If `songInfo.key` and `songInfo.scale` are present (sloppak manifest), use them directly. Otherwise, detect from pitch classes using the built-in `SCALE_CATALOG`. Result is recomputed on each `song:ready`.
- **FR10**: Tonic positions in Scales mode MUST be visually distinct (extra ring + higher opacity) from non-tonic scale notes.

## Non-Functional Requirements

- DPR-aware canvas sizing.
- 60 fps target; per-frame work scales with string count × fret count + visible active notes.
- Notes array is sorted by time — active-note search breaks at `n.t > t + 0.5` (early exit).
- Scale detection is synchronous and runs inline against a fixed 11-entry `SCALE_CATALOG`. No network requests.

## Out of Scope

- Microphone / pitch detection / scoring (read-only display).
- Editing notes or changing tuning from the overlay.
- Splitscreen support (legacy single-instance overlay).
- Manual scale selection (auto-detect only).
