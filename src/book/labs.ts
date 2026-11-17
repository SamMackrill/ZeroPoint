// Links from the companion into the laboratories. The names are kept here as plain text so that a chapter page does
// not load the laboratories' models; tests/book.test.tsx checks every name and route against the experiment definitions.
import type { LabId, LabLink } from './types';

/** Each laboratory's title and the titles of its scenarios, as the workbench rail shows them. */
export const LABS: Record<LabId, { title: string; scenarios: Record<string, string> }> = {
  medium: { title: 'Medium lifecycle', scenarios: { balanced: 'Balanced medium', sparse: 'Sparse fluctuations', dense: 'Dense medium', slow: 'Slow oscillations' } },
  light: { title: 'Light through the ZPF', scenarios: { induction: 'Induction sequence', absorption: 'Absorption at a wall' } },
  'double-slit': { title: 'Double slit', scenarios: { slits: 'Two slits', open: 'Open path', 'light-speed': 'Fields at light speed' } },
  electron: { title: 'Electron in the ZPF', scenarios: { stationary: 'Stationary electron', spin: 'Spin in the field', moving: 'Moving electron', proton: 'Proton polarizer', 'charge-flux': 'Charge & flux', 'radius-limit': 'Radius limit', 'mass-shell': 'Mass & excluded energy' } },
  casimir: { title: 'Extended Casimir effect', scenarios: { 'electron-electron': 'Electron / electron', 'electron-proton': 'Electron / proton' } },
  vdw: { title: 'Van der Waals & vacuum pressure', scenarios: { induced: 'Induce a dipole', correlated: 'Correlate the fluctuations', pressure: 'Reveal the pressure' } },
};

/** The laboratory application, relative to the companion page (book/index.html). */
export const LAB_APP = '../';

/** The route a link opens, in the workbench's hash form (#/electron/spin?…). */
export const labHash = (link: Pick<LabLink, 'lab' | 'scenario' | 'query'>) => `#/${link.lab}/${link.scenario}${link.query ? `?${link.query}` : ''}`;

/** The address of a link from the companion page. */
export const labHref = (link: Pick<LabLink, 'lab' | 'scenario' | 'query'>) => `${LAB_APP}${labHash(link)}`;

/** A link's name: the laboratory, then the scenario. */
export const labName = (link: Pick<LabLink, 'lab' | 'scenario'>) => `${LABS[link.lab].title} › ${LABS[link.lab].scenarios[link.scenario] ?? link.scenario}`;

/** Fleming's book, relative to the companion page; `#page=` opens a PDF page in the browser's viewer. */
export const BOOK_PDF = '../docs/papers/Book%20-%20the-zero-point-universe.pdf';

/** Fleming's papers held with the project, by a short key. */
export const PAPERS = {
  photons: { title: 'Photons as Quantum Electron-Positron Composites', file: 'Photons%20as%20Quantum%20Electron-Positron%20Composites.pdf' },
  motion: { title: 'Electromagnetic Motion as an Extended Casimir Effect', file: 'Electromagnetic%20Motion%20as%20an%20Extended%20Casimir%20Effect.pdf' },
  properties: { title: 'Electron Properties Explained as Quantum Field Effects', file: 'Electron%20Properties%20Explained%20as%20Quantum%20Field%20Effects.pdf' },
  radii: { title: 'Electron and proton radii are due to quantum polarization rate and the speed of light', file: 'Electron%20and%20proton%20radii%20are%20due%20to%20quantum%20polarization%20rate%20and%20the%20speed%20of%20light.pdf' },
  alpha: { title: 'Fine Structure Constant as the Polarization of the Quantum Field by a Unit Charge', file: 'Fine%20Structure%20Constant%20as%20the%20Polarization%20of%20the%20Quantum%20Field%20by%20a%20Unit%20Charge%20.pdf' },
  casimirElectrons: { title: 'Casimir attraction between electrons', file: 'Casimir%20attraction%20between%20electrons.pdf' },
} as const;

/** A paper's key. */
export type PaperId = keyof typeof PAPERS;

/** The address of a paper, optionally at a page. */
export const paperHref = (id: PaperId, page?: number) => `../docs/papers/${PAPERS[id].file}${page ? `#page=${page}` : ''}`;
