// Morgan's flywheels in three dimensions, for Figure 9-1: a motor on a base drives the smaller disc, and the larger,
// passive disc faces it on the same axis across a small air gap, held on an upright at the far end, as in the
// photograph of his apparatus. Loaded on demand, and drawn only when something changes.
import { useContext, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';
import { FigureRunning } from '../kit/clock';
import { disposeAll, label } from './common';

/** What the scene shows at a moment: each disc's turn (degrees, about the shared axis) and its speed (signed, for the arrows). */
export interface FlywheelState {
  drivenAngle: number;
  passiveAngle: number;
  driven: number;
  passive: number;
  reset?: number;
}

/** The discs' sizes and places along the shared axis (x), in scene units; the gap is drawn wider than 1/16 inch so it can be seen. */
export const DISCS = { axisY: 1, driven: { r: 0.55, t: 0.18, x: -0.3 }, passive: { r: 0.75, t: 0.26, x: 0 }, gap: 0.04 } as const;

/** A curved arrow round the shared axis, showing which way a disc turns; `set` sets its sense (+1 right-handed about +x) or hides it. */
function turnArrow(radius: number, color: string) {
  const group = new THREE.Group(), material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true }), arc = Math.PI * 0.9;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 8, 48, arc), material);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 14), material);
  // The torus lies round z; turned a quarter round y it lies round x, and increasing its angle is a right-handed turn about +x.
  ring.rotation.y = Math.PI / 2;
  head.position.set(0, radius * Math.sin(arc), -radius * Math.cos(arc));
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, Math.cos(arc), Math.sin(arc)));
  group.add(ring, head);
  // Mirrored top to bottom, the arrow turns the other way.
  const set = (sense: number) => { group.visible = sense !== 0; group.scale.y = sense < 0 ? -1 : 1; };
  return { group, set, material };
}

/**
 * The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat drawing instead.
 * Like every rotation arrow in the book, the arrows round the discs fade out while the figure plays, since the turning
 * discs show the motion themselves, and come back when it pauses.
 */
