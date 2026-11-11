# Double slit — illustrative model

Implemented model ID: **`double-slit/1`**. Open **Double slit** in the experiment library. It has three scenarios: **Two slits**, **Open path** and **Fields at light speed**.

The lab follows chapter 19 of Ray Fleming's *The Zero-Point Universe*, "The Speed of the Zero-Point Universe", and its [Figure 19-3](figures/double-slit/figure-19-3.jpeg) ([PDF p. 147](papers/Book%20-%20the-zero-point-universe.pdf#page=147)). Fleming uses a single photon and two slits to argue that a photon's fields spread far faster than light. The lab shows that argument. It does not model an interference pattern, which chapter 19 does not derive.

## What Fleming says

- A photon is "a sequence of central zeptons associated with a wavefront of associated zeptons in the space around it" (Fig. 19-2). The zeptons around the central one "rotate and orient themselves with respect to the central zepton", and the field "declines in strength at a rate proportional to the inverse of the distance squared".
- The energy "originates at point A and is absorbed at point B. A photon never loses a part of its energy; it is always absorbed all at once." The fields do not exist before the photon originates or after it is absorbed, and they "are also extinguished each half wavelength along with the central zepton".
- With nothing in the way the photon reaches B "in a time t that is exactly in keeping with the speed of light". With a wall and "two slits some distance apart, equidistant from the straight-line path", "it will still take the same time t even though the photon has to travel through slits offset from the direct path".
- "The information of the photon, the magnetic and electric fields, travels through the slits, but the propagation of those fields in a direction perpendicular to the direction of the photon happens at a rate much faster than the speed of light."
- If the fields spread only at the speed of light they "would only go out a half wavelength to either side of the photon's path", and "the fields, and thus the photon, could never make it through the slits". Diffraction patterns "exist entirely at distances greater than half a wavelength from the photon".
- In Fig. 19-3 the zeptons rotate in the plane of the page, giving "an electric field E that oscillates left and right and a magnetic field B that oscillates in and out of the page".

## Units and timing

Lengths are in photon wavelengths `λ` and times in periods `τ = λ/c`, the terms the argument is made in, so the photon moves one `λ` per `τ`. One tick is `τ/60`. A central pair lasts half a period (30 ticks) and opens to its own wavelength, `λ/2`, as in the [Light lab](light-model.md).

The straight path from A to B is `8 λ` with the wall halfway, so the run is `8 τ` (480 ticks) and the hand-off between pairs 8 and 9 falls at the wall. Fleming gives no distances. His own figure, read with "the wavelength equivalent to the diameter of the dots", is far larger measured in wavelengths; the lab's scale keeps a pair visible.

Each slit's centre is `2–5 λ` from the straight path (default 3) and each slit is `0.5–2 λ` wide (default 1), so the nearest slit edge is always at least `1 λ` from the path: beyond the half wavelength a field at light speed can reach. The slit geometry is live, because every drawn quantity is a function of the parameters and the tick alone.

## The central pairs

Pair `n` (from 0) is induced at tick `30 n` at the fixed centre `(0, (n + 1/2) λ/2)` on the straight line from A to B. As in the Light lab (book Figs 4-9 and 5-1) it is born along the path, turns 180° in the plane of the page, lies across the path at midlife and alternates in polarity from pair to pair. Its lobe separation is `(λ/2) sin(π u)` at age fraction `u`.

The pairs keep to the straight line on both sides of the wall. Fleming does not say where the central zeptons go at the wall. He does say the photon takes the same time `t`, which a centre detouring through a slit at `c` could not do: the route through the middle of a slit is longer than the straight path (10 λ against 8 λ at the default slits). So the lab reads him as the fidelity review does: the centres go straight and the field goes through the slits.

## The field

The field at a point is taken from the active pair. It is not an electromagnetic field solver.

```
E = s_n · sin²(π u) · F
F = 1 / (1 + (r / (λ/4))²)                                  on the pair's side of the wall, or with no wall
F = ½ [ f(r_left) + f(r_right) ],  f(r) = 1 / (1 + (r / (λ/4))²)     across the wall
```

- `s_n sin²(π u)` is the transverse part of the pair's moment, as in the Light lab: zero at each hand-off, one polarity per pair, reversed for the next.
- `r` is the distance from the pair's centre. The fall-off is inverse-square at distance and softened inside a quarter-wavelength so the centre stays finite; the softening radius is a display choice.
- The field is established at once wherever it reaches. Fleming gives no speed beyond "much faster than the speed of light" (he quotes astronomical bounds of at least 2 × 10¹⁰ c for fields in general), and no delay is modelled.
- Across the wall the field "travels through the slits". `r_left` and `r_right` are the shortest routes from the pair to the point through each opening: the straight line where it passes through the opening, otherwise by way of the opening's nearer edge. The two openings carry half each, so a wall never strengthens the field beyond it, and on the straight path the two shares are equal.

**The route rule and the equal shares are this model's construction.** Fleming says the field passes the slits; he does not say how it divides between them or how it spreads beyond them.

In **Fields at light speed** a field stops `λ/2` from its pair, which is how far it would spread in the pair's life at `c`. No field reaches a slit, pair 9 is never induced, and the run halts at the wall at `4 τ`; the timeline runs on to `8 τ` to show that nothing arrives at B. Fleming's counterfactual has no account of where the energy goes, and the lab gives none.

## What is drawn

The page is the plane of zepton rotation, as in Fig. 19-3, with A at the bottom and B at the top.

- **Surrounding zeptons** (558 on a jittered grid, with seeded resting orientations) turn toward the active pair's orientation by a share `w` and relax at each hand-off. `w` is the fourth root of the field strength there: the true bias is slight, since the field falls with the inverse square, and the root keeps the far field visible. A zepton no field reaches stays grey.
- **E / B of the active pair**: E points toward the pair's positive charge (book Fig. 6-7). B is drawn into the page when E points right and out of it when E points left, so that E × B lies along the direction of travel.
- **Field routes through the slits**: the shortest way from the active pair through each slit to B, while the pair is short of the wall.
- **Reach at light speed**: the band `λ/2` to either side of the path.
- The **dock** shows the photon's place, its arrival time (the straight-line time, or never), the field at B, and the nearest slit edge. **Plots** has the field strength at B through the run and along the wall at the current instant, both on logarithmic scales. **Reach** sets the straight path beside the route through a slit, and the slit edge beside the reach of a field at light speed.

## Files and export

Double-slit JSON files use the `zeropoint-double-slit` version 1 format: model ID, scenario, slit geometry, layers and tick. The scenario sets the wall and the field speed; a file cannot override them. Imports are limited to 20 KB and validate every field. CSV exports all 481 ticks of the run: status, the photon's place, the active pair and its polarity, the field at B with each slit's share, and the field on the wall at a slit's centre.

## Not modelled

- **A screen pattern.** Chapter 19 says diffraction patterns lie more than half a wavelength from the photon and takes them as evidence for fast fields; it does not derive fringes. Because the field here is established at once with the pair's single polarity, the two slits' contributions always agree in sign, so this model produces no fringes either. A screen with a pattern would need a rule Fleming does not give in the sources held here.
- **Which-path detection**, a single slit, and absorption anywhere but B.
- **A finite field speed.** The two cases are Fleming's: far faster than light, or held to it.
- Coupling forces, torque and energy transfer, as in the Light lab.
