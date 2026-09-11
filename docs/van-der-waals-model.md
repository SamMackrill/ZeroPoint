# Van der Waals attraction and zero-point pressure

Implemented as a separate experiment in the library. It follows Chapter 3 of Ray Fleming's [The Zero-Point Universe](papers/Book%20-%20the-zero-point-universe.pdf#page=27), PDF pages 27–32. The three stages connect induced polarization, correlated dipoles and the pressure difference between conducting plates. Switching experiments retains controls and pauses the animation; hiding the browser tab also pauses it. Reset restores the opening stage and defaults. Animation starts paused, and discrete stepping is available.

## Source extraction

The four original embedded JPEGs were extracted without modification using PyMuPDF `Document.extract_image`. No page screenshots or generated substitutes are used in the source gallery.

| Source | PDF page | Embedded image xref | Local asset | Use |
| --- | --- | --- | --- | --- |
| Figure 3-1 | 28 | 1011 | [Dipole orientations](figures/van-der-waals/figure-3-1.jpeg) | Opposed and aligned configurations; polarization changes the dipole moment. |
| Figure 3-2 | 28 | 1012 | [Induced atom](figures/van-der-waals/figure-3-2.jpeg) | Neutral atom versus shifted negative charge distribution. |
| Figure 3-3 | 29 | 623 | [Plate cavity](figures/van-der-waals/figure-3-3.jpeg) | Inside/outside field comparison. |
| Figure 3-4 | 30 | 1014 | [Pressure imbalance](figures/van-der-waals/figure-3-4.jpeg) | Nearly balanced opposing stresses and net inward force. |
| Equation 3-1 | 31 | — | See the linked book | Ideal plate force proportional to area and inverse fourth power of gap. |

The in-app SVG diagrams adapt these ideas with labelled charge colours, adjustable geometry and explicit model boundaries. The original figures remain available in the expandable source gallery.

On PDF page 28 the prose calls case II repulsive as well as case I. In Figure 3-1, case I has adjacent like charges and case II has adjacent opposite charges. The interactive explanation follows that geometry, rather than repeating the inconsistent wording. A fixed dipole configuration can repel; London attraction is an averaged fluctuation interaction, not a claim that all instantaneous dipole orientations attract.

## 1. Induced polarization

The field control moves the centre of a drawn negative cloud relative to a fixed positive nucleus. This illustrates `p = αE`, with fixed polarizability and an arbitrary field scale. The cloud radius and displacement are schematic. Net charge remains zero. This is not a hydrogen wavefunction calculation or a classical orbit animation.

Chapter 3 distinguishes permanent/permanent (Keesom), permanent/induced (Debye), and fluctuating induced/induced (London dispersion) interactions. The remaining stages follow the London branch.

## 2. Correlated dipoles

Both moments follow a prescribed cosine through a six-second display cycle. Opposite lobes move symmetrically around fixed pair centres; the centres only change when the user adjusts their separation. The animation depicts nonzero correlation despite zero cycle-average dipole moments. It is not a stochastic or quantum solver, and its instantaneous lobe positions do not calculate the displayed force.

The independent nonretarded London reference is:

```
U(r) = −C₆/r⁶
F(r) = −dU/dr = −6C₆/r⁷
```

The controls use `s = r/r₀` between 1 and 3, an arbitrary reference separation `r₀` chosen within the conceptual nonretarded regime. With `E₀ = C₆/r₀⁶`, the readouts are `U/E₀ = −s⁻⁶` and `F/(E₀/r₀) = −6s⁻⁷`. No material-specific coefficient, absolute atomic distance, or field dipole density is supplied. Doubling separation divides the energy magnitude by 64 and the force magnitude by 128. Short-range overlap repulsion is excluded. Retardation changes the long-range atom–atom powers to energy proportional to `−r⁻⁷` and force proportional to `−r⁻⁸`; no arbitrary crossover interpolation is used.

