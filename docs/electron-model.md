# Electron polarization experiment

**Implemented model: `electron-polarization/3`.** Open **Electron in the zero-point field** from the experiment library. See [extracted source details](electron-source-notes.md) for the three supplied papers, page references, equations and decisions.

## Three views

1. **Stationary electron:** the unpolarized cube is shown first, with the electron absent at tick zero. The negative-marked core appears at the origin over 0.35 tau; representative pairs then rotate from isotropically distributed initial directions into radial alignment, with positive ends toward the electron. Near sites start earlier than distant sites, and all finish at 3 tau. Afterwards the alignment remains while successive pair generations separate and collapse. Optional electric reference arrows appear once alignment is nearly complete; the three-unit transition is illustrative, not a measured field-propagation time.
2. **Spin in the surrounding field:** the core remains stationary. Pair generations make local turns that increase strongly toward the core under a labelled inverse-square display hypothesis. The default shell sampling view exposes counter-moving positive/negative charge layers at four representative distances. Local axes vary with position; no pair centre or solid shell orbits the electron. Spin projection and preferred axis are selectable reference inputs. The intrinsic magnetic reference remains separately selectable. Entering this stage hides the Faraday lines, intrinsic arrows and half-Compton guide to expose the charge-layer geometry; both can be re-enabled.
3. **Moving electron:** a prescribed, uniformly moving negative polarizer crosses the medium. Its signed velocity controls the motion-induced magnetic reference and the associated local turn preference. Pair centres stay fixed in laboratory coordinates. The local rotation associated with spin remains distinct from the motion response. Intrinsic magnetic arrows can be enabled separately.

## Scale and reference fields

`R = lambda_C/2 = 1.21315511769 pm`, `tau = R/c`, and `c = 299792458 m/s`. At 1× playback, one second of wall time represents one tau (approximately `4.05 × 10^-21 s`). The effective radius argument gives `c/(2*pi*R) ≈ 3.933 × 10^19 Hz`. That is a source reference, not a rigid surface speed in the renderer.

Use `E0 = e/(4*pi*epsilon0*R²)` and `B0 = E0/c`. Coordinates below are normalized to R and fields to E0/B0. For displacement `r = point - electronPosition` and `beta = vx/c`, the negative charge's uniform-motion reference is:

```
E = -(1-beta²) r / [r² - beta²(ry² + rz²)]^(3/2)
B_motion = (beta, 0, 0) cross E
```

At rest this reduces to the inverse-square Coulomb field. This reference assumes uniform motion for all relevant retarded times; it does not model switching-on, acceleration, radiation or solve field propagation. A mode/parameter change starts a separate reference run rather than a physical velocity-change event.

The separate magnetic-dipole overlay uses `m = -spinSign*g/(4*pi) * preferredAxis` in normalized moment units and `B_spin = [3*n*(m dot n)-m]/r³`, where `n=r/|r|`. It is a rest-frame dipole reference translated to the current core position for comparison. Moving-spin Lorentz transformations and their induced electric contribution are not calculated. The electric-only view hides this overlay to isolate electric alignment; it is not a spinless-electron claim. CSV retains both reference components separately rather than claiming a complete summed relativistic electron field.

Points within `0.3 R` of the core are excluded from rendering/reference readouts. This is a numerical/display mask, not a physical electron radius. Probe histories show gaps there and CSV leaves reference components empty. It prevents singular infinities without falsely reporting a physical zero field at the core.

Enclosed charge is calculated using 256 equal-area sphere directions at radius 2 R: `sum(E dot n * radius² / 256)`. The result is flux divided by `4*pi`, approximately −1. It is an analytic-field quadrature, independent of displayed particle count. The supplied reference inputs alpha, unit charge, spin projection and g factor are not inferred from this quadrature or from the animated dipoles.

## Local pair geometry

