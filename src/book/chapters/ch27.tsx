// Chapter 27: Conclusion (PDF pp. 207–209). No figures: the zero-point universe in summary.
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';
import { StepList, type Step } from './shared';
import { ScientistLink } from '../../papertrails/PaperTrailsLink';

/** What a zepton does, and the force or property each of its behaviours is, with the figures that show it. */
export const ZEPTON_DOES: Step[] = [
  { id: 'a', name: 'It appears, opens to its wavelength, and is gone', says: 'Each vacuum fluctuation is a virtual particle pair held within the energy-time limit of Planck and Heisenberg.', see: [{ label: 'Figure 4-1', href: '#/ch/4/4-1' }, { label: 'Figure 19-4', href: '#/ch/19/19-4' }] },
  { id: 'b', name: 'It turns its ends toward charge', says: 'Oriented with respect to electric charge, zeptons are the electric field, and Faraday’s lines.', see: [{ label: 'Figure 6-2', href: '#/ch/6/6-2' }, { label: 'Figure 6-7', href: '#/ch/6/6-7' }] },
  { id: 'c', name: 'It rotates when charge moves', says: 'Rotating in response to the motion of charge, zeptons are the magnetic field. A series of half-turns is a photon.', see: [{ label: 'Figure 6-14', href: '#/ch/6/6-14' }, { label: 'Figure 5-1', href: '#/ch/5/5-1' }] },
  { id: 'd', name: 'It turns its ends toward matter, and rotates when matter moves', says: 'Each zepton carries matter and antimatter as well as charge. The same two behaviours are the matter field, inertia and the mattermagnetic field.', see: [{ label: 'Figure 11-1', href: '#/ch/11/11-1' }, { label: 'Figure 10-2', href: '#/ch/10/10-2' }, { label: 'Figure 12-2', href: '#/ch/12/12-2' }] },
  { id: 'e', name: 'It is shut out of a particle’s shell', says: 'The zepton energy a particle excludes is its mass.', see: [{ label: 'Figure 16-1', href: '#/ch/16/16-1' }] },
  { id: 'f', name: 'Beside one of the other kind, it always repels', says: 'Electron-like and proton-like zeptons cannot cancel both charges, which leaves a pressure that falls as the inverse square: gravity, by shadowing.', see: [{ label: 'Figure 17-5', href: '#/ch/17/17-5' }, { label: 'Figure 17-1', href: '#/ch/17/17-1' }] },
  { id: 'g', name: 'It resists being turned', says: 'The drag of its neighbours on a rotating zepton sets the speed of light, and slows it near matter.', see: [{ label: 'Chapter 20', href: '#/ch/20' }, { label: 'Figure 23-2', href: '#/ch/23/23-2' }] },
  { id: 'h', name: 'It is shut out between two shells, and caught across a boundary', says: 'Between proton shells the exclusion is the strong force; half a pair crossing into a particle is the weak interaction.', see: [{ label: 'Figure 25-1', href: '#/ch/25/25-1' }, { label: 'Figure 26-1', href: '#/ch/26/26-1' }] },
];

const chapter: ChapterContent = {
  n: 27,
  summary: <>
    <p>Fleming dates the renewal of zero-point theory from <ScientistLink id="bohr">Bohr</ScientistLink>’s remark to <ScientistLink id="casimir">Casimir</ScientistLink> that his effect <Q>must have something to do with zero-point energy</Q>. The lesson he draws from the century before is about method: require of every theory that <Q>every force is transmitted by and through the zero-point field</Q>, and <Q>the possibilities [are] limited to such a degree that there is only one possible set of conclusions</Q> (<Pg n={207}/>).</p>
    <p>The result in his words: <Q>It is a universe filled with vacuum fluctuations, the zeptons. The zeptons carry positive and negative electric charge and matter and antimatter matter charge.</Q> <Q>There is only one force, the Electro-Matter Force.</Q> Even stable matter appears to be virtual, and <Q>Everything in the zero-point universe is virtual</Q> (<Pg n={208}/>). He allows that there are oversimplifications, and that particle theory and cosmology are left for later.</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x27-1', page: 208, section: 'The Zero Point Universe', title: 'One kind of thing, eight things it does',
      Diagram: () => <StepList label="What a zepton does, and what each behaviour amounts to" heading="Behaviour" steps={ZEPTON_DOES}/>,
      text: <p>The book derives every force from the behaviour of one object. This list goes back through it by what the zepton does, with a figure for each.</p>,
      tryThis: ['Step through the eight and revisit any figure that has faded.', 'Then see what the book still asks for on the Future simulations page.'],
      notes: <p>The grouping into eight behaviours is this companion’s summary; the sentences paraphrase the chapters they link to.</p>,
    },
  ],
};
export default chapter;
