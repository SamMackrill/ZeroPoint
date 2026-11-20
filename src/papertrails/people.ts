// Which people and papers in ZeroPoint are on PaperTrails, by PaperTrails id. Chosen by hand: a name is linked only
// when it is the same person, and a reference only to the paper PaperTrails lists when it is the same work.
// `scripts/check-papertrails.mjs` checks every id here against the published PaperTrails data.

/** The PaperTrails scientists ZeroPoint links to, with the name shown before PaperTrails' own data arrives. */
export const PEOPLE = {
  anderson: 'Carl D. Anderson',
  bohr: 'Niels Bohr',
  bose: 'Satyendra Nath Bose',
  casimir: 'Hendrik Casimir',
  coulomb: 'Charles-Augustin de Coulomb',
  descartes: 'René Descartes',
  dirac: 'Paul Dirac',
  eddington: 'Arthur Eddington',
  einstein: 'Albert Einstein',
  faraday: 'Michael Faraday',
  fatio: 'Nicolas Fatio de Duillier',
  fermi: 'Enrico Fermi',
  feynman: 'Richard Feynman',
  george_fitzgerald: 'George FitzGerald',
  heaviside: 'Oliver Heaviside',
  heisenberg: 'Werner Heisenberg',
  joseph_larmor: 'Joseph Larmor',
  kelvin: 'Lord Kelvin',
  lamb: 'Willis Lamb',
  lamoreaux: 'Steve K. Lamoreaux',
  lesage: 'Georges-Louis Le Sage',
  lodge: 'Oliver Lodge',
  lorentz: 'Hendrik Lorentz',
  maxwell: 'James Clerk Maxwell',
  michelson: 'Albert Michelson',
  morley: 'Edward Morley',
  nernst: 'Walther Nernst',
  newton: 'Isaac Newton',
  pierre_laplace: 'Pierre-Simon Laplace',
  planck: 'Max Planck',
  poincare: 'Henri Poincaré',
  retherford: 'Robert Retherford',
  stern: 'Otto Stern',
  van_der_waals: 'Johannes van der Waals',
  wheeler: 'John Wheeler',
  young: 'Thomas Young',
} as const;

/** A PaperTrails scientist id that ZeroPoint links to. */
export type PersonId = keyof typeof PEOPLE;

/** Book Index entries (as `src/book/appendix/index.json` spells them) for people on PaperTrails. */
export const INDEX_PEOPLE: Readonly<Record<string, PersonId>> = {
  'Anderson, Carl D.': 'anderson',
  'Bohr, Niels': 'bohr',
  'Bose, Satyendra Nath': 'bose',
  'Casimir, Hendrik': 'casimir',
  'Coulomb, Charles-Augustin de': 'coulomb',
  'Descartes, René': 'descartes',
  'Dirac, Paul': 'dirac',
  'Eddington, Arthur': 'eddington',
  'Einstein, Albert': 'einstein',
  'Faraday, Michael': 'faraday',
  'Fatio de Duillier, Nicolas': 'fatio',
  'Fermi, Enrico': 'fermi',
  'Feynman, Richard': 'feynman',
  'FitzGerald, George': 'george_fitzgerald',
  'Heaviside, Oliver': 'heaviside',
  'Heisenberg, Werner': 'heisenberg',
  'Kelvin, Lord (William Thomson)': 'kelvin',
  'Laplace, Pierre-Simon': 'pierre_laplace',
  'Larmor, Joseph': 'joseph_larmor',
  'Le Sage, Georges-Louis': 'lesage',
  'Lodge, Oliver': 'lodge',
  'Lorentz, Hendrik': 'lorentz',
  'Maxwell, James Clerk': 'maxwell',
  'Michelson, Albert': 'michelson',
  'Nernst, Walther': 'nernst',
  'Newton, Isaac': 'newton',
  'Planck, Max': 'planck',
  'Poincaré, Henri': 'poincare',
  'van der Waals, Johannes': 'van_der_waals',
  'Wheeler, John': 'wheeler',
};

/** A paper on PaperTrails, with the title shown for its link. */
export interface PtPaperLink { id: string; title: string }

/** What a book endnote links to on PaperTrails: its authors who are there, and the cited work when PaperTrails lists it. */
export interface NoteLinks { authors: PersonId[]; paper?: PtPaperLink }

const LINES_OF_FORCE: PtPaperLink = { id: 'maxwell-work-00', title: 'On Physical Lines of Force' };
const LARMOR_PART_3: PtPaperLink = { id: 'joseph_larmor-work-00', title: 'A Dynamical Theory of the Electric and Luminiferous Medium, Part III' };
const AETHER_AND_MATTER: PtPaperLink = { id: 'joseph_larmor-work-01', title: 'Aether and Matter' };
const CASIMIR_POLDER: NoteLinks = { authors: ['casimir'] };

/**
 * Fleming's endnotes, by number, that name a PaperTrails author. Only authors are linked, not people a title names.
 * A paper is linked only when PaperTrails lists that very work; Fermi's 1934 theory of beta decay is linked although
 * Fleming cites its German printing (Z. Physik 88) and PaperTrails the Italian one.
 */
