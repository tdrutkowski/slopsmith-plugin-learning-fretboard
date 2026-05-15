// Fretboard View plugin — Learning fork
// Modes: off | classic (fret numbers) | notes (note letters, 10 s fade) | scales (tonal overlay)

(function () {
'use strict';

let _fbMode = 'off';
let _fbCanvas = null;
let _fbCtx = null;
let _fbDismissBtn = null;
let _fbRafId = null;

const FB_STRING_COLORS = ['#cc0000', '#cca800', '#0066cc', '#cc6600', '#00cc66', '#9900cc'];
const FB_STRING_BRIGHT = ['#ff4444', '#ffe050', '#4499ff', '#ff9944', '#44ff99', '#cc44ff'];
const FB_DOT_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const FB_DOUBLE_DOT = [12, 24];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALE_CATALOG = [
    { type: 'minor pentatonic', intervals: [0, 3, 5, 7, 10] },
    { type: 'major pentatonic', intervals: [0, 2, 4, 7, 9] },
    { type: 'blues',            intervals: [0, 3, 5, 6, 7, 10] },
    { type: 'major',            intervals: [0, 2, 4, 5, 7, 9, 11] },
    { type: 'minor',            intervals: [0, 2, 3, 5, 7, 8, 10] },
    { type: 'dorian',           intervals: [0, 2, 3, 5, 7, 9, 10] },
    { type: 'mixolydian',       intervals: [0, 2, 4, 5, 7, 9, 10] },
    { type: 'phrygian',         intervals: [0, 1, 3, 5, 7, 8, 10] },
    { type: 'harmonic minor',   intervals: [0, 2, 3, 5, 7, 8, 11] },
    { type: 'lydian',           intervals: [0, 2, 4, 6, 7, 9, 11] },
    { type: 'locrian',          intervals: [0, 1, 3, 5, 6, 8, 10] },
];
const FB_FADE_NOTES = 10; // seconds — notes / scales trailing fade

let _fbMaxFret = 12;

// ── Scale state ───────────────────────────────────────────────────────────

let _fbDetectedScale = null;  // { name, tonic, notes: string[] }
let _fbScalePositions = null; // Map<rsString, Set<fret>>

// ── Pitch helpers ─────────────────────────────────────────────────────────

function _fbGetOpenStringMidi() {
    const sc = highway.getStringCount() || 6;
    const info = highway.getSongInfo();
    const isBass = /bass/i.test((info && info.arrangement) || '') || sc === 4;
    const base = isBass ? [28, 33, 38, 43] : [40, 45, 50, 55, 59, 64];
    while (base.length < sc) base.unshift(base[0] - 5);
    return base;
}

function _fbNoteLabel(rsString, fret, tuning, capo) {
    const open = _fbGetOpenStringMidi();
    const midi = (open[rsString] || 40) + (tuning[rsString] || 0) + (capo || 0) + fret;
    return NOTE_NAMES[((midi % 12) + 12) % 12];
}

function _fbComputeMaxFret() {
    let max = 0;
    const notes = highway.getNotes();
    const chords = highway.getChords();
    if (notes) for (const n of notes) if (n.f > max) max = n.f;
    if (chords) for (const c of chords) for (const cn of (c.notes || [])) if (cn.f > max) max = cn.f;
    _fbMaxFret = Math.max(12, max);
}

// ── Mode select ───────────────────────────────────────────────────────────

function _fbInjectSelect() {
    const controls = document.getElementById('player-controls');
    if (!controls || document.getElementById('fb-mode-select')) return;

    const closeBtn = controls.querySelector('button:last-child');
    const sel = document.createElement('select');
    sel.id = 'fb-mode-select';
    sel.style.cssText =
        'background:#111827;color:#9ca3af;border:1px solid #374151;border-radius:0.5rem;' +
        'padding:0.25rem 0.5rem;font-size:0.75rem;cursor:pointer;outline:none;';
    [
        ['off',     'No fretboard'],
        ['classic', 'Frets'],
        ['notes',   'Notes'],
        ['scales',  'Scales'],
    ].forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        sel.appendChild(opt);
    });
    sel.value = _fbMode;
    sel.addEventListener('change', () => _fbSetMode(sel.value));
    controls.insertBefore(sel, closeBtn);
}

