# Planned experiment: Lamb shift

**Status: planned, not implemented.** Build a visual comparison between unshifted reference energy levels and the small Lamb shift in a bound-electron spectrum.

## Question and scene

How does a small field-dependent correction change the energy levels and transition lines of a simple atom? Show a baseline spectrum beside a shifted spectrum, with the difference magnified for inspection without confusing display scale with physical scale.

## Controls

- Atomic transition or simplified hydrogen-like level selection.
- Reference versus shifted level view, transition-line selection and display magnification.
- Field/coupling parameters only after their units and source are specified.
- A comparison table and CSV export containing the unshifted value, shifted value and displayed difference.

## Reference and proposed mechanism

Keep the established reference result and any future Fleming/zero-point-field explanation separate. The visualisation must not imply that an illustrative field animation derives the measured shift. A source dataset, units, uncertainty treatment and a defined correction rule are required before numerical values are presented as a comparison.

## Implementation gates and acceptance

1. Define the atomic system, transition labels, units, reference data and sign convention.
2. Render the small shift legibly while retaining an honest physical-scale view.
3. Verify that level differences produce the corresponding transition-frequency differences and that changing display magnification does not change the data.
4. Add a proposed medium/zepton contribution only after its equations, cutoff and convergence behaviour are specified.
