// The book's structure: every chapter of The Zero-Point Universe with its PDF pages and figures, in order. Chapter
// pages load on demand. tests/book.test.tsx checks that each chapter's page carries exactly the figures listed here.
import type { ChapterMeta } from './types';

/** Figure numbers `chapter-1` … `chapter-count`. */
const figs = (chapter: number, count: number) => Array.from({ length: count }, (_, i) => `${chapter}-${i + 1}`);

/** The chapters in book order. Chapter 0 is the Introduction. */
export const CHAPTERS: ChapterMeta[] = [
  { n: 0, title: 'Introduction: The Genesis of a Physics Heretic', pages: [7, 10], figures: [], blurb: 'How Fleming came to the zero-point field, and what he asks of a theory.', load: () => import('./chapters/ch00') },
  { n: 1, title: 'The Philosophy of Science', pages: [11, 17], figures: [], blurb: 'The tests a physical theory must pass: a mechanical cause for every force.', load: () => import('./chapters/ch01') },
  { n: 2, title: 'The Zero-Point', pages: [18, 26], figures: [], blurb: 'Planck, Nernst and Heisenberg: the vacuum is full of energy, with a limit on each fluctuation.', load: () => import('./chapters/ch02') },
  { n: 3, title: 'The Casimir Effect, The Model Force', pages: [27, 32], figures: figs(3, 4), blurb: 'Vacuum fluctuations as dipoles that push on matter; the plates as the model for every force.', load: () => import('./chapters/ch03') },
  { n: 4, title: 'What is a Virtual Photon?', pages: [33, 42], figures: figs(4, 9), blurb: 'Why a fluctuation cannot be a photon pair, and must be a rotating electron-positron pair.', load: () => import('./chapters/ch04') },
  { n: 5, title: 'The Zero-Point Photon', pages: [43, 47], figures: figs(5, 2), blurb: 'A photon as a series of alternately rotating pairs, with the field around it turning too.', load: () => import('./chapters/ch05') },
  { n: 6, title: 'Zeptons and Faraday Field Lines', pages: [48, 61], figures: figs(6, 18), blurb: 'Zeptons polarize round a charge and become Faraday’s lines; attraction, repulsion and magnetism follow.', load: () => import('./chapters/ch06') },
  { n: 7, title: 'Maxwell’s Equations', pages: [62, 69], figures: figs(7, 5), blurb: 'Maxwell’s molecular vortices, and the Lorentz force from rotating zepton dipoles.', load: () => import('./chapters/ch07') },
  { n: 8, title: 'The Mattermagnetic Field', pages: [70, 80], figures: figs(8, 6), blurb: 'Descartes’s vortices, the spinning top, and a magnetic-like field of moving matter.', load: () => import('./chapters/ch08') },
  { n: 9, title: 'Tops, Flywheels, and Gyroscopes', pages: [81, 85], figures: figs(9, 2), blurb: 'Induction between spinning masses: the Morgan and Wallace experiments.', load: () => import('./chapters/ch09') },
  { n: 10, title: 'Inertia', pages: [86, 90], figures: figs(10, 3), blurb: 'Inertia as the zero-point field’s resistance to a change in the rotation matter induces.', load: () => import('./chapters/ch10') },
  { n: 11, title: 'The Matter Dipole', pages: [91, 97], figures: figs(11, 6), blurb: 'Zeptons polarize by matter and antimatter as well as by charge.', load: () => import('./chapters/ch11') },
  { n: 12, title: 'Astronomical Motion', pages: [98, 109], figures: figs(12, 8), blurb: 'Orbits, precession and galaxy rotation with the mattermagnetic field added.', load: () => import('./chapters/ch12') },
  { n: 13, title: 'Solar and Planetary Dynamos', pages: [110, 112], figures: figs(13, 1), blurb: 'How a rotating body with layered matter could drive its magnetic field.', load: () => import('./chapters/ch13') },
  { n: 14, title: 'The Matter Force', pages: [113, 116], figures: [], blurb: 'The repulsive force between bodies of matter, written like Coulomb’s law.', load: () => import('./chapters/ch14') },
  { n: 15, title: 'The Electro-Matter Force', pages: [117, 121], figures: [], blurb: 'Electric and matter forces unified in one set of equations.', load: () => import('./chapters/ch15') },
  { n: 16, title: 'Mass', pages: [122, 128], figures: figs(16, 2), blurb: 'Mass as the zero-point energy a particle’s shell shuts out.', load: () => import('./chapters/ch16') },
  { n: 17, title: 'Gravity', pages: [129, 136], figures: figs(17, 5), blurb: 'Push gravity revisited: a van der Waals shadow between bodies of matter.', load: () => import('./chapters/ch17') },
  { n: 18, title: 'The Distance Limitation of Gravity', pages: [137, 141], figures: figs(18, 2), blurb: 'Why the path of gravity narrows, and gravity fades at great distance.', load: () => import('./chapters/ch18') },
  { n: 19, title: 'The Speed of the Zero-Point Universe', pages: [142, 150], figures: figs(19, 4), blurb: 'Fields that spread far faster than light; a single photon and two slits.', load: () => import('./chapters/ch19') },
  { n: 20, title: 'The Origin of the Speed of Light', pages: [151, 152], figures: [], blurb: 'The speed of light as a property of the zepton medium.', load: () => import('./chapters/ch20') },
  { n: 21, title: 'Æther and Michelson-Morley', pages: [153, 161], figures: figs(21, 1), blurb: 'What the interferometer did and did not test.', load: () => import('./chapters/ch21') },
  { n: 22, title: 'Relativity is Not Special', pages: [162, 175], figures: figs(22, 3), blurb: 'Light measured from moving frames in a zero-point rest frame; the Sagnac effect.', load: () => import('./chapters/ch22') },
  { n: 23, title: 'Gravity, Energy, and Light', pages: [176, 184], figures: figs(23, 2), blurb: 'The Shapiro delay and the bending of starlight as changes in the medium.', load: () => import('./chapters/ch23') },
  { n: 24, title: 'Standard Tests of Gravitational Theory', pages: [185, 191], figures: [], blurb: 'The classical tests set against the zero-point account.', load: () => import('./chapters/ch24') },
  { n: 25, title: 'The Strong Nuclear Force', pages: [192, 200], figures: figs(25, 2), blurb: 'The strong force as a van der Waals shadow between particles at contact distance.', load: () => import('./chapters/ch25') },
  { n: 26, title: 'The Weak Interaction', pages: [201, 206], figures: figs(26, 1), blurb: 'Decay as an interaction with the zero-point field.', load: () => import('./chapters/ch26') },
  { n: 27, title: 'Conclusion', pages: [207, 209], figures: [], blurb: 'The zero-point universe in summary.', load: () => import('./chapters/ch27') },
];

/** The chapter with a number, if the book has one. */
export const chapterMeta = (n: number) => CHAPTERS.find(c => c.n === n);

/** How a chapter is named in headings and links: "Introduction" or "Chapter 6". */
export const chapterLabel = (n: number) => (n === 0 ? 'Introduction' : `Chapter ${n}`);

/** A chapter's title without the "Introduction:" prefix. */
export const chapterTitle = (meta: ChapterMeta) => meta.title.replace(/^Introduction: /, '');

/** Every figure number in the book, in order. */
export const ALL_FIGURES = CHAPTERS.flatMap(c => c.figures);
