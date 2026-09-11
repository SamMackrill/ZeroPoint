# Planned experiment: double slit

**Status: planned, not implemented.** Build an inspectable wave/interference experiment showing how slit geometry and observation conditions affect the screen pattern.

## Question and scene

How does a two-slit arrangement produce a screen distribution compared with one slit, and what changes when which-path information is introduced? Show the source, slits, propagation region and screen, with the accumulated pattern separated from individual event traces.

## Controls

- Wavelength, slit separation, slit width, source distance and screen distance.
- One-slit, two-slit and which-path comparison modes.
- Wave/intensity view, individual arrival view, exposure time and reproducible seed.
- A screen-profile plot and CSV export for direct comparison between runs.

## Reference and proposed mechanism

Start with a clearly labelled reference interference model and preserve the distinction between a probability/intensity pattern and individual detection events. A future Fleming/zero-point-field interpretation must be shown as a separate hypothesis; the animation alone cannot establish a mechanism or replace a quantitative comparison.

## Implementation gates and acceptance

1. Define the propagation model, boundary conditions, units and detector sampling rule.
2. Reproduce the one-slit and two-slit reference patterns across wavelength and geometry changes.
3. Make the which-path change explicit and compare its screen profile with the two-slit case.
4. Add any proposed medium response only after its dynamics, noise assumptions and convergence tests are specified.
