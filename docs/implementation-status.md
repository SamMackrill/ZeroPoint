# Implementation status — 8 September 2026

The medium lifecycle MVP is implemented as a new React + TypeScript + Vite application with Three.js WebGL 2 and a dedicated simulation worker.

| Plan stage | Status |
| --- | --- |
| 0 — Model specification | Reduced lifecycle equations, sampling, units, timing and bookkeeping are specified in `model-specification.md`. Force/shell/cosmology questions remain open. |
| 1 — Workbench foundation | Implemented: accessible controls, worker, fixed ticks, seeded state, snapshots, recoverable viewport and worker errors, responsive layout. |
| 2 — Medium laboratory | Implemented: four presets, births/deaths, lobe/point views, energy slice, inspection, diagnostics, checkpoints and JSON/CSV/PNG export. |
| 3 — Electron polarization | Implemented: electric alignment, preferred local spin turns, counter-moving charge-shell sampling, labelled radial falloff, moving-electron magnetic response, optional polarization-derived Faraday lines, analytic reference fields/flux, probes, replay and file exports. See [electron model](electron-model.md) and [source extraction](electron-source-notes.md). Calculated torque and constitutive pressure laws remain pending. |
| 3a — Casimir effect | Planned: adjustable parallel plates, mode views, ideal force/energy reference and a future zepton boundary model. See [experiment plan](planned-experiments/casimir-effect.md). |
| 3b — Lamb shift | Planned: reference and shifted energy levels, transition comparisons and a separately labelled future zero-point-field contribution. See [experiment plan](planned-experiments/lamb-shift.md). |
| 3c — Double-slit experiment | Planned: one-slit/two-slit/which-path comparisons, screen patterns, reproducible event traces and a separately labelled future medium interpretation. See [experiment plan](planned-experiments/double-slit.md). |
| 4a — Light through the zero-point field | Implemented as an illustrative induction sequence: fixed-centre half-turn pairs, field/probe views, wavelength/polarization/direction controls, event stepping, timeline replay, checkpoints and JSON/CSV/PNG export. Separate half-wavelength timing is specified in [light-model.md](light-model.md). Calculated coupling and absorption remain pending. |
| 4b — Particle shells | Pending spectral-energy and species rules. |
| 5 — Exchange events | Pending event maps and complete conservation rules. |
| 6 — Cosmology and advanced rendering | Pending loss law, comparison data and measured need for GPU compute / volume rendering. |

The energy-density slice is a measured view of the lifecycle model, not implementation of the blueprint's pressure-force mechanism. Renderer interpolation, adaptive level of detail, a picking broad phase and camera-state persistence are not included. Snapshot arrival drives geometry updates directly; rendering controls run independently.

Validation passed: TypeScript checks, 29 model tests, 11 browser tests and the production build. Model coverage includes deterministic replay, energy accounting, capacity/rejection handling, birth-rate behavior, lifetime/energy relationships, render-state independence and file validation. Browser coverage includes the principal desktop and mobile flows, parameter acknowledgements, visibility pause, actual WebGL context loss/recovery, and PNG export. Light coverage additionally verifies half-wavelength event timing, alternating rotation, fixed centres, direction reversal, one-packet energy bookkeeping, file replay, experiment switching, mobile controls and graphics recovery. Electron coverage verifies radial positive-end alignment, fixed pair centres through replacement and motion, flux scaling, independent spin/motion magnetism, velocity reversal, polarization-derived line tracing, exact replay, saved layer settings, masked probes, exports and graphics recovery. Browser tests use software-rendered Chromium. A production smoke check advanced the bundled worker from tick 0 to tick 1, fetched the bundled model documentation, and recorded no page errors or external network requests. Desktop and mobile screenshots were inspected.

Performance targets in the original plan are still targets. The original renderer-only investigation is not a full-application benchmark. Firefox/Safari, integrated-GPU performance, extended memory soak and comparative WebGPU compute tests remain to be run before making those release guarantees.

Motion correction (model version 2): pair centres remain fixed; individual spin planes are seeded, and the two lobes separate and collapse symmetrically over their lifetime. Peak pair separation replaces translational jitter. Existing version 1 files migrate to the corrected motion with an event-log note.

Electron spin update (model version 2): paired charge layers expose opposite lobe motion at four representative radii, with cutaway/full 3D controls and a near/far rate inspector. The inverse-square radial rate is explicitly an illustrative hypothesis, not a law established in Fleming’s papers. Additional checks cover opposite tangential directions, rate scaling/caps, fixed shell-sample centres and version 1 file migration.

Electron presentation update (model version 3): the default medium is a full cube, selector off, with an attached minus sign on the core. The stationary sequence introduces the electron into an initially unpolarized medium; locally traced 3D Faraday lines resolve during alignment. Reset restores the absent-electron opening. Version 1/2 imports explicitly migrate to the cubic sampling.
