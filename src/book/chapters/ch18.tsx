// Chapter 18: The Distance Limitation of Gravity (PDF pp. 137–141). Figures 18-1 and 18-2.
import { useState } from 'react';
import { Arrow, Body, Diagram, Line, Readout, Remark, Slider, Stage, T, clamp, fmt } from '../kit';
import { Pg, Q } from '../prose';
import type { ChapterContent } from '../types';
import { TwoSources } from './shared';

const W = 720;
/** The radius of a star the size of the Sun, as the text takes it, in metres. */
export const STAR_RADIUS = 7e8;

/** The diameter of the circle on one star's surface cut by the cone from the edges of another to its centre, in metres. */
export const pathDiameter = (distance: number, radius = STAR_RADIUS) => (2 * radius * radius) / distance;

/** Lengths the text compares the path with, in metres. */
const SCALES = [
  { name: 'electron-positron pair', length: 6.066e-13 },
  { name: 'hydrogen atom', length: 1e-10 },
  { name: 'red light wavelength', length: 7e-7 },
  { name: '1 millimetre', length: 1e-3 },
  { name: '1 kilometre', length: 1e3 },
  { name: 'the star', length: 2 * STAR_RADIUS },
];

/** A length in metres with a fitting unit. */
function length(m: number) {
  if (m >= 1e3) return `${fmt(m / 1e3)} km`;
  if (m >= 1) return `${fmt(m)} m`;
  if (m >= 1e-3) return `${fmt(m * 1e3)} mm`;
  if (m >= 1e-6) return `${fmt(m * 1e6)} µm`;
  if (m >= 1e-9) return `${fmt(m * 1e9)} nm`;
  return `${fmt(m * 1e12)} pm`;
}

/** Figure 18-2: the narrow path gravity must travel from one star to another, against the size of what lies along it. */
function GravityPath() {
  const [exp, setExp] = useState(Math.log10(4e20));
  const distance = 10 ** exp, d = pathDiameter(distance), atoms = d / 1e-10, red = d / 7e-7, pairs = d / 6.066e-13;
  const H = 400, y = 120, x1 = 110, x2 = 610, r = 46, spot = clamp((Math.log10(d) + 9) / 18) * 40 + 2;
  // A logarithmic ruler from a picometre to the size of the star, with the width of the path marked on it.
  const sx = (m: number) => 80 + ((Math.log10(m) + 13) / 23) * 560;
  const medium = distance * 100;
  return <Diagram stage={
    <Stage w={W} h={H} label={`Two stars the size of the Sun, ${fmt(distance)} metres apart. The path of the gravitational force between them is ${length(d)} across where it meets the first star: ${fmt(atoms)} hydrogen atoms, or ${fmt(red)} wavelengths of red light.`}>
      <Line d={`M${x2} ${y - r} L${x1} ${y} L${x2} ${y + r}`} tone="mark" w={1.4}/>
      <Body x={x1} y={y} r={r} tone="plain" label="Star 1"/><Body x={x2} y={y} r={r} tone="plain" label="Star 2"/>
      <ellipse cx={x1 + r} cy={y} rx={2.5} ry={spot / 2 + 1.5} className="bk-f-mark"/>
      <Arrow x1={x1 + r + 70} y1={y - 62} x2={x1 + r + 6} y2={y - 6} tone="muted" w={1.2} head={7}/><T x={x1 + r + 74} y={y - 66} anchor="start" size="sm">path diameter on the star’s surface: {length(d)}</T>
      <T x={W / 2} y={y + r + 38} size="sm">not to scale: the stars are {fmt(distance / (2 * STAR_RADIUS))} of their own diameters apart</T>
      <line x1={80} y1={300} x2={640} y2={300} className="bk-s-faint" strokeWidth="2"/>
      {SCALES.map((s, i) => <g key={s.name}><line x1={sx(s.length)} y1={292} x2={sx(s.length)} y2={308} className="bk-s-muted" strokeWidth="1.5"/><T x={sx(s.length)} y={i % 2 ? 336 : 322} size="sm">{s.name}</T></g>)}
      <line x1={sx(d)} y1={268} x2={sx(d)} y2={308} className="bk-s-mark" strokeWidth="3"/><T x={sx(d)} y={260} tone="mark">width of the path</T>
      <T x={W / 2} y={H - 22} size="sm" tone={d < 7e-7 ? 'danger' : 'muted'}>{d < 7e-7 ? 'narrower than one wavelength of red light: a single such zepton can interrupt it' : 'wider than a wavelength of red light, but long-wavelength zeptons still cross it'}</T>
    </Stage>}>
    <Slider label="Distance between the stars" value={exp} min={11} max={26} step={0.05} onChange={setExp} show={() => `${fmt(distance, 2)} m`}/>
    <Readout label="Path diameter at the star" value={length(d)} tone="force"/>
    <Readout label="In hydrogen atoms" value={fmt(atoms)}/>
    <Readout label="In red light wavelengths" value={fmt(red)} tone={red < 1 ? 'bad' : undefined}/>
    <Readout label="In electron-positron pairs" value={fmt(pairs)}/>
    <Readout label="Atoms along a 1 cm² path" value={fmt(medium)}/>
    <Remark>{exp > 25 ? 'At the scale of the observable universe the path is about a hundred atoms across. The pressure cannot be passed on that far.' : exp > 20 ? 'At the radius of the Milky Way the path is a couple of millimetres across, on a star 1.4 million kilometres wide.' : 'Nearer than this the path is wide and the push arrives undisturbed.'}</Remark>
  </Diagram>;
}

