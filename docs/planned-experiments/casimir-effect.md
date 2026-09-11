# Planned experiment: Casimir effect

**Status: planned, not implemented.** Add a parallel-plate experiment alongside polarization and pressure (stage 3), before using a Casimir-cavity interpretation for particle shells (stage 4).

## Question and scene

How does plate separation change the field's allowed modes, interaction energy and resulting attraction? Show two neutral parallel conducting plates, a cutaway through the gap, an outside reference region, mode overlays and force arrows. Keep any zepton-pair midpoints fixed; pairs rotate, separate and collapse about those midpoints. Changing the allowed population or boundary response must follow an explicitly specified rule.

## Controls

- Plate gap, displayed plate area, camera orientation and cutaway plane.
- Inside/outside field layers, allowed-mode visualization and force/energy plots.
- A gap sweep with a reproducible parameter set and CSV export.
- Initially, an ideal perfect-conductor, zero-temperature baseline. Material response, temperature, finite-size and edge corrections are later extensions requiring their own models.

Use a separate physical scale preset suitable for plate gaps; do not inherit the medium MVP's 10⁻¹³ m length unit as a required plate scale.

## Reference and proposed mechanism

For ideal infinite parallel perfectly conducting plates at zero temperature, use the standard reference pressure `P(d) = −π²ℏc/(240 d⁴)` and interaction energy per area `U(d)/A = −π²ℏc/(720 d³)`. Negative pressure denotes attraction. For a large finite displayed area, `F ≈ PA` is an explicitly labelled approximation ignoring edges. The pressure reference and its idealizations are described in the [NIST-hosted review of Casimir forces in micro- and nano-electromechanical systems](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=906575). The energy expression above follows by integrating that pressure with zero interaction energy at infinite separation.

Maintain separate labels for the analytic reference and a future Fleming/zepton-model result. The current lifecycle reservoir and a visual reduction of dipole count cannot by themselves derive the Casimir pressure. A proposed zepton mechanism requires plate boundary conditions, a mode or spectral-density rule, regularization of the inside/outside energy difference, and a force calculation from that difference. Reference `c` is supplied for this baseline; it is not claimed as an emergent constant.

## Implementation gates and acceptance

1. Specify positive gap limits, conductor idealizations, spectral cutoffs/regularization and scale mapping. Do not permit zero plate separation in an ideal formula.
2. Build the analytic comparison scene independently of the still-undefined zepton force solver. Clearly label illustrative mode graphics.
3. Verify attraction, pressure units, the `d⁻⁴` trend (doubling gap gives one-sixteenth the pressure magnitude), area scaling in the plate approximation, and `P = −d(U/A)/dd`.
4. Add a zepton prediction only after its boundary/energy law is defined; test cutoff and spatial-resolution convergence instead of tuning a density slider to match the reference curve.
5. If plates are allowed to move later, include mechanical work and the corresponding field-energy change in the ledger. Static-gap sweeps are the first release of this experiment.

The planar result is a benchmark for the workbench. It does not establish the blueprint's spherical shell mass formula; that geometry still needs a separate derivation.
