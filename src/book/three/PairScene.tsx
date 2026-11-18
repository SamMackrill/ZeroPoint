// Figure 4-9 in three dimensions: a virtual electron-positron pair turning in its plane, with E in that plane and B
// along the axis of rotation. Loaded on demand (three.js is large), and drawn only when something changes.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { palette } from '../../ui/palette';

/** Where the reader looks from: the printed page face on, turned to show depth, or along the photon's path. */
export type PairView = 'turned' | 'page' | 'path';

/** What the scene shows at a moment. Angles in degrees; `field` is E and B as a share of their peak. */
export interface PairState {
  /** Angle the positive end has turned through, 0 to 180. */
  turned: number;
  /** Clockwise as seen on the printed page. */
  cw: boolean;
  field: number;
  /** How fully the pair is there: it fades in as it forms and out as its half-turn ends. */
  presence: number;
  /** The rotation arrow is shown only while the motion is paused. */
  showSpin: boolean;
  view: PairView;
}

const CAMERA: Record<PairView, [number, number, number]> = { turned: [4.5, 2.1, 4.1], page: [0, 0, 6.8], path: [6.5, 1.1, 1.6] };
const ARM = 1.05, E_AT = 1.9, PEAK = 1.6;

/** A text label that always faces the reader. */
function label(text: string, color: string, size = 0.5) {
  const canvas = document.createElement('canvas'), wide = Math.max(1, text.length * 0.62);
  canvas.width = Math.round(128 * wide);
  canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.font = '600 84px "DM Sans", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, canvas.width / 2, 70);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true }));
  sprite.scale.set(size * wide, size, 1);
  sprite.renderOrder = 2;
  return sprite;
}

/** A solid arrow (a shaft and a cone), easier to see than a line; `set` points it and sets its length. */
function solidArrow(color: string) {
  const group = new THREE.Group(), material = new THREE.MeshBasicMaterial({ color }); // unlit, so the arrow keeps its data colour from every side
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 12), material);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 16), material);
  group.add(shaft, head);
  const set = (from: THREE.Vector3, direction: THREE.Vector3, length: number) => {
    const body = Math.max(0.01, length - 0.28);
    group.position.copy(from);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    shaft.scale.y = body;
    shaft.position.y = body / 2;
    head.position.y = body + 0.14;
  };
  return { group, set };
}

/** An arc with an arrowhead, in the plane of rotation, showing which way the pair turns. */
function spinArrow(cw: boolean) {
  const group = new THREE.Group(), radius = 1.45, from = cw ? 150 : 210, sweep = 100, sense = cw ? -1 : 1;
  const points = Array.from({ length: 33 }, (_, i) => {
    const a = ((from + (sense * sweep * i) / 32) * Math.PI) / 180;
    return new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0);
  });
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: palette.text2 })));
  const end = points[points.length - 1], before = points[points.length - 3];
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), new THREE.MeshBasicMaterial({ color: palette.text2 }));
  head.position.copy(end);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(before).normalize());
  group.add(head);
  return group;
}

