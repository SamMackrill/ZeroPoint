// A top in three dimensions, for chapter 8's figures: standing on its tip on a floor, leaning, turning about its own
// axis and (for a spinning top) precessing round its tip. The centre of mass, gravity's pull from it and the path it
// follows can be shown. Loaded on demand, and drawn only when something changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';
import { disposeAll, label, solidArrow, woodTexture } from './common';
import { PROFILE, TOP_CM, TOP_LAID } from './top-math';

/** What the scene shows at a moment. Angles in degrees. */
export interface TopState {
  /** Lean of the top's axis from the upright. */
  lean: number;
  /** The direction it leans toward, round the upright (0 toward the reader's right). */
  heading: number;
  /** How far the top has turned about its own axis. */
  spun: number;
  /** The path its centre of mass follows: falling over from `from` degrees, or circling at the present lean. */
  path: { kind: 'fall'; from: number } | { kind: 'circle' } | null;
  gravity: boolean;
  /**
   * Fleming's mattermagnetic account of a spinning top (p. 80): the field B_m along the axis, toward the tip for a
   * clockwise top (`toTip`), and the force F_m round the circle the way it precesses (`ahead`: +1 the way the heading
   * grows). The velocity downward is gravity's arrow.
   */
  account?: { toTip: boolean; ahead: 1 | -1 } | null;
  /** Where the view looks from: beside the top, higher and centred on the tip to watch it circle, or square on to the plane it leans in, as a printed side view. */
  look?: 'side' | 'above' | 'front';
  /**
   * The parts of the torque of gravity, as Figure 8-5 labels them (Equation 8-4): the upright through the tip, r from
   * the tip to the centre of mass, the angle α between them, mg on gravity's arrow, and the lever r sin α on the floor.
   */
  torque?: boolean;
  reset?: number;
}

/** Where the centre of mass is for a lean and heading, in the scene. */
const centreOf = (lean: number, heading: number) => {
  const l = (lean * Math.PI) / 180, h = (heading * Math.PI) / 180;
  return new THREE.Vector3(TOP_CM * Math.sin(l) * Math.cos(h), TOP_CM * Math.cos(l), -TOP_CM * Math.sin(l) * Math.sin(h));
};

