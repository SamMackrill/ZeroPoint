# Reduced medium lifecycle model, version 2

This specifies the implemented first release. The [original blueprint](Ray%20Fleming's%20Zero-Point%20Field%20Physics_%203D%20Simulation%20Blueprint.md) remains unchanged. These engineering choices make its fluctuation lifecycle reproducible; they do not close the full ZPF physics model.

## Units and domain

The cell is periodic in all three directions with coordinates in `[-4, 4)` and a fixed capacity of 10,000 representative dipoles. `L₀ = 10⁻¹³ m`, `f₀ = 10²⁰ Hz`, `τ = 1/f₀ = 10⁻²⁰ s`, and `E₀ = hf₀ = 6.62607015 × 10⁻¹⁴ J`. Sampling does not imply a literal physical dipole density at these scales. There is no Planck-resolution claim.

Model time advances in fixed steps of `1/120 τ`. At 1× playback, approximately one wall-clock second advances one τ. Playback changes scheduling only, not the timestep. Catch-up is bounded to 12 steps per worker iteration; overload slows model time instead of changing the integrator. Tab hiding pauses the run and returning leaves it paused. The run limit is 10,000,000 ticks; save and reset to continue with a new experiment.

## Stochastic lifecycle

The generator is the unsigned 32-bit LCG `s = 1664525s + 1013904223 (mod 2³²)`, using `(s + 0.5)/2³²` for an open-interval uniform variate. Seed zero is supported. It is for reproducibility, not cryptography.

Birth attempts follow a Poisson process: the next interarrival time is `−ln(U)/rate`. Each tick processes all due attempts, so rates are not limited to one birth per tick. Attempts when the capacity is full are rejected and counted. Pending arrivals are rescheduled from the current model time when creation rate changes. Zero rate disables new births.

Positions are uniform in the periodic cube. Initial axes are uniform on the sphere. A frequency `f/f₀` is sampled uniformly from `0.5–1.5 × frequencyCentre`, where the centre ranges from 0.25 to 3. Existing dipoles retain their frequency after parameter edits. Creation rate ranges from 0 to 10,000 attempts per τ.

Each birth assigns `E/E₀ = (f/f₀)/2`. We explicitly identify the blueprint's `ΔE` with this energy and enforce its equality `ΔE Δt = h/2`. Lifetime is therefore `Δt/τ = 1/(f/f₀)`. This is a model convention, not an assertion that the blueprint supplies a complete uncertainty-based dynamics.

Deaths occur at the first fixed tick at or beyond the assigned lifetime. Births due during a tick are placed at the tick boundary; their sub-tick delay is at most one timestep. These discretization choices are part of the model version. The numerical tests do not establish continuous-time convergence of a force solver.

Initialization prepopulates `min(6000, round(rate × 0.6 / frequencyCentre))` dipoles, with ages uniform over each assigned lifetime. This is an illustrative starting distribution, **not a sampled steady state**. Reset regenerates it from the currently displayed seed and parameters.

## Energy ledger

The initial combined budget is `50,000 E₀`. Creating each active dipole transfers `f/2` from a bookkeeping reservoir into the field; death returns it. The field energy is independently summed over live dipoles. The displayed residual is `Efield + Ereservoir − 50,000 E₀`. There is no correction that forces the displayed residual to zero.

The reservoir budget is chosen to exceed the maximum possible active energy at the allowed frequency and capacity. Rejected attempts transfer no energy. The reference tests require the residual magnitude to stay below `10⁻⁷ E₀` over tested runs. Imported files have a `10⁻⁵ E₀` ledger tolerance to admit harmless JSON round-trip / accumulated floating-point differences.

This ledger accounts for assigned fluctuation energy only. It does not calculate kinetic energy, pressure, force, momentum or spin conservation. Changing peak pair separation does not debit the reservoir because the separation curve is a geometric visualization convention, not a derived mechanical-energy law.

## Presentation

Each pair retains its birth position as a fixed midpoint for its entire lifetime. There is no translational jitter or drift. Phase is `phase₀ + 2π f × age`; the pair direction rotates in a plane perpendicular to its seeded spin axis. If `p = age/lifetime`, the full lobe-centre separation is `D(p) = Dmax sin(πp)` for 0 < p < 1, with zero at both endpoints. Positions are `centre ± direction × D/2`: the lobes separate symmetrically, reach their widest spacing at midlife, and collapse together. The sinusoidal envelope and one-turn-per-lifetime rotation remain explicit visualization choices, not a new force-law claim. The peak separation slider ranges from 0 to 0.8 L₀ and defaults to 0.3 L₀.

Lobes retain their ordinary radius through most of life, shrinking only near birth/death by `min(1, sin(πp)/0.2)`. Thus pair separation changes independently of lobe size. Reduced flashing fixes the lobe-size multiplier to 0.8 but still preserves the same rotation and separation/collapse positions. Paused stepping is the fully still inspection mode. A lobe can extend slightly outside the drawn cell when its fixed centre is near an edge; the pair is not independently wrapped or displaced.

The positive and negative lobes are orange and blue, with signed text legends. Point mode represents a dipole with one stationary point at its midpoint and discards charge, separation and orientation detail. Geometry is exaggerated for visibility and is not the physical spatial extent of a zepton. A selected object is identified by slot plus generation; reused slots do not inherit selection.

The optional energy slice bins assigned live energy into a 32×32 XY grid for a 0.5 L₀ thick slab at the chosen Z, wrapping across the periodic Z boundary when needed. Values divide energy by bin volume `0.25 × 0.25 × 0.5 L₀³`. Linear texture filtering and a square-root colour mapping improve readability. The legend is scaled to each snapshot's maximum, floored at 1 E₀/L₀³; brightness cannot be quantitatively compared between frames without reading the legend. This is measured **energy density**, not a pressure field.

## State, files and threading

The worker owns Float64 reference state, the random generator and clock. Messages are ordered on one worker channel; parameter updates are reflected in a revision number and an event at the applied tick. Rendering consumes Float32 snapshots at approximately 30 Hz while running. A bounded two-buffer transfer pool prevents a snapshot queue; the main thread copies each received view before returning its buffer. React diagnostics are throttled to approximately 8 Hz when running. This version uploads snapshots directly; render interpolation and packed quaternion optimizations remain future work.

The versioned JSON format stores all Float64 state values, free-slot ordering, generator state, pending birth time, counters, current and initial parameters, parameter revision, up to 100 recent configuration events and view settings. A checkpoint contains enough state for exact continuation in the same runtime/model version. Cross-engine floating-point bit identity is not guaranteed. Up to six in-memory checkpoints can be restored while paused. These are not persistent until an experiment is downloaded.

Imports are limited to 8 MB and validate model/schema version, numeric ranges, particle and free-list consistency, lifecycle counters, schedule, unit orientation vectors and the energy ledger. The worker validates again before restoring. Files are read locally; no server or account is involved. CSV exports the most recent 240 displayed diagnostic samples. PNG exports the view with model, seed, tick and scale labels. Diagnostics history and camera orbit are not included in the experiment file; view layers are.

Version 1 experiment files are validated and upgraded to version 2 on import. Their random state, birth/death schedule, energies and fixed birth positions are retained. The retired jitter parameter is discarded, peak separation defaults to 0.3 L₀, and the event log records the upgrade. Older visual trajectories are deliberately not replayed. New saves identify the motion convention as `medium-lifecycle/2`.

## Scope and next gates

Implemented: workbench foundation and medium lifecycle MVP (plan stages 1–2), with the reduced-model choices above documenting the applicable part of stage 0.

Still undefined: the London–van der Waals force/torque law, constitutive pressure relation, derivation of ε₀/μ₀, 10²⁰c event ordering, shell spectral-energy integral, species-specific quantization, exchange event maps and tired-light observational comparison. These remain the gates for stages 3–6. No production WebGPU backend or GPU compute solver is claimed in this release.

The [Casimir effect](planned-experiments/casimir-effect.md) is now a planned standalone parallel-plate experiment at stage 3. It will compare an ideal analytic baseline with any subsequently specified zepton boundary-response model; it is not implemented by the current energy slice.