The medium view samples 2197 fixed sites on a 13 × 13 × 13 cubic lattice with spacing 0.8 R and equal extents ±4.8 R on every axis. Spin shell sampling instead uses 320 additional fixed sites: 80 at each radius 0.6, 1.1, 1.8 and 2.8 R, arranged as sixteen azimuths on five latitudes. All sites are fixed in laboratory coordinates; shell sampling is shown only for the stationary spin stage. The full cube and an oblique camera are the default for stationary/moving stages. The optional cutaway shows the central Z slab for the lattice; entering the spin stage selects its equatorial ring. Samples are finite representatives, not a literal count or density of all vacuum fluctuations. Generation lifetimes vary deterministically by site, `pi*(0.8 + (index mod 11)/25) tau`, with staggered starting phases. This is a visibility convention, not a newly derived fluctuation spectrum.

For normalized age `u`, full pair separation is `D = 0.22 R * sin(pi*u)`. Positive/negative lobe positions are `centre ± direction*D/2`, so separation, collapse and local turning leave the midpoint fixed. Replacement generations reuse the same site. Pinning selects the sampling site; the inspector shows which generation currently occupies it.

The fully aligned positive-lobe direction is the inward radial direction. For spin views, project the selected global axis onto the plane perpendicular to that direction to obtain the local rotation axis. The assumed rate magnitude is `omega(r) = 0.12/max(r, 0.55)^2` radians/tau. For lifetime L, the signed lifecycle sweep is `spinSign * min(pi/2, omega(r)*L)`; the actual illustrated rate is that sweep divided by L. The direction turns through angle `sweep*(u-0.5)`, symmetric about inward radial alignment. This keeps positive ends closer to the electron even with magnified near-core turns. At degenerate local axes the illustrated rate is zero. At rest and outside the cap, doubling radius quarters the rate. The 0.6 R and 2.8 R bands have rates 19.10 and 0.88 degrees/tau respectively, a ratio about 21.78. The paper does not establish this radial law; see the source investigation. For motion, use the axis of `B_motion` and turn magnitude `min(0.3, 1.5*|B_motion|)` radians. Apply the additional motion rotation locally with angle proportional to `-(1-u)`. Angles are magnified display conventions; the source describes tiny physical turns in a much denser medium. Degenerate axes have no illustrated turn.

In the shell view, separate warm/cool arrows show `v_plus = omega_local * (axis cross direction) * D/2` and `v_minus = -v_plus`. These are the spin-rotation component only, with length compressed for readability; they exclude radial expansion/collapse. Positive and negative charge ends therefore have opposing tangential motion around the electron. Neighboring complete dipoles retain a common preferred sense. Faint paired wire guides sit at each band radius ±0.095 R; these are illustrative reference envelopes, not exact instantaneous lobe radii or material surfaces. The full 3D toggle adds off-equator samples, and the band buttons pin a representative site for rate inspection.

In the lattice view, arc sweep scales with the illustrated local turn instead of using identical circular glyphs everywhere. Arcs indicate local rotation sense; they do not depict zeptons travelling around the core. Field-arrow lengths are compressed for readability. Circular magnetic guides indicate the direction topology around the trajectory, not equal-magnitude contours. The faint half-Compton mesh is a dimensional guide and has no collision or rigid-shell dynamics.

## Time, controls and files

### Optional Faraday field lines

**Faraday lines from polarization** traces a coarse-grained field of the lattice pair moments (`direction * separation`), using trilinear interpolation between the fixed lattice sites. Shell sampling uses the same local orientation law at additional sites; the Faraday overlay continues to use the lattice interpolation when that sampling view is selected. Midpoint integration with step 0.055 R traces outward against polarization from seeds 0.38 R from the core; arrowheads point inward along polarization. The full-volume default uses forty approximately equal-area directions across a sphere, with no privileged XY plane. Enabling the cutaway uses twenty directions in the central plane. At tick zero no Faraday lines are drawn. Their opacity grows as the square of the overall alignment progress while their geometry follows the changing local polarization. Lines terminate at the sample volume, central mask, a stalled/looping path, or 160 steps. Seed count and spacing are display choices, not a flux-density measurement. Disordered initial orientations can produce short or curved lines before radial alignment develops.