/** The figure's scene. Calls `onFail` when the browser cannot draw WebGL, so the card can show the flat page instead. */
export default function TopScene({ state, onFail, description, onLean }: { state: TopState; onFail(): void; description: string; onLean?(lean: number): void }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update(s: TopState): void; view(): void } | null>(null);
  // The latest handler for a lean set by dragging the top, read when a drag moves, so the scene need not be rebuilt.
  const leanTo = useRef(onLean);
  leanTo.current = onLean;
  const heading = useRef(state.heading);
  heading.current = state.heading;

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
      const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 720 / 360, 0.1, 100);
      scene.add(new THREE.AmbientLight(0xffffff, 1.3));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(3, 6, 5);
      scene.add(key);

      // The floor: a disc with a faint ring at the tip, so the point of contact reads.
      const floor = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.MeshStandardMaterial({ color: palette.bg2, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 32), new THREE.MeshBasicMaterial({ color: palette.text3 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.002;
      scene.add(floor, ring);

      // The top: turned on a lathe from its outline, with a coloured band and two marks so its own turning shows.
      const pivot = new THREE.Group(), body = new THREE.Group();
      const shape = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(PROFILE.map(([r, h]) => new THREE.Vector2(r, h))).getPoints(60), 96), new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55, metalness: 0 }));
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.362, 0.362, 0.06, 48, 1, true), new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.5, side: THREE.DoubleSide }));
      band.position.y = 0.96;
      const markMaterial = new THREE.MeshStandardMaterial({ color: palette.dataMark, roughness: 0.4 });
      for (const a of [0, Math.PI]) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), markMaterial);
        mark.position.set(0.36 * Math.cos(a), 1.1, 0.36 * Math.sin(a)); // on the surface of the smoothed body
        mark.rotation.z = Math.cos(a) * 0.12;
        body.add(mark);
      }
      body.add(shape, band);
      pivot.add(body);
      scene.add(pivot);

      // The centre of mass, gravity from it straight down, and the path it follows.
      const centre = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 12), new THREE.MeshBasicMaterial({ color: palette.dataMark, depthTest: false }));
      centre.renderOrder = 4;
      const pull = solidArrow(palette.warn);
      // The path of the centre of mass: a row of dots along it, ending in an arrowhead the way it goes, drawn over
      // the body like the dashed arrow of the printed figure.
      const pathLine = new THREE.Group();
      const dotGeometry = new THREE.SphereGeometry(0.022, 10, 6), dotMaterial = new THREE.MeshBasicMaterial({ color: palette.dataMark, transparent: true, opacity: 0.85, depthTest: false });
      const headGeometry = new THREE.ConeGeometry(0.055, 0.15, 14);
      // Drawn over the body, so gravity's pull and the path show through the solid top.
      pull.group.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.depthTest = false; o.renderOrder = 5; });
      scene.add(centre, pull.group, pathLine);
      // The arrows of the mattermagnetic account, drawn over the body, with their labels.
      const fieldArrow = solidArrow(palette.dataBHi), forceArrow = solidArrow(palette.text);
      for (const a of [fieldArrow, forceArrow]) a.group.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.depthTest = false; o.renderOrder = 5; });
      const fieldLabel = label('Bₘ', palette.dataBHi, 0.3), forceLabel = label('Fₘ', palette.text, 0.3), fallLabel = label('v', palette.warn, 0.3);
      scene.add(fieldArrow.group, forceArrow.group, fieldLabel, forceLabel, fallLabel);
      // Figure 8-5's parts of the torque: the upright, r, the angle α, mg and the lever r sin α, all over the body.
      const overlay = (m: THREE.Material) => { m.depthTest = false; m.transparent = true; return m; };
      const upright = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.1, 0)]), overlay(new THREE.LineDashedMaterial({ color: palette.text3, dashSize: 0.07, gapSize: 0.06 })));
      upright.computeLineDistances();
      const reach = solidArrow(palette.dataMark);
      reach.group.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) overlay(m); o.renderOrder = 5; });
      const arc = new THREE.Line(new THREE.BufferGeometry(), overlay(new THREE.LineBasicMaterial({ color: palette.accent })));
      const lever = new THREE.Line(new THREE.BufferGeometry(), overlay(new THREE.LineBasicMaterial({ color: palette.dataE })));
      for (const o of [upright, arc, lever]) o.renderOrder = 5;
      const reachLabel = label('r', palette.dataMark, 0.3), angleLabel = label('α', palette.accent, 0.3), weightLabel = label('mg', palette.warn, 0.3), leverLabel = label('r sin α', palette.dataE, 0.24);
      const torqueParts = [upright, reach.group, arc, lever, reachLabel, angleLabel, weightLabel, leverLabel];
      scene.add(...torqueParts);

      // Grabbing the top tilts it: registered before the orbit controls, so a press on the top is ours and does not
      // turn the view. The pointer's ray meets the upright plane the top leans in, and the lean is the angle there
      // from the upright, measured at the tip.
      const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), hit = new THREE.Vector3();
      const aim = (e: PointerEvent) => {
        const box = renderer.domElement.getBoundingClientRect();
        pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
        ray.setFromCamera(pointer, camera);
      };
      const onTop = (e: PointerEvent) => { aim(e); return ray.intersectObject(body, true).length > 0; };
      let dragging = false;
      const press = (e: PointerEvent) => {
        if (!leanTo.current || !onTop(e)) return;
        dragging = true;
        e.stopImmediatePropagation();
        renderer.domElement.setPointerCapture(e.pointerId);
        renderer.domElement.style.cursor = 'grabbing';
      };
      const move = (e: PointerEvent) => {
        if (!dragging) { if (leanTo.current) renderer.domElement.style.cursor = onTop(e) ? 'grab' : ''; return; }
        aim(e);
        const h = (heading.current * Math.PI) / 180, across = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
        // The upright plane through the tip that contains the lean direction.
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3().crossVectors(across, new THREE.Vector3(0, 1, 0)).normalize(), new THREE.Vector3());
        if (!ray.ray.intersectPlane(plane, hit)) return;
        leanTo.current?.((Math.atan2(hit.dot(across), Math.max(0.05, hit.y)) * 180) / Math.PI);
        e.stopImmediatePropagation();
      };
      const release = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        renderer.domElement.releasePointerCapture(e.pointerId);
        renderer.domElement.style.cursor = '';
      };
      renderer.domElement.addEventListener('pointerdown', press);
      renderer.domElement.addEventListener('pointermove', move);
      renderer.domElement.addEventListener('pointerup', release);
      renderer.domElement.addEventListener('pointercancel', release);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = false; // the mouse wheel scrolls the book, as everywhere else on the page
      // A vertical swipe scrolls the page, as the wheel does; a sideways one turns the view.
      renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
      controls.maxPolarAngle = Math.PI / 2 - 0.04; // never look from under the floor
      const draw = () => renderer.render(scene, camera);
      controls.addEventListener('change', draw);
      const look = { current: state.look ?? 'side' };
      const view = () => {
        const [p, t] = look.current === 'above' ? [[1.7, 2.9, 4.9], [0, 1.05, 0]] : look.current === 'front' ? [[0.5, 1.05, 4.1], [0.5, 0.8, 0]] : [[1.9, 1.75, 4.5], [0.55, 0.78, 0]];
        camera.position.set(p[0], p[1], p[2]); controls.target.set(t[0], t[1], t[2]); camera.lookAt(t[0], t[1], t[2]); controls.update(); draw();
      };
      const resize = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        draw();
      });
      resize.observe(el);

      const up = new THREE.Vector3(0, 1, 0);
      let drawnPath = '';
      api.current = {
        view,
        update(s) {
          // Turn about its own axis, lean, then face the heading: all about the tip, which stays on the floor.
          body.rotation.set(0, (s.spun * Math.PI) / 180, 0);
          // Never further over than lying on the floor.
          const lean = Math.min(s.lean, TOP_LAID);
          pivot.quaternion.setFromEuler(new THREE.Euler(0, (s.heading * Math.PI) / 180, (-lean * Math.PI) / 180, 'YXZ'));
          const c = centreOf(lean, s.heading);
          centre.position.copy(c);
          pull.group.visible = s.gravity && c.y > 0.12;
          pull.set(c, up.clone().negate(), Math.max(0.12, c.y - 0.02));
          // The account's arrows: B_m along the axis from the centre of mass, F_m along the circle the centre follows.
          const shown = !!s.account;
          fieldArrow.group.visible = forceArrow.group.visible = fieldLabel.visible = forceLabel.visible = fallLabel.visible = shown;
          if (s.account) {
            const axis = c.clone().normalize(), along = s.account.toTip ? axis.clone().negate() : axis;
            // B_m lies along the whole axis; it is drawn above the head, on the axis, clear of the body and the other
            // arrows. F_m runs from the centre of mass along the circle; v's label sits on the side away from F_m.
            const h = (s.heading * Math.PI) / 180, tangent = new THREE.Vector3(-Math.sin(h), 0, -Math.cos(h)).multiplyScalar(s.account.ahead);
            fieldArrow.set(axis.clone().multiplyScalar(s.account.toTip ? 2.4 : 1.9), along, 0.5);
            fieldLabel.position.copy(axis).multiplyScalar(2.2).addScaledVector(tangent, -0.2);
            forceArrow.set(c, tangent, 0.6);
            forceLabel.position.copy(c).addScaledVector(tangent, 0.76);
            fallLabel.position.copy(c).addScaledVector(tangent, -0.16).setY(Math.max(0.12, c.y * 0.4));
          }
          // Figure 8-5's parts: all in the upright plane the top leans in, except the lever, drawn on the floor a
          // little toward the reader so the body does not hide it.
          for (const o of torqueParts) o.visible = !!s.torque;
          if (s.torque) {
            const l = (lean * Math.PI) / 180, h = (s.heading * Math.PI) / 180;
            const toward = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h)), front = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
            const axis = c.clone().normalize(), below = toward.clone().multiplyScalar(Math.cos(l)).addScaledVector(up, -Math.sin(l));
            reach.set(new THREE.Vector3(), axis, TOP_CM);
            reachLabel.position.copy(c).multiplyScalar(0.55).addScaledVector(below, -0.17);
            const swing = (t: number, radius: number) => toward.clone().multiplyScalar(Math.sin(t) * radius).addScaledVector(up, Math.cos(t) * radius);
            arc.geometry.dispose();
            arc.geometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 25 }, (_, i) => swing((l * i) / 24, 1.25)));
            angleLabel.position.copy(swing(l / 2, 1.45));
            weightLabel.position.copy(c).setY(Math.max(0.1, c.y * 0.45)).addScaledVector(toward, 0.26);
            const lift = new THREE.Vector3(0, 0.004, 0), start = front.clone().multiplyScalar(0.3).add(lift), end = start.clone().add(new THREE.Vector3(c.x, 0, c.z)), tick = up.clone().multiplyScalar(0.06);
            lever.geometry.dispose();
            lever.geometry = new THREE.BufferGeometry().setFromPoints([start.clone().add(tick), start, end, end.clone().add(tick)]);
            leverLabel.position.copy(start).lerp(end, 0.5).addScaledVector(front, 0.22);
          }
          const key = JSON.stringify([s.path, s.path?.kind === 'circle' ? s.lean : 0, s.path?.kind === 'fall' ? s.heading : 0]);
          if (key !== drawnPath) {
            const points = !s.path ? [] : s.path.kind === 'fall'
              // As Fleming drew it, down to the floor: the top itself comes to rest a little before, when its side meets the floor.
              ? Array.from({ length: 48 }, (_, i) => centreOf((s.path as { from: number }).from + ((90 - (s.path as { from: number }).from) * i) / 47, s.heading))
              : Array.from({ length: 73 }, (_, i) => centreOf(s.lean, i * 5));
            pathLine.clear();
            // A dot every 0.06 along the path, measured along it, so the spacing is even.
            let since = 0;
            points.forEach((p, i) => {
              since += i ? p.distanceTo(points[i - 1]) : 1;
              if (since < 0.06 || i === points.length - 1) return;
              since = 0;
              const dot = new THREE.Mesh(dotGeometry, dotMaterial);
              dot.position.copy(p);
              dot.renderOrder = 3;
              pathLine.add(dot);
            });
            if (s.path?.kind === 'fall' && points.length > 1) {
              const end = points[points.length - 1], head = new THREE.Mesh(headGeometry, dotMaterial);
              head.position.copy(end);
              head.quaternion.setFromUnitVectors(up, end.clone().sub(points[points.length - 2]).normalize());
              head.renderOrder = 3;
              pathLine.add(head);
            }
            drawnPath = key;
          }
          draw();
        },
      };
      view();
      api.current.update(state);
      return () => {
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

  return <div ref={host} className="bk-stage-3d" style={{ aspectRatio: '720 / 360' }} role="img" aria-label={description}/>;
}
