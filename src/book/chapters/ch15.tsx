// Chapter 15: The Electro-Matter Force (PDF pp. 117–121). No figures: one explorer.
import { useState } from 'react';
import { Arrow, BlockArrow, Diagram, Readout, Remark, Slider, Stage, T, fmt } from '../kit';
import { Eq, Frac, Pg, Q, V } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** The number of unit matter charges in Fleming's proposed unit, the Matt (p. 118). */
export const MATT = 6.24150965e18;

/** The static part of the combined Lorentz force on a body (Equation 15-9 with the body at rest): qE + mM. */
export const electroMatterForce = (q: number, E: number, m: number, M: number) => ({ electric: q * E, matter: m * M, total: q * E + m * M });

/** Explorer: one body with both kinds of charge in both kinds of field, and the single force that results. */
function CombinedForce() {
  const [q, setQ] = useState(1);
  const [m, setM] = useState(2);
  const [E, setE] = useState(0.6);
  const [M, setM2] = useState(-0.4);
  const { electric, matter, total } = electroMatterForce(q, E, m, M), H = 320, cx = 360, unit = 70;
  const way = (v: number) => (Math.abs(v) < 0.005 ? 'none' : `${fmt(Math.abs(v), 2)} ${v > 0 ? 'right' : 'left'}`);
  return <Diagram stage={
    <Stage w={W} h={H} label={`A body with electric charge ${q} and matter charge ${m}. The electric field pushes it ${way(electric)}, the matter field ${way(matter)}, and the total force is ${way(total)}.`}>
      {Math.abs(E) > 0.02 && [60, 120].map(y => <Arrow key={y} x1={cx - 300 * Math.sign(E)} y1={y - 22} x2={cx - 300 * Math.sign(E) + 600 * Math.sign(E) * (0.35 + 0.65 * Math.abs(E))} y2={y - 22} tone="e" w={1.4} opacity={0.6}/>)}
      {Math.abs(M) > 0.02 && [220, 280].map(y => <Arrow key={y} x1={cx - 300 * Math.sign(M)} y1={y + 12} x2={cx - 300 * Math.sign(M) + 600 * Math.sign(M) * (0.35 + 0.65 * Math.abs(M))} y2={y + 12} tone="matter" w={1.4} opacity={0.6}/>)}
      <T x={40} y={24} anchor="start" size="sm" tone="e">electric field E</T><T x={40} y={H - 8} anchor="start" size="sm" tone="matter">matter field M</T>
      <circle cx={cx} cy={160} r={26} className="bk-body bk-body-plain"/><T x={cx} y={156} tone="text" size="sm">q = {q}</T><T x={cx} y={172} tone="text" size="sm">m = {m}</T>
      {Math.abs(electric) > 0.005 && <><Arrow x1={cx} y1={118} x2={cx + electric * unit} y2={118} tone="e" w={3}/><T x={cx + electric * unit + Math.sign(electric) * 10} y={122} anchor={electric > 0 ? 'start' : 'end'} tone="e" size="sm">qE</T></>}
      {Math.abs(matter) > 0.005 && <><Arrow x1={cx} y1={202} x2={cx + matter * unit} y2={202} tone="matter" w={3}/><T x={cx + matter * unit + Math.sign(matter) * 10} y={206} anchor={matter > 0 ? 'start' : 'end'} tone="matter" size="sm">mM</T></>}
      {Math.abs(total) > 0.005 && <BlockArrow x1={cx + Math.sign(total) * 30} y1={160} x2={cx + Math.sign(total) * 30 + total * unit} y2={160} thick={14}/>}
    </Stage>}>
    <Slider label="Electric charge of the body, q" value={q} min={-2} max={2} step={1} onChange={setQ} show={v => `${v > 0 ? '+' : ''}${v} e`}/>
    <Slider label="Matter charge of the body, m" value={m} min={0} max={4} step={1} onChange={setM} show={v => `${v} eₘ`}/>
    <Slider label="Electric field, E" value={E} min={-1} max={1} step={0.1} onChange={setE}/>
    <Slider label="Matter field, M" value={M} min={-1} max={1} step={0.1} onChange={setM2}/>
    <Readout label="qE" value={way(electric)} tone="e"/>
    <Readout label="mM" value={way(matter)} tone="force"/>
    <Readout label="Total force" value={way(total)} tone="good"/>
    <Remark>A force is a force regardless of what causes it: the body responds only to the sum.</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 15,
  summary: <>
    <p>The two forces have the same equations and the same carrier. <Q>Each zepton has both types of charge and interact[s] with both the electromagnetic and mattermagnetic fields</Q>, so strictly there is one force, which Fleming calls the Electro-Matter Force (<Pg n={117}/>, <Pg n={120}/>).</p>
    <p>To write it down he fixes units. Matter charge is not mass; it is an intrinsic property, and he sets the matter charge of an electron <V>e</V><sub>m</sub> numerically equal to the electric charge <V>e</V>, with a unit, the Matt, of 6.24150965 × 10¹⁸ <V>e</V><sub>m</sub> to match the coulomb. The permittivity and permeability for matter are given the magnitudes of ε<sub>0</sub> and μ<sub>0</sub>, since both pairs must give the speed of light (<Pg n={118}/>, <Pg n={119}/>).</p>
  </>,
  items: [
    {
      kind: 'explorer', id: 'x15-1', page: 120, section: 'The Electro-Matter Force', title: 'Two charges, two fields, one force',
      Diagram: CombinedForce,
      text: <>
        <p>The combined field equations (15-5 to 15-8) are, Fleming says, <Q>symbolic of the unification of the two forces</Q>; it may not be possible to combine the fields in practical computation. The combined Lorentz law is the useful one: <Q>the total force on a body can be determined by summing the two forces due to the different charges</Q> (<Pg n={119}/>, <Pg n={120}/>).</p>
        <Eq n="15-9"><V>F</V> = <V>q</V>(<V>E</V> + <V>υ</V> × <V>B</V><sub>e</sub>) + <V>m</V>(<V>M</V> + <V>υ</V> × <V>B</V><sub>m</sub>)</Eq>
        <p>Behind it is one relation for both pairs of constants (Equations 15-3 and 15-4):</p>
        <Eq n="15-3"><V>c</V> = <Frac top="1" bottom={<>√(ε<sub>0</sub>μ<sub>0</sub>)</>}/></Eq>
      </>,
      tryThis: ['Set the electric charge to zero: an electrically neutral body still feels the matter field.', 'Give the two fields opposite directions and find the settings where the two forces cancel.', 'Reverse the sign of q: only the electric part reverses. Matter charge has one sign here, because local space holds only matter.'],
      notes: <p>The explorer shows the static terms of Equation 15-9 for a body at rest, in arbitrary units; the two velocity terms are the subjects of Figures 7-5 and 12-2.</p>,
    },
  ],
};
export default chapter;
