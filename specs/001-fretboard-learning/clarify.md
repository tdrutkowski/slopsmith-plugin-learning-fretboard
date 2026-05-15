# Clarifications — Fretboard View

## Q1: Why the legacy `playSong` wrap and not setRenderer?
**A**: The plugin is an overlay, not a replacement renderer. The setRenderer factory contract (slopsmith#36) replaces the highway; the fretboard is meant to coexist with it. Hence the older hook pattern.

## Q2: Does this work for bass arrangements (4 strings)?
**A**: Yes. The plugin calls `highway.getStringCount()` and stores the result in `numStrings`. All layout geometry — string rows, dot placement, scale positions — is computed from `numStrings`, not a hard-coded 6. Bass arrangements render on 4 evenly-spaced rows.

## Q3: Does this work for 7-string / extended-range guitars?
**A**: Mostly. `getStringCount()` returns 7+ for extended-range GP imports and the layout adapts. However `FB_STRING_COLORS` and `FB_STRING_BRIGHT` only define 6 entries, so string index 6 falls back to `'#888'` (grey) and `'#fff'`. `[OPEN]` whether to extend the palettes or leave the fallback as-is.

## Q4: How does the plugin know the song's tuning?
**A**: It reads `songInfo.tuning` (array of per-string semitone offsets from `highway.getSongInfo()`) for pitch calculation in Notes and Scales modes — `_fbNoteLabel` adds the offset so Drop D, Open G, etc. produce correct note names. What it does not do is display the tuning name anywhere; a user won't see "Drop D" written on screen. Classic mode (shows fret numbers) doesn't use tuning at all — fret numbers are layout-agnostic.

## Q5: Why ±80 ms for active-note window?
**A**: Larger than the drums plugin's 50 ms hit window — the fretboard is illustrative not scoring, so it errs toward "show the note slightly early and slightly after" for clarity.

## Q6: What's the relationship to the guitar-theory plugin's fretboard?
**A**: Independent. Guitar Theory Lab is a full-screen learning tool with quizzes/jam mode; this plugin is a passive overlay during playback. No code shared.

## Q7: Why is the dismiss `✕` a sibling of the canvas, not drawn on it?
**A**: `pointer-events: none` on the canvas (so clicks fall through to the highway behind it). The dismiss button needs `pointer-events: auto`; making it a separate sibling is cleaner than re-enabling pointer-events on a sub-region of the canvas.

## Q8: How does the mode persist across songs and reloads?
**A**: `localStorage` key `fretboard-learning.mode` stores the active mode string (`off` / `classic` / `notes` / `scales`). Switching songs re-injects the select and re-creates the canvas if mode is not `off`. The mode survives browser reloads.

## Q9: How does Scales mode detect the key?
**A**: On `song:ready` (or when the user switches to Scales mode), `_fbTriggerScaleDetect` collects every distinct pitch class played across the entire arrangement and runs `_fbDetectScale`, which scores every combination of root × scale type against those pitch classes. The winner is the scale whose notes best cover what was played (primary: recall — fraction of played notes explained; secondary: precision — no extra unused notes; tertiary: the root note was actually played). If the sloppak manifest provides `key` + `scale` fields via `songInfo`, those are used directly and detection is skipped entirely.

**Accuracy limitations:** Detection is a best-fit heuristic over all notes in the arrangement at once. It does not track key changes within the song — a track that modulates from E minor to G major gets one result for the whole thing. The result should be treated as a guide to where on the fretboard the arrangement's notes live, not as authoritative music-theory analysis. When a sloppak manifest includes `key`/`scale` authored by a human (or AI tooling with full musical context), that data takes priority and will be accurate. `[OPEN]` Whether to let the user override the detected scale manually, or pick from the top N candidates.

## Q10: Why is `_fbMaxFret` floored at 12?
**A**: Songs that only use the first few frets would otherwise show a cramped 5- or 6-fret board, which looks odd and hides the standard marker dots (3, 5, 7, 9, 12). The floor of 12 guarantees the first octave is always visible. `[OPEN]` Whether the ceiling should be 24 always (show the full neck) or should track the song's actual max fret (current behaviour).

## Q11: Why does the plugin hook both `playSong` and `song:ready`?
**A**: The `playSong` wrap re-creates the canvas element between songs (the old canvas is torn down with `_fbRemoveCanvas` so frets from the previous song don't flash). `song:ready` fires after note data has arrived and is the right moment to call `_fbComputeMaxFret` and re-run scale detection — at `playSong` time the note arrays are empty.
