// Introduction: The Genesis of a Physics Heretic (PDF pp. 7–10). No figures: the route through the book.
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';
import { StepList, type Step } from './shared';

/** The book's argument as a chain of steps, each with the chapters that make it. */
export const ROUTE: Step[] = [
  { id: '1', name: 'The vacuum is full of energy', says: 'Planck, Nernst and Heisenberg: zero-point energy fills space, in fluctuations each limited in energy and time.', see: [{ label: 'Chapter 2', href: '#/ch/2' }] },
  { id: '2', name: 'It pushes on matter', says: 'The Casimir effect shows vacuum fluctuations acting as dipoles that press on bodies. A force is a difference of that pressure.', see: [{ label: 'Chapter 3', href: '#/ch/3' }] },
  { id: '3', name: 'Its fluctuations are charged pairs', says: 'A fluctuation cannot be a photon; it is a rotating electron-positron pair, a zepton, and a photon is a series of them.', see: [{ label: 'Chapter 4', href: '#/ch/4' }, { label: 'Chapter 5', href: '#/ch/5' }] },
  { id: '4', name: 'Oriented and rotating, they are the electric and magnetic fields', says: 'Faraday’s lines are rows of polarized zeptons; Maxwell’s vortices are rotating ones.', see: [{ label: 'Chapter 6', href: '#/ch/6' }, { label: 'Chapter 7', href: '#/ch/7' }] },
  { id: '5', name: 'Matter has a field of the same kind', says: 'Tops, flywheels and inertia point to a magnetic-like force of moving matter, whose charge is matter and antimatter.', see: [{ label: 'Chapter 8', href: '#/ch/8' }, { label: 'Chapter 10', href: '#/ch/10' }, { label: 'Chapter 11', href: '#/ch/11' }] },
  { id: '6', name: 'It moves the heavens', says: 'Tidal locking, Mercury’s perihelion, spiral arms and planetary dynamos, with the Matter Force added to gravity.', see: [{ label: 'Chapter 12', href: '#/ch/12' }, { label: 'Chapter 13', href: '#/ch/13' }] },
  { id: '7', name: 'The two forces are one', says: 'The same equations serve charge and matter: the Electro-Matter Force.', see: [{ label: 'Chapter 14', href: '#/ch/14' }, { label: 'Chapter 15', href: '#/ch/15' }] },
  { id: '8', name: 'Mass and gravity follow', says: 'Mass is the vacuum energy a particle’s shell excludes; gravity is a long-range van der Waals pressure with a limited reach.', see: [{ label: 'Chapter 16', href: '#/ch/16' }, { label: 'Chapter 17', href: '#/ch/17' }, { label: 'Chapter 18', href: '#/ch/18' }] },
  { id: '9', name: 'Light’s speed belongs to the medium', says: 'Fields spread far faster than light; the speed of light is the rate a zepton can turn, and relativity is rewritten about one rest frame.', see: [{ label: 'Chapter 19', href: '#/ch/19' }, { label: 'Chapter 20', href: '#/ch/20' }, { label: 'Chapter 22', href: '#/ch/22' }, { label: 'Chapter 23', href: '#/ch/23' }] },
  { id: '10', name: 'The nuclear forces are the same force at short range', says: 'The strong force as a Casimir force between proton shells; the weak interaction as a zepton caught at a boundary.', see: [{ label: 'Chapter 25', href: '#/ch/25' }, { label: 'Chapter 26', href: '#/ch/26' }] },
];

const chapter: ChapterContent = {
  n: 0,
  summary: <>
    <p>Fleming opens with Newton’s remark that one body acting on another at a distance through a vacuum, <Q>without the mediation of any thing else</Q>, is an absurdity. The forces of modern physics, carried by exchanged particles, seemed to him to have the same fault: the particles would need to carry information they have no means of holding, and nothing says how a body moves once it has received it (<Pg n={7}/>, <Pg n={8}/>).</p>
    <p>His standard is the one physics held in the nineteenth century: <Q>Each and every force interaction must be due to a force mechanism, which allows point-to-point transmission through space</Q> (<Pg n={9}/>). The one thing known to fill space is the zero-point field, so that is where he looks, and he says of the result that <Q>everything can be described by a single simple mechanical theory</Q> (<Pg n={10}/>).</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x0-1', page: 9, title: 'The route of the book',
      Diagram: () => <StepList label="The argument of the book in ten steps" heading="Step" steps={ROUTE}/>,
      text: <p>The introduction promises a single mechanical account of every force. This is the order in which the book builds it, with the chapters of each step.</p>,
      tryThis: ['Step through the ten stages, and follow a link to start where your reading has reached.', 'The figures begin in chapter 3; every one of them has a diagram in this companion.'],
      notes: <p>The ten steps and their one-line summaries are this companion’s outline of the book, not Fleming’s wording.</p>,
    },
  ],
};
export default chapter;
