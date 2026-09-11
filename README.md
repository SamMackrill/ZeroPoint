# A view into the Luminiferous Aether

This is a visualisation laboratory for exploring the work of Ray Fleming, detailed in his book *The Zero-Point Universe* and his many published papers. Tragically, Ray died in 2024. You can find his [YouTube channel](https://www.youtube.com/@rayfleming2053) among the source material for this work. It is an experimental, evolving project and is **not yet scientifically accurate**; its visualisations are illustrative explorations, not validated physics.

The current laboratory is a single-page workbench for the **reduced medium lifecycle model** described in [the model specification](docs/model-specification.md), based on the [supplied ZPF blueprint](docs/Ray%20Fleming's%20Zero-Point%20Field%20Physics_%203D%20Simulation%20Blueprint.md).

## Run locally

Node.js 22.12+ is required (developed with Node 24).

```powershell
npm ci
npm run dev
```

Open <http://127.0.0.1:5174>. The simulation, fonts and controls run locally; there are no runtime CDN dependencies or account requirements. Serve the app through Vite or a static HTTP server; do not open the application HTML with `file://` because it uses a module worker.

## Use the laboratory

- Choose a preset, then **Run** (Space), **Pause**, **Step** (Right arrow) or **Reset**. Runs start paused and pause when the tab is hidden.
- Change creation rate, frequency centre and peak pair separation. Seed changes take effect on reset.
- Drag to orbit, scroll to zoom, switch camera presets, or choose a point overview. Toggle bounds and a measured energy-density slice.
- Pause and click a dipole to inspect its fixed centre, pair separation, frequency, energy, age and lifetime, or use **Dipole → Inspect first active dipole**.
- **Capture** keeps up to six in-memory checkpoints. Click one to restore that exact state while paused.
- **Save experiment** downloads a versioned state file; **Load** validates and restores it. Export recent diagnostic samples as CSV or the labelled viewport as PNG.
- **Reduced model** explains the implemented assumptions. Mobile layouts expose the library and inspector through drawer buttons.

Choose **Light through the zero-point field** in the library to explore the new [illustrative induction experiment](docs/light-model.md). Adjust wavelength, polarization and direction, step each handoff, pin a pair, inspect field/probe plots and save or replay the sequence. Switching laboratories keeps their separate state and pauses playback.

This release implements the medium MVP and the illustrative light sequence from [the HTML development plan](docs/simulation-plan.html). It does not implement force laws, emergent constants, calculated photon coupling, stable particle shells, exchange events or cosmology. The energy reservoir is bookkeeping for the assigned fluctuation energy, not a complete physical energy/momentum model.

Choose **Electron in the zero-point field** for stationary electric polarization, local spin rotation with counter-moving charge-shell layers and a moving electron’s magnetic response. The [electron model](docs/electron-model.md) includes optional Faraday lines from the dipole polarization, a fixed probe, replay, inspection, checkpoints and exports, with [source notes](docs/electron-source-notes.md) extracted from Fleming’s three electron papers.

## Build and validate

```powershell
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

The build produces `dist/`, including the docs and fonts. It can be hosted as a static site; `base: './'` permits serving from a subdirectory. The local production preview uses <http://127.0.0.1:4173>. Browser tests use software-rendered Chromium for functional coverage, not performance claims.

Core tests exercise deterministic replay, seed zero, conservation bookkeeping, multiple arrivals per tick, capacity rejection, disabled births, lifetime/energy relationships, snapshot independence and hostile imports. Browser tests exercise transport controls, inspection, checkpoints, download/import, malformed files, presets, layers and mobile drawers.

## Structure

`src/model` contains the deterministic reference simulation; `src/simulation` owns worker scheduling and transport; `src/rendering` owns the Three.js WebGL 2 scene; `src/app` contains the React workspace; `src/persistence` validates medium experiment files. `src/light` and `src/electron` contain their separate models, workers, renderers and workspaces. The initial app is archived in `docs/legacy/`. No application code depends on it.

See [docs/README.md](docs/README.md) for the preserved blueprint, initial investigation, model specification and original plan.

## Publish updates

The reserved site is https://saffron-solace-dyj7.here.now/. Its non-secret slug and output directory are stored in [`here-now.json`](here-now.json). Run `npm run deploy` to build and update that same site. The helper uses `HERENOW_API_KEY` or `~/.herenow/credentials`; credentials are never put in the repo or browser bundle. The ignored `.herenow/` directory retains the last published version for stale-update protection. Inspect and reconcile remote changes if the publisher reports a version conflict.
