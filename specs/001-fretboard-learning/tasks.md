# Tasks — Fretboard View

Status legend: **DONE** = shipped; **OPEN** = candidate work. `[P]` = parallel-safe.

## US1 — Live fretboard overlay

- **DONE** Mode selector `<select>` injection (off / classic / notes / scales) — `_fbInjectSelect`
- **DONE** Canvas creation + dismiss `✕` sibling — `_fbCreateCanvas`
- **DONE** Resize-aware positioning (tracks controls bar height) — `_fbResize`
- **DONE** Draw loop (strings, frets, dot markers, fret numbers, string labels) — `_fbDraw`
- **DONE** Active-note rendering with glow + fret number (classic) or note name (notes/scales) — `_fbDrawNoteDot`
- **DONE** Sustain fade — `_fbGetActiveNotes` alpha calculation
- **DONE** Idempotent `playSong` wrap — `__slopsmithFretboardLearningHooksInstalled` guard
- **DONE** Mode persists across reloads — `localStorage` key `fretboard-learning.mode`

## US2 — Dismiss

- **DONE** `✕` button removes canvas + rAF loop — `_fbRemoveCanvas`
- **DONE** Mode selector reflects current mode on inject

## US3 — Chords

- **DONE** Chord notes lit simultaneously — `_fbGetActiveNotes` chord branch

## US4 — Scales mode

- **DONE** Inline scale detection — `SCALE_CATALOG` (11 types) + `_fbDetectScale`
- **DONE** Sloppak manifest priority — `_fbScaleFromManifest` reads `songInfo.key`/`songInfo.scale` when present
- **DONE** Scale position map — `_fbBuildScalePositions` (string × fret, tuning + capo aware)
- **DONE** Scale dot overlay — `_fbDrawScaleDots` (dim string-coloured dots, tonic ring)
- **DONE** Scale name HUD label — top-left of canvas
- **DONE** Re-detect on `song:ready` and on mode switch

## Cross-cutting

- **DONE** Rocksmith string-color palette (low-E red → high-e purple) — `FB_STRING_COLORS`, `FB_STRING_BRIGHT`
- **DONE** Single dots at 3/5/7/9/15/17/19/21, double at 12/24 — `FB_DOT_FRETS`, `FB_DOUBLE_DOT`
- **DONE** Reversed display order (high-e on top)
- **DONE** Bass arrangement support — `_fbGetOpenStringMidi` bass path + `sc === 4` detection
- **DONE** Extended-range support — all geometry driven by `highway.getStringCount()`
- **OPEN** [P] Display tuning name corner label (read from `highway.getSongInfo()`)
- **OPEN** Test harness for `_fbGetActiveNotes` (pure helper)
- **OPEN** Extend `FB_STRING_COLORS` / `FB_STRING_BRIGHT` beyond 6 entries for 7-string colour accuracy

## Documentation

- **DONE** README with install, modes, accuracy note
- **OPEN** [P] CHANGELOG / version history
