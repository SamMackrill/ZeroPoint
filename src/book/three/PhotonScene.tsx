// Figure 19-2 in three dimensions: a much simplified form of the laboratory's light scene. A photon travels along x as a
// sequence of central zeptons, a new one each half wavelength, each turning in its brief life; its electric and magnetic
// fields trail behind at right angles to each other and to the path. A sphere round the central zepton shows how far its
// field gets in its lifetime, against half a wavelength, the reach at the speed of light. Loaded on demand; drawn when
// something changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';
import { disposeAll, label, releaseControls, solidArrow, turnWithKeys } from './common';
import { PATH_SITES, PATH_START } from './photon-math';

/**
 * What the scene draws at a moment: the central zepton's angle and opening, where it sits and how far the photon's front has got along x, and how far its field reaches (wavelengths).
 */
export interface PhotonFrame { central: number; open: number; x: number; front: number; reach: number; waveSign?: 1 | -1 }

/** A zepton: a bar with a positive and a negative end, starting along x and turned in the x-y plane about z (so E lies along y and B along z). */
function zepton(length: number, ball: number, materials: { bar: THREE.Material; pos: THREE.Material; neg: THREE.Material }) {
  const group = new THREE.Group(), inner = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(ball * 0.32, ball * 0.32, length, 8), materials.bar);
  rod.rotation.z = Math.PI / 2;
  const plus = new THREE.Mesh(new THREE.SphereGeometry(ball, 14, 10), materials.pos), minus = new THREE.Mesh(new THREE.SphereGeometry(ball, 14, 10), materials.neg);
  plus.position.x = length / 2;
  minus.position.x = -length / 2;
  inner.add(rod, plus, minus);
  group.add(inner);
  return {
    group,
    set(angle: number, open: number, look?: { bar: THREE.Material; pos: THREE.Material; neg: THREE.Material }) {
      const o = Math.max(0.2, open);
      group.rotation.z = angle;
      inner.scale.set(o, 1, 1);
      // Undo the squash on the balls, along the bar only, so they stay round as the zepton opens and closes.
      plus.scale.set(1 / o, 1, 1);
      minus.scale.set(1 / o, 1, 1);
      if (look) { rod.material = look.bar; plus.material = look.pos; minus.material = look.neg; }
    },
  };
}

