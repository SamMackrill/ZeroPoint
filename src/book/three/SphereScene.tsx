// Figure 6-4 in three dimensions: field lines coming in from every direction to a charge, and a sphere round it that
// every line crosses. As the sphere grows, the crossings spread over its area, 4πr², and a patch of fixed area holds
// fewer of them: the inverse square. Loaded on demand, and drawn only when something changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';
import { disposeAll, label, releaseControls, turnWithKeys } from './common';
import { SPHERE_LINES, SPHERE_R_MAX, evenDirections, patchAngle } from './sphere-math';

/** Where the patch sits: a direction facing the default view, so the reader sees it from the start. */
const PATCH_AT = new THREE.Vector3(0.62, 0.45, 0.64).normalize();

/** The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat page instead. */
export default function SphereScene({ radius, onFail, onReady, description }: { radius: number; onFail(): void; onReady?(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<((r: number) => void) | null>(null);

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
    // Build the scene; if anything fails part way, undo what was set up and show the flat view instead.
    try {
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 720 / 330, 0.1, 100);
      undo.push(() => disposeAll(scene));
      scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(4, 6, 7);
      scene.add(key);

      // The charge, and the lines coming in to it from every direction, each with its arrowhead near the charge.
      const charge = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), new THREE.MeshStandardMaterial({ color: palette.dataNeg, roughness: 0.45 }));
      const minus = label('−', palette.bg0, 0.4);
      minus.renderOrder = 3;
      scene.add(charge, minus);
      const directions = evenDirections(SPHERE_LINES).map(([x, y, z]) => new THREE.Vector3(x, y, z)), outer = SPHERE_R_MAX + 0.45, inner = 0.34;
      const lineMaterial = new THREE.LineBasicMaterial({ color: palette.dataE, transparent: true, opacity: 0.85 });
      const headGeometry = new THREE.ConeGeometry(0.06, 0.18, 12), headMaterial = new THREE.MeshBasicMaterial({ color: palette.dataE });
      for (const d of directions) {
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([d.clone().multiplyScalar(outer), d.clone().multiplyScalar(inner + 0.12)]), lineMaterial));
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.copy(d.clone().multiplyScalar(inner + 0.09));
        head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate());
        scene.add(head);
      }

      // The sphere: a translucent shell, with a dot where each line crosses it.
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ color: palette.dataMark, transparent: true, opacity: 0.13, roughness: 0.9, depthWrite: false }));
      // Three faint great circles give the shell its shape without a busy mesh.
      const rim = new THREE.Group(), ringMaterial = new THREE.LineBasicMaterial({ color: palette.dataMark, transparent: true, opacity: 0.35 });
      const ring = Array.from({ length: 97 }, (_, i) => new THREE.Vector3(Math.cos((i / 96) * 2 * Math.PI), 0, Math.sin((i / 96) * 2 * Math.PI)));
      for (const [x, z] of [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 2]]) {
        const loop = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), ringMaterial);
        loop.rotation.set(x, 0, z);
        rim.add(loop);
      }
      scene.add(shell, rim);
      const dotGeometry = new THREE.SphereGeometry(0.055, 16, 10);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: palette.dataMark }), inPatchMaterial = new THREE.MeshBasicMaterial({ color: palette.dataMarkHi });
      const dots = directions.map(() => { const dot = new THREE.Mesh(dotGeometry, dotMaterial); scene.add(dot); return dot; });

      // The patch of fixed area on the sphere's surface: a cap that narrows as the sphere grows.
      const patchMaterial = new THREE.MeshBasicMaterial({ color: palette.dataMark, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
      let patch = new THREE.Mesh(new THREE.BufferGeometry(), patchMaterial);
      scene.add(patch);
      const patchLabel = label('fixed area', palette.dataMarkHi, 0.3);
      scene.add(patchLabel);

      const controls = new OrbitControls(camera, renderer.domElement);

      undo.push(releaseControls(controls, renderer.domElement));
      undo.push(turnWithKeys(el, camera, controls, () => draw()));
      controls.enablePan = false;
      controls.enableZoom = false; // the mouse wheel scrolls the book, as everywhere else on the page
      // A vertical swipe scrolls the page, as the wheel does; a sideways one turns the view.
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      camera.position.set(6.4, 4.2, 9.6);
      camera.lookAt(0, 0, 0);
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

      api.current = r => {
        shell.scale.setScalar(r);
        rim.scale.setScalar(r);
        const theta = patchAngle(r), cosTheta = Math.cos(theta);
        directions.forEach((d, i) => {
          dots[i].position.copy(d.clone().multiplyScalar(r));
          dots[i].material = d.dot(PATCH_AT) >= cosTheta ? inPatchMaterial : dotMaterial;
        });
        // A cap of half-angle θ about +y, lifted just off the shell and turned to face the patch's direction.
        scene.remove(patch);
        patch.geometry.dispose();
        patch = new THREE.Mesh(new THREE.SphereGeometry(r * 1.004, 48, 12, 0, 2 * Math.PI, 0, theta), patchMaterial);
        patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), PATCH_AT);
        scene.add(patch);
        patchLabel.position.copy(PATCH_AT.clone().multiplyScalar(r + 0.38));
        draw();
      };
      api.current(radius);
      onReady?.();
      return teardown;
    } catch (error) {
      console.error('A 3D figure failed to set up; showing its flat drawing instead.', error);
      teardown();
      onFail();
      return undefined;
    }
  }, [onFail]);

  useEffect(() => { api.current?.(radius); }, [radius]);

  return <div ref={host} className="bk-stage-3d" role="img" aria-label={`${description} With the figure focused, the arrow keys turn it too.`}/>;
}
