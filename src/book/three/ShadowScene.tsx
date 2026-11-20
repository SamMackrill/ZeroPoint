// Figures 17-2, 18-2 and 25-2 in three dimensions: the second body seen from the centre of the first fills a cone, and
// where that cone meets the first body's surface is the "shadow": a cap on the sphere, facing the second. As the second
// moves away the cone narrows and the cap shrinks, as the inverse square. For Figure 25-2 the bodies are particles drawn
// as open rhombic triacontahedra, so the shadow can be set against the openings in the frame. Loaded on demand, and drawn
// only when something changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';
import { disposeAll, label, releaseControls, turnWithKeys } from './common';
import { STAR1_R, tangentCone } from './shadow-math';

/** An open frame to draw a body as: its vertices on a sphere of radius 1, and the struts between them, as index pairs. */
export interface Cage { points: readonly (readonly [number, number, number])[]; edges: readonly (readonly [number, number])[] }

/**
 * The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat page instead.
 * `names` labels the two bodies (none if empty); `cage` draws them as open frames on faint spheres instead of solid stars.
 */
export default function ShadowScene({ distance, size, onFail, onReady, description, names = ['Star 1', 'Star 2'], cage }: { distance: number; size: number; onFail(): void; onReady?(): void; description: string; names?: readonly string[]; cage?: Cage }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<((d: number, s: number) => void) | null>(null);

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
    // If the browser takes the drawing context away (a GPU reset, too many contexts), fall back to the flat view.
    const lost = (e: Event) => { e.preventDefault(); onFail(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    // Everything set up is undone in reverse, the same way on unmount and when setup fails part way.
    const undo: (() => void)[] = [() => renderer.domElement.remove(), () => renderer.dispose(), () => renderer.domElement.removeEventListener('webglcontextlost', lost)];
    const teardown = () => { api.current = null; while (undo.length) { try { undo.pop()!(); } catch { /* keep releasing the rest */ } } };
    try {
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 720 / 330, 0.1, 100);
      undo.push(() => disposeAll(scene));
      scene.add(new THREE.AmbientLight(0xffffff, 1.1));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(-3, 5, 6);
      scene.add(key);

      // The two bodies: plain stars as in the printed figure, or open frames on faint spheres.
      const starMaterial = cage
        ? new THREE.MeshStandardMaterial({ color: palette.text4, roughness: 0.9, transparent: true, opacity: 0.12, depthWrite: false })
        : new THREE.MeshStandardMaterial({ color: palette.text4, roughness: 0.75 });
      const star1 = new THREE.Mesh(new THREE.SphereGeometry(STAR1_R, 64, 40), starMaterial);
      const star2 = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), starMaterial);
      scene.add(star1, star2);
      if (cage) {
        // Struts along each edge of the frame, turned a little so the frame is seen at an angle, as photographed.
        const strut = new THREE.MeshStandardMaterial({ color: palette.text3, roughness: 0.5 }), turn = new THREE.Euler(0.4, 0.5, 0.2);
        const frame = (radius: number) => {
          const group = new THREE.Group(), at = cage.points.map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(radius).applyEuler(turn));
          for (const [i, j] of cage.edges) {
            const a = at[i], b = at[j], length = a.distanceTo(b), rod = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.04, radius * 0.04, length, 8), strut);
            rod.position.copy(a).add(b).multiplyScalar(0.5);
            rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
            group.add(rod);
          }
          return group;
        };
        star1.add(frame(STAR1_R));
        star2.add(frame(1));
      }
      const name1 = label(names[0] ?? '', palette.text, 0.36), name2 = label(names[1] ?? '', palette.text, 0.36);
      if (names[0]) scene.add(name1);
      if (names[1]) scene.add(name2);
      name1.position.set(-0.4, -STAR1_R - 0.45, 0);

      // The cone from Star 1's centre to Star 2's edges: a faint surface and four lines along it.
      const coneMaterial = new THREE.MeshBasicMaterial({ color: palette.dataMark, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
      const lineMaterial = new THREE.LineBasicMaterial({ color: palette.dataMark, transparent: true, opacity: 0.8 });
      // The shadow: a cap on Star 1's surface, lifted just off it, facing Star 2 (along +x).
      const capMaterial = new THREE.MeshBasicMaterial({ color: palette.dataMark, side: THREE.DoubleSide });
      let cone = new THREE.Mesh(new THREE.BufferGeometry(), coneMaterial), cap = new THREE.Mesh(new THREE.BufferGeometry(), capMaterial);
      const lines = new THREE.Group();
      scene.add(cone, cap, lines);
      const toX = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
      const apexToOrigin = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0));

      const controls = new OrbitControls(camera, renderer.domElement);
      undo.push(releaseControls(controls, renderer.domElement));
      undo.push(turnWithKeys(el, camera, controls, () => draw()));
      controls.enablePan = false;
      controls.enableZoom = false; // the mouse wheel scrolls the book, as everywhere else on the page
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      // From over Star 2's shoulder, looking back at Star 1, so the shadow on Star 1 faces the reader. When Star 2 is moved
      // or resized the view keeps whatever angle the reader has turned it to, and stands back far enough to keep both stars
      // and their labels clear of the viewport edges from any orbit angle.
      const frame = (d: number, s: number) => new THREE.Vector3(0.65 * d + 2.8 + 2.2 * s, 2.4 + 0.4 * s, 5.2 + 1.8 * s);
      controls.target.set(distance * 0.45, 0, 0);
      camera.position.copy(controls.target).add(frame(distance, size));
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

      api.current = (d, s) => {
        const direction = camera.position.clone().sub(controls.target).normalize();
        controls.target.set(d * 0.45, 0, 0);
        camera.position.copy(controls.target).add(direction.multiplyScalar(frame(d, s).length()));
        camera.lookAt(controls.target);
        controls.update();
        star2.position.set(d, 0, 0);
        star2.scale.setScalar(s);
        name2.position.set(d, s + 0.5, 0);
        const { along, radius, half } = tangentCone(d, s);
        scene.remove(cone, cap);
        cone.geometry.dispose();
        cap.geometry.dispose();
        cone = new THREE.Mesh(new THREE.ConeGeometry(radius, along, 64, 1, true), coneMaterial);
        cone.quaternion.copy(apexToOrigin);
        cone.position.set(along / 2, 0, 0);
        cap = new THREE.Mesh(new THREE.SphereGeometry(STAR1_R * 1.006, 64, 16, 0, 2 * Math.PI, 0, Math.max(half, 0.004)), capMaterial);
        cap.quaternion.copy(toX);
        scene.add(cone, cap);
        lines.children.forEach(l => (l as THREE.Line).geometry.dispose());
        lines.clear();
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * 2 * Math.PI, edge = new THREE.Vector3(along, radius * Math.cos(a), radius * Math.sin(a));
          // Each line starts where it leaves Star 1, at the edge of the shadow, and runs to where it touches Star 2.
          lines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([edge.clone().setLength(STAR1_R * 1.006), edge]), lineMaterial));
        }
        draw();
      };
      api.current(distance, size);
      onReady?.();
      return teardown;
    } catch (error) {
      console.error('A 3D figure failed to set up; showing its flat drawing instead.', error);
      teardown();
      onFail();
      return undefined;
    }
  }, [onFail]);

  useEffect(() => { api.current?.(distance, size); }, [distance, size]);

  return <div ref={host} className="bk-stage-3d" role="img" aria-label={`${description} With the figure focused, the arrow keys turn it too.`}/>;
}
