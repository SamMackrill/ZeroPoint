# Experiment: Light through the zero-point field

**Status: illustrative sequence implemented.** Stage 4a now has an interactive light laboratory with a prescribed induction sequence, controls, local pair inspection, replay, field/probe plots and file export. See the [implemented model specification](../light-model.md) for the adopted half-wavelength timing, units and limitations. Calculated coupling, emission and absorption remain future work. The sections below retain the experiment design and its later gates.

Source: Ray Fleming, [Photons as Quantum Electron-Positron Composites](../papers/Photons%20as%20Quantum%20Electron-Positron%20Composites.pdf). The mechanisms below describe Fleming's proposed model; the visualization should identify source claims, chosen animation conventions and any subsequently calculated results.

## Mechanism to visualize

- **Local pairs, travelling excitation.** In section 5 (page 4), Fleming describes each successive quantum dipole along the photon path as induced into existence, with successive pairs counter-rotating to conserve angular momentum. Represent propagation as a sequence of local pair events. Keep each pair's centre fixed throughout its lifetime, consistent with the workbench's motion convention; its electron and positron rotate, separate and collapse symmetrically. A moving energy envelope highlights the advancing excitation.
- **The surrounding medium carries the fields.** Section 4 (page 3) describes electric polarization and magnetic rotation of surrounding dipoles as the electromagnetic fields themselves. Show that response around the central sequence, with optional E/B arrows and a larger-scale wave overlay. Figure 3 (page 2) supplies the alternating pair rotation and field-sign reference.
- **Half-wavelength succession.** Section 2 (page 2) associates each central pair with half a photon wavelength; section 6 (page 4) assigns a 180-degree rotation over its existence. Show pair identity, age, signed rotation and the next induction event so users can follow this process directly.
- **Energy in the pair and field.** Section 2 assigns `hf/2` to the central pair and the other half to the surrounding electromagnetic field, for total photon energy `hf`. Track the travelling excitation's energy above the background. Successive pair events must transfer the packet's budget rather than add another photon's energy at every handoff.

## Scene and interaction

Start with a finite pulse travelling through a cutaway of the existing 3D medium. Provide a side view of the path and an orbitable close-up of a selected pair. Distinguish background fluctuations, the induced central sequence and responding surrounding dipoles through charge signs, arrows and labels as well as colour. Treat the finite pulse envelope as an illustrative scene convention until its dynamics are specified.

Offer pause, single-tick stepping, **next induction event**, and a replayable timeline. Pin a pair's centre in the close-up while the wave passes it; the overview follows the energy envelope. Each handoff should reveal the retiring pair, the induced successor and their opposite rotation senses. A spatial phase plot and a probe's time trace connect local motion to the travelling wave.

Planned controls:

- Photon wavelength/frequency, linked through the stated propagation speed; polarization orientation and initial phase.
- Pulse position and direction, probe locations, camera scale and physical-time/playback-time readouts.
- Layers for background pairs, induced pairs, surrounding polarization/rotation, E/B arrows, energy envelope and centre markers.
- Playback speed and reduced-motion/event-stepping mode, separate from physical propagation speed.

Readouts: distance travelled, elapsed physical time, measured propagation speed, wavelength, phase, pair age/rotation, induction-event count and central-pair/field/total excess energy. Any prescribed wave or field overlay must be labelled illustrative until computed from defined coupling laws.

## Build sequence and acceptance

1. **Specify timing and handoff rules.** Distinguish photon frequency, pair lifetime and angular rotation rate. If `lambda = c/f` and one pair spans half a wavelength, the inferred handoff interval is `1/(2f)` and a 180-degree rotation implies `|omega| = 2*pi*f`. These are planning deductions, not a complete evolution law supplied by the paper. The current MVP instead uses lifetime `1/f` from `E = hf/2` and `Delta E Delta t = h/2`, with a full rotation at that frequency. Reconcile these definitions explicitly in a new model specification before implementing photon dynamics; do not silently change the medium model or saved runs.
2. **Build an illustrative induction sequence.** Reuse the Three.js instanced pair renderer, worker clock, inspection and timeline. Prescribe the sequence initially and label it accordingly. Verify fixed centres, symmetric separation/collapse, alternating rotation of successive pairs, half-wavelength phase mapping, deterministic replay and travel at the configured `c`. This demonstrates the proposed mechanism without claiming an emergent propagation speed.
3. **Add a calculated medium response.** Define the induction trigger, spatial coupling, torque, phase continuity, birth/death handoff and energy/momentum transfer rules. Keep the existing separation envelope labelled as a visualization choice unless a dynamical law replaces it. Check energy and angular-momentum ledgers and timestep/spatial-resolution convergence; opposite rotation arrows alone do not establish conservation.
4. **Extend to emission and absorption.** Sections 7–8 (pages 4–5) describe exchange with a stable electron: the quantum positron annihilates with it and the quantum electron becomes stable. Add these as explicit later events once particle and field energy accounting is specified. The initial propagation scene needs neither an atomic-shell solver nor an absorption implementation.

## Separate field-response timescale

Section 6 distinguishes the photon sequence's full half-turns from very small rotations establishing a field response. Fleming gives `1.8 x 10^22 c` as an example based on `10^-20` degrees and states that the maximum field-propagation rate is unknown and finite. It is not a measured constant or the photon travel speed. Keep this optional later comparison separate from the light-wave controls; the blueprint's `10^20 c` likewise must not become an unexplained default. Event-based or explicitly quasistatic treatment would need its own documented approximation.

The supplied paper supports the visual mechanism. The illustrative implementation adopts a separate half-wavelength timing convention, documented in the model specification. Quantitative coupling rules and reconciliation into a single underlying dynamics remain necessary before turning it into a predictive simulation.
