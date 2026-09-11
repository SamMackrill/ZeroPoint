# Electron in the zero-point field: extracted source details

The [implemented experiment](electron-model.md) has three views: stationary electric alignment, spin at rest, and a moving electron. This document separates Fleming's account from the choices needed to animate it. The supplied PDFs and blueprint remain unchanged.

## Source map

| Source | Relevant sections | What the experiment uses |
| --- | --- | --- |
| [Electron Properties Explained as Quantum Field Effects](papers/Electron%20Properties%20Explained%20as%20Quantum%20Field%20Effects.pdf) | §2, p. 2; §3 and Fig. 2, p. 3; §§4–6, pp. 3–5; §8, p. 5; §9, p. 6 | Bare negative polarizer, radial charge orientation, preferred local rotation, fixed dipole centres, spin/magnetic moment interpretation, and pair separation/collapse. |
| [Electron and proton radii are due to quantum polarization rate and the speed of light](papers/Electron%20and%20proton%20radii%20are%20due%20to%20quantum%20polarization%20rate%20and%20the%20speed%20of%20light.pdf) | §1 and Fig. 1, p. 1; §2 and Fig. 2, p. 2; §4, p. 3 | Electron radius interpreted as half the Compton wavelength, effective polarization-rate argument, and the distinction between local rotation and a literal rotating shell. |
| [Fine Structure Constant as the Polarization of the Quantum Field by a Unit Charge](papers/Fine%20Structure%20Constant%20as%20the%20Polarization%20of%20the%20Quantum%20Field%20by%20a%20Unit%20Charge%20.pdf) | §2 and Fig. 1, p. 2; §3, p. 2; §4, p. 3 | Static polarization versus motion-induced rotation, van der Waals torque as the proposed resistance to polarization, flux interpretation of charge and volumetric-polarization interpretation of alpha. |
| [Original simulation blueprint](Ray%20Fleming's%20Zero-Point%20Field%20Physics_%203D%20Simulation%20Blueprint.md) | §§2, 4, 6 | Pair lifecycle, positive ends toward a negative polarizer, magnetic rotation under motion, right-hand-rule geometry and a half-Compton scale guide. |

## Stationary electron and electric alignment

The supplied [Polarization Notes](Polarization-Notes.md), especially §2, also describe neighboring dipoles aligning end to end as the physical basis of Faraday field lines in Fleming's account. The optional **Faraday lines from polarization** layer follows the mean orientation of the displayed pairs. It illustrates that interpretation without adding a microscopic neighbor-torque law. The electric arrows remain a separately selectable analytic comparison.

In the electron-properties paper, the bare electron is a small negative polarizer; the surrounding dipoles give it its observable charge and other properties. Positive ends lie nearer the central electron and negative ends farther away. The paper expresses charge using `Q = integral_surface P · dA`, with the same total flux on spheres of different radii (§2, equations 1–2). Its `P` is Fleming's polarization-flux quantity; it must not silently be identified with the conventional SI bound-charge polarization vector of material electrodynamics.

The experiment replays local alignment at fixed sampling positions and overlays an explicitly analytic electric reference. For a negative stationary charge, the reference vectors point inward and fall as `1/r²`. Numerical flux quadrature on a sphere gives enclosed charge −1 in units of e. This checks the reference geometry; it does not derive unit charge by summing the displayed dipoles.

## Local rotation and spin

Section 3 of the electron-properties paper describes continuously replaced pairs born with differing orientations. Fleming argues that nearby, partially polarized dipoles use less energy when they rotate with a common preference rather than forcing like charges closer together through opposing turns. He also says only a small subset of an extremely dense medium need turn by small angles to support a field.

Crucially, p. 3 distinguishes a common preference from every dipole rotating on the same axis. The field can appear to rotate as a whole while the bare electron remains still and individual dipole centres remain fixed. Section 6, p. 5 compares this to a sequence of stationary lights whose changing states create apparent motion. The implementation therefore animates local turns and replacement generations, with spatially varying local axes. It does not send zeptons around the core or rotate a material sphere.

The paper writes the spin projection as `±hbar/2 = ±h/(4*pi)` and relates its magnitude to `e²/(8*pi*epsilon0*alpha*c)` (p. 2, equation 3). These are reference relations. A chosen ±½ projection controls the illustrated preference; the code does not claim to obtain quantization from a torque solver.

The magnetic-moment relation is `mu = -g*e*S/(2*m_e) = -g*mu_B*S/hbar` (§4, equation 5). Thus the electron's magnetic moment is opposite its spin projection on the same axis. Fleming interprets the near-two g factor using both signs in rotating dipoles, with two oppositely charged counter-rotating shells as an approximation (§4, p. 4). The implementation now exposes these opposing charge layers in a dedicated shell sampling view, while keeping the magnetic-dipole reference separately selectable.

## Shells and radial rotation rate

Follow-up investigation, 8 September 2026:

- **Electron properties, §4, p. 4:** the shell approximation places positive charge inside negative charge, with their motions in opposite directions. This describes the two charge ends of locally rotating dipoles. It does not specify that the rotation sign of each complete dipole reverses from one radial band to the next.
- **Radii paper, §1, p. 2:** repeats the two opposite-charge, opposite-direction shell approximation. Section 2 distinguishes effective shell motion from charge actually orbiting a spherical surface. Section 4 gives `c/(2*pi*R)` for the effective particle-scale rate, comparing electron and proton radii. That relation is not a radial rate profile within one electron's surrounding field.
- **Additional primary-source search:** Fleming's [Particle Spin and Magnetic Moment as Quantum Field Effects](https://www.researchgate.net/publication/327835330_Particle_Spin_and_Magnetic_Moment_as_Quantum_Field_Effects), §§4–6, also describes local rotation, fixed centres and two counter-moving charge surfaces. Its §6 reverses the stated inner/outer charge order relative to the supplied electron-properties paper. We retain positive-inside for a negative electron, consistent with the supplied paper's polarization geometry.

No explicit `omega(r) ∝ 1/r²` law was found in the checked passages or the targeted source search. Inverse-square electric polarization alone does not fix angular speed without a torque/response law. Version 2 therefore uses a **labelled inverse-square display hypothesis**, with bounded near-core turning. It makes the nearest representative band turn about 22 times faster than the outermost band; this ratio is chosen by the visualization's radii and assumed law, not reported as a Fleming prediction.

The shell view samples four radial bands to compare distances. Each band exposes its inner positive and outer negative charge layers, producing an alternating sequence of charge signs and tangential directions. All pair midpoints remain fixed. The number, radii, thickness and spacing of the bands are display choices; the papers do not prescribe four discrete physical shells. Local arrows show rotation-only lobe velocity, excluding separation/collapse. The cutaway and full 3D view display the same underlying local rotation geometry.

## Electron radius and effective rate

The radii paper assigns the electron's field structure `R = lambda_C/2` and relates its effective pattern rate to `c/(2*pi*R)`. Section 4 quotes about `3.933 × 10^19` turns/s for the electron and `5.452 × 10^22` for the proton, a ratio about 1386 using that paper's radius values. The electron-properties paper's §9 explicitly says the structure is an arrangement of dipoles rather than a material shell and leaves a full mathematical balance for future work.

The new scene uses a labelled half-Compton guide around the electron. It is neither a solid boundary nor the experimentally measured classical/charge radius of a literal electron sphere. Its effective rate is shown as a source scale, not the angular speed of every displayed pair or a particle orbit. The proton's historical `0.8751 fm` radius and the blueprint's `0.8775 fm` are recorded as source values, not substituted into this electron experiment or presented as current proton-radius measurements.

## Motion and magnetic response

Both Fig. 1 of the electron-properties paper and Fig. 1 of the fine-structure paper show dipoles turning as an electron moves. The blueprint requires right-hand-rule consistency. The moving view prescribes a straight trajectory through world-fixed sampling centres. Nearby local orientation changes follow the electron; the path guide is not a permanent magnetic wake.

The motion-induced reference uses the constant-velocity electric field and `B_motion = v × E / c²`. A negative charge moving in +X has B toward −Z at a point above it (+Y); reversing velocity reverses B. These reference relations, including the uniform-motion electric field, are documented in [Feynman Lectures II, §26–2, equations 26.2–26.12](https://www.feynmanlectures.caltech.edu/II_26.html). Intrinsic spin magnetism remains a separate overlay so zero translational velocity is not confused with the absence of all electron magnetism.

## Fine-structure constant and remaining equations

The fine-structure paper relates charge to polarization flux, then argues that alpha measures total volumetric polarization. It gives `alpha = e²/(4*pi)` in units with `epsilon0 = c = hbar = 1`, or `alpha = e²/2` when `epsilon0 = c = h = 1` (§4, equations 4–5). Those are different unit conventions, not interchangeable SI formulas.

Equation 7 on p. 3 writes a radial integral of the enclosing-sphere polarization flux from zero to infinity. A flux independent of radius would make that integral divergent as written. A finite numerical alpha calculation needs further definitions, a measure and/or regularization; this experiment does not invent them. Likewise, the papers do not supply a closed, quantitative van der Waals torque law, angular-momentum ledger or replacement-pair induction dynamics. The local animation is a stated convention, with alpha and the spin/moment values supplied as reference inputs.

For the displayed constants, the implementation uses the [2022 CODATA table hosted by NIST](https://physics.nist.gov/cuu/Constants/Table/allascii.txt), including `lambda_C = 2.42631023538 × 10^-12 m` and `alpha = 7.2973525643 × 10^-3`. These reference inputs do not validate Fleming's interpretations or turn the illustrated response into a predictive microscopic solver.
