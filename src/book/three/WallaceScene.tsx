// Wallace's apparatus in three dimensions, for Figure 9-2, after the drawings of his patent (US 3,626,605, FIGS. 1-4
// and 7): two U-shaped brass members, mirrored, leave two gaps between them. The generator sits in one, its wheel
// between two pole pieces, and its whole assembly can be turned over on a shaft driven by a motor and belt. The
// detector, built the same way, hangs in the other gap on a knife edge; a lamp's beam off a mirror on it shows its
// tilt on a scale. Loaded on demand, and drawn only when something changes.
import { useContext, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette, scene as sceneColours } from '../../ui/palette';
import { FigureRunning } from '../kit/clock';
import { disposeAll, label, turnWithKeys } from './common';

/** What the scene shows at a moment. Angles in degrees. */
export interface WallaceState {
  /** How far each wheel has turned on its own axle. */
  wheel: number;
  /** How far the generator assembly is turned over on its shaft (0: poles as the detector's, aligned). */
  over: number;
  /** The detector's tilt away from its resting angle, already magnified for display. */
  tilt: number;
  /** Whether the generator is being turned over (for the arrow on its pulley, shown only while paused). */
  turning: boolean;
  reset?: number;
}

/** Where the parts stand: the two gaps' centres along x, at the height of the gaps, and the plane the light beam runs in. */
const GAP_Y = 1.25, GEN_X = -0.85, DET_X = 0.85, BEAM_Z = 0.42, DETECTOR_REST = 45;
const LAMP = new THREE.Vector3(2.15, 0.62, BEAM_Z), SCALE_X = 2.55, SCALE_AIM = 1.72;

/** The wheel between its two pole pieces in a steel frame: the generator and the detector are built alike. The wheel turns about the group's y axis. */
function wheelAssembly(metal: (c: string, r?: number) => THREE.Material, north: string) {
  const group = new THREE.Group(), wheel = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 64), metal(sceneColours.steel, 0.3));
  // The turbine buckets cut in the rim, where the compressed air drives it, and a stripe so its turning shows.
  const buckets = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 64, 1, true), new THREE.MeshStandardMaterial({ color: palette.text4, roughness: 0.6, wireframe: true }));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.105, 0.05), new THREE.MeshStandardMaterial({ color: palette.dataMark, roughness: 0.5 }));
  stripe.position.x = 0.15;
  wheel.add(disc, buckets, stripe);
  // The pole pieces face the wheel's two faces across a hair's gap; one is coloured so the assembly's orientation shows.
  const pole = (y: number, colour: string) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 40), metal(colour, 0.45)); m.position.y = y; return m; };
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.3), metal(sceneColours.steel, 0.6)), frame2 = frame.clone();
  frame.position.x = -0.36;
  frame2.position.x = 0.36;
  const bridge = (y: number) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.3), metal(sceneColours.steel, 0.6)); b.position.y = y; return b; };
  group.add(wheel, pole(0.11, north), pole(-0.11, sceneColours.steel), frame, frame2, bridge(0.25), bridge(-0.25));
  return { group, wheel };
}