function _fbSetMode(mode) {
    _fbMode = mode;
    localStorage.setItem('fretboard-learning.mode', mode);
    const sel = document.getElementById('fb-mode-select');
    if (sel) sel.value = mode;
    if (mode === 'off') {
        _fbRemoveCanvas();
    } else {
        _fbCreateCanvas();
        if (mode === 'scales') _fbTriggerScaleDetect();
    }
}

// ── Canvas lifecycle ──────────────────────────────────────────────────────

function _fbCreateCanvas() {
    if (_fbCanvas) return;
    const player = document.getElementById('player');
    if (!player) return;

    _fbCanvas = document.createElement('canvas');
    _fbCanvas.id = 'fretboard-canvas';
    _fbCanvas.style.cssText = 'position:absolute;left:0;right:0;z-index:20;pointer-events:none;';

    const controls = document.getElementById('player-controls');
    player.insertBefore(_fbCanvas, controls);

    _fbDismissBtn = document.createElement('button');
    _fbDismissBtn.id = 'btn-fretboard-dismiss';
    _fbDismissBtn.textContent = '✕';
    _fbDismissBtn.title = 'Hide fretboard overlay';
    _fbDismissBtn.style.cssText =
        'position:absolute;right:8px;z-index:21;width:24px;height:24px;' +
        'display:flex;align-items:center;justify-content:center;' +
        'background:rgba(8,8,16,0.85);border:1px solid rgba(100,100,130,0.5);' +
        'border-radius:4px;color:#aaa;cursor:pointer;font-size:12px;' +
        'pointer-events:auto;';
    _fbDismissBtn.onclick = () => _fbSetMode('off');
    player.insertBefore(_fbDismissBtn, controls);

    _fbCtx = _fbCanvas.getContext('2d');
    _fbComputeMaxFret();
    _fbResize();
    window.addEventListener('resize', _fbResize);
    _fbRafId = requestAnimationFrame(_fbDraw);
}

function _fbRemoveCanvas() {
    if (_fbRafId !== null) { cancelAnimationFrame(_fbRafId); _fbRafId = null; }
    if (_fbCanvas) {
        window.removeEventListener('resize', _fbResize);
        _fbCanvas.remove();
        _fbCanvas = null;
        _fbCtx = null;
    }
    if (_fbDismissBtn) {
        _fbDismissBtn.remove();
        _fbDismissBtn = null;
    }
}

function _fbResize() {
    if (!_fbCanvas) return;
    const player = document.getElementById('player');
    const controls = document.getElementById('player-controls');
    if (!player) return;
    const controlsH = controls ? controls.offsetHeight : 50;
    _fbCanvas.style.bottom = controlsH + 'px';
    _fbCanvas.width = player.clientWidth;
    _fbCanvas.height = Math.max(120, player.clientHeight * 0.15);
    if (_fbDismissBtn) {
        _fbDismissBtn.style.bottom = (controlsH + _fbCanvas.height - 30) + 'px';
    }
}

// ── Scale detection ───────────────────────────────────────────────────────

// Build a { name, tonic, notes } result from manifest key/scale fields.
// Accepts common aliases: "natural minor" → "minor", "pentatonic minor" → "minor pentatonic".
function _fbScaleFromManifest(key, scaleType) {
    const aliases = {
        'natural minor':    'minor',
        'pentatonic minor': 'minor pentatonic',
        'pentatonic major': 'major pentatonic',
    };
    const normalized = (scaleType || '').toLowerCase().trim();
    const type = aliases[normalized] || normalized;
    const entry = SCALE_CATALOG.find(e => e.type === type);
    if (!entry) return null;
    const rootIdx = NOTE_NAMES.indexOf((key || '').trim());
    if (rootIdx < 0) return null;
    const tonic = NOTE_NAMES[rootIdx];
    return {
        name: tonic + ' ' + entry.type,
        tonic,
        notes: entry.intervals.map(i => NOTE_NAMES[(rootIdx + i) % 12]),
    };
}

