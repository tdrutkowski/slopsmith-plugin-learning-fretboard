# Slopsmith Plugin: Learning Fretboard

> **Fork** of [slopsmith-plugin-fretboard](https://github.com/byrongamatos/slopsmith-plugin-fretboard) by byrongamatos — extended with note names, scale detection, and a 10-second trailing fade.

A plugin for [Slopsmith](https://github.com/byrongamatos/slopsmith) that overlays an interactive guitar/bass fretboard on the player. Unlike the original fretboard plugin (which lights up fret numbers while notes are active), this fork adds modes for note-name display and automatic scale detection — making it useful for ear training and theory study alongside regular play.

## Modes

A dropdown in the player controls lets you choose between four modes:

### No fretboard
Hides the overlay entirely. The dropdown stays visible so you can switch back without reloading.

### Frets
The classic view: a horizontal fretboard appears below the highway. Active notes light up as filled dots labelled with their **fret number**. Notes disappear as soon as they leave the ±80 ms active window — identical behaviour to the original plugin.

### Notes
Same fretboard, but active dots are labelled with the **note name** (C, C#, D, …) instead of the fret number. The dots linger for **10 seconds** after a note is played so you can see which notes are appearing most often over a passage. Useful for connecting what you hear to theory.
<img width="1551" height="915" alt="Notes" src="https://github.com/user-attachments/assets/e174e0e4-9711-46f9-bfd7-cd7646f830c7" />

### Scales
Builds on Notes mode. The plugin analyses every pitch class played across the arrangement and finds the best-matching scale from a built-in catalogue of common guitar scales (minor pentatonic, major pentatonic, blues, major, minor, dorian, mixolydian, phrygian, harmonic minor, lydian, locrian). The detected scale is displayed at the top of the overlay, and **every position of that scale** across the fretboard is drawn as a dim, string-coloured dot — tonic notes carry a ring and are slightly brighter. Active notes still light up on top, so you can see how what you're playing relates to the full scale pattern.
<img width="1560" height="915" alt="Scales" src="https://github.com/user-attachments/assets/9077d001-eda7-4e61-83ca-f02f831ee58c" />

> **Accuracy note:** Detection is a best-fit guess over all notes in the arrangement — it picks one scale for the whole song and does not track key changes. Think of it as a guide to *where on the fretboard the arrangement's notes are found*, not as precise music-theory analysis. Songs that change key mid-way, or that use notes from multiple scales, may show a result that covers most but not all of what's played. When a sloppak file includes `key`/`scale` metadata authored alongside the chart, the plugin will use that instead and the display will be accurate.

## Fretboard details

**Fret range** — the overlay always shows at least 12 frets, making note reading comfortable for lower-fret passages. It expands up to 24 frets to match the highest fret played in the current arrangement. Songs that never go past fret 12 get a compact view; songs that venture into higher positions stretch accordingly.

**Bass support** — bass arrangements are detected automatically and the fretboard switches to a 4-string layout with the correct open-string MIDI values. 5- and 6-string bass support is not yet implemented; extended-range bass charts will currently render as 4 strings.

## Installation

```bash
cd /path/to/slopsmith/plugins
git clone https://github.com/tdrutkowski/slopsmith-plugin-learning-fretboard.git learning_fretboard
docker compose restart
```

A mode selector dropdown will appear in the player controls when you open a song. The selected mode persists across page reloads via `localStorage`.

## License

MIT
