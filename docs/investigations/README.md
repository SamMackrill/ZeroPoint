# Rendering investigation — 7 September 2026

This is a disposable experiment, independent of the old app and any future implementation. It tests rendering representation and backend availability. It contains synthetic motion, **not a physics solver**.

## Run it

From the repository root:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Open <http://127.0.0.1:5173/docs/investigations/rendering-spike.html>. Internet access to jsDelivr is needed for pinned Three.js **0.185.1**. No npm install is needed. The version was obtained with `npm view three version`; this does not upgrade the existing application.

Select a backend, representation and count, then **Load configuration**. Drag to orbit. Select **Measure 5 seconds**, keeping the page visible and the viewport unchanged for one second of warmup plus five seconds of measurement. Export a completed result as JSON. Backgrounding, resizing or stalled animation callbacks invalidate a sample. Animation callbacks can be suspended by an embedded preview even if the document initially reports itself visible.

## Method

- Seed 2026; identical base distributions and synthetic motion per configuration.
- Counts: 1,000, 10,000 and 50,000 dipoles.
- Detailed mode: two opaque instanced spheres per dipole, 8 longitudinal and 6 latitudinal segments, matrices updated on the CPU every rendered frame.
- Coarse mode: one point per dipole, positions updated on the CPU. This discards paired charge and orientation information, so it is a level-of-detail option, not equal visual fidelity.
- DPR fixed to 1, antialiasing enabled, same camera and scene extent; orbiting changes the workload and should be avoided while measuring.
- Frame intervals include CPU update work, uploads, drawing and browser scheduling. Mean FPS is 1,000 divided by mean interval. Percentiles use sorted frame intervals. These are not GPU timer-query results.
- No force calculations, worker, pressure grid, transparency, shadows, streamlines, picking, postprocessing configured by the spike, or GPU compute.
- `window.spikeSmoke()` submits one frame explicitly and returns backend/draw statistics. This allows a functional check when preview animation callbacks are suspended; it is not a timing benchmark. Renderer-reported counts may include internal passes.

## Observed results

Raw captured data is in [results.json](results.json). Environment: Windows, T3Code 0.0.39 / Chromium 150, AMD Radeon RX 7900 GRE. Preview viewport: 1280 × 800 CSS pixels; the measured canvas was 1265 × 416 because the document includes controls and a scrollbar.

| Check | Observation | Interpretation |
| --- | --- | --- |
| WebGLRenderer, 10,000 paired dipoles | 500 sampled frame intervals; mean 10.0024 ms (~99.98 FPS), p50 10.0 ms, p95 10.1 ms; 2 draw calls, 1,600,000 triangles | Valid local renderer-only sample. Likely display/scheduling limited; does not establish headroom or solver throughput. |
| WebGPURenderer, 10,000 paired dipoles | Actual WebGPU backend; explicit frame submission returned 3 calls and 1,600,001 triangles without captured JS errors | Backend smoke check only. No valid timing comparison obtained. |
| WebGPURenderer with forced WebGL, 10,000 paired dipoles | Actual WebGL 2 fallback; explicit frame submission returned 3 calls and 1,600,001 triangles without captured JS errors | Rendering fallback works for this scene. Says nothing about compute fallback. |
| WebGLRenderer, 50,000 coarse dipoles | Explicit frame submission rendered 50,000 points in one call | Supports a coarse overview path. No valid timing measurement recorded. |
| WebGPURenderer, 50,000 coarse dipoles | Actual WebGPU backend; explicit frame submission reported 50,000 points, 2 calls and 1 triangle without captured JS errors | Coarse representation also submits on WebGPU; counts include renderer work beyond the points. No timed sample. |

The first WebGL timing attempt was invalidated by preview visibility/resize and discarded; the subsequent 500-interval sample above was valid. WebGPU/fallback animation callbacks stalled in the embedded preview, so those attempts are not published as performance measurements. A watchdog was added to make that failure visible and allow another attempt. Explicit frame submission is a limited functional check, not visual image comparison. The preview screenshot tool also failed; no screenshot-based visual verification is claimed.

The initial WebGPU diagnostic probe incorrectly assumed every renderer's `getContext()` returned a WebGL context. That spike-only issue was corrected before smoke checks. The final script also records uncaught errors and rejected promises and supplies a timestamp default for the animation callback. These diagnostic changes do not alter the detailed scene workload used in the valid WebGL sample.

## Analytical findings

Two Float32 4×4 transforms cost 128 bytes/dipole. At 10,000 dipoles and 30 snapshots/s that is 38.4 MB/s of snapshot payload, before copies/uploads. A position/quaternion/size structure would use 32 bytes/dipole (9.6 MB/s at the same cadence), but expansion into rendering attributes still needs a measured implementation. These are calculated payloads, not measured bus speeds.

A 64³ grid with four Float32 channels uses 4 MiB per buffer. Grid resolution, represented dipole count, and visible detail should be independent controls. A coarse pressure slice is a cheaper first investigative view than committing to full volumetric ray marching.

## Decision and limits

Recommend Three.js with WebGLRenderer for the first workbench and a separate CPU reference model. Current Three.js guidance recommends WebGLRenderer for pure WebGL 2 apps and still identifies WebGPURenderer as experimental. Preserve an adapter boundary for WebGPU/TSL experiments; do not assume WebGPU will outperform WebGL for this workload.

This decision does not depend on the legacy code. Babylon.js remains a credible alternative if compute-heavy engine tooling becomes central; vtk.js is worth revisiting if structured scientific volumes and imported datasets become the main product. They were investigated through official documentation, **not benchmarked locally**. See [the HTML plan](../simulation-plan.html#technology) for the comparison and linked sources.

Before choosing GPU compute or promising capacity, measure the actual worker, field solver, transfers, transparent/cutaway shells, slices, field lines and selection together. Repeat timed runs on an integrated GPU and the intended browsers, with 30-second samples after warmup. Add CPU/GPU parity checks before replacing any reference physics operation.