// Rank all root×scale combinations against the played pitch classes.
// Primary sort: recall (fraction of played notes the scale explains).
// Secondary: precision (fraction of scale notes that were actually played).
// Tertiary: root was played (avoids tonics that never sounded).
function _fbDetectScale(pitchClasses) {
    const pcSet = new Set(
        pitchClasses.map(pc => NOTE_NAMES.indexOf(pc)).filter(n => n >= 0)
    );
    if (!pcSet.size) return null;

    let best = null, bestRecall = -1, bestPrecision = -1, bestRootPlayed = -1;

    for (const { type, intervals } of SCALE_CATALOG) {
        for (let root = 0; root < 12; root++) {
            const scaleSet = new Set(intervals.map(i => (root + i) % 12));
            let matched = 0;
            for (const pc of pcSet) if (scaleSet.has(pc)) matched++;

            const recall     = matched / pcSet.size;
            const precision  = matched / intervals.length;
            const rootPlayed = pcSet.has(root) ? 1 : 0;

            if (recall > bestRecall ||
                (recall === bestRecall && precision > bestPrecision) ||
                (recall === bestRecall && precision === bestPrecision && rootPlayed > bestRootPlayed)) {
                bestRecall = recall; bestPrecision = precision; bestRootPlayed = rootPlayed;
                const tonic = NOTE_NAMES[root];
                best = {
                    name: tonic + ' ' + type,
                    tonic,
                    notes: intervals.map(i => NOTE_NAMES[(root + i) % 12]),
                };
            }
        }
    }
    return best;
}

function _fbGetPlayedPitchClasses(tuning, capo) {
    const notes = highway.getNotes() || [];
    const chords = highway.getChords() || [];
    const seen = new Set();
    const add = (s, f) => seen.add(_fbNoteLabel(s, f, tuning, capo));
    for (const n of notes) add(n.s, n.f);
    for (const c of chords) for (const cn of (c.notes || [])) add(cn.s, cn.f);
    return [...seen];
}

function _fbBuildScalePositions(scaleNotes, tuning, capo) {
    const sc = highway.getStringCount() || 6;
    const open = _fbGetOpenStringMidi();
    const noteSet = new Set(scaleNotes);
    const positions = new Map();
    for (let s = 0; s < sc; s++) {
        const fretsInScale = new Set();
        for (let f = 0; f <= _fbMaxFret; f++) {
            const midi = (open[s] || 40) + (tuning[s] || 0) + (capo || 0) + f;
            if (noteSet.has(NOTE_NAMES[((midi % 12) + 12) % 12])) fretsInScale.add(f);
        }
        positions.set(s, fretsInScale);
    }
    return positions;
}

function _fbTriggerScaleDetect() {
    try {
        const songInfo = highway.getSongInfo() || {};
        const tuning = songInfo.tuning || [];
        const capo = songInfo.capo || 0;
        _fbComputeMaxFret();

        // Prefer key/scale authored in the sloppak manifest (when the server
        // forwards them via song_info — see specs/001-fretboard-learning/analyze.md).
        if (songInfo.key && songInfo.scale) {
            const fromManifest = _fbScaleFromManifest(songInfo.key, songInfo.scale);
            if (fromManifest) {
                _fbDetectedScale = fromManifest;
                _fbScalePositions = _fbBuildScalePositions(fromManifest.notes, tuning, capo);
                return;
            }
        }

        // Fall back to pitch-class detection from the chart notes.
        const pitchClasses = _fbGetPlayedPitchClasses(tuning, capo);
        _fbDetectedScale = pitchClasses.length ? _fbDetectScale(pitchClasses) : null;
        _fbScalePositions = _fbDetectedScale
            ? _fbBuildScalePositions(_fbDetectedScale.notes, tuning, capo)
            : null;
    } catch (e) {
        console.error('[fretboard-learning] scale detection failed', e);
        _fbDetectedScale = null;
        _fbScalePositions = null;
    }
}

// ── Drawing ───────────────────────────────────────────────────────────────