The layer updates every twelve ticks while playing and at exact paused ticks. It is optional, survives JSON save/load and does not affect the model. Reference E arrows are independently selectable. The circular motion-magnetic guides follow the prescribed local rotation-axis direction; neither overlay calculates magnetic induction from microscopic currents. These distinctions connect the [polarization notes](Polarization-Notes.md) to the animation without claiming an emergent Maxwell solver.

The worker owns integer ticks with step `tau/120`, ending at tick 5760 (48 tau). **Advance 1 tau** advances 120 ticks; scrubbing pauses at an exact tick. The worker bounds catch-up and acknowledges at most one outstanding snapshot. Playback rate affects scheduling, not the equations. Hidden tabs and experiment switching pause the outgoing run. Each laboratory retains its own state; viewports are disposed and recreated when switching.

The moving trajectory is `x = beta*(t - 24)` with signed beta between −0.2 and +0.2, keeping the displayed run within ±4.8 R. Static modes use x = 0. Tick 5760 is the end of a displayed interval, not a physical stop, so the uniform-motion reference still uses beta at that paused endpoint.

Stages start a new paused sequence. Velocity, spin projection/axis and probe-coordinate edits apply together with **Apply electron parameters**, resetting the clock. The zepton selector is off by default and has an explicit toggle below the viewport. While off, clicking lobes cannot select them and the yellow selection mesh/inspector are hidden. Enabling it chooses the nearest sample in the current sampling view when needed; explicitly inspecting a spin band also enables it. Layer toggles, camera orbit, close-up and reduced-flashing mode do not change model state. The fixed probe reports complete vector components; the history plots Ey, Bmotion,z and Bspin,z, with a shared automatic scale in their respective normalized units.

Up to four session checkpoints retain tick and parameters. JSON format `zeropoint-electron`, version 3, stores those fields plus view settings. Imports are limited to 100 KB and validate mode, axis, spin sign, finite numeric ranges, tick and boolean layers; the worker revalidates state. Imports restore paused. Version 1 and 2 files migrate their tick, parameters and existing layer settings to the cubic medium, with selection disabled; version 1 also receives shell sampling. The UI reports the change. The changed lattice and initial alignment mean old orientations are not reproduced identically. New files validate both shell sampling and the selector boolean. Medium/light files are separate formats. A save records the latest received coherent snapshot; camera position, selected site and checkpoint list are session-only.

CSV exports the full reference sequence at 0.1-tau intervals, including future samples; PNG exports a captioned viewport. Graphics context loss pauses playback, and recovery reconstructs the current view without losing the timeline. A failed-worker restart starts a fresh default run.

## Scope

Implemented: source-linked electric alignment, local preferred turns illustrating Fleming's spin account, moving-electron response, analytic reference fields/flux, fixed probes, lifecycle inspection, transport, replay, state files and exports.

Not yet derived: a microscopic van der Waals torque law, emergent charge/alpha, quantized angular momentum, g-factor corrections, mass-energy from spectral exclusion, shell equilibrium, acceleration/radiation or a causal medium propagation solver. The source papers' missing equations and the differing shell/radius interpretations are recorded in the source notes.

## Electron introduction and initial polarization

Version 3 uses an illustrative sequence, not a charge-creation or Maxwell propagation solver. With `smooth(x) = clamp(x,0,1)^2 * (3 - 2*clamp(x,0,1))`, the core size/presence is `smooth(t/0.35)`. The stationary local alignment at radius r is `smooth((t - 0.35 - 0.08*r)/(2.65 - 0.08*r))`. Initial axes are deterministic spherical directions; Rodrigues rotation carries each toward its local inward direction. No pair midpoint translates. The final-field reference probe and flux remain analytic comparison targets throughout this introduction; they do not measure the partially polarized display. A minus glyph sits directly on the purple core, replacing the offset electron label.