/** The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat drawing instead. */
export default function WallaceScene({ state, onFail, description }: { state: WallaceState; onFail(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update(s: WallaceState): void; view(): void; quiet(running: boolean): void } | null>(null);
  const running = useContext(FigureRunning);
  const runningNow = useRef(running);
  runningNow.current = running;

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(palette.bg0);
    Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });
    el.appendChild(renderer.domElement);
    // If the browser takes the drawing context away (a GPU reset, too many contexts), fall back to the flat view.
    const lost = (e: Event) => { e.preventDefault(); onFail(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    // Everything set up is undone in reverse, the same way on unmount and when setup fails part way.
    const undo: (() => void)[] = [() => renderer.domElement.remove(), () => renderer.dispose(), () => renderer.domElement.removeEventListener('webglcontextlost', lost)];
    const teardown = () => { api.current = null; while (undo.length) { try { undo.pop()!(); } catch { /* keep releasing the rest */ } } };
    // Build the scene; if anything fails part way, undo what was set up and show the flat view instead.
    try {
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 720 / 360, 0.1, 100);
      undo.push(() => disposeAll(scene));
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(2, 5, 5);
      scene.add(key);
      const metal = (color: string, roughness = 0.4) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.55 });
      const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); scene.add(b); return b; };

      // The base and the steel supports at each end that carry the upper member.
      const steel = metal(sceneColours.steel, 0.7), brass = metal(sceneColours.brass, 0.35);
      box(4.4, 0.1, 1.9, 0.2, 0.05, 0.3, metal(palette.line2, 0.8));
      box(0.16, 2.2, 0.5, -1.82, 1.2, 0, steel);
      box(0.16, 2.2, 0.5, 1.82, 1.2, 0, steel);
      // The mass circuit: two U-shaped brass members, mirrored, whose arms meet across the two gaps.
      for (const s of [-1, 1]) {
        const bar = GAP_Y + s * 0.95, arm = GAP_Y + s * 0.6;
        box(3.5, 0.3, 0.5, 0, bar, 0, brass);
        for (const x of [GEN_X, DET_X]) box(0.62, 0.42, 0.5, x, arm, 0, brass);
      }

      // The generator, turned over on a shaft through its gap (front to back), with a pulley at the front driven by
      // a belt from a small motor on the base.
      const generator = wheelAssembly(metal, palette.accent);
      generator.group.position.set(GEN_X, GAP_Y, 0);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 14), metal(palette.text3, 0.3));
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(GEN_X, GAP_Y, 0.2);
      const pulley = new THREE.Group(), pulleyDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 32), metal(palette.text3, 0.4));
      pulleyDisc.rotation.x = Math.PI / 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.06), new THREE.MeshStandardMaterial({ color: palette.accent }));
      pulley.add(pulleyDisc, spoke);
      pulley.position.set(GEN_X, GAP_Y, 0.85);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 24), metal(palette.text4, 0.6));
      motor.rotation.x = Math.PI / 2;
      motor.position.set(GEN_X, 0.27, 0.78);
      const belt = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(GEN_X - 0.16, GAP_Y, 0.85), new THREE.Vector3(GEN_X - 0.07, 0.27, 0.85),
        new THREE.Vector3(GEN_X + 0.16, GAP_Y, 0.85), new THREE.Vector3(GEN_X + 0.07, 0.27, 0.85),
      ]), new THREE.LineBasicMaterial({ color: palette.text2 }));
      scene.add(generator.group, shaft, pulley, motor, belt);

      // The detector, hung on a knife edge (an axis front to back) in the other gap, set at an angle as in FIG. 2,
      // with a small mirror at the front.
      const detector = wheelAssembly(metal, palette.accent);
      const hang = new THREE.Group();
      hang.position.set(DET_X, GAP_Y, 0);
      hang.add(detector.group);
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.14), new THREE.MeshStandardMaterial({ color: palette.text, roughness: 0.1, metalness: 0.9 }));
      const knife = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 3), steel);
      knife.rotation.x = Math.PI;
      knife.position.set(DET_X, GAP_Y + 0.33, 0.3);
      scene.add(hang, mirror, knife);

      // The lamp, its beam to the mirror and back out to the scale, and the spot of light on the scale.
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), metal(palette.text4, 0.5));
      lamp.position.copy(LAMP);
      box(0.04, 1.0, 0.32, SCALE_X + 0.02, SCALE_AIM, BEAM_Z, new THREE.MeshStandardMaterial({ color: palette.bg3, roughness: 0.9 }));
      const ticks: THREE.Vector3[] = [];
      for (let i = -6; i <= 6; i++) { const y = SCALE_AIM + i * 0.07, w = i === 0 ? 0.14 : i % 3 === 0 ? 0.1 : 0.05; ticks.push(new THREE.Vector3(SCALE_X - 0.001, y, BEAM_Z - w), new THREE.Vector3(SCALE_X - 0.001, y, BEAM_Z + w)); }
      const tickLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), new THREE.LineBasicMaterial({ color: palette.text3 }));
      const beamMaterial = new THREE.LineBasicMaterial({ color: palette.warn, transparent: true, opacity: 0.85 });
      const beam = new THREE.Line(new THREE.BufferGeometry(), beamMaterial);
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 10), new THREE.MeshBasicMaterial({ color: palette.warn }));
      scene.add(lamp, tickLines, beam, spot);

      // Labels, after the patent's names.
      const labels: [string, string, number, number, number][] = [
        ['generator', palette.text2, GEN_X, GAP_Y + 1.35, 0.3], ['detector, on a knife edge', palette.text2, DET_X + 0.1, GAP_Y + 1.35, 0.3],
        ['brass', sceneColours.brass, 0, GAP_Y - 1.2, 0.45], ['motor and belt', palette.text3, GEN_X - 0.25, 0.45, 1.15], ['lamp', palette.text3, LAMP.x + 0.05, LAMP.y - 0.2, BEAM_Z], ['scale', palette.text3, SCALE_X, SCALE_AIM + 0.65, BEAM_Z],
      ];
      for (const [text, colour, x, y, z] of labels) { const l = label(text, colour, 0.17); l.position.set(x, y, z); scene.add(l); }

      // The arrow round the pulley for the turning-over: shown only while paused, like every rotation arrow in the book.
      const arrowMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, side: THREE.DoubleSide });
      const turnArrow = new THREE.Group(), arc = Math.PI * 1.1;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.016, 8, 40, arc), arrowMaterial);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), arrowMaterial);
      head.position.set(0.27 * Math.cos(arc), 0.27 * Math.sin(arc), 0);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-Math.sin(arc), Math.cos(arc), 0));
      turnArrow.add(ring, head);
      turnArrow.position.set(GEN_X, GAP_Y, 0.9);
      scene.add(turnArrow);

      const controls = new OrbitControls(camera, renderer.domElement);

      undo.push(() => controls.dispose());
      undo.push(turnWithKeys(el, camera, controls, () => draw()));
      controls.enablePan = false;
      controls.enableZoom = false; // the mouse wheel scrolls the book, as everywhere else on the page
      // A vertical swipe scrolls the page, as the wheel does; a sideways one turns the view.
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      controls.maxPolarAngle = Math.PI / 2 - 0.04; // never look from under the base
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      // From in front and a little above and to the right, close to the patent's FIG. 2 face on, with depth.
      const view = () => { camera.position.set(1.4, 2.4, 6.6); controls.target.set(0.35, 1.2, 0); camera.lookAt(0.35, 1.2, 0); controls.update(); draw(); };
      const resize = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        draw();
      });
      resize.observe(el);
      undo.push(() => resize.disconnect());

      // The mirror's normal at rest sends the beam from the lamp to the middle of the scale; the detector's tilt turns
      // it, and the reflected beam twice as far.
      const mirrorAt = new THREE.Vector3(DET_X + 0.12, GAP_Y + 0.02, BEAM_Z), z = new THREE.Vector3(0, 0, 1);
      const restNormal = new THREE.Vector3(SCALE_X, SCALE_AIM, BEAM_Z).sub(mirrorAt).normalize().add(LAMP.clone().sub(mirrorAt).normalize()).normalize();

      let shown = runningNow.current ? 0 : 1, frame = 0, turning = state.turning;
      const showArrow = () => { arrowMaterial.opacity = shown; turnArrow.visible = turning && shown > 0.01; };
      // The arrow's opacity eases to its target over 350 ms, as the flat figures' arrows do (none with reduced motion).
      const quiet = (on: boolean) => {
        cancelAnimationFrame(frame);
        const target = on ? 0 : 1, from = shown, start = performance.now();
        const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const step = (now: number) => {
          const k = instant ? 1 : Math.min(1, (now - start) / 350);
          shown = from + (target - from) * k;
          showArrow();
          draw();
          if (k < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      };
      api.current = {
        view,
        quiet,
        update(s) {
          const rad = Math.PI / 180;
          generator.wheel.rotation.y = s.wheel * rad;
          detector.wheel.rotation.y = -s.wheel * rad;
          generator.group.rotation.z = s.over * rad;
          pulley.rotation.z = s.over * rad;
          hang.rotation.z = (-DETECTOR_REST + s.tilt) * rad;
          // The mirror turns with the detector's tilt about the knife edge.
          const normal = restNormal.clone().applyAxisAngle(z, s.tilt * rad);
          mirror.position.copy(mirrorAt);
          mirror.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
          const incoming = mirrorAt.clone().sub(LAMP).normalize(), out = incoming.clone().addScaledVector(normal, -2 * incoming.dot(normal));
          const hit = mirrorAt.clone().addScaledVector(out, (SCALE_X - mirrorAt.x) / out.x);
          beam.geometry.dispose();
          beam.geometry = new THREE.BufferGeometry().setFromPoints([LAMP, mirrorAt, hit]);
          spot.position.copy(hit);
          turning = s.turning;
          showArrow();
          draw();
        },
      };
      showArrow();
      view();
      api.current.update(state);
      undo.push(() => cancelAnimationFrame(frame));
      return teardown;
    } catch (error) {
      console.error('A 3D figure failed to set up; showing its flat drawing instead.', error);
      teardown();
      onFail();
      return undefined;
    }
    // The scene is built once; `state` changes go through `api`.
  }, [onFail]);

  useEffect(() => { api.current?.update(state); }, [state]);
  useEffect(() => { api.current?.view(); }, [state.reset]);
  useEffect(() => { api.current?.quiet(running); }, [running]);

  return <div ref={host} className="bk-stage-3d" style={{ aspectRatio: '720 / 360' }} role="img" aria-label={`${description} With the figure focused, the arrow keys turn it too.`}/>;
}
