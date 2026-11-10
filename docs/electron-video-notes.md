# Electron properties: video refinement

Source: Ray Fleming, [Electron Properties are Quantum Field Effects](https://www.youtube.com/watch?v=mFearr3kmIQ), 14:06. Reviewed on 11 September 2026 using YouTube's English auto-generated captions, cross-checked against the supplied [electron-properties paper](papers/Electron%20Properties%20Explained%20as%20Quantum%20Field%20Effects.pdf). Times locate discussion starts approximately; captions can misrecognize equations and names. The video description refers to protons, so it was not used as an electron transcript. No transcript is reproduced here.

## Source map

| Video passage | Fleming's account | Implementation decision |
| --- | --- | --- |
| [1:06–3:23](https://www.youtube.com/watch?v=mFearr3kmIQ&t=66s) | Rewrites magnetic moment using the Compton wavelength; two opposite charges moving oppositely contribute to his near-two g interpretation. | Add a magnified pair with velocity/current switching. Preserve the signed magnetic-moment reference; do not derive g from two arrows. |
| [3:30–5:38](https://www.youtube.com/watch?v=mFearr3kmIQ&t=210s) | Continual pair replacement and lower-energy coordinated turns underpin his explanation of spin. | Link the close-up to the existing timeline and selected shell site. Add a shared-preference shortcut. |
| [5:51–8:21](https://www.youtube.com/watch?v=mFearr3kmIQ&t=351s) | Relates sphere flux to charge and attributes polarization resistance to quantum van der Waals torque. | Add an adjustable Gauss sphere using the static analytic reference. No microscopic torque law is supplied. |
| [8:22–9:23](https://www.youtube.com/watch?v=mFearr3kmIQ&t=502s) | Associates mass with excluded zero-point energy at a Compton-diameter structure. | Implemented as **Mass & excluded energy** (10 November 2026), from chapter 16 of the book. |
| [9:27–10:12](https://www.youtube.com/watch?v=mFearr3kmIQ&t=567s) | Associates electron/positron identity with the outward matter/antimatter orientation. | Propose charge-conjugation comparison below. |
| [10:16–11:52](https://www.youtube.com/watch?v=mFearr3kmIQ&t=616s) | Uses a speed limit to cap size at a given polarization rate; acknowledges an unresolved origin of the electron/proton rate difference. | Add an effective radius/rate calculator. Keep its rate separate from microscopic display turns. |

## Changes available in the laboratory

**Spin: two charges, one local turn.** The close-up uses `displayedDipole`, shared with the 3D shells, equatorial section and inspector. It follows the selected visible shell site, or sample 2231 if none is selected. The local plane has inward radial and tangential coordinates; the pair midpoint stays at the centre of the drawing. Positive and negative velocity arrows are equal and opposite. Conventional-current arrows apply the charge signs, `(+1)v+` and `(−1)v−`, so they point together. Arrow lengths are normalized to show direction rather than speed; they omit separation/collapse velocities. This illustrates reinforcement of local current, not a spatial current-density integral or a computed magnetic moment. It cannot determine g or its anomaly.

The shared-preference button enables shell sampling, the equatorial section and selection, then chooses shared local turns. The existing alternating-band comparison remains available. The video supports coordinated local rotation; it supplies no rule alternating successive complete zepton bands and no inverse-square angular-speed law. Those options retain their earlier illustrative labels.

**Charge & flux.** An independent stationary reference lets the sphere radius vary from 0.5 R to 3 R. It reports `|E|/E0 = (R/r)^2`, normalized surface area `(r/R)^2`, and a 256-point sphere quadrature giving `Q/e ≈ −1`. The scene is an equatorial section of an integration sphere; the calculation integrates the full sphere. It assumes an already established Coulomb field with charge −e, including when the main scene is introducing or moving the electron. It does not calculate unit charge from sample count or pair alignment.

**Radius & rate limit.** Independently vary `r/R` and `f/f0` over 0.5–2, where `R = lambda_C/2` and `f0 = c/(2*pi*R)`. The graph evaluates `v_eff/c = (r/R)(f/f0)` and reports the limiting radius `r_limit/R = f0/f`. Points above c are explicitly hypothetical excluded trials in this argument. The graph is a kinematic illustration, not a new particle trajectory, stability solution or measurement of electron size. Its controls do not alter the simulation, save file or CSV.

### Effective shell speed versus local tip speed

The video's wording moves between an effective rotating shell and local dipole tips. These have different lever arms: `v_eff = 2*pi*r*f_eff`, while a rotating pair end has `v_tip = omega_local*separation/2`. Neither formula establishes that the two angular rates are equal. The supplied paper §6, p. 5 explicitly distinguishes apparent field motion from dipoles moving around a spherical surface. We therefore retain fixed pair centres and introduce no new microscopic speed law.

Similarly, substituting `lambda_C = h/(m_e*c)` into the reference magnitude `|mu| = g*e*hbar/(4*m_e)` gives `g*e*c*lambda_C/(8*pi)`. The algebra alone does not measure a radius or uniquely require a material shell. The half-Compton interpretation is Fleming's additional model assumption. His field-medium account remains labelled as an interpretation rather than an established derivation of electron properties.

## Proposed next experiments

| Investigation | Useful interaction and observable | Work needed before a quantitative claim |
| --- | --- | --- |
| Neighbor coordination and torque | Compare shared and opposing turns at fixed centres; plot a declared interaction energy versus angle and neighbor spacing. | Specify finite pair size, coupling, boundary conditions and damping. Begin with a labelled electrostatic toy model; do not call it a derivation of quantum van der Waals torque or spin quantization. |
| Excluded modes and mass budget | **Implemented** as the static scenario *Mass & excluded energy*: sweep shell diameter and thickness for the electron or proton and compare the excluded energy with `mc²`. | The recipe did not need the separate mass paper: chapter 16 of *The Zero-Point Universe* gives the energy density (Eq. 16-1) and worked figures, which the study reproduces. See *Mass as excluded zero-point energy* below. |
| Electron ↔ positron | Reverse core and pair charge orientation; compare electric field, current and intrinsic moment while holding spin projection fixed. | Parameterize core charge consistently throughout reference fields, geometry and exports; require field/moment sign reversal tests. Treat matter/antimatter orientation as Fleming's interpretation, not an annihilation calculation. |

## Mass as excluded zero-point energy

Source: *The Zero-Point Universe*, chapter 16 (PDF pages 122–128), and *Electron Properties* §5. Fleming treats a particle as a spherical shell that acts as a Casimir cavity (Fig. 16-1): fluctuations with wavelengths shorter than the inner diameter `d_i` exist inside it, those longer than the outer diameter `d_o` exist outside it, and those in between are excluded. The shell is a structure of fluctuations, not a solid surface, so wavelengths as short as its own thickness are not excluded.

The energy density of the fluctuations between two angular frequencies is `rho = hbar*(w2^4 - w1^4)/(8*pi^2*c^3)` (Eq. 16-1), with `w = 2*pi*c/d`. That is `2*pi^2*hbar*c*(1/d_i^4 - 1/d_o^4)`. Fleming compares it with the particle's mass-energy spread over a sphere of the mean diameter. The study uses the book's CODATA 2010 inputs so its figures reproduce:

| Quantity | Book | Study |
| --- | --- | --- |
| Proton mass-energy density at diameter 1.755 fm | 3.315 × 10³⁸ GeV/cm³ | 3.315 × 10³⁸ |
| All wavelengths from 1.755 fm up | 4.106 × 10³⁸ GeV/cm³ | 4.106 × 10³⁸ |
| Outer diameter that balances, inner 1.755 fm | 2.649 fm | 2.649 |
| Proton shell about 1.755 fm: inner / outer / thickness | 1.586 / 1.924 / 0.169 fm | 1.586 / 1.924 / 0.169 |
| Electron mass-energy density at the Compton wavelength | 6.833 × 10²⁵ GeV/cm³ | 6.833 × 10²⁵ |
| All wavelengths from the Compton wavelength up | 1.124 × 10²⁶ GeV/cm³ | 1.124 × 10²⁶ |
| Outer diameter that balances, inner at the Compton wavelength | 3.066 pm | 3.066 |
| Pair wavelength at the pair-production energy, `hc/4mc²` | 0.6066 pm, 0.330 fm | 0.6066, 0.330 |
| Electron shell with diameters 0.6066 pm apart: radius / inner / outer | 1.592 / 2.880 / 3.487 pm | 1.592 / 2.880 / 3.487 |
| Electron shell about the Compton wavelength: inner / outer | 2.123 / 2.472 pm | 2.247 / 2.606 |

The last row is the one difference. The book says the average of the two diameters is set to the Compton wavelength (2.426 pm), but 2.123 and 2.472 pm average to 2.298 pm. The same recipe that gives every other row, including the proton's shell, gives 2.247 and 2.606 pm with a thickness of 0.179 pm (the book prints 0.175). The study shows the computed values.

The study takes mass as an input and compares; it does not predict a mass from a diameter that the model derives. The balance is unique for a given diameter because the sphere's mass-energy density falls with the cube of diameter and the excluded density with its fourth power, as Fleming notes.

See [the model specification](electron-model.md) and [earlier paper source notes](electron-source-notes.md) for units, geometry and the remaining microscopic-model assumptions.
