// Simulations proposed for future work, in the order of the book. Each names the figures and pages it would bring to
// life, what it could be built from, and what Fleming leaves open (so a build exposes it rather than inventing it).
import type { FutureSim } from './types';

/** The proposals. Chapter pages list the ones that name them. */
export const FUTURE: FutureSim[] = [
  {
    id: 'casimir-plates', title: 'Casimir plates, wavelength by wavelength', chapters: [3],
    sources: 'Figures 3-3 and 3-4, pp. 29–31',
    idea: 'Two plates in a three-dimensional medium of fluctuations of every wavelength. Move the plates and count what can form between them; the pressure on each face is tallied from the fluctuations that press on it, and compared with Equation 3-1.',
    basis: 'The Medium lifecycle laboratory for the population of fluctuations and the Van der Waals laboratory’s pressure stage for the reference curve. It is already on the laboratory’s list of planned experiments.',
    open: 'How one fluctuation’s push on a plate is to be counted. Fleming gives the argument by exclusion and the standard formula, not a rule for a single dipole.',
  },
  {
    id: 'polarized-light', title: 'Linear and circular polarization', chapters: [5],
    sources: 'p. 45; Figures 5-1 and 5-2',
    idea: 'A photon’s series of pairs with the plane of rotation set by the reader, and a circular mode in which the pairs also turn about the direction of travel, tracing the helix (a double helix when both charges are drawn) that the text describes. A polarizing filter could be added to show which series pass.',
    basis: 'The Light laboratory already turns the plane of polarization; the helix needs a second rotation and a trail.',
    open: 'The exact motion in the circular case: the text says the pairs rotate “in a circle perpendicular to the direction of propagation in addition to rotating forward” and gives no figure.',
  },
  {
    id: 'induction', title: 'Currents, coils and induction', chapters: [6, 7, 10],
    sources: 'Figures 6-15, 6-18, 7-2 and 10-1; pp. 57, 59, 63, 86',
    idea: 'A wire, then a coil, in a field of zeptons that the current sets spinning; a second wire or coil nearby in which the spinning zeptons drive a current. Switch the first off and watch the back EMF. Maxwell’s rows of vortices are the same scene in section.',
    basis: 'The Electron laboratory’s moving scenario gives the rotation one charge induces; this multiplies it along a conductor and adds the return effect on charges.',
    open: 'The rates: how quickly rotation passes from zepton to zepton, and how strongly spinning zeptons move a charge. The book gives the mutual dependence in words.',
  },
  {
    id: 'lorentz', title: 'A charge in fields made of zeptons', chapters: [7],
    sources: 'Figures 7-3, 7-4 and 7-5; pp. 64–66',
    idea: 'Fire a charge through a region of oriented zeptons (an electric field) and a region of rotating ones (a magnetic field). See the pressure build between like charges and the sweep to one side in the rotating field; reverse the charge; close the path into a circle.',
    basis: 'The Extended Casimir laboratory colours local pressure between two charges and lets them move; the Electron laboratory draws rotation.',
    open: 'How a rotating dipole “sweeps” a charge mechanically. Fleming says it is “not that simple”, since negative charges go the other way, and leaves the picture qualitative.',
  },
  {
    id: 'tops', title: 'Tops, flywheels and induction between masses', chapters: [8, 9],
    sources: 'Figures 8-3, 8-5, 9-1 and 9-2; Equations 8-8 and 8-14; pp. 72–85',
    idea: 'A top in three dimensions with its mattermagnetic field drawn along its axis and the force of Equation 8-8 on it as it starts to fall. Then Laithwaite’s flywheel on its pivot, and Morgan’s two discs with a gap to vary, the second disc free to turn.',
    basis: 'A new laboratory in the workbench shell; the rotation glyphs and the split view for the top-down section already exist.',
    open: 'The matter permeability μ₀ₘ and the sign of the force: the text says only that the force is at 90 degrees to the fall. Morgan’s and Wallace’s reports give directions, not magnitudes.',
  },
  {
    id: 'inertia', title: 'Inertia as induction', chapters: [10],
    sources: 'Figures 10-2 and 10-3; pp. 87–89',
    idea: 'A body of matter in a medium of zeptons oriented to it. Push it: the zeptons are made to rotate, and their rotation is plotted against the body’s momentum. Release it and it coasts. Push harder and watch the zeptons approach the half-turn that sets the limit of speed.',
    basis: 'The Electron laboratory’s moving scenario, with matter polarity in place of charge (its proton polarizer is a first step toward a second kind of polarizer).',
    open: 'Whether it is the number or the energy of rotating zeptons that follows momentum (“the number and/or energy”), and the share of inertia that lies inside the body.',
  },
  {
    id: 'two-zeptons', title: 'A medium of electron-like and proton-like zeptons', chapters: [11, 17],
    sources: 'Figures 11-3, 11-6, 17-4 and 17-5; Table 17-1; pp. 95, 133–135',
    idea: 'The medium with both kinds of zepton, each carrying matter and electric charge. Put in a neutral body and see matter polarization with no electric field; measure the pressure that pairs of unlike kind leave, and how it falls with distance compared with pairs of like kind.',
    basis: 'The Medium lifecycle laboratory, with a second species and a second polarity on every pair.',
    open: 'The proportion of the two kinds, the wavelengths of the proton-like ones, and whether a neutron-like pair exists; Fleming leaves the last as an open question.',
  },
  {
    id: 'orbits', title: 'Orbits with the mattermagnetic force', chapters: [12],
    sources: 'Figures 12-2 to 12-6; Equation 12-4; pp. 100–105',
    idea: 'A sun and planets under Newtonian gravity with the Lorentz force of the sun’s rotation added. Measure the perihelion advance it gives Mercury against the 43 arcseconds a century; add each planet’s own rotation and watch it slow toward synchronous rotation as its orbit widens.',
    basis: 'The orbit integrator behind Figure 12-6 on these pages, made three-dimensional and given real units.',
    open: 'The strength μ₀ₘ, and the direction of the force: the text calls it tangential to the velocity, the figure and Equation 12-4 put it across the velocity. A simulation would let the reader try both.',
  },
  {
    id: 'galaxy', title: 'Spiral arms from a missing force', chapters: [12],
    sources: 'Figures 12-7 and 12-8; Equation 12-5; pp. 106–108',
    idea: 'A disc of stars with gravity and the mattermagnetic attraction between stars moving the same way. Start from a smooth disc and see whether arms form; plot orbital speed against radius with and without the extra force.',
    basis: 'A particle simulation in the workbench shell; Fleming points to Peratt’s plasma simulations as the same mathematics.',
    open: 'The ratio of the mattermagnetic force to gravity at galactic speeds. The text says it exceeds Newtonian gravity in the arms and gives no figure.',
  },
  {
    id: 'dynamo', title: 'A planet’s eddies and its magnetic field', chapters: [13],
    sources: 'Figure 13-1; pp. 110–112',
    idea: 'A rotating fluid sphere whose inner and outer halves stir each other at the dividing shell. Vary the rotation and the conductivity; watch convection cells form, drive a magnetic field, and now and then reverse it.',
    basis: 'The eddy diagram of Figure 13-1 on these pages, with a simple conducting-fluid model added.',
    open: 'Everything quantitative: the text gives the mechanism and the 0.8 R shell, and says the field is a superposition of many small fields that can vary and reverse.',
  },
  {
    id: 'particle-shells', title: 'Particle shells: mass, and the strong force between two', chapters: [16, 25],
    sources: 'Figures 16-1, 16-2, 25-1 and 25-2; Equations 16-1 and 25-3; pp. 122–128, 194–199',
    idea: 'A shell built of virtual pairs made and annihilated in turn round its circumference, so that it appears to spin. Count the wavelengths it excludes for its mass. Then bring two shells together: the excluded band between them, the shadow each casts through the other’s openings, and the distance at which the shell becomes transparent.',
    basis: 'The Electron laboratory’s “Mass & excluded energy” and “Radius limit” studies. It is on the laboratory’s list of planned experiments.',
    open: 'The structure of the shell (the triacontahedron is offered as a speculation), and the size of the force, which Fleming’s approximation leaves several times short of the measured strong force.',
  },
  {
    id: 'shadow-gravity', title: 'Gravity by shadow, and where it gives out', chapters: [17, 18],
    sources: 'Figures 17-1, 17-2, 18-1 and 18-2; pp. 129–140',
    idea: 'A medium whose pressure is carried zepton to zepton in straight lines. Two bodies shade each other and are pushed together. Then lengthen the path and scatter long-wavelength zeptons, gas and plasma along it: find the distance at which the shadow fails and matter repulsion, carried by polarization, takes over.',
    basis: 'The Extended Casimir laboratory’s pressure field, with matter in place of charge and a much longer path.',
    open: 'The law by which obstacles disrupt the pressure, and so the range itself. Fleming argues for a limit and points to dwarf elliptical galaxies as the place to estimate it; he gives no formula.',
  },
  {
    id: 'field-speed', title: 'How fast a field spreads', chapters: [19],
    sources: 'Figures 19-1 and 19-4; pp. 142–149',
    idea: 'A medium in which each zepton passes on a polarization after turning only a set fraction of its half-turn. Set the fraction and time the field across the cell, beside a photon crossing the same cell at c. Then an orbit under a force with that delay.',
    basis: 'The Medium lifecycle laboratory for the turning pairs and the Double slit laboratory, which already contrasts fields at c with fields much faster.',
    open: 'The real fraction, which “has not been determined”; the text’s 10²⁰ is an example, and astronomy gives only a lower bound of 2 × 10¹⁰ c.',
  },
  {
    id: 'torque', title: 'The torque that sets the speed of light', chapters: [20, 23],
    sources: 'pp. 151–152; Figures 23-1 and 23-2; Equation 23-6',
    idea: 'A photon’s series of pairs crossing from vacuum into glass, where the neighbours’ drag on the central pair is greater: it slows and turns. Then the same with the drag graded round a star, giving the Shapiro delay and the bending of starlight from one cause.',
    basis: 'The Light laboratory, with a region in which the background pairs resist rotation more.',
    open: 'The torque as a function of the surrounding zeptons. Fleming says the speed of light should be derivable from it and does not derive it.',
  },
  {
    id: 'frames', title: 'Interferometers in the zero-point rest frame', chapters: [21, 22],
    sources: 'Figures 21-1, 22-1, 22-2 and 22-3; Equations 22-6 to 22-15; pp. 154–172',
    idea: 'A Michelson interferometer and a Sagnac ring that can be moved and turned through a field at rest. Light travels at c₀ in the field; the apparatus measures with its own slowed clocks and contracted wavelengths. See why one gives a null result and the other does not.',
    basis: 'The Light laboratory’s photon and probe, with a moving source and detector.',
    open: 'The transformations at high velocity: the text gives first-order forms and refers to Selleri’s equations for the rest.',
  },
  {
    id: 'weak', title: 'Decay as a zepton caught at a boundary', chapters: [26],
    sources: 'Figure 26-1; pp. 202–205',
    idea: 'A neutron’s shell in the medium. Wait for a pair to form with one half inside; see the annihilation and the freed electron. Run many and plot the half-life, and the spread of energies of the electrons that come out.',
    basis: 'The Medium lifecycle laboratory, with a shell that can separate the halves of a pair.',
    open: 'The rate at which a suitable pair forms across the shell, on which the half-life depends, and the source of the energy spread; the text describes the step and not its statistics.',
  },
];