export const NOTE_LINKS: Readonly<Record<number, NoteLinks>> = {
  1: { authors: ['newton'] },
  2: { authors: ['fatio'] },
  4: { authors: ['lorentz'] },
  5: { authors: ['dirac'] },
  7: { authors: ['dirac'] },
  8: { authors: ['lorentz'] },
  10: { authors: ['feynman'] },
  11: { authors: ['wheeler'] },
  12: { authors: ['planck'], paper: { id: 'planck-work-00', title: 'Zur Theorie des Gesetzes der Energieverteilung im Normalspectrum' } },
  13: { authors: ['planck'] },
  14: { authors: ['planck'] },
  15: { authors: ['einstein'] },
  16: { authors: ['einstein', 'stern'] },
  17: { authors: ['nernst'] },
  18: { authors: ['lorentz'] },
  19: { authors: ['einstein'] },
  20: { authors: ['bose'], paper: { id: 'bose-work-00', title: 'Planck’s Law and the Hypothesis of Light Quanta' } },
  21: { authors: ['heisenberg'], paper: { id: 'heisenberg-work-01', title: 'Über den anschaulichen Inhalt der quantentheoretischen Kinematik und Mechanik' } },
  23: { authors: ['lamb', 'retherford'], paper: { id: 'lamb-work-00', title: 'Fine Structure of the Hydrogen Atom by a Microwave Method' } },
  24: CASIMIR_POLDER,
  26: CASIMIR_POLDER,
  27: CASIMIR_POLDER,
  28: { authors: ['lamoreaux'], paper: { id: 'lamoreaux-work-00', title: 'Demonstration of the Casimir Force in the 0.6 to 6 µm Range' } },
  33: { authors: ['dirac'], paper: { id: 'dirac-work-00', title: 'The Quantum Theory of the Electron' } },
  34: { authors: ['anderson'] },
  38: { authors: ['feynman'] },
  39: { authors: ['feynman'] },
  40: { authors: ['dirac'] },
  41: { authors: ['maxwell'], paper: LINES_OF_FORCE },
  42: { authors: ['joseph_larmor'] },
  43: { authors: ['maxwell'], paper: LINES_OF_FORCE },
  44: { authors: ['maxwell'], paper: LINES_OF_FORCE },
  51: { authors: ['heaviside'] },
  56: { authors: ['newton'], paper: { id: 'newton-work-00', title: 'Philosophiæ Naturalis Principia Mathematica' } },
  57: { authors: ['lodge'] },
  59: { authors: ['joseph_larmor'] },
  60: { authors: ['maxwell'] },
  63: { authors: ['heaviside'] },
  72: { authors: ['maxwell'], paper: LINES_OF_FORCE },
  73: { authors: ['maxwell'], paper: LINES_OF_FORCE },
  75: { authors: ['heaviside'] },
  80: { authors: ['casimir'] },
  82: { authors: ['poincare'] },
  83: { authors: ['fatio'] },
  84: { authors: ['kelvin'] },
  85: { authors: ['maxwell'] },
  86: { authors: ['poincare'] },
  87: { authors: ['feynman'] },
  88: CASIMIR_POLDER,
  92: { authors: ['feynman'] },
  93: { authors: ['eddington'] },
  94: { authors: ['einstein'] },
  96: { authors: ['pierre_laplace'] },
  98: { authors: ['dirac'] },
  100: { authors: ['nernst'] },
  101: { authors: ['einstein'] },
  102: { authors: ['michelson', 'morley'], paper: { id: 'michelson-work-01', title: 'On the Relative Motion of the Earth and the Luminiferous Ether' } },
  103: { authors: ['maxwell'] },
  104: { authors: ['george_fitzgerald'], paper: { id: 'george_fitzgerald-work-01', title: 'The Ether and the Earth’s Atmosphere' } },
  105: { authors: ['lorentz'] },
  106: { authors: ['joseph_larmor'], paper: LARMOR_PART_3 },
  107: { authors: ['joseph_larmor'], paper: AETHER_AND_MATTER },
  109: { authors: ['lorentz'] },
  110: { authors: ['lorentz'], paper: { id: 'lorentz-work-01', title: 'Electromagnetic phenomena in a system moving with any velocity smaller than that of light' } },
  111: { authors: ['poincare'] },
  112: { authors: ['einstein'], paper: { id: 'einstein-work-00', title: 'Zur Elektrodynamik bewegter Körper' } },
  114: { authors: ['lorentz'] },
  115: { authors: ['maxwell'] },
  116: { authors: ['joseph_larmor'], paper: AETHER_AND_MATTER },
  117: { authors: ['michelson'] },
  118: { authors: ['joseph_larmor'], paper: LARMOR_PART_3 },
  120: { authors: ['einstein'] },
  126: { authors: ['einstein'] },
  128: { authors: ['fermi'], paper: { id: 'fermi-work-00', title: 'Tentativo di una teoria dei raggi β' } },
  131: { authors: ['feynman'] },
  133: { authors: ['casimir'] },
};

/**
 * The people behind each laboratory, listed in its Help › Sources: those whose work the lab's model builds on or whose
 * picture it draws, as Fleming tells the history. Keyed by the laboratories' experiment ids.
 */
export const LAB_PEOPLE: Readonly<Record<'medium' | 'light' | 'double-slit' | 'electron' | 'casimir' | 'vdw', readonly PersonId[]>> = {
  // Zero-point energy: Planck's oscillators, Einstein and Stern, Nernst's filled vacuum, Heisenberg's limit, Dirac's pairs.
  medium: ['planck', 'einstein', 'stern', 'nernst', 'heisenberg', 'dirac'],
  // Light as a wave in a field, and as quanta of energy.
  light: ['maxwell', 'planck', 'einstein'],
  // Young's two slits, and Feynman's reading of them.
  'double-slit': ['young', 'feynman'],
  // Faraday's lines, Maxwell's vortices, Lorentz's electron, Dirac's electron and Anderson's positron.
  electron: ['faraday', 'maxwell', 'lorentz', 'dirac', 'anderson'],
  casimir: ['casimir', 'lamoreaux', 'van_der_waals'],
  vdw: ['van_der_waals', 'casimir'],
};