The connection and retardation distinction follow [Casimir and Polder, Physical Review 73, 360 (1948)](https://journals.aps.org/pr/abstract/10.1103/PhysRev.73.360).

## 3. Pressure from a change in interaction energy

Fleming interprets fluctuations as interacting electric dipoles which exert pressure on matter. Figures 3-3 and 3-4 motivate the inside/outside imbalance. The app labels this as Fleming's interpretation. It does not derive a constitutive force law from the medium lifecycle or identify the drawn ovals as established microscopic vacuum particles.

For the separately evaluated standard reference, the plates are infinite, parallel, perfectly conducting and at zero temperature. Each electromagnetic mode has ground-state energy `½ℏω`; boundaries change the spectrum. A regularized interaction energy relative to infinite separation yields:

```
U(d)/A = −π²ℏc/(720d³)                 J/m²
P(d)   = −∂(U/A)/∂d = −π²ℏc/(240d⁴)  Pa
F      ≈ PA                            N
```

The planar pressure is exact within those idealizations; finite-area force and total energy use the large-plate approximation, neglecting edges. `ℏ = 1.054571817 × 10⁻³⁴ J s` and `c = 299792458 m/s` are supplied constants. The energy zero is infinite separation. Negative pressure and force denote attraction, tending to reduce the gap.

Gap controls span 100–1000 nm, area 0.1–10 mm². At 100 nm the pressure is approximately −13.0013 Pa; at 200 nm, −0.81258 Pa; at 1000 nm, −0.00130013 Pa. For 1 mm² at 200 nm the force is approximately −0.81258 μN. Doubling the gap divides pressure magnitude by 16. Changing area scales force but not pressure. The logarithmic chart and 61-row CSV sweep evaluate this analytic function for fixed gaps; neither moves plates dynamically nor purports to measure experimental samples.

The derivation and assumptions are supported by [Decca, Aksyuk and López, Casimir force in micro and nano electro mechanical systems, introduction and Eq. (1)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=906575). The energy expression follows by integrating the pressure with zero energy at infinite separation.

The blue opposing arrows illustrate a common background and a small imbalance, exaggerated for visibility. Their lengths do not represent absolute inside or outside pressures. Green net arrows use a compressed logarithmic visual scale. The numerical readout is the stress difference only. Absolute vacuum pressure, a cosmological equation of state, or a vacuum energy density cannot be inferred from it.

The n = 1, 2, 3 curves show example normal standing-wave components satisfying `λₙ = 2d/n`. They omit transverse wavevectors, polarization details and other modes. Their amplitude is arbitrary; toggling them changes only the drawing. The book's wavelength exclusion picture is a heuristic, not the literal removal of every fluctuation with wavelength greater than d. Retardation is finite propagation time, not synonymous with this visual exclusion. The complete regularized electromagnetic spectrum, not the count of drawn curves, underlies the reference formula.

Real conductivity, dielectric dispersion, finite temperature, roughness, patch potentials, finite size, overlap repulsion and mechanically moving plates are excluded. As [Jaffe, Physical Review D 72, 021301 (2005)](https://arxiv.org/abs/hep-th/0503158) discusses, Casimir forces also admit descriptions through interactions of charges and currents without assigning an observable absolute vacuum energy. The experiment therefore illustrates Fleming's proposed mechanism alongside an established ideal result, without claiming the latter uniquely validates the former.

## Verification

Unit tests check numerical magnitude and SI conversions, attraction, inverse-power scaling, the negative energy derivative, area independence of pressure, invalid input rejection and sweep export. Browser tests cover the three stages, live controls/readouts, stepping and pausing, state retention, source assets, CSV export and a narrow mobile layout.

The broader [Casimir experiment plan](planned-experiments/casimir-effect.md) still includes a future microscopic boundary model and more complete 3D controls. This release implements its analytic pressure comparison within the van der Waals experiment.
