# ZeroPoint field laboratory

A single-page workbench for the **reduced medium lifecycle model** described in [the model specification](docs/model-specification.md), based on the [supplied ZPF blueprint](docs/Ray%20Fleming's%20Zero-Point%20Field%20Physics_%203D%20Simulation%20Blueprint.md).

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

This release implements the medium MVP from [the HTML development plan](docs/simulation-plan.html). It does not implement force laws, emergent constants, photons, stable particle shells, exchange events or cosmology. The energy reservoir is bookkeeping for the assigned fluctuation energy, not a complete physical energy/momentum model.

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

`src/model` contains the deterministic reference simulation; `src/simulation` owns worker scheduling and transport; `src/rendering` owns the Three.js WebGL 2 scene; `src/app` contains the React workspace; `src/persistence` validates experiment files. The initial app is archived in `docs/legacy/`. No application code depends on it.

See [docs/README.md](docs/README.md) for the preserved blueprint, initial investigation, model specification and original plan.