function _fbDraw() {
    if (!_fbCanvas || !_fbCtx || _fbMode === 'off') return;

    const W = _fbCanvas.width;
    const H = _fbCanvas.height;
    const ctx = _fbCtx;

    const sc = highway.getStringCount() || 6;
    const songInfo = highway.getSongInfo();
    const isBass = /bass/i.test((songInfo && songInfo.arrangement) || '') || sc === 4;
    const numStrings = sc;
    const tuning = (songInfo && songInfo.tuning) || [];
    const capo = (songInfo && songInfo.capo) || 0;

    ctx.fillStyle = 'rgba(8, 8, 16, 0.92)';
    ctx.fillRect(0, 0, W, H);

    const padL = 35;
    const padR = 10;
    const padT = 10;
    const padB = 20;
    const fretW = (W - padL - padR) / _fbMaxFret;
    const stringH = (H - padT - padB) / Math.max(1, numStrings - 1);
    const center = (numStrings - 1) / 2;

    // Fret lines + nut
    for (let f = 0; f <= _fbMaxFret; f++) {
        ctx.strokeStyle = f === 0 ? '#555' : '#2a2a40';
        ctx.lineWidth = f === 0 ? 3 : 1;
        const x = padL + f * fretW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + (numStrings - 1) * stringH);
        ctx.stroke();
    }

    // Fret dots
    ctx.fillStyle = '#1a1a30';
    for (const f of FB_DOT_FRETS) {
        if (f > _fbMaxFret) continue;
        const x = padL + (f - 0.5) * fretW;
        if (FB_DOUBLE_DOT.includes(f)) {
            ctx.beginPath(); ctx.arc(x, padT + (center - 1) * stringH, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x, padT + (center + 1) * stringH, 4, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(x, padT + center * stringH, 4, 0, Math.PI * 2); ctx.fill();
        }
    }

    // Strings
    for (let s = 0; s < numStrings; s++) {
        const rsString = numStrings - 1 - s;
        ctx.strokeStyle = FB_STRING_COLORS[rsString] || '#888';
        ctx.lineWidth = 1 + s * 0.3;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(padL, padT + s * stringH);
        ctx.lineTo(W - padR, padT + s * stringH);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Fret numbers
    ctx.fillStyle = '#444';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let f = 1; f <= _fbMaxFret; f++) {
        ctx.fillText(f, padL + (f - 0.5) * fretW, padT + (numStrings - 1) * stringH + 5);
    }

    // String labels — high-to-low in visual order (s=0 is top row = highest string)
    const guitarNamesHtoL = ['e', 'B', 'G', 'D', 'A', 'E', 'B'];
    const bassNamesHtoL   = ['G', 'D', 'A', 'E', 'B', 'C'];
    const nameSource = isBass ? bassNamesHtoL : guitarNamesHtoL;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 10px sans-serif';
    for (let s = 0; s < numStrings; s++) {
        const rsString = numStrings - 1 - s;
        ctx.fillStyle = FB_STRING_COLORS[rsString] || '#888';
        ctx.fillText(nameSource[s] || '?', padL - 8, padT + s * stringH);
    }

    const t = highway.getTime();
    const notes = highway.getNotes();
    const chords = highway.getChords();

    // Scales: dim scale dots drawn before active notes
    if (_fbMode === 'scales') {
        if (_fbDetectedScale && _fbScalePositions) {
            _fbDrawScaleDots(ctx, numStrings, padL, padT, fretW, stringH, tuning, capo);
            ctx.fillStyle = '#aaa';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(_fbDetectedScale.name, padL + 4, 2);
        }
    }

    // Active note dots (all active modes)
    const fadeOut = _fbMode === 'classic' ? 0 : FB_FADE_NOTES;
    const activeNotes = _fbGetActiveNotes(t, notes, chords, fadeOut);
    for (const n of activeNotes) {
        _fbDrawNoteDot(ctx, n, numStrings, padL, padT, fretW, stringH, tuning, capo);
    }

    _fbRafId = requestAnimationFrame(_fbDraw);
}

