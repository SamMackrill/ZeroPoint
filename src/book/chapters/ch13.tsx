// Chapter 13: Solar and Planetary Dynamos (PDF pp. 110–112). Figure 13-1.
import { useId, useState } from 'react';
import { Arrow, Diagram, PlayBar, Readout, Remark, Slider, Spin, Stage, Still, T, Toggle, fmt, polar, usePlayback } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';

const W = 720;

/** The radius, as a fraction of a uniform sphere's radius, that encloses a given fraction of its mass. */
export const dividingRadius = (fraction: number) => Math.cbrt(fraction);

/** An eddy of stirred matter: a small loop with three specks of matter carried round it, turned to `turned` degrees. */
function Eddy({ x, y, r = 12, turned }: { x: number; y: number; r?: number; turned: number }) {
  return <g>
    <circle cx={x} cy={y} r={r} fill="none" className="bk-s-muted" strokeWidth="1.2" strokeDasharray="2 3"/>
    {[0, 120, 240].map(a => { const [px, py] = polar(x, y, r, turned + a); return <circle key={a} cx={px} cy={py} r={Math.max(2, r * 0.25)} className="bk-f-mark"/>; })}
  </g>;
}

/** Figure 13-1: a rotating body divided into two halves of its mass, with counter-rotating eddies where they meet. */
function DynamoEddies() {
  // Carry angle from a base so changing the rotation rate never makes the body or eddies jump.
  const [{ rate, baseT, baseAngle }, setSpin] = useState({ rate: 0.7, baseT: 0, baseAngle: 0 });
  const [fraction, setFraction] = useState(0.5);
  const [molten, setMolten] = useState(true);
  const clipId = `bk-dynamo-${useId().replace(/:/g, '')}`;
  const play = usePlayback();
  const H = 420, cx = 300, cy = 210, R = 170, shell = dividingRadius(fraction) * R, n = 9, turning = Math.abs(rate) >= 0.05;
  const turned = baseAngle + (play.t - baseT) * rate * 50;
  const setRate = (v: number) => setSpin({ rate: v, baseT: play.t, baseAngle: turned });
  // Keep the outer eddies inside the body's rim even when the dividing shell sits close to it.
  const rimRoom = R - shell, outOffset = Math.min(19, Math.max(6, rimRoom * 0.5)), outR = Math.min(12, Math.max(4.5, rimRoom * 0.34));
  const restart = () => { setSpin(s => ({ ...s, baseT: 0, baseAngle: 0 })); play.restart(); };
  return <Diagram stage={
    <Stage w={W} h={H} label={!turning ? 'A body that is not rotating: no eddies and no convection.' : `A body seen from above, rotating ${rate > 0 ? 'counter-clockwise' : 'clockwise'}. A shell at ${fmt(dividingRadius(fraction), 2)} of its radius divides the inner ${Math.round(fraction * 100)} per cent of its mass from the rest, and on either side of the shell there are eddies turning opposite ways.`}>
      <defs><clipPath id={clipId}><circle cx={cx} cy={cy} r={R}/></clipPath></defs>
      <circle cx={cx} cy={cy} r={R} className="bk-body bk-body-plain"/>
      {molten && turning && <circle cx={cx} cy={cy} r={shell} clipPath={`url(#${clipId})`} className="bk-s-danger" fill="none" strokeWidth={54} opacity={0.16 + 0.14 * Math.abs(rate)}/>}
      <circle cx={cx} cy={cy} r={shell} className="bk-s-text" fill="none" strokeWidth="2"/>
      {[0, 60, 120].map(a => <line key={a} x1={polar(cx, cy, R - 4, turned + a)[0]} y1={polar(cx, cy, R - 4, turned + a)[1]} x2={polar(cx, cy, R - 4, turned + a + 180)[0]} y2={polar(cx, cy, R - 4, turned + a + 180)[1]} className="bk-s-muted" strokeWidth="2" strokeDasharray="6 8"/>)}
      {turning && <>
        <Spin x={cx} y={cy} r={30} ccw={rate > 0} sweep={270} tone="text" w={3}/>
        <Still><Arrow x1={cx + R + 26} y1={cy + 40 * Math.sign(rate)} x2={cx + R + 26} y2={cy - 40 * Math.sign(rate)} tone="text" w={3}/><Arrow x1={cx - R - 26} y1={cy - 40 * Math.sign(rate)} x2={cx - R - 26} y2={cy + 40 * Math.sign(rate)} tone="text" w={3}/></Still>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * 360 + 30, [ix, iy] = polar(cx, cy, shell - 19, a), [ox, oy] = polar(cx, cy, shell + outOffset, a);
          // As p. 110 states and Figure 13-1 draws: the rotating inner sphere drives a counter-rotating field outside the
          // shell (clockwise for a counter-clockwise body), while the eddies inside the shell turn the opposite way.
          return <g key={i}><Eddy x={ix} y={iy} turned={turned * 4}/><Eddy x={ox} y={oy} r={outR} turned={-turned * 4}/><Spin x={ix} y={iy} r={17} ccw={rate > 0} sweep={200} w={1.6}/><Spin x={ox} y={oy} r={outR + 4} ccw={rate < 0} sweep={200} w={1.6}/></g>;
        })}
      </>}
      <T x={cx} y={cy - Math.min(54, Math.max(44, shell * 0.42))} size="sm">inner {Math.round(fraction * 100)} % of the mass</T>
      <T x={560} y={150} anchor="start" size="sm">dividing shell at</T><T x={560} y={172} anchor="start" tone="text" size="lg">{fmt(dividingRadius(fraction), 2)} R</T>
    </Stage>}>
    <Slider label="Rotation of the body" value={rate} min={-1} max={1} step={0.05} onChange={setRate} show={v => (Math.abs(v) < 0.05 ? 'none' : `${Math.round(Math.abs(v) * 100)} % ${v > 0 ? 'counter-clockwise' : 'clockwise'}`)}/>
    <Slider label="Share of the mass inside the shell" value={fraction} min={0.2} max={0.8} step={0.05} onChange={setFraction} show={v => `${Math.round(v * 100)} %`}/>
    <Toggle label="Shade the stirred region" checked={molten} onChange={setMolten}/>
    <PlayBar play={{ ...play, restart }} label="the rotation"/>
    <Readout label="Radius of the dividing shell" value={`${fmt(dividingRadius(fraction), 3)} R`}/>
    <Readout label="Strength of the eddies" value={turning ? `${Math.round(Math.abs(rate) * 100)} %` : 'none'} tone={turning ? 'b' : undefined}/>
    <Remark>{turning ? 'The eddies stir real matter where the two halves meet. In a conducting fluid that stirring is the convection a dynamo needs.' : 'No rotation, no eddies: the convection, and the magnetic field it drives, last as long as the body keeps rotating.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 13,
  summary: <>
    <p>The magnetic fields of the Sun and the planets are put down to convection in a conducting fluid. What drives the convection has had no good answer, and for the Earth’s dynamo to run indefinitely <Q>there must be a constant input of energy from some unknown source</Q> (<Pg n={110}/>).</p>
    <p>Fleming finds the source in the body’s own rotation. Each half of the mass of a rotating sphere makes a counter-rotating mattermagnetic field in the region the other half occupies, and the two meet as eddies near the shell that divides them. The eddies stir the matter; where it conducts, the stirring makes the magnetic field (<Pg n={111}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '13-1', page: 111, section: 'Matter Force Induced Convection', title: 'Eddies where the two halves of the mass meet',
      caption: 'A body as seen from above rotating counterclockwise as shown by the black arrows with a spherical shell dividing the two halves of its mass. On either side of the spherical shell dividing the two masses there are eddy currents as shown by the circling arrows.',
      Diagram: DynamoEddies,
      text: <>
        <p>For a non-solid rotating sphere, to a first approximation <Q>the mass can be divided in two. Half of the mass is in an inner sphere, and the other half is in an outer spherical shell. If the density is uniform throughout, the dividing line between these two halves is at a radius that is approximately 80% of the radius of the sphere</Q> (<Pg n={110}/>).</p>
        <p><Q>As the inner 50% of the mass rotates, it produces a counter-rotating mattermagnetic field outside of it</Q>; the outer half does the same in the region inside. <Q>These mattermagnetic fields produce two separate counter-rotating mattermagnetic loops or eddies that meet near the 0.8R spherical shell</Q>. They <Q>cause real stirring of the matter, convection currents</Q>, enough <Q>to melt rock and keep it molten as long as the body keeps rotating</Q> (<Pg n={111}/>).</p>
        <p>In a conducting fluid, electrons flow in the convection loops more easily than protons, and an electrically induced magnetic field forms. The loops raise counter-loops of their own, so the whole field is a superposition of many small ones and can vary and even reverse (<Pg n={111}/>, <Pg n={112}/>).</p>
      </>,
      tryThis: ['Leave the mass split at 50 %: the dividing shell is at 0.79 R, the “approximately 80%” of the text.', 'Reverse the rotation: both rings of eddies reverse, and they still turn opposite ways to each other.', 'Stop the rotation: the eddies, and the stirring, stop.', 'Move the split away from 50 % to see how the shell’s radius follows the cube root of the share of mass.'],
      notes: <p>The shell radius is that of a sphere of uniform density, as in the text. The outer eddies counter-rotate against the body, as p. 110 states for the inner sphere’s field outside 0.8 R and as Figure 13-1 draws in the shaded band, while the inner eddies turn the opposite way (matching the sense inside a rotating shell from Figure 11-4, though the text briefly calls both counter-rotating and a couple of printed inner arrows vary). The number of eddies, their size and the width of the shaded band are display choices. The secondary counter-loops and the resulting magnetic field are not drawn.</p>,
    },
  ],
};
export default chapter;
