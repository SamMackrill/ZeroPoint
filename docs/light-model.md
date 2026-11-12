# Light through the zero-point field — illustrative model

Implemented model ID: **`light-induction/3`**. Open **Light through the zero-point field** in the experiment library. The medium and light laboratories retain their separate state when switching; switching pauses the outgoing experiment and releases its viewport.

This implements the illustrative sequence in steps 1–2 of the [experiment plan](planned-experiments/light-through-zero-point.md). It follows Fleming's account of successive induced, counter-rotating dipoles and surrounding polarization/rotation in [Photons as Quantum Electron-Positron Composites](papers/Photons%20as%20Quantum%20Electron-Positron%20Composites.pdf), especially sections 2 and 4–6. Induction and the fall-off of the field with distance are prescribed; the field's strength and polarity are taken from the active pair. This release does not calculate coupling forces, torque or an emergent light speed.

Model 2 (10 November 2026) changed two things to follow Fleming's figures and text more closely: the central pair now opens to its own wavelength and lies across the path at midlife, and the field is produced by that pair instead of being a separate wave-packet gliding along. Model 1 files hold the same state and open as the current model.

Model 3 (11 November 2026) adds an optional absorbing wall, described under [Absorption](#absorption-at-a-wall). Model 1 and 2 files open as model 3 with no wall.

## Units and timing decision

- `L = 250 nm`; `c = 299,792,458 m/s` is supplied, giving `tau = L/c ≈ 0.834 fs` and normalized speed `c = 1 L/tau`.
- Wavelength ranges from `1–4 L` (250–1000 nm), in increments of `0.1 L`. Frequency is linked through `f = c/lambda`; default wavelength is 500 nm.
- An induced pair occupies a half-wavelength interval, with duration `Tpair = lambda/(2c) = 1/(2f)` and a half-turn at `|omega| = 2*pi*f`.
- The medium model gives a pair a `1/f` lifetime and a half-turn in it. The light model's half-wavelength interval is a separate correlation/induction convention inferred from the photon paper, not a redefinition of the background fluctuation lifetime or a claim to satisfy the medium model's uncertainty equality. The two conventions are not asserted to be a single derived dynamics.

The worker advances integer ticks of `tau/120`. Wavelength increments ensure every induction event lands on an exact tick: `hopTicks = round(60 * wavelengthInL)`. At 1× playback, one wall-clock second represents one tau. Speed changes scheduling only; up to 12 fixed steps per scheduler iteration bound catch-up. Hiding the tab or switching experiments pauses playback. Reduced flashing/camera motion changes presentation only; pause and event stepping provide a still inspection mode.

## Pair sequence and window

The window spans `[offset - 6, offset + 6] L`. Offset ranges from −2 to +2 L. The launch position is `offset - direction * 6`, with direction +1 or −1. The excitation travels as `x(t) = launch + direction * c*t`, and the run stops when it reaches the opposite boundary at `t = 12 tau` (tick 1440).

Pair `n` is induced at `(n - a)*Tpair`, where `a` (from 0 up to 1) is the share of the first pair's life already behind it when the run begins; at the default pair start angle, `a = 0`. Its fixed centre is `launch + direction * (n + 1/2 - a)*lambda/2`, the midpoint of the stretch of path the energy covers during its life. With local age fraction `u` clamped to [0,1], travel unit vector `t = (direction, 0, 0)`, polarization unit vector `e` (the chosen axis, perpendicular to travel) and polarity `s_n = (-1)^(n + k)`, the positive lobe points along

```
d(u) = cos(theta) t + s_n sin(theta) e,     theta = pi*u
```

Every pair is born along the path, turns through 180°, and lies along the polarization axis at midlife. Successive pairs have opposite polarity and opposite rotation sense. This is how Fleming draws them: each pair across the path with a single field direction, alternating from pair to pair (book Figs 4-9 and 5-1; *Photons* Fig. 3). Model 1 placed the pair across the path at birth and death, when it has no width, and along the path at midlife.

The **pair start angle** (0–360°, stored as `phase`) chooses where in this cycle the run begins and nothing else. The first pair has already turned through that angle at tick 0: `a + k = round(angle/180 × hopTicks) / hopTicks`, with `k` the whole pairs skipped (0 below 180°, 1 from 180°, which reverses every polarity, 2 at 360°). It moves every hand-off earlier by `a*Tpair` and never changes a pair's geometry, so each pair still has one field polarity, the magnetic field stays on its rotation axis and `E × B` stays along the travel direction at every start angle. At 90° the first pair is across the path, fully open, at tick 0.

Full lobe separation is `D = (lambda/2) * sin(pi*u)`, zero at both endpoints. Fleming: "The dipole wavelength is equal to the distance traveled by a photon during a half-wavelength" (*Photons* §2), and a pair separates "to the full extent of [its] wavelength" (*Electron Properties* §8). Along the path the lobes stay inside the pair's own half-wavelength cell. The electron/positron centres are `centre ± d*D/2`. Model 1 used a fixed 0.42 L at every wavelength. The sinusoidal envelope is the medium laboratory's convention; it supplies no kinetic-energy or torque law. The inspector reports signed rotation about the axis `x × e`, the separation beside its peak, and the pair's field polarity. Pinning holds the selected pair identity while time advances. The 3D pair camera can orbit that fixed midpoint. It cuts away distant background samples and hides the field-reach cage for a clear local view; the overview restores those layers.

For wavelengths that do not divide the 12 L window into complete half-wavelength intervals, the last interval is clipped by the end of the displayed run. Its centre can lie just outside the drawn window. Its local lifecycle is not claimed to finish early; the inspector labels this state **Window exited**, rather than a completed collapse. There is no periodic wrap, automatic restart or absorption event.

## Field and background illustration

The field is produced by the active central pair. Fleming: a rotating pair "produces an electric field in its plane of rotation and a magnetic field in the perpendicular direction" (book ch. 4); when the pair is annihilated "the surrounding field reverses electric and magnetic polarity", and "those fields induce a new central particle pair" (ch. 5); the fields "are also extinguished each half wavelength along with the central zepton" (ch. 19). With `r` the distance from the active pair's centre in any direction:

```
E(r, t) = s_n * sin(theta) * sin(pi*u) / (1 + (4r/lambda)^2)
B(r, t) = direction * E(r, t)        on the axis x × e
```

`s_n sin(theta)` is the transverse part of the pair's orientation and `sin(pi*u)` its opening, so `E` is the transverse part of the pair's dipole moment, normalized to its peak. It is `s_n sin²(pi*u)`: one polarity per pair, zero at each hand-off, reversed for the next pair, whatever the pair start angle. The electric arrow points toward the positive end of the pair (book Fig. 6-7). The magnetic field lies along the pair's rotation axis in the right-hand-grip sense (book ch. 6), and `E × B` points along the direction of travel; reversing travel reverses the rotation sense and the magnetic field.

The field "radiates outward from the central zepton and declines in strength at a rate proportional to the inverse of the distance squared" (ch. 19). The `1/(1 + (4r/lambda)^2)` factor follows that at distance and is softened inside a quarter-wavelength so the centre stays finite; the softening radius is a display choice. The field is drawn as established at once across the whole window: in Fleming's account fields spread dipole to dipole far faster than light (*Photons* §6), and the window is small. No field-propagation delay is modelled. Profiles are clipped to the window and hidden after exit. Amplitudes are normalized, not V/m or tesla.

A fixed probe therefore sees alternating pulses, one per pair, growing as the chain approaches and fading as it recedes: an oscillation at the photon's frequency. The probe trace samples this same function over elapsed time, including after timeline replay. The gold probe ring and plot marker identify its coordinate. The along-path plot shows the field on the travel axis at the current instant. Model 1 instead drew a fixed one-cycle `cos²` wave-packet translating at `c`, whose value at its own centre never changed.

The renderer displays 540 deterministic background pair samples at fixed centres in a shallow 3D cutaway. Each has its own seeded orientation and lifetime and makes a half-turn per generation, as in the medium laboratory. Near the active pair they are biased toward its orientation and turn with it, by an amount proportional to the unsigned field strength; far away they stay random. Fleming: the surrounding pairs are "somewhat randomized and only slightly biased in the direction consistent with the photon's central pair" (ch. 5, Fig. 5-2). The bias is magnified for visibility. This is a prescribed visual response, not reuse of the medium laboratory's stochastic population or energy reservoir. The **Field reach** cage is a sphere about the active pair that swells and collapses with it; its radius is a display choice.

## Absorption at a wall

With the wall on (`absorber: true`) the run ends in an absorption instead of a window exit. The sources:

- "A photon never loses a part of its energy; it is always absorbed all at once. The magnetic and electric fields do not exist prior to the origination of the photon, nor after the photon is absorbed" (book ch. 19).
- "When a photon is absorbed its energy is absorbed in an instant, while almost all of the energy in a photon's fields is outside the photon's light cone at that instant" (*Photons* §1, Fig. 1). If fields were limited to the speed of light, "during the last half-wavelength of a photon's existence, only the field energy within a half-wavelength can make it back to be absorbed".
- "The field energy gets absorbed along with the energy of the central quantum particle pair dipole" (*Photons* §6).
- Photons are absorbed "when the positron from the quantum dipole within a photon annihilates with a stable electron"; the photon's quantum electron "gains the mass-energy from the orbital electron that was annihilated in addition to retaining the photon's energy", and is then stable (*Photons* §7).

The wall stands where the last pair that completes inside the 12 L window ends its half wavelength: at the far edge of the window when the pairs divide it evenly (the default 500 nm gives 12 pairs and a wall at 12 L), and a little short of it otherwise. With pair start angle fraction `a` and `Tpair` ticks per pair, the last pair is `k = floor((1440 + a*Tpair) / Tpair) - 1` and the absorption tick is `(k + 1 - a) * Tpair`. **Placing the wall at a hand-off is this model's choice**: Fleming speaks of "the last half-wavelength of a photon's existence" and does not describe a photon meeting an absorber partway through a pair's life.

At the absorption tick the last pair is gone, no further pair is induced, and the field is zero everywhere at once. The whole budget moves to **absorbed energy** in that one tick: the central pair's `E/2` and the field's `E/2` together. Nothing is recorded as departed. The timeline still runs to 12 τ; after the absorption nothing remains in the window.

Not modelled: the annihilation itself (which charge of the last pair meets the stable electron), the electron's new state, and how much field energy would be lost if fields were limited to light speed. Fleming gives no number for the last; a figure would depend on the softening radius chosen here for the field.

## Assigned excess-energy ledger

The packet budget is `E = hc/lambda`, converted to eV. Until the excitation exits the window, the central-pair budget and surrounding-field budget each equal `E/2`, following section 2 of the paper. Every induction handoff carries this same budget forward; it does not create another packet's energy. At window exit the budget transfers to **departed energy**, with both in-window entries zero; with an absorbing wall it transfers to **absorbed energy** at the absorption tick instead.

The residual is `central + field + absorbed + departed - initialPacketEnergy`. It checks this assignment bookkeeping, not energy calculated by integrating the plotted field or a mechanical force solver. The field fall-off, geometric lobe separation, clipped window and ledger are separate illustrative conventions. Angular-momentum conservation is not calculated; alternating rotation alone does not establish it.

## Controls, storage and recovery

Run/pause, single-tick stepping, next induction, reset and timeline scrubbing operate on the worker clock. **Next induction** lands on the next half-wavelength boundary (or window exit), even after arbitrary scrubbing. Pair-event buttons pause at a chosen induction and pin that pair. Wavelength, polarization, pair start angle, launch offset, probe position and direction are drafts until **Apply and restart sequence** resets to tick zero.

Up to four in-memory checkpoints retain parameters and tick. Light JSON files have their own `zeropoint-light` version 1 format, storing model ID, parameters, tick and view layers. A file saved by model `light-induction/1` holds the same fields and loads as model 2, with a notice. Imports are limited to 100 KB and validate the schema, finite bounds, direction, wavelength grid and tick. The worker validates state again. Import and restore leave playback paused. A file captures a coherent received snapshot; it need not be the very latest worker tick if exported while running. Camera orbit, pinned selection and the checkpoint list are session-only view state, not saved-file fields. Medium files remain independent and retain their existing compatibility.

CSV exports all 1441 samples of the configured prescribed sequence, including future samples, with physical time, distance, position, handoff count, energy entries and normalized probe response. PNG exports the current viewport with a model/scale caption. Worker snapshots use acknowledgement backpressure, with at most one unacknowledged state message. Graphics context loss pauses playback; recovery reconstructs the viewport at the retained tick. Restarting a failed worker explicitly resets the sequence.

## Remaining physics

Calculated induction needs an interaction law, birth/phase handoff dynamics, torque and energy/momentum transfer equations. Emission and the stable-electron exchange at absorption remain later steps. Fleming's faster field response is represented only by drawing the field as established at once across the window; its propagation is not modelled, and it is not used as the photon speed. The source paper's numerical example is documented in the experiment plan.
