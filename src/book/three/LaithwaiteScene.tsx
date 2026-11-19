// Laithwaite's flywheel in three dimensions, for chapter 9's explorer: a stand with a shaft pivoted at its top and a
// heavy flywheel on the shaft's end. Spinning, the flywheel holds its height and precesses round the stand; pushed along
// the precession it rises to level; still, or locked so it cannot tilt, it falls. Loaded on demand; drawn when something
// changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';
import { disposeAll, label, releaseControls, solidArrow, turnWithKeys } from './common';

/** What the scene shows at a moment. Angles in degrees: the shaft's tilt from level (negative is down), how far it has gone round the stand, and the flywheel's turn about the shaft. */
export interface LaithwaiteState { lift: number; turn: number; spin: number; rising: boolean }

/** The stand's height to the pivot, the shaft's length and the flywheel's radius, in scene units. */
const PIVOT_Y = 3.4, SHAFT = 2.4, WHEEL_R = 0.8;

/** The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat drawing instead. */
export default function LaithwaiteScene({ state, onFail, description }: { state: LaithwaiteState; onFail(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<((s: LaithwaiteState) => void) | null>(null);

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
    Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
    el.appendChild(renderer.domElement);
    const lost = (e: Event) => { e.preventDefault(); onFail(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const undo: (() => void)[] = [() => renderer.domElement.remove(), () => renderer.dispose(), () => renderer.domElement.removeEventListener('webglcontextlost', lost)];
    const teardown = () => { api.current = null; while (undo.length) { try { undo.pop()!(); } catch { /* keep releasing the rest */ } } };
    try {
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 720 / 380, 0.1, 100);
      undo.push(() => disposeAll(scene));
      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(4, 7, 6);
      scene.add(key);

      // The floor, the stand and the pivot at its top.
      const metal = new THREE.MeshStandardMaterial({ color: palette.text3, roughness: 0.45, metalness: 0.3 });
      const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshStandardMaterial({ color: palette.bg2, roughness: 0.95 }));
      floor.rotation.x = -Math.PI / 2;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.14, 40), metal);
      base.position.y = 0.07;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, PIVOT_Y, 20), metal);
      post.position.y = PIVOT_Y / 2;
      const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshStandardMaterial({ color: palette.dataMark, roughness: 0.4 }));
      pivot.position.y = PIVOT_Y;
      const pivotLabel = label('pivot', palette.text2, 0.26);
      pivotLabel.position.set(-0.45, PIVOT_Y + 0.25, 0);
      scene.add(floor, base, post, pivot, pivotLabel);

      // The shaft and the flywheel on its end. The arm turns round the stand and tilts; the wheel spins about the shaft.
      const arm = new THREE.Group(), tilt = new THREE.Group();
      arm.position.y = PIVOT_Y;
      arm.add(tilt);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, SHAFT, 16), metal);
      shaft.rotation.z = -Math.PI / 2;
      shaft.position.x = SHAFT / 2;
      const wheel = new THREE.Group();
      wheel.position.x = SHAFT;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.16, 64), new THREE.MeshStandardMaterial({ color: palette.dataMarkLo, roughness: 0.5, metalness: 0.2 }));
      disc.rotation.z = Math.PI / 2;
      // Dark spokes on the face, so the spin can be seen.
      const spokes = new THREE.Group(), ink = new THREE.MeshStandardMaterial({ color: palette.dataMarkDeep, roughness: 0.7 });
      for (let k = 0; k < 4; k++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, WHEEL_R * 0.85, 0.07), ink);
        spoke.position.set(0.09, (WHEEL_R * 0.85) / 2 + 0.12, 0);
        const holder = new THREE.Group();
        holder.rotation.x = (k * Math.PI) / 2;
        holder.add(spoke);
        const holder2 = holder.clone();
        holder2.position.x = -0.18;
        spokes.add(holder, holder2);
      }
      wheel.add(disc, spokes);
      tilt.add(shaft, wheel);
      scene.add(arm);

      // Its weight, pulling down from the flywheel, and the upward push while it rises; the circle it is going round.
      const weight = solidArrow(palette.text), rise = solidArrow(palette.accent);
      scene.add(weight.group, rise.group);
      let ring = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: palette.text3, dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0.7 }));
      scene.add(ring);
      const weightLabel = label('weight', palette.text, 0.24);
      scene.add(weightLabel);

      const controls = new OrbitControls(camera, renderer.domElement);
      undo.push(releaseControls(controls, renderer.domElement));
      undo.push(turnWithKeys(el, camera, controls, () => draw()));
      controls.enablePan = false;
      controls.enableZoom = false;
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      controls.target.set(0, 2.1, 0);
      camera.position.set(6.4, 5.4, 8.6);
      camera.lookAt(controls.target);
      controls.update();
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

      let ringAt = '';
      api.current = s => {
        const lift = (s.lift * Math.PI) / 180, turn = (s.turn * Math.PI) / 180;
        arm.rotation.y = turn;
        tilt.rotation.z = lift;
        wheel.rotation.x = (s.spin * Math.PI) / 180;
        // Where the flywheel's centre is, for its arrows and the circle it goes round.
        const reach = SHAFT * Math.cos(lift), height = PIVOT_Y + SHAFT * Math.sin(lift);
        const centre = new THREE.Vector3(reach * Math.cos(turn), height, -reach * Math.sin(turn));
        // The weight hangs from just below the wheel's lowest point, and stops short of the floor however far it has fallen.
        const rimBelow = WHEEL_R * Math.cos(lift), from = centre.clone().add(new THREE.Vector3(0, -rimBelow - 0.1, 0)), drop = Math.max(0.3, Math.min(0.8, from.y - 0.08));
        weight.set(from, new THREE.Vector3(0, -1, 0), drop);
        weightLabel.position.copy(from).add(new THREE.Vector3(0.45, -drop / 2, 0));
        rise.group.visible = s.rising;
        if (s.rising) rise.set(centre.clone().add(new THREE.Vector3(0, WHEEL_R * Math.cos(lift) + 0.1, 0)), new THREE.Vector3(0, 1, 0), 0.7);
        const key = `${reach.toFixed(3)}|${height.toFixed(3)}`;
        if (key !== ringAt) {
          ringAt = key;
          ring.geometry.dispose();
          scene.remove(ring);
          ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 97 }, (_, i) => new THREE.Vector3(reach * Math.cos((i / 96) * 2 * Math.PI), height, reach * Math.sin((i / 96) * 2 * Math.PI)))), ring.material);
          ring.computeLineDistances();
          scene.add(ring);
        }
        draw();
      };
      api.current(state);
      return teardown;
    } catch (error) {
      console.error('A 3D figure failed to set up; showing its flat drawing instead.', error);
      teardown();
      onFail();
      return undefined;
    }
  }, [onFail]);

  useEffect(() => { api.current?.(state); }, [state]);

  return <div ref={host} className="bk-stage-3d" role="img" aria-label={`${description} With the figure focused, the arrow keys turn it too.`}/>;
}
