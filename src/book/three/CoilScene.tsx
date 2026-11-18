// Figure 6-18 in three dimensions: a coil wound along x, cut away at the front to show inside, its field lines running
// through it and back round the outside, and zeptons spinning about the field: one way inside, the other outside.
// Loaded on demand, and drawn only when something changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette, scene as sceneColours } from '../../ui/palette';
import { COIL_LENGTH, COIL_PITCH, COIL_RADIUS, COIL_TURNS, COIL_ZEPTONS, FIELD_BOX, SEEDS, coilField, coilFieldLine, linesForCurrent } from './coil-math';
import { disposeAll, label, turnWithKeys } from './common';

/** What the scene shows at a moment: the current (−1 to 1, sign for direction), the clock, and whether the front is cut away. */
export interface CoilState { current: number; t: number; cutaway: boolean; zeptons: number }

/** The planes round the axis each seed's line is drawn in. */
const PLANES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

/** A point of the helix at angle θ along the wire (0 at the left end, at the top). */
const helix = (theta: number) => new THREE.Vector3(-COIL_LENGTH / 2 + (COIL_PITCH * theta) / (2 * Math.PI), COIL_RADIUS * Math.cos(theta), COIL_RADIUS * Math.sin(theta));

/** A point in a plane through the axis, at angle `a` round it, as a 3D position. */
const meridian = (x: number, rho: number, a: number) => new THREE.Vector3(x, rho * Math.cos(a), rho * Math.sin(a));

/** The field's direction at a point in 3D (for a positive current), as a unit vector. */
function fieldAt(p: THREE.Vector3) {
  const rho = Math.hypot(p.y, p.z), [bx, br] = coilField(p.x, rho);
  const out = rho > 1e-6 ? new THREE.Vector3(0, p.y / rho, p.z / rho) : new THREE.Vector3(0, 0, 0);
  return new THREE.Vector3(bx, 0, 0).addScaledVector(out, br).normalize();
}

