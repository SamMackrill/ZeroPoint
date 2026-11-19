// The top of chapter 8's figures as plain numbers, so a page can use its shape without loading three.js.

/** Height of the centre of mass above the tip, along the axis. */
export const TOP_CM = 0.96;

/** The top's outline, as [radius, height] up its axis from the tip: a cone, a shoulder and a stem, as Fleming drew it. */
export const PROFILE: [number, number][] = [[0, 0], [0.04, 0.12], [0.3, 0.6], [0.36, 0.96], [0.34, 1.22], [0.27, 1.46], [0.12, 1.5], [0.12, 1.76], [0, 1.78]];

/** The lean at which the top lies on the floor: where its side first meets the floor, with the tip still on it. */
export const TOP_LAID = 90 - Math.max(...PROFILE.slice(1).map(([r, h]) => (Math.atan2(r, h) * 180) / Math.PI));
