// The geometry of Figure 19-2's 3D scene, kept apart from it so the chapter and tests can use it without loading three.js.
// Lengths are in photon wavelengths; angles in radians, turned about the photon's path (x).

/** Where the photon's central zeptons appear along its path: one each half wavelength, from `PATH_START` for `PATH_SITES` sites. */
export const PATH_START = -3, PATH_SITES = 13;

/** The x of the central zepton in its `n`-th lifetime: a half wavelength on from the last, starting again at the left. */
export const centralX = (n: number) => PATH_START + 0.5 * (((n % PATH_SITES) + PATH_SITES) % PATH_SITES);
