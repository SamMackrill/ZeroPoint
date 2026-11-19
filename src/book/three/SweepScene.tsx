// Figure 7-5 in three dimensions: a charge moving across a plane into a field of zeptons spinning in that same plane,
// and swept aside in it; the magnetic field stands at right angles to the plane, down for a clockwise spin. Loaded on
// demand, and drawn only when something changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';
import { disposeAll, label, releaseControls, solidArrow, turnWithKeys } from './common';

/** Where the reader looks from: turned to show the plane, or straight down on it, as the page prints it. */
export type SweepView = 'turned' | 'above';

/** What the scene shows at a moment. Positions are on the plane, as [x, z]: x across, z toward the reader. */
export interface SweepState {
  /** The charge's path, and where it is now. */
  path: readonly [number, number][];
  at: [number, number];
  positive: boolean;
  /** Clockwise as seen from above. */
  clockwise: boolean;
  /** The angle the zeptons have turned through, in degrees, and how strongly the field is drawn (0 to 1). */
  spin: number;
  strength: number;
  view: SweepView;
  /** Draw the layers of the field above and below the plane of motion too. */
  layers: boolean;
  reset?: number;
}

/** The field region on the plane and the zeptons' places in it, as [x, z]. */
export const SWEEP_REGION = { x0: -5.4, x1: 5.4, z0: -3, z1: 1.65 };
const ZEPTONS = Array.from({ length: 4 }, (_, r) => Array.from({ length: 8 }, (_, c) => [-4.65 + c * 1.33, -2.4 + r * 1.1] as [number, number])).flat();
/** The layers of zeptons: the plane of motion, and two above and two below it, fainter with distance. */
const LAYERS = [{ y: 0, weight: 1 }, { y: 0.9, weight: 0.42 }, { y: -0.9, weight: 0.42 }, { y: 1.8, weight: 0.2 }, { y: -1.8, weight: 0.2 }];
const CAMERA: Record<SweepView, [number, number, number]> = { turned: [3.4, 6.2, 9.6], above: [0, 12.5, 0.01] };

