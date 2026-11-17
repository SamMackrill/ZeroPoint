// Chapter 1: The Philosophy of Science (PDF pp. 11–17). No figures: two explorers.
import { useRef, useState } from 'react';
import { BlockArrow, Body, Diagram, PlayBar, Readout, Remark, Slider, Stage, T, clamp, fmt, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';
import { StepList, type Step } from './shared';

const W = 720;

/** The twelve principles of the chapter, in Fleming's words for their titles, with where the companion shows each at work. */
export const PRINCIPLES: Step[] = [
  { id: '1', name: 'Every theory is open', page: 14, says: 'The scientific method must not allow closed theories. Every theory must be able to be brought into question, always.' },
  { id: '2', name: 'Treat all problems as class-one problems first', page: 14, says: 'Considering a problem as class-one first forces a greater range of possibilities to be examined. It may turn out to be class-two after all, with only the mechanism needing explanation.' },
  { id: '3', name: 'Science fiction is not science', page: 14, says: 'Not every mathematical equation has a real physical analogue; mathematical dimensions are not physical ones.' },
  { id: '4', name: 'Every force is transmitted by and through the zero-point field', page: 15, says: 'The zero-point field is the only thing known to permeate the vacuum, so it alone can carry a force across it.', see: [{ label: 'Figure 6-8', href: '#/ch/6/6-8' }, { label: 'Figure 11-2', href: '#/ch/11/11-2' }] },
  { id: '5', name: 'Every theory must adhere to Heisenberg’s Uncertainty Principle', page: 15, says: 'A zero-point event cannot be directly measurable; theories that need more energy-time than that allows must change.', see: [{ label: 'Figures 4-3 to 4-7', href: '#/ch/4/4-3' }] },
  { id: '6', name: 'Every theory must adhere to conservation of energy and momentum', page: 15, says: 'Theories that violate them must be modified or done away with. What the old theories call potentials are, in the new, the pressure of the zero-point field.', see: [{ label: 'Figure 5-1', href: '#/ch/5/5-1' }] },
  { id: '7', name: 'Everything moves because it is pushed', page: 16, says: 'Vacuum fluctuations do not come with hooks. Two bodies move together when the pressure pushing them together exceeds the pressure pushing them apart.', see: [{ label: 'Figure 3-4', href: '#/ch/3/3-4' }, { label: 'Figure 6-12', href: '#/ch/6/6-12' }, { label: 'Figure 17-1', href: '#/ch/17/17-1' }] },
  { id: '8', name: 'Space is free of prior structure', page: 16, says: 'Any theory of space must start from something geometrically flat.', see: [{ label: 'Figure 22-2', href: '#/ch/22/22-2' }] },
  { id: '9', name: 'Set aside hero worship or negative feelings about individual scientists', page: 16, says: 'This is not about individuals; this is about science. Feelings about individuals have to be set aside to evaluate every theory fully.' },
  { id: '10', name: 'Start with a logical and intuitive model', page: 16, says: 'It is easy to hide erroneous ideas in equations. A theory that introduces a paradox or contradicts itself is incorrect.' },
  { id: '11', name: 'Beware of numerology', page: 16, says: 'Combining numbers until the right result appears is not physics.', see: [{ label: 'Figure 16-2', href: '#/ch/16/16-2' }] },
  { id: '12', name: 'Theory must match observation', page: 17, says: 'Equations that give the right answers are not enough; every part of the theory must hold, and observation decides.', see: [{ label: 'Chapter 24', href: '#/ch/24' }] },
];

/** Explorer: a body between two pressures. It moves only when they differ, and always away from the greater. */
function Pushed() {
  const [left, setLeft] = useState(1);
  const [right, setRight] = useState(0.96);
  const play = usePlayback();
  const state = useRef({ t: 0, x: 360, v: 0 });
  const dt = Math.max(0, Math.min(0.05, play.t - state.current.t)), net = left - right, s = state.current;
  if (play.t < s.t) { s.x = 360; s.v = 0; }
  s.t = play.t; s.v += net * 400 * dt; s.x = clamp(s.x + s.v * dt, 190, 530);
  if (s.x === 190 || s.x === 530) s.v = 0;
  const H = 280, y = 130;
  return <Diagram stage={
    <Stage w={W} h={H} label={`A body with the vacuum pressing on it from both sides: ${fmt(left, 3)} from the left and ${fmt(right, 3)} from the right. ${Math.abs(net) < 0.0005 ? 'The pressures balance and it stays where it is.' : `It is pushed to the ${net > 0 ? 'right' : 'left'}.`}`}>
      <BlockArrow x1={s.x - 46 - 150 * left} y1={y} x2={s.x - 46} y2={y} thick={46}/>
      <BlockArrow x1={s.x + 46 + 150 * right} y1={y} x2={s.x + 46} y2={y} thick={46}/>
      <Body x={s.x} y={y} r={40} tone="plain"/>
      <T x={W / 2} y={H - 30} size="sm">{Math.abs(net) < 0.0005 ? 'equal pressures: no motion, however large they are' : 'it looks like attraction toward the side with less pressure; it is a push from the side with more'}</T>
    </Stage>}>
    <Slider label="Pressure from the left" value={left} min={0.8} max={1.2} step={0.005} onChange={setLeft}/>
    <Slider label="Pressure from the right" value={right} min={0.8} max={1.2} step={0.005} onChange={setRight}/>
    <PlayBar play={play} label="the body"/>
    <Readout label="Difference" value={Math.abs(net) < 0.0005 ? 'none' : `${fmt(Math.abs(net), 2)} toward the ${net > 0 ? 'right' : 'left'}`} tone="force"/>
    <Remark>And even at a state of rest everything is being pushed.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 1,
  summary: <>
    <p>Before any physics the book sets its rules. Fleming’s complaint is that theories have been closed: declared finished, and their difficulties treated as details. He borrows Dirac’s distinction between class-one problems, which show a theory to be wrong at its foundation, and class-two problems, which can be worked out later, and asks that every difficulty be treated as class-one first (<Pg n={11}/>, <Pg n={12}/>).</p>
    <p>The chapter ends with twelve principles (<Pg n={14} to={17}/>). Two of them carry most of the book: <Q>Every force is transmitted by and through the zero-point field</Q>, and <Q>Everything moves because it is pushed</Q>.</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x1-1', page: 15, section: 'Fundamental Principles', title: 'Twelve principles, and where they are used',
      Diagram: () => <StepList label="Fleming’s twelve principles for a physical theory" heading="Principle" steps={PRINCIPLES}/>,
      text: <p>The titles are Fleming’s. He applies them through the rest of the book as tests, most plainly in chapter 24, where general relativity is scored against them.</p>,
      tryThis: ['Step through the twelve.', 'Where a principle has links, follow one to see it doing work in a figure.'],
      notes: <p>The one-line glosses are condensed from his text; the links are this companion’s.</p>,
    },
    {
      kind: 'explorer', id: 'x1-2', page: 16, title: 'Everything moves because it is pushed',
      Diagram: Pushed,
      text: <>
        <p><Q>And even at a state of rest everything is being pushed. The concept of an attractive force is an illusion. Zero-point vacuum fluctuations do not come with hooks. They cannot pull on a body. If two bodies move toward each other due to a force it is because the pressure pushing them together is greater than the pressure pushing them apart</Q> (<Pg n={16}/>).</p>
        <p>The principle is Dolbear’s, quoted just before it: <Q>every body moves because it is pushed</Q>.</p>
      </>,
      tryThis: ['Make the two pressures equal: the body does not move, at any size of pressure.', 'Lower one side a little: the body moves toward that side, as if attracted by it.', 'Every attraction in the book is drawn this way; Figure 6-12 is the clearest.'],
      notes: <p>The size of the pressures and how fast the body responds are illustrative.</p>,
      labs: [{ lab: 'casimir', scenario: 'electron-proton', why: 'An attraction produced by lower pressure between two charges than outside them.' }],
    },
  ],
};
export default chapter;