export default function FlywheelScene({ state, onFail, description }: { state: FlywheelState; onFail(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update(s: FlywheelState): void; view(): void; quiet(running: boolean): void } | null>(null);
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
    // Build the scene; if anything fails part way, undo what was set up and show the flat view instead.
    try {
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 720 / 360, 0.1, 100);
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(2, 5, 4);
      scene.add(key);
      const metal = (color: string, roughness = 0.4) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.55 });

      // The base, the motor's housing at one end and the upright that carries the passive disc at the other.
      const { axisY, driven: d, passive: p } = DISCS;
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.1), metal(palette.line2, 0.7));
      base.position.set(-0.3, 0.06, 0);
      const motor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.85), metal(palette.text4, 0.6));
      motor.position.set(-1.55, 0.12 + 0.475, 0);
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), metal(palette.text4, 0.5));
      boss.rotation.z = Math.PI / 2;
      boss.position.set(-1.09, axisY, 0);
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.75, 1.1), metal(palette.line2, 0.7));
      upright.position.set(1.1, 0.12 + 0.875, 0);
      const shaftGeometry = (length: number) => { const g = new THREE.CylinderGeometry(0.05, 0.05, length, 16); g.rotateZ(Math.PI / 2); return g; };
      const shaftFrom = -1.03, shaftTo = d.x - d.t / 2;
      const drivenShaft = new THREE.Mesh(shaftGeometry(shaftTo - shaftFrom), metal(palette.text3, 0.3));
      drivenShaft.position.set((shaftFrom + shaftTo) / 2, axisY, 0);
      const axleFrom = p.x + p.t / 2, axleTo = 1.06;
      const passiveAxle = new THREE.Mesh(shaftGeometry(axleTo - axleFrom), metal(palette.text3, 0.3));
      passiveAxle.position.set((axleFrom + axleTo) / 2, axisY, 0);
      scene.add(base, motor, boss, upright, drivenShaft, passiveAxle);

      // The discs: each turns in a group about the shared axis, with a stripe across both faces and a mark on the rim so its turning shows.
      const disc = (r: number, t: number, x: number, colour: string, stripe: string) => {
        const group = new THREE.Group();
        group.position.set(x, axisY, 0);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 72), metal(colour, 0.35));
        body.rotation.z = Math.PI / 2;
        const mark = new THREE.MeshStandardMaterial({ color: stripe, roughness: 0.5 });
        const across = new THREE.Mesh(new THREE.BoxGeometry(t + 0.01, r * 0.8, 0.07), mark);
        across.position.y = r * 0.52;
        const rim = new THREE.Mesh(new THREE.BoxGeometry(t + 0.01, 0.03, 0.16), mark);
        rim.position.y = r + 0.005;
        group.add(body, across, rim);
        scene.add(group);
        return group;
      };
      const drivenDisc = disc(d.r, d.t, d.x, palette.text3, palette.dataMark), passiveDisc = disc(p.r, p.t, p.x, palette.text2, palette.accent);

      // Arrows round each disc for the way it turns, and labels.
      const drivenTurn = turnArrow(d.r + 0.14, palette.dataMark), passiveTurn = turnArrow(p.r + 0.14, palette.accent);
      drivenTurn.group.position.set(d.x - 0.12, axisY, 0);
      passiveTurn.group.position.set(p.x + 0.16, axisY, 0);
      const drivenLabel = label('driven (motor)', palette.dataMark, 0.2), passiveLabel = label('passive (free to turn)', palette.accent, 0.2), gapLabel = label('air gap only', palette.text2, 0.18);
      drivenLabel.position.set(-0.95, axisY + d.r + 0.3, 0);
      passiveLabel.position.set(0.75, axisY + p.r + 0.22, 0);
      gapLabel.position.set(d.x + d.t / 2 + DISCS.gap / 2, 0.3, 0.75);
      const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(d.x + d.t / 2 + DISCS.gap / 2, 0.38, 0.72), new THREE.Vector3(d.x + d.t / 2 + DISCS.gap / 2, axisY - d.r * 0.4, d.r * 0.55)]), new THREE.LineBasicMaterial({ color: palette.text3 }));
      scene.add(drivenTurn.group, passiveTurn.group, drivenLabel, passiveLabel, gapLabel, leader);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = false; // the mouse wheel scrolls the book, as everywhere else on the page
      // A vertical swipe scrolls the page, as the wheel does; a sideways one turns the view.
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      controls.maxPolarAngle = Math.PI / 2 - 0.04; // never look from under the base
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      // From in front and a little to the right, like the photograph, so both discs and the gap between them show.
      const view = () => { camera.position.set(1.9, 2.2, 4.9); controls.target.set(-0.3, 0.95, 0); camera.lookAt(-0.3, 0.95, 0); controls.update(); draw(); };
      const resize = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        draw();
      });
      resize.observe(el);

      const still = (v: number) => (Math.abs(v) < 0.03 ? 0 : Math.sign(v));
      // The arrows' opacity eases to its target over 350 ms, as the flat figures' arrows do (none with reduced motion).
      const arrowMaterials = [drivenTurn.material, passiveTurn.material];
      let shown = runningNow.current ? 0 : 1, frame = 0;
      for (const m of arrowMaterials) m.opacity = shown;
      const quiet = (on: boolean) => {
        cancelAnimationFrame(frame);
        const target = on ? 0 : 1, from = shown, start = performance.now();
        const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const step = (now: number) => {
          const k = instant ? 1 : Math.min(1, (now - start) / 350);
          shown = from + (target - from) * k;
          for (const m of arrowMaterials) m.opacity = shown;
          draw();
          if (k < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      };
      api.current = {
        view,
        quiet,
        update(s) {
          drivenDisc.rotation.x = (s.drivenAngle * Math.PI) / 180;
          passiveDisc.rotation.x = (s.passiveAngle * Math.PI) / 180;
          drivenTurn.set(still(s.driven));
          passiveTurn.set(still(s.passive));
          draw();
        },
      };
      view();
      api.current.update(state);
      return () => {
        cancelAnimationFrame(frame);
        api.current = null;
        resize.disconnect();
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        controls.dispose();
        renderer.dispose();
        disposeAll(scene);
        renderer.domElement.remove();
      };
    } catch {
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
      renderer.domElement.remove();
      onFail();
      return undefined;
    }
    // The scene is built once; `state` changes go through `api`.
  }, [onFail]);

  useEffect(() => { api.current?.update(state); }, [state]);
  useEffect(() => { api.current?.view(); }, [state.reset]);
  useEffect(() => { api.current?.quiet(running); }, [running]);

  return <div ref={host} className="bk-stage-3d" style={{ aspectRatio: '720 / 360' }} role="img" aria-label={description}/>;
}