/** The figure's scene. Reports `false` through `onFail` when the browser cannot draw WebGL, so the card can fall back. */
export default function PairScene({ state, onFail, description }: { state: PairState; onFail(): void; description: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update(s: PairState): void; view(v: PairView): void } | null>(null);

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
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 720 / 330, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, 6);
    scene.add(key);

    // The plane of rotation, the photon's path through it, and the axis the pair turns about.
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.3, 64), new THREE.MeshBasicMaterial({ color: palette.bg3, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(1.3 * Math.cos((i / 64) * 2 * Math.PI), 1.3 * Math.sin((i / 64) * 2 * Math.PI), 0))), new THREE.LineBasicMaterial({ color: palette.text4 }));
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3, 0, 0), new THREE.Vector3(3, 0, 0)]), new THREE.LineDashedMaterial({ color: palette.text4, dashSize: 0.12, gapSize: 0.1 }));
    path.computeLineDistances();
    // The photon moves along x (Fig. 5-2, p. 44): an arrowhead at the far end, and the label above the line's near end.
    const travel = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), new THREE.MeshBasicMaterial({ color: palette.text3 }));
    travel.position.set(3.05, 0, 0);
    travel.rotation.z = -Math.PI / 2;
    const pathLabel = label('photon’s path', palette.text3, 0.3);
    pathLabel.position.set(-2.2, 0.28, 0);
    scene.add(disc, rim, path, travel, pathLabel);

    // The pair: two charges on a rod, turning in the plane.
    const pair = new THREE.Group();
    const sphere = new THREE.SphereGeometry(0.2, 32, 20);
    const pos = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: palette.dataPos, roughness: 0.45, transparent: true }));
    const neg = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: palette.dataNeg, roughness: 0.45, transparent: true }));
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2 * ARM, 12), new THREE.MeshStandardMaterial({ color: palette.text3, transparent: true }));
    rod.rotation.z = Math.PI / 2;
    pos.position.x = ARM;
    neg.position.x = -ARM;
    const plus = label('+', palette.bg0, 0.42), minus = label('−', palette.bg0, 0.42);
    plus.position.x = ARM;
    minus.position.x = -ARM;
    pair.add(rod, pos, neg, plus, minus);
    scene.add(pair);

    // E in the plane of rotation, beside the pair; B along the axis of rotation.
    const eArrow = solidArrow(palette.dataE), bArrow = solidArrow(palette.dataBHi);
    scene.add(eArrow.group, bArrow.group);
    const eLabel = label('E', palette.dataE), bLabel = label('B', palette.dataBHi);
    scene.add(eLabel, bLabel);
    let spin = spinArrow(true), spinCw = true;
    scene.add(spin);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 16;
    const draw = () => renderer.render(scene, camera);
    controls.addEventListener('change', draw);
    const view = (v: PairView) => { camera.position.set(...CAMERA[v]); controls.target.set(0, 0, 0); camera.lookAt(0, 0, 0); controls.update(); draw(); };
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      draw();
    });
    resize.observe(el);

    api.current = {
      view,
      update(s) {
        // The positive end starts on the left of the page and turns over the top (clockwise) or under the bottom.
        pair.rotation.z = ((s.cw ? 180 - s.turned : 180 + s.turned) * Math.PI) / 180;
        for (const m of [pos.material, neg.material, rod.material] as THREE.MeshStandardMaterial[]) m.opacity = s.presence;
        for (const sp of [plus, minus]) sp.material.opacity = s.presence;
        const up = s.cw ? 1 : -1, len = PEAK * s.field;
        // E points toward the positive end's side of the path (Fig. 6-7); B follows the right-hand grip rule.
        const shown = len > 0.32, drawn = Math.max(len, 0.33);
        eArrow.group.visible = bArrow.group.visible = eLabel.visible = bLabel.visible = shown;
        eArrow.set(new THREE.Vector3(E_AT, (-up * drawn) / 2, 0), new THREE.Vector3(0, up, 0), drawn);
        bArrow.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -up), drawn);
        eLabel.position.set(E_AT + 0.4, up * (drawn / 2 - 0.1), 0);
        bLabel.position.set(0.28, 0.22, -up * (drawn + 0.22));
        if (s.cw !== spinCw) { scene.remove(spin); spin = spinArrow(s.cw); spinCw = s.cw; scene.add(spin); }
        spin.visible = s.showSpin;
        draw();
      },
    };
    view('turned');
    return () => {
      api.current = null;
      resize.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse(o => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of mats) { (m as THREE.SpriteMaterial).map?.dispose(); m.dispose(); }
      });
      renderer.domElement.remove();
    };
  }, [onFail]);

  useEffect(() => { api.current?.update(state); }, [state]);
  useEffect(() => { api.current?.view(state.view); }, [state.view]);

  return <div ref={host} className="bk-stage-3d" role="img" aria-label={description}/>;
}