/** The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat page instead. */
export default function CoilScene({ state, onFail, description }: { state: CoilState; onFail(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<((s: CoilState) => void) | null>(null);

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
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 720 / 380, 0.1, 100);
      undo.push(() => disposeAll(scene));
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(3, 6, 8);
      scene.add(key);

      // The wire: the whole helix, and its back half alone for the cut-away.
      const wireMaterial = new THREE.MeshStandardMaterial({ color: sceneColours.copper, emissive: sceneColours.copperGlow, roughness: 0.32, metalness: 0.55 });
      const curve = (from: number, to: number) => new THREE.CatmullRomCurve3(Array.from({ length: 41 }, (_, i) => helix(from + ((to - from) * i) / 40)));
      const whole = new THREE.Mesh(new THREE.TubeGeometry(curve(0, 2 * Math.PI * COIL_TURNS), 600, 0.075, 10), wireMaterial);
      const back = new THREE.Group();
      // The back half of each turn, from the bottom (θ = π, at z ≈ 0) round through z < 0 to the top (θ = 2π).
      for (let n = 0; n < COIL_TURNS; n++) back.add(new THREE.Mesh(new THREE.TubeGeometry(curve(2 * Math.PI * n + Math.PI, 2 * Math.PI * (n + 1)), 60, 0.075, 10), wireMaterial));
      scene.add(whole, back);

      // Markers that travel along the wire the way the current flows.
      const markerGeometry = new THREE.ConeGeometry(0.1, 0.28, 12), markerMaterial = new THREE.MeshBasicMaterial({ color: palette.dataMark });
      const markers = Array.from({ length: COIL_TURNS * 4 }, () => { const m = new THREE.Mesh(markerGeometry, markerMaterial); scene.add(m); return m; });

      // The field lines, computed once for a positive current, in four planes round the axis, plus the axis itself.
      const lineMaterial = new THREE.LineBasicMaterial({ color: palette.dataB });
      const headGeometry = new THREE.ConeGeometry(0.075, 0.22, 12), headMaterial = new THREE.MeshBasicMaterial({ color: palette.dataBHi });
      const field = new THREE.Group(), heads: { mesh: THREE.Mesh; along: THREE.Vector3 }[] = [];
      // One group for the axis, then one per seed (its line in each plane), so the current can show more or fewer.
      const groups = [[[new THREE.Vector3(-FIELD_BOX.x, 0, 0), new THREE.Vector3(FIELD_BOX.x, 0, 0)]], ...SEEDS.map(seed => {
        const line = coilFieldLine(0, seed);
        return PLANES.map(a => line.map(([x, rho]) => meridian(x, rho, a)));
      })].map(paths => { const group = new THREE.Group(); field.add(group); return { group, paths }; });
      for (const { group, paths } of groups) for (const path of paths) {
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(path), lineMaterial));
        // Two arrowheads along each line, pointing with the field.
        for (const share of path.length > 2 ? [0.3, 0.72] : [0.15, 0.85]) {
          const i = Math.min(path.length - 2, Math.floor(share * (path.length - 1)));
          const at = path.length > 2 ? path[i] : path[0].clone().lerp(path[1], share), along = path.length > 2 ? path[i + 1].clone().sub(path[i]).normalize() : new THREE.Vector3(1, 0, 0);
          const head = new THREE.Mesh(headGeometry, headMaterial);
          head.position.copy(at);
          heads.push({ mesh: head, along });
          group.add(head);
        }
      }
      scene.add(field);
      const north = label('N', palette.text, 0.55), south = label('S', palette.text, 0.55);
      scene.add(north, south);

      // The zeptons: small dipoles that spin about the field where they are.
      const sphere = new THREE.SphereGeometry(0.09, 16, 10);
      const pos = new THREE.MeshStandardMaterial({ color: palette.dataPos, roughness: 0.45 }), neg = new THREE.MeshStandardMaterial({ color: palette.dataNeg, roughness: 0.45 });
      const rodMaterial = new THREE.MeshStandardMaterial({ color: palette.text3 }), rodGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8);
      const zeptons = COIL_ZEPTONS.map(([x, rho, a]) => {
        const at = meridian(x, rho, a), axis = fieldAt(at), holder = new THREE.Group(), spinner = new THREE.Group();
        holder.position.copy(at);
        holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis); // the spinner turns about its local y: the field
        const p = new THREE.Mesh(sphere, pos), n = new THREE.Mesh(sphere, neg), rod = new THREE.Mesh(rodGeometry, rodMaterial);
        p.position.x = 0.18;
        n.position.x = -0.18;
        rod.rotation.z = Math.PI / 2;
        spinner.add(rod, p, n);
        holder.add(spinner);
        scene.add(holder);
        return { holder, spinner };
      });

      const controls = new OrbitControls(camera, renderer.domElement);

      undo.push(() => controls.dispose());
      undo.push(turnWithKeys(el, camera, controls, () => draw()));
      controls.enablePan = false;
      controls.enableZoom = false; // the mouse wheel scrolls the book, as everywhere else on the page
      // A vertical swipe scrolls the page, as the wheel does; a sideways one turns the view.
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      camera.position.set(3.1, 3.3, 8.4);
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

      const up = new THREE.Vector3(0, 1, 0);
      // The markers' and zeptons' phases build up from the time that passes at the current then set, so changing or
      // reversing the current changes how fast they go from here on, without a jump. Going back in time starts again.
      let lastT = 0, markerPhase = 0, zeptonPhase = 0;
      api.current = s => {
        const on = Math.abs(s.current) > 0.05, sense = Math.sign(s.current) || 1, dt = s.t - lastT;
        if (dt < 0) { markerPhase = sense * s.t * 2.2; zeptonPhase = s.t * 4 * s.current; } else { markerPhase += sense * dt * 2.2; zeptonPhase += dt * 4 * s.current; }
        lastT = s.t;
        whole.visible = !s.cutaway;
        back.visible = s.cutaway;
        // The current runs toward increasing θ when positive; the markers move along the wire that way.
        markers.forEach((m, i) => {
          const theta = ((i + 0.5) / markers.length) * 2 * Math.PI * COIL_TURNS + markerPhase;
          const wrapped = ((theta % (2 * Math.PI * COIL_TURNS)) + 2 * Math.PI * COIL_TURNS) % (2 * Math.PI * COIL_TURNS), here = helix(wrapped);
          m.visible = on && (!s.cutaway || here.z <= 0.02);
          m.position.copy(here);
          const tangent = helix(wrapped + 0.01).sub(here).normalize().multiplyScalar(sense);
          m.quaternion.setFromUnitVectors(up, tangent);
        });
        field.visible = north.visible = south.visible = on;
        // The axis line always, then as many seeds' lines as the current calls for: one per sixth of full current.
        const shown = linesForCurrent(s.current);
        groups.forEach((g, i) => { g.group.visible = i === 0 || i <= shown; });
        for (const h of heads) h.mesh.quaternion.setFromUnitVectors(up, h.along.clone().multiplyScalar(sense));
        north.position.set(sense * (COIL_LENGTH / 2 + 1.5), 0.4, 0);
        south.position.set(-sense * (COIL_LENGTH / 2 + 1.5), 0.4, 0);
        // Each zepton spins about the field where it is, faster for more current; reversing the current reverses them.
        zeptons.forEach((z, i) => { z.holder.visible = on && i < s.zeptons; z.spinner.rotation.y = zeptonPhase + i * 0.8; });
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
    // The scene is built once; `state` changes go through `api`.
  }, [onFail]);

  useEffect(() => { api.current?.(state); }, [state]);

  return <div ref={host} className="bk-stage-3d" style={{ aspectRatio: '720 / 400' }} role="img" aria-label={`${description} With the figure focused, the arrow keys turn it too.`}/>;
}
