// The sphere figure's geometry (Figure 6-4) as plain numbers, so a page can use it without loading three.js.

/** How many field lines come in, spread evenly over every direction. */
export const SPHERE_LINES = 26;

/** Smallest and largest sphere radii, in scene units: the figure's 1× to 3.56× (45 to 160 on the flat page). */
export const SPHERE_R_MIN = 1, SPHERE_R_MAX = 3.56;

/** The fixed patch's area: a sixth of the smallest sphere, so it holds about four crossings there and fewer further out. */
export const PATCH_AREA = (4 * Math.PI * SPHERE_R_MIN ** 2) / 6;

/** Directions spread evenly over a sphere (a Fibonacci lattice), the same every time, as unit [x, y, z]. */
export function evenDirections(n: number): [number, number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n, ring = Math.sqrt(1 - y * y), a = golden * i;
    return [ring * Math.cos(a), y, ring * Math.sin(a)];
  });
}

/** The half-angle of a cap of the patch's fixed area on a sphere of radius `r` (2πr²(1 − cos θ) = area). */
export const patchAngle = (r: number) => Math.acos(Math.max(-1, 1 - PATCH_AREA / (2 * Math.PI * r * r)));
