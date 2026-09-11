# Electron properties: video refinement

Source: Ray Fleming, [Electron Properties are Quantum Field Effects](https://www.youtube.com/watch?v=mFearr3kmIQ), 14:06. Reviewed on 11 September 2026 using YouTube's English auto-generated captions, cross-checked against the supplied [electron-properties paper](papers/Electron%20Properties%20Explained%20as%20Quantum%20Field%20Effects.pdf). Times locate discussion starts approximately; captions can misrecognize equations and names. The video description refers to protons, so it was not used as an electron transcript. No transcript is reproduced here.

## Source map

| Video passage | Fleming's account | Implementation decision |
| --- | --- | --- |
| [1:06–3:23](https://www.youtube.com/watch?v=mFearr3kmIQ&t=66s) | Rewrites magnetic moment using the Compton wavelength; two opposite charges moving oppositely contribute to his near-two g interpretation. | Add a magnified pair with velocity/current switching. Preserve the signed magnetic-moment reference; do not derive g from two arrows. |
| [3:30–5:38](https://www.youtube.com/watch?v=mFearr3kmIQ&t=210s) | Continual pair replacement and lower-energy coordinated turns underpin his explanation of spin. | Link the close-up to the existing timeline and selected shell site. Add a shared-preference shortcut. |
| [5:51–8:21](https://www.youtube.com/watch?v=mFearr3kmIQ&t=351s) | Relates sphere flux to charge and attributes polarization resistance to quantum van der Waals torque. | Add an adjustable Gauss sphere using the static analytic reference. No microscopic torque law is supplied. |
| [8:22–9:23](https://www.youtube.com/watch?v=mFearr3kmIQ&t=502s) | Associates mass with excluded zero-point energy at a Compton-diameter structure. | Propose an energy-budget investigation below. |
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
| Excluded modes and mass budget | Sweep shell diameter, thickness and excluded frequency band; compare integrated energy with the supplied reference `m_e*c²`. | Obtain the detailed mass paper cited by §5, define spectral density, mode exclusion, subtraction/regularization and integration measure. Test cutoff dependence and avoid fitting the answer silently through shell thickness. |
| Electron ↔ positron | Reverse core and pair charge orientation; compare electric field, current and intrinsic moment while holding spin projection fixed. | Parameterize core charge consistently throughout reference fields, geometry and exports; require field/moment sign reversal tests. Treat matter/antimatter orientation as Fleming's interpretation, not an annihilation calculation. |

See [the model specification](electron-model.md) and [earlier paper source notes](electron-source-notes.md) for units, geometry and the remaining microscopic-model assumptions.