/** The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat page instead. */
export default function PhotonScene({ frame, onFail, onReady, description }: { frame: PhotonFrame; onFail(): void; onReady?(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<((f: PhotonFrame) => void) | null>(null);

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
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(4, 6, 7);
      scene.add(key);

      // The axes, as in the printed figure, small and to one side: x, the photon's direction, in its colour.
      const corner = new THREE.Vector3(PATH_START - 1.1, -2.1, 0);
      for (const [dir, name] of [[new THREE.Vector3(1, 0, 0), 'x'], [new THREE.Vector3(0, 1, 0), 'y'], [new THREE.Vector3(0, 0, 1), 'z']] as const) {
        const arrow = solidArrow(name === 'x' ? palette.dataMark : palette.text3);
        arrow.set(corner, dir, 0.95);
        const tag = label(name, name === 'x' ? palette.dataMark : palette.text, 0.34);
        tag.position.copy(corner.clone().add(dir.clone().multiplyScalar(1.22)));
        scene.add(arrow.group, tag);
      }

      // The path: dashed along x, with a small dot where each central zepton sits (the middle of each half wavelength).
      const end = PATH_START + 0.5 * PATH_SITES;
      const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(PATH_START - 0.4, 0, 0), new THREE.Vector3(end + 0.4, 0, 0)]), new THREE.LineDashedMaterial({ color: palette.text3, dashSize: 0.08, gapSize: 0.08 }));
      path.computeLineDistances();
      scene.add(path);
      const siteDot = new THREE.SphereGeometry(0.035, 10, 8), siteMaterial = new THREE.MeshBasicMaterial({ color: palette.text3 });
      for (let i = 0; i < PATH_SITES; i++) { const dot = new THREE.Mesh(siteDot, siteMaterial); dot.position.x = PATH_START + 0.5 * (i + 0.5); scene.add(dot); }

      // The central zepton: an electron and a positron, as in the laboratory.
      const centre = zepton(0.6, 0.1, { bar: new THREE.MeshStandardMaterial({ color: palette.text, roughness: 0.4 }), pos: new THREE.MeshStandardMaterial({ color: palette.dataPos, roughness: 0.5 }), neg: new THREE.MeshStandardMaterial({ color: palette.dataNeg, roughness: 0.5 }) });
      scene.add(centre.group);

      // The fields the photon leaves behind it: electric in the x-y plane, magnetic in the x-z plane.
      const waveE = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: palette.dataE }));
      const waveB = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: palette.dataB }));
      scene.add(waveE, waveB);
      // How far the field gets in the central zepton's life (a sphere), and half a wavelength, the reach at c (a red ring).
      const reachSphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: palette.dataE, transparent: true, opacity: 0.13, roughness: 0.9, depthWrite: false }));
      const half = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 65 }, (_, i) => new THREE.Vector3(0, 0.5 * Math.cos((i / 64) * 2 * Math.PI), 0.5 * Math.sin((i / 64) * 2 * Math.PI)))), new THREE.LineDashedMaterial({ color: palette.danger, dashSize: 0.05, gapSize: 0.04 }));
      half.computeLineDistances();
      scene.add(reachSphere, half);

      const controls = new OrbitControls(camera, renderer.domElement);
      undo.push(releaseControls(controls, renderer.domElement));
      undo.push(turnWithKeys(el, camera, controls, () => draw()));
      controls.enablePan = false;
      controls.enableZoom = false;
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      // From in front and a little above, the path running across the picture, as in the laboratory.
      controls.target.set(0, 0, 0);
      camera.position.set(0.9, 2.5, 7.4);
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

      api.current = f => {
        centre.group.position.x = f.x;
        centre.set(f.central, f.open);
        // The waves trail from PATH_START to the photon's front, anchored to the sites so each half-wave crest aligns with the
        // central zepton at its midpoint, flipping sign via `waveSign` when an odd-length path wraps.
        const sign = f.waveSign ?? 1;
        const points = (plane: 'y' | 'z') => {
          const from = PATH_START, span = Math.max(0.05, f.front - from), n = Math.max(2, Math.round(span * 40));
          return Array.from({ length: n + 1 }, (_, i) => {
            const x = from + (span * i) / n, s = 0.55 * sign * Math.sin(2 * Math.PI * (x - PATH_START));
            return new THREE.Vector3(x, plane === 'y' ? s : 0, plane === 'z' ? -s : 0);
          });
        };
        waveE.geometry.dispose(); waveE.geometry = new THREE.BufferGeometry().setFromPoints(points('y'));
        waveB.geometry.dispose(); waveB.geometry = new THREE.BufferGeometry().setFromPoints(points('z'));
        // Past the picture's size the sphere and the half-wavelength ring are drawn to a smaller common scale, so the ring
        // shrinks within the sphere and their ratio, the speed in units of c, stays true.
        const k = Math.min(1, 2.6 / f.reach);
        reachSphere.position.x = f.x;
        reachSphere.scale.setScalar(f.reach * k);
        half.position.x = f.x;
        half.scale.set(1, k, k);
        draw();
      };
      api.current(frame);
      onReady?.();
      return teardown;
    } catch (error) {
      console.error('A 3D figure failed to set up; showing its flat drawing instead.', error);
      teardown();
      onFail();
      return undefined;
    }
  }, [onFail]);

  useEffect(() => { api.current?.(frame); }, [frame]);

  return <div ref={host} className="bk-stage-3d" role="img" aria-label={`${description} With the figure focused, the arrow keys turn it too.`}/>;
}
