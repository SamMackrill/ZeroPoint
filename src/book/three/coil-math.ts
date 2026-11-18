// Figure 6-18's coil as plain numbers, so its field can be computed and tested without loading three.js. The coil runs
// along x; its current goes round in the sense from +y toward +z (out of the page at the top of each turn, as the
// caption has it), so by the right hand grip its field points along +x inside, with north to the right.

/** Turns of wire, the coil's radius and the distance between turns, in scene units. */
export const COIL_TURNS = 6, COIL_RADIUS = 1, COIL_PITCH = 0.5;

/** The coil's length, end to end. */
export const COIL_LENGTH = COIL_TURNS * COIL_PITCH;

/** Where the field lines may run before they are cut off: along the axis, and out from it. */
export const FIELD_BOX = { x: 5.4, rho: 3 };

const SEGMENTS = 72;

/**
 * The field at a point in a plane through the axis, `x` along it and `rho` out from it, for a current of 1, as the
 * sum over the turns, each taken as a circular loop (Biot–Savart, unscaled). Returns [along x, outward].
 */
export function coilField(x: number, rho: number): [number, number] {
  let bx = 0, brho = 0;
  for (let n = 0; n < COIL_TURNS; n++) {
    const xn = -COIL_LENGTH / 2 + (n + 0.5) * COIL_PITCH;
    for (let k = 0; k < SEGMENTS; k++) {
      const phi = ((k + 0.5) / SEGMENTS) * 2 * Math.PI, c = Math.cos(phi), s = Math.sin(phi);
      // A piece of the loop at (xn, R cos φ, R sin φ), running toward increasing φ; the point is (x, rho, 0).
      const dly = -COIL_RADIUS * s, dlz = COIL_RADIUS * c, rx = x - xn, ry = rho - COIL_RADIUS * c, rz = -COIL_RADIUS * s;
      const r3 = (rx * rx + ry * ry + rz * rz) ** 1.5 + 1e-9;
      // dl × r, with dl = (0, dly, dlz).
      bx += (dly * rz - dlz * ry) / r3;
      brho += (dlz * rx) / r3;
    }
  }
  const scale = (2 * Math.PI) / SEGMENTS;
  return [bx * scale, brho * scale];
}

/**
 * A field line in the plane through the axis, traced both ways from a seed, as [x, rho] points in the direction of
 * the field (for a positive current). Stops at the box's edge or when it closes on itself.
 */
export function coilFieldLine(x0: number, rho0: number, step = 0.035, limit = 1400): [number, number][] {
  const trace = (sign: 1 | -1) => {
    const points: [number, number][] = [[x0, rho0]];
    let x = x0, rho = rho0;
    for (let i = 0; i < limit; i++) {
      const dir = (px: number, pr: number) => { const [bx, br] = coilField(px, pr), m = Math.hypot(bx, br) || 1; return [(sign * bx) / m, (sign * br) / m]; };
      const [ax, ar] = dir(x, rho), [mx, mr] = dir(x + (ax * step) / 2, rho + (ar * step) / 2);
      x += mx * step;
      rho += mr * step;
      if (rho < 0 || Math.abs(x) > FIELD_BOX.x || rho > FIELD_BOX.rho) break;
      points.push([x, rho]);
      if (i > 60 && Math.hypot(x - x0, rho - rho0) < step * 1.5) return { points, closed: true };
    }
    return { points, closed: false };
  };
  const forward = trace(1);
  if (forward.closed) return forward.points;
  const back = trace(-1);
  return [...back.points.slice(1).reverse(), ...forward.points];
}

/** How many spinning zeptons each setting of the figure's Zeptons control shows. */
export const ZEPTON_COUNTS = { few: 7, more: 20, many: 40 } as const;

/**
 * Places for the spinning zeptons, as [x, rho, angle round the axis]. The first seven are fixed: three inside on the
 * axis and four outside. The rest are scattered, the same every time, about two in five inside the coil and the others
 * round the outside, out past its ends where the field turns back.
 */
export const COIL_ZEPTONS: [number, number, number][] = (() => {
  const places: [number, number, number][] = [
    [-0.9, 0, 0], [0, 0, 0], [0.9, 0, 0],
    [0, 1.75, Math.PI / 2], [0, 1.75, -Math.PI / 2], [0, 1.75, Math.PI * 0.95], [0, 1.75, Math.PI * 0.05],
  ];
  let seed = 61;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (places.length < ZEPTON_COUNTS.many) {
    const inside = places.length % 5 < 2, a = random() * 2 * Math.PI;
    places.push(inside
      ? [(random() - 0.5) * (COIL_LENGTH - 0.5), random() * 0.62, a]
      : [(random() - 0.5) * 6.4, 1.35 + random() * 1.3, a]);
  }
  return places;
})();

/**
 * Field-line seeds across the middle of the coil, out from the axis, in the order they appear as the current rises:
 * the number drawn follows the current, so the lines' density shows the field's strength (as in Figure 6-4).
 */
export const SEEDS = [0.4, 0.75, 0.2, 0.58, 0.82, 0.3];

/** How many seeds' field lines a current shows (each seed is drawn in four planes): in proportion, at least one. */
export const linesForCurrent = (current: number) => (Math.abs(current) < 0.05 ? 0 : Math.max(1, Math.round(Math.abs(current) * SEEDS.length)));
