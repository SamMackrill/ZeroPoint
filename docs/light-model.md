# Light through the zero-point field — illustrative model

Implemented model ID: **`light-induction/1`**. Open **Light through the zero-point field** in the experiment library. The medium and light laboratories retain their separate state when switching; switching pauses the outgoing experiment and releases its viewport.

This implements the illustrative sequence in steps 1–2 of the [experiment plan](planned-experiments/light-through-zero-point.md). It follows Fleming's account of successive induced, counter-rotating dipoles and surrounding polarization/rotation in [Photons as Quantum Electron-Positron Composites](Photons%20as%20Quantum%20Electron-Positron%20Composites.pdf), especially sections 2 and 4–6. Induction, the field response and the wave envelope are prescribed. This release does not calculate coupling forces, torque, an emergent light speed, or absorption.

## Units and timing decision

- `L = 250 nm`; `c = 299,792,458 m/s` is supplied, giving `tau = L/c ≈ 0.834 fs` and normalized speed `c = 1 L/tau`.
- Wavelength ranges from `1–4 L` (250–1000 nm), in increments of `0.1 L`. Frequency is linked through `f = c/lambda`; default wavelength is 500 nm.
- An induced pair occupies a half-wavelength interval, with duration `Tpair = lambda/(2c) = 1/(2f)` and a half-turn at `|omega| = 2*pi*f`.
- The existing medium model keeps its `1/f` lifetime and full-turn convention. The light model's half-wavelength interval is a separate correlation/induction convention inferred from the photon paper, not a redefinition of the background fluctuation lifetime or a claim to satisfy the medium model's uncertainty equality. The two conventions are not asserted to be a single derived dynamics.

The worker advances integer ticks of `tau/120`. Wavelength increments ensure every induction event lands on an exact tick: `hopTicks = round(60 * wavelengthInL)`. At 1× playback, one wall-clock second represents one tau. Speed changes scheduling only; up to 12 fixed steps per scheduler iteration bound catch-up. Hiding the tab or switching experiments pauses playback. Reduced flashing/camera motion changes presentation only; pause and event stepping provide a still inspection mode.

## Pair sequence and window

The window spans `[offset - 6, offset + 6] L`. Offset ranges from −2 to +2 L. The launch position is `offset - direction * 6`, with direction +1 or −1. The excitation travels as `x(t) = launch + direction * c*t`, and the run stops when it reaches the opposite boundary at `t = 12 tau` (tick 1440).

Pair `n` is induced at `n*Tpair`. Its fixed centre is `launch + direction * (n + 1/2)*lambda/2`, the midpoint of its spatial interval. For local age fraction `u` clamped to [0,1], its rotation is `angle = phase0 + n*pi + (-1)^n*pi*u`. This alternates rotation sense while matching orientation modulo a full turn at successive interval endpoints. The central pairs rotate in the plane containing the travel axis and the chosen polarization axis; polarization rotates that plane about X.

Full lobe separation is `D = 0.42 L * sin(pi*u)`, zero at both endpoints. The electron/positron centres are `centre ± directionVector*D/2`. This reuses the medium's sinusoidal separation convention, with exaggerated geometry. It supplies no kinetic-energy or torque law. The inspector reports signed rotation relative to the pair's initial orientation, independently of initial phase. Pinning holds the selected pair identity while time advances. The 3D pair camera can orbit that fixed midpoint. It cuts away distant background samples and hides the envelope cage for a clear local view; the overview restores those layers.

For wavelengths that do not divide the 12 L window into complete half-wavelength intervals, the last interval is clipped by the end of the displayed run. Its centre can lie just outside the drawn window. Its local lifecycle is not claimed to finish early; the inspector labels this state **Window exited**, rather than a completed collapse. There is no periodic wrap, automatic restart or absorption event.

## Field and background illustration

The renderer displays 540 deterministic background pair samples at fixed centres in a shallow 3D cutaway. Their baseline phase varies by sample and time. Their separation periodically vanishes; the wave changes the drawn orientation and separation in place. This is a prescribed visual response, not reuse of the medium laboratory's stochastic population or energy reservoir.

Let `q = direction*(x - launch) - c*t`. The compact envelope is `A(q) = cos²(pi*|q|/lambda)` for `|q| < lambda/2`, zero elsewhere. The normalized electric projection is `E = A*cos(2*pi*q/lambda + phase0)`. The normalized magnetic projection is `direction*E` on the perpendicular transverse axis, so reversing travel reverses the magnetic orientation. Both profiles are clipped to the window and hidden after exit. Arrows, line profiles and the surrounding dipoles are illustrative layers; their amplitudes are normalized, not V/m or tesla. The compact pulse and its clipping are display conventions, not a derived single-photon wavefunction or spectrum.

The probe trace samples this same prescribed field at a fixed coordinate over elapsed time, including after timeline replay. The gold probe ring and plot marker identify its coordinate. The spatial plot shows the current profile; the camera and wave layers do not affect either trace.

## Assigned excess-energy ledger

The packet budget is `E = hc/lambda`, converted to eV. Until the excitation exits the window, the central-pair budget and surrounding-field budget each equal `E/2`, following section 2 of the paper. Every induction handoff carries this same budget forward; it does not create another packet's energy. At window exit the budget transfers to **departed energy**, with both in-window entries zero.

The residual is `central + field + departed - initialPacketEnergy`. It checks this assignment bookkeeping, not energy calculated by integrating the plotted envelope or a mechanical force solver. The prescribed envelope, geometric lobe separation, clipped window and ledger are separate illustrative conventions. Angular-momentum conservation is not calculated; alternating rotation alone does not establish it.

## Controls, storage and recovery

Run/pause, single-tick stepping, next induction, reset and timeline scrubbing operate on the worker clock. **Next induction** lands on the next half-wavelength boundary (or window exit), even after arbitrary scrubbing. Pair-event buttons pause at a chosen induction and pin that pair. Wavelength, polarization, initial phase, launch offset, probe position and direction are drafts until **Apply and restart sequence** resets to tick zero.

Up to four in-memory checkpoints retain parameters and tick. Light JSON files have their own `zeropoint-light` version 1 format, storing model ID, parameters, tick and view layers. Imports are limited to 100 KB and validate the schema, finite bounds, direction, wavelength grid and tick. The worker validates state again. Import and restore leave playback paused. A file captures a coherent received snapshot; it need not be the very latest worker tick if exported while running. Camera orbit, pinned selection and the checkpoint list are session-only view state, not saved-file fields. Medium files remain independent and retain their existing compatibility.

CSV exports all 1441 samples of the configured prescribed sequence, including future samples, with physical time, distance, position, handoff count, energy entries and normalized probe response. PNG exports the current viewport with a model/scale caption. Worker snapshots use acknowledgement backpressure, with at most one unacknowledged state message. Graphics context loss pauses playback; recovery reconstructs the viewport at the retained tick. Restarting a failed worker explicitly resets the sequence.

## Remaining physics

Calculated induction needs an interaction law, birth/phase handoff dynamics, torque and energy/momentum transfer equations. Emission, stable-electron exchange and absorption remain later steps. Fleming's separate faster field-response example is not implemented or used as the photon speed. The source paper's numerical example is documented in the experiment plan.
