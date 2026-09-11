# ZeroPoint planning documents

Start with [the HTML development plan](simulation-plan.html). Open it directly in a browser; it has no external assets and works offline. It includes blueprint analysis, technology selection, an illustrative workspace layout, implementation stages, and validation criteria.

- [Original supplied blueprint](Ray%20Fleming's%20Zero-Point%20Field%20Physics_%203D%20Simulation%20Blueprint.md), copied byte-for-byte on 7 September 2026. SHA-256: `FE939FE05D90A6A3B5AEA825C07C40C39179E87F4CE1D4F29FB7A6214D1019A5`.
- [Disposable renderer investigation](investigations/rendering-spike.html), [method and findings](investigations/README.md), and [raw results](investigations/results.json).

To run the investigation, serve the repository from a terminal:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Then open <http://127.0.0.1:5173/docs/simulation-plan.html>. The investigation uses Three.js 0.185.1 from jsDelivr and needs internet access; it requires no npm installation. The HTML plan itself needs neither a server nor internet access.

The original `index.html` and `dipole-worker.js` are archived in `docs/legacy/`. The new React/TypeScript application now implements the medium lifecycle MVP. See [implementation status](implementation-status.md), [the current model specification](model-specification.md) for equations, scope and remaining model gates, and [the repository README](../README.md) for running and testing it. The HTML plan is retained as the original proposal; it is not the release-status source.

Verification: the blueprint copy matches its source SHA-256; local HTML links and anchors resolve; inline plan JavaScript and the spike pass JavaScript syntax checks; the scenario descriptions respond in the browser. The plan was checked for document overflow at desktop width and in a 390-pixel iframe (no horizontal document overflow; navigation becomes static). Renderer evidence and preview limitations are recorded with the investigation. Printing is provided through the browser; exported PDF appearance has not been inspected.

Additional experiments:

- [Electron video refinement](electron-video-notes.md): timestamped video interpretation, implemented charge-motion, flux and radius/rate investigations, plus proposed torque, mass-budget and positron experiments.

- [Casimir effect — adjustable parallel plates](planned-experiments/casimir-effect.md), including controls, reference physics and implementation gates.
- [Lamb shift](planned-experiments/lamb-shift.md), with reference/shifted energy-level comparisons and future zero-point-field modelling gates.
- [Double slit](planned-experiments/double-slit.md), with one-slit, two-slit and which-path comparisons and future medium-modelling gates.
- [Light through the zero-point field — implemented illustrative model](light-model.md), with its [experiment plan and future gates](planned-experiments/light-through-zero-point.md): an energy wave carried by successive induced, counter-rotating pairs, with scene controls, source references and timing/coupling decisions. Based on the supplied [Photons as Quantum Electron-Positron Composites paper](papers/Photons%20as%20Quantum%20Electron-Positron%20Composites.pdf).

- [Electron in the zero-point field](electron-model.md): implemented electric alignment, local spin rotation and moving-electron magnetic response. [Extracted details from the three electron papers](electron-source-notes.md) link the source sections and distinguish illustrative choices from analytic reference fields.