const chapter: ChapterContent = {
  n: 18,
  summary: <>
    <p>Gravity holds galaxies together and yet the universe expands faster and faster. Both the Matter Force and gravity fall as the inverse square, so their ratio should be the same at every distance, and it is not. Fleming looks for the difference in how each is carried. Matter repulsion travels as a <em>polarization</em> of the zero-point field, spread through a wide region. Gravity is carried by <Q>zepton jitter</Q>, a pressure passed from zepton to zepton <Q>along essentially straight lines</Q> (<Pg n={137}/>, <Pg n={138}/>).</p>
    <p>Over a great distance that straight path becomes very narrow, and whatever lies along it, a long-wavelength zepton, gas, dust, above all plasma, interrupts it. <Q>Over a long distance these various disruptions add up and the force of gravity falls below the matter repulsion force in intensity</Q> (<Pg n={140}/>).</p>
  </>,
  items: [
    {
      kind: 'figure', id: '18-1', page: 138, section: 'Gravity Versus The Matter Force', title: 'Matter repulsion spreads through a wide region',
      caption: 'Two bodies of matter surrounded by matter-oriented zeptons in nearby space, oriented in a repulsive configuration.',
      Diagram: () => <TwoSources signs={[-1, -1]} mode="zeptons" names={['First body of matter', 'Second body of matter']} matter/>,
      text: <>
        <p><Q>The matter repulsion force on the other hand propagates through polarization of the zero-point field. The antimatter charges of the zeptons orient toward the matter with the matter charges oriented away.</Q> <Q>In some intermediate region of space, matter charges go against matter charges, causing them to deflect away as we see with the repulsive Faraday field line configuration</Q> (<Pg n={138}/>).</p>
        <p>This is Figure 11-2 again, set here beside Figure 18-2 for the contrast: <Q>The possibility is there that the propagation of the polarization of the zero-point field is more stable than simple random vibrations transmitted zepton to zepton.</Q></p>
      </>,
      tryThis: ['Drag the bodies apart. The polarization fills the whole picture, and every row of zeptons takes part in the repulsion.', 'Keep this breadth in mind for Figure 18-2, where gravity between two stars has only a thread to travel along.'],
    },
    {
      kind: 'figure', id: '18-2', page: 139, section: 'The Solution', title: 'Gravity’s path: a very long, very narrow cone',
      caption: 'The path of the gravitational force from Star 2 to Star 1.',
      Diagram: GravityPath,
      text: <>
        <p>Take two stars like the Sun, radius about 7 × 10⁸ m, and put them 4 × 10²⁰ m apart, about the radius of the Milky Way. Since gravity acts on the centre of mass, <Q>we can draw a line from the outer edges of one star to the center of the other to look at the path that the gravitational force must travel</Q> (<Pg n={138}/>).</p>
        <p><Q>The circle at the surface of the first star is about 2.5 millimeters in diameter.</Q> That is <Q>3500 visible red light photon wavelengths, 25 million hydrogen atoms, or 4 x 10<sup>9</sup> electron-positron pairs across</Q>. At 1 × 10²⁶ m, the scale of the observable universe, it would be <Q>100 hydrogen atom diameters across, less than a single visible red light photon wavelength</Q>. For the pressure to be passed all that way <Q>there must be a very high percentage of small high-energy zeptons along the entire path. Given the random nature of the zeptons, that cannot happen</Q> (<Pg n={139}/>).</p>
        <p>Matter in the way does more: at one atom per cubic centimetre there are <Q>4 x 10<sup>22</sup> atoms along a centimeter square path between our two stars</Q>, and plasma, with its large fields, inhibits the van der Waals forces most of all (<Pg n={140}/>).</p>
      </>,
      tryThis: ['Leave the distance at 4 × 10²⁰ m and check the readouts against the text: 2.5 mm, 25 million atoms, 3500 red wavelengths, 4 × 10⁹ pairs.', 'Slide out to 10²⁶ m. The path falls below one wavelength of red light and is about a hundred atoms across.', 'Slide in to the distance of the nearest stars (about 4 × 10¹⁶ m) and see how wide the path is there.'],
      notes: <>
        <p>The readouts are the geometry of the figure: a cone from the edges of Star 2 to the centre of Star 1, cut at Star 1’s surface. They reproduce the lengths the text gives. The text also gives the area as <Q>about 20 square millimeters</Q>, 3.3 × 10⁻²⁴ of the star’s surface; a circle 2.5 mm in diameter has an area of 4.9 mm², and 20 mm² is the area of a circle of 2.5 mm radius. The diagram reports the diameter only.</p>
        <p>The drawing of the two stars is a schematic; the ruler beneath it is to scale, logarithmically.</p>
      </>,
    },
  ],
};
export default chapter;