function _fbDrawScaleDots(ctx, numStrings, padL, padT, fretW, stringH, tuning, capo) {
    const tonic = _fbDetectedScale.tonic;
    for (let s = 0; s < numStrings; s++) {
        const fretsInScale = _fbScalePositions.get(s);
        if (!fretsInScale) continue;
        const drawRow = numStrings - 1 - s;
        const y = padT + drawRow * stringH;
        const color = FB_STRING_COLORS[s] || '#888';
        for (const fret of fretsInScale) {
            const x = fret === 0 ? padL - 2 : padL + (fret - 0.5) * fretW;
            const noteName = _fbNoteLabel(s, fret, tuning, capo);
            const isTonic = noteName === tonic;

            ctx.globalAlpha = isTonic ? 0.45 : 0.25;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();

            if (isTonic) {
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(x, y, 13, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.globalAlpha = isTonic ? 0.55 : 0.35;
            ctx.fillStyle = '#fff';
            ctx.font = noteName.length > 1 ? 'bold 8px sans-serif' : 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(noteName, x, y);

            ctx.globalAlpha = 1;
        }
    }
}

function _fbDrawNoteDot(ctx, n, numStrings, padL, padT, fretW, stringH, tuning, capo) {
    const rsString = n.s;
    const fret = n.f;
    const drawRow = numStrings - 1 - rsString;
    const y = padT + drawRow * stringH;
    const x = fret === 0 ? padL - 2 : padL + (fret - 0.5) * fretW;
    const color = FB_STRING_BRIGHT[rsString] || '#fff';
    const alpha = n.alpha || 1;

    if (_fbMode === 'classic') {
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fret, x, y);
    } else {
        // notes + scales
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
        const label = _fbNoteLabel(rsString, fret, tuning, capo);
        ctx.fillStyle = '#000';
        ctx.font = label.length > 1 ? 'bold 14px sans-serif' : 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }
    ctx.globalAlpha = 1;
}

function _fbGetActiveNotes(t, notes, chords, fadeOut) {
    const active = [];
    const lookahead = 0.08;

    if (notes) {
        for (const n of notes) {
            if (n.t > t + 0.5) break;
            const end = n.t + (n.sus || 0);
            if (n.t > t + lookahead || end + fadeOut < t) continue;
            let alpha;
            if (t <= end) {
                alpha = n.sus > 0 && t > n.t ? Math.max(0.3, 1 - (t - n.t) / n.sus * 0.7) : 1;
            } else {
                if (fadeOut === 0) continue;
                alpha = (n.sus > 0 ? 0.3 : 1) * Math.max(0, 1 - (t - end) / fadeOut);
            }
            active.push({ s: n.s, f: n.f, alpha });
        }
    }

    if (chords) {
        for (const c of chords) {
            if (c.t > t + 0.5) break;
            if (c.t > t + lookahead) continue;
            for (const cn of (c.notes || [])) {
                const end = c.t + (cn.sus || 0);
                if (end + fadeOut < t) continue;
                let alpha;
                if (t <= end) {
                    alpha = cn.sus > 0 && t > c.t ? Math.max(0.3, 1 - (t - c.t) / cn.sus * 0.7) : 1;
                } else {
                    if (fadeOut === 0) continue;
                    alpha = (cn.sus > 0 ? 0.3 : 1) * Math.max(0, 1 - (t - end) / fadeOut);
                }
                active.push({ s: cn.s, f: cn.f, alpha });
            }
        }
    }

    return active;
}

// ── Hooks ─────────────────────────────────────────────────────────────────

const HOOK_KEY = '__slopsmithFretboardLearningHooksInstalled';
if (!window[HOOK_KEY]) {
    window[HOOK_KEY] = true;

    const origPlaySong = window.playSong;
    window.playSong = async function (filename, arrangement) {
        await origPlaySong(filename, arrangement);
        _fbInjectSelect();
        if (_fbMode !== 'off') {
            _fbRemoveCanvas();
            _fbCreateCanvas();
        }
        if (_fbMode === 'scales') _fbTriggerScaleDetect();
    };

    window.slopsmith.on('song:ready', () => {
        if (_fbMode !== 'off') _fbComputeMaxFret();
        if (_fbMode === 'scales') _fbTriggerScaleDetect();
    });
}

_fbMode = localStorage.getItem('fretboard-learning.mode') || 'off';

})();
