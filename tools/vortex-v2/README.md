# tools/vortex-v2 — Vortex Explorer V2 (Vite + TypeScript build)

This subfolder is a self-contained Vite + TypeScript + React rebuild of `sacrifunk_vortex_v2.jsx`. It compiles to a **single inlined HTML file** that lands at `docs/sacrifunk_vortex_v2.html` and ships from GitHub Pages at the existing URL.

Every other tool in this repo still uses the legacy `build_pages.py` pipeline (CDN React + Babel Standalone in-browser transpile + Tailwind 2.2 CDN). Vortex v2 is the pilot for a modern build path; if it pans out, the same pattern can be extended to the others.

## Why a new build for this one tool

Lighthouse on the live page (`sacrifunk.github.io/sacrifunk-lab-tools/sacrifunk_vortex_v2.html`) baseline:

| | Mobile | Desktop |
|---|---:|---:|
| Performance | 56 | 89 |
| Accessibility | 69 | 69 |
| Total transfer | 797 KB | 797 KB |
| FCP | 6.4 s | 1.5 s |
| TBT | 260 ms | 30 ms |

Two structural causes:
1. **Babel Standalone runs in the browser** — every page load transpiles ~28 KB of JSX on the main thread. 260 ms of blocking time on mobile.
2. **Tailwind 2.2 CDN ships ~3 MB unpurged** — gzipped to ~700 KB. Tailwind isn't even used by this tool (every style is inline).

After the Vite rebuild:

| | Mobile | Desktop |
|---|---:|---:|
| Performance | **81** | **100** |
| Accessibility | **96** | **96** |
| Total transfer | **265 KB** | **265 KB** |
| FCP | 3.5 s | 0.6 s |
| TBT | **0 ms** | 0 ms |

## Develop

```bash
cd tools/vortex-v2
npm install
npm run dev          # vite dev server with HMR
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

Outputs `docs/sacrifunk_vortex_v2.html` (single inlined HTML, ~165 KB / ~53 KB gzipped). Re-run after touching anything under `src/`.

## Source layout

```
tools/vortex-v2/
├── sacrifunk_vortex_v2.html     # Vite entry — also the output filename
├── package.json
├── tsconfig.json
├── vite.config.ts               # single-file output → ../../docs/
└── src/
    ├── main.tsx                 # React 18 bootstrap
    ├── VortexV2.tsx             # main component (tabs + layout)
    ├── lib/
    │   ├── scales.ts            # Colors, NOTE12, JI5, SCALES, GENERATORS
    │   └── computeVortex.ts     # modular-arithmetic engine + helpers
    └── components/
        ├── VortexSVG.tsx        # interactive SVG diagram
        ├── AnalysisPanel.tsx    # cycle decomposition + Law I check
        ├── SpectralPanel.tsx    # triad spectral coherence (N=12)
        └── CymaticsMini.tsx     # Chladni plate canvas
```

## Behavioural parity

The `.jsx` source at `sacrifunk_vortex_v2.jsx` (kept in the repo root as the canonical theory reference) and the `.tsx` build emit identical outputs for every metric they share:

- `computeVortex(N, multiplier)` produces the same cycles / feeders / chains
- `stabilityScore(pos, GENERATORS, N)` returns identical scores
- The SVG diagram renders the same node/edge layout at every (N, multipliers) pair
- The Cymatics plate kernel `cos(n·π·x)·cos(m·π·y) - cos(m·π·x)·cos(n·π·y)` matches

What changed:
- All form inputs now have associated `<label>` elements (visually-hidden where the label text is redundant with surrounding UI).
- Tabs use proper `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls`.
- Multiplier and preset buttons use `aria-pressed`.
- Color contrast: `Colors.dim` `#6668` → `#a8a8c0` (was ~2.6:1 against the dark bg, now ~8.3:1 — WCAG 2.2 AA pass).
- Skip-to-main link + `<main id="main" tabindex="-1">` landmark.
- `aria-live="polite"` on the cycle-analysis output so screen readers announce updates.
- TypeScript strict mode, no `any`, no implicit returns.

## Why a single inlined HTML output?

GitHub Pages serves `docs/sacrifunk_vortex_v2.html` at a stable URL. Splitting into `index.html` + `assets/*.js` would require either:
- An `index.html` redirect (one extra request), or
- A subdirectory rename (URL change → breaks any existing links).

Inlining keeps the URL stable, ships in one round trip, and gzips down to ~53 KB. For a ~3000-LOC React app, that's a fine trade-off.

## Future work

- Apply the same Vite + TS migration to the other 7 tools.
- Add a `.github/workflows/build.yml` that runs `npm run build` on push so the committed `docs/sacrifunk_vortex_v2.html` doesn't have to be manually rebuilt.
- Code-split `CymaticsMini` and `SpectralPanel` (only loaded inside their respective tab panels) to push Mobile Perf above 90.

## License

MIT — same as the parent repository.
