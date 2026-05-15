# Analysis — Fretboard View

## Coverage

| Area | Spec'd | Implemented | Notes |
|---|---|---|---|
| Mode select (off/classic/notes/scales) | yes | yes | `screen.js:57-81` — `<select>` in player controls |
| Canvas + dismiss UI | yes | yes | sibling pattern for pointer-events |
| Active-note window | yes | yes | ±80 ms |
| Sustain fade | yes | yes | alpha 1→0.3 |
| Rocksmith string colors | yes | yes | matches palette |
| DPR scaling | yes | yes | |
| Dynamic string count | yes | yes | `highway.getStringCount()` at lines 32, 178, 230 |
| Dynamic fret range | yes | yes | `_fbComputeMaxFret()` scans notes/chords; min 12 |
| Bass / extended-range | yes | yes | bass detected by name + `sc===4`; 7+ strings via `getStringCount()` |
| Persistence | yes | yes | `localStorage` key `fretboard-learning.mode` |
| Scales mode (tonal.js) | yes | yes | auto-detects scale from played pitch classes |
| Tests | yes (open) | no | |

## Drift

- README implies the overlay "fades through their sustain duration" — implementation matches.
- Plugin uses the legacy `playSong` wrap pattern, while the drums and jumpingtab plugins use Wave C setRenderer. Intentional — it's an overlay, not a renderer — but worth documenting so future maintainers don't try to "modernise" it incorrectly.

## Gaps

1. **No tuning display.** The fret numbers are absolute; users tuning in Drop D / Open G have to mentally translate. Showing the tuning name in a corner would help context.
2. **No tests.** `_fbGetActiveNotes` is a pure function ideal for a test harness like jumpingtab's.

## Recommendations

- **Low cost**: read tuning from `highway.getSongInfo()` and render as a corner label (e.g. "Drop D").
- **Low cost**: stand up `test/test.html` with a synthetic notes/chords list verifying the active-note window math.