/** The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat page instead. */
export default function SweepScene({ state, onFail, description }: { state: SweepState; onFail(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update(s: SweepState): void; view(v: SweepView): void } | null>(null);

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
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 720 / 400, 0.1, 100);
      undo.push(() => disposeAll(scene));
      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(3, 8, 6);
      scene.add(key);

      // The plane of motion, and the region of it where the field is: a faint sheet and its outline.
      const { x0, x1, z0, z1 } = SWEEP_REGION;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(13, 9.5), new THREE.MeshBasicMaterial({ color: palette.bg2, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(0, -0.02, -0.4);
      const regionMaterial = new THREE.MeshBasicMaterial({ color: palette.dataB, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
      const region = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), regionMaterial);
      region.rotation.x = -Math.PI / 2;
      region.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => new THREE.Vector3(x, 0.01, z))), new THREE.LineBasicMaterial({ color: palette.dataB, transparent: true, opacity: 0.5 }));
      scene.add(plane, region, edge);

      // The zeptons: dipoles that spin about the upright, each in a plane parallel to the motion. The layer in the
      // charge's own plane is drawn fully; layers above and below, fainter with distance and shifted half a cell so they
      // do not stack in the view from above, show that the field fills the space round the path.
      const sphere = new THREE.SphereGeometry(0.11, 16, 10), rod = new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8);
      const layerSets = LAYERS.map(({ y, weight }, k) => {
        const posM = new THREE.MeshStandardMaterial({ color: palette.dataPos, roughness: 0.45, transparent: true }), negM = new THREE.MeshStandardMaterial({ color: palette.dataNeg, roughness: 0.45, transparent: true });
        const rodM = new THREE.MeshStandardMaterial({ color: palette.text3, transparent: true });
        // Seen from above, no layer next to the plane sits on the plane's zeptons or on the other's: the one above is
        // shifted half a cell in both directions, the one below half a cell along z only (x and z grids are 1.33 and
        // 1.1 apart, so these differ modulo the grid). The outer two line up with the plane, behind the nearer layers.
        const shift = y === 0.9 ? [0.665, 0.55] : y === -0.9 ? [0, 0.55] : [0, 0];
        const zeptons = ZEPTONS.map(([x, z], i) => {
          const g = new THREE.Group(), p = new THREE.Mesh(sphere, posM), n = new THREE.Mesh(sphere, negM), r = new THREE.Mesh(rod, rodM);
          p.position.x = 0.25;
          n.position.x = -0.25;
          r.rotation.z = Math.PI / 2;
          g.add(r, p, n);
          g.position.set(x + shift[0], 0.12 + y, z + shift[1]);
          scene.add(g);
          return { g, phase: ((i * 47 + k * 113) * Math.PI) / 180 };
        });
        return { zeptons, materials: [posM, negM, rodM], weight, main: y === 0 };
      });

      // The magnetic field: upright arrows through the plane, down for a clockwise spin seen from above.
      const fieldArrows = [[-3.8, -2.2], [3.8, -2.2], [-3.8, 0.9], [3.8, 0.9]].map(([x, z]) => { const a = solidArrow(palette.dataBHi); scene.add(a.group); return { a, x, z }; });
      const bLabel = label('B', palette.dataBHi, 0.5);
      scene.add(bLabel);

      // The charge and its path, lying on the plane.
      const pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: palette.dataMark, dashSize: 0.18, gapSize: 0.12 }));
      scene.add(pathLine);
      const chargeMaterial = new THREE.MeshStandardMaterial({ color: palette.dataPos, roughness: 0.4 });
      const charge = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), chargeMaterial);
      const plus = label('+', palette.bg0, 0.36), minus = label('−', palette.bg0, 0.36);
      plus.renderOrder = minus.renderOrder = 3;
      scene.add(charge, plus, minus);

      const controls = new OrbitControls(camera, renderer.domElement);

      undo.push(releaseControls(controls, renderer.domElement));
      undo.push(turnWithKeys(el, camera, controls, () => draw()));
      controls.enablePan = false;
      controls.enableZoom = false; // the mouse wheel scrolls the book, as everywhere else on the page
      // A vertical swipe scrolls the page, as the wheel does; a sideways one turns the view.
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      const view = (v: SweepView) => { camera.position.set(...CAMERA[v]); controls.target.set(0, 0, -0.6); camera.lookAt(0, 0, -0.6); controls.update(); draw(); };
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

      let drawnPath: readonly [number, number][] | null = null;
      api.current = {
        view,
        update(s) {
          // Clockwise from above is a negative turn about the upright.
          const turn = ((s.clockwise ? -1 : 1) * s.spin * Math.PI) / 180, fade = 0.35 + 0.65 * s.strength;
          for (const set of layerSets) {
            const shown = set.main || s.layers;
            set.zeptons.forEach(z => { z.g.visible = shown; z.g.rotation.y = turn + z.phase; });
            for (const m of set.materials) m.opacity = fade * set.weight;
          }
          regionMaterial.opacity = 0.04 + 0.08 * s.strength;
          const down = s.clockwise ? -1 : 1, length = (s.layers ? 3.4 : 1.2) + 0.9 * s.strength; // through every layer drawn
          for (const f of fieldArrows) f.a.set(new THREE.Vector3(f.x, -down * length / 2, f.z), new THREE.Vector3(0, down, 0), length);
          bLabel.position.set(4.25, down * (length / 2) + 0.25 * down, -2.2);
          if (s.path !== drawnPath) {
            pathLine.geometry.dispose();
            pathLine.geometry = new THREE.BufferGeometry().setFromPoints(s.path.map(([x, z]) => new THREE.Vector3(x, 0.02, z)));
            pathLine.computeLineDistances();
            drawnPath = s.path;
          }
          chargeMaterial.color.set(s.positive ? palette.dataPos : palette.dataNeg);
          charge.position.set(s.at[0], 0.2, s.at[1]);
          plus.visible = s.positive;
          minus.visible = !s.positive;
          plus.position.copy(charge.position);
          minus.position.copy(charge.position);
          draw();
        },
      };
      view(state.view);
      api.current.update(state);
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
  useEffect(() => { api.current?.view(state.view); }, [state.view, state.reset]);

  return <div ref={host} className="bk-stage-3d" style={{ aspectRatio: '720 / 400' }} role="img" aria-label={`${description} With the figure focused, the arrow keys turn it too.`}/>;
}
