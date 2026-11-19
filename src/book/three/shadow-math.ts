// The geometry of Figures 17-2 and 18-2, kept apart from the scene so the chapters can use it without loading three.js.

/** Star 1's radius, in the units of the figure (Star 2's radius at its starting size is 1). */
export const STAR1_R = 0.9;

/** The cone from a point to the edges of a sphere of radius `s` at distance `d`: how far along the axis it touches the sphere, the radius of that circle, and the half-angle. */
export function tangentCone(d: number, s: number) {
  const along = (d * d - s * s) / d, radius = (s * Math.sqrt(d * d - s * s)) / d;
  return { along, radius, half: Math.asin(Math.min(1, s / d)) };
}
