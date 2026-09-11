import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { lightReadout, pairAt, pairCount, sourceX, waveAt } from './model';
import type { LightSnapshot, LightView } from './model';

const SAMPLES = 241, BACKGROUND = 540;
export class LightRenderer {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, .05, 100);
  private controls: OrbitControls;
  private positive: THREE.InstancedMesh;
  private negative: THREE.InstancedMesh;
  private centres: THREE.InstancedMesh;
  private electric: THREE.Line;
  private magnetic: THREE.Line;
  private response = new THREE.Group();
  private arrows: THREE.ArrowHelper[] = [];
  private envelope: THREE.Mesh;
  private probe: THREE.Mesh;
  private selection: THREE.Mesh;
  private base = new THREE.Group();
  private dummy = new THREE.Object3D();
  private colour = new THREE.Color();
  private resize: ResizeObserver;
  private frame = 0;
  private data: LightSnapshot | null = null;
  private selected: number | null = null;
  private cameraMode: 'side' | 'orbit' | 'pair' = 'orbit';
  private down = { x: 0, y: 0 };
  private disposed = false;
  constructor(private host: HTMLElement, private options: LightView, private onPick: (index: number) => void, private onError: (message: string) => void) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor('#0a1420');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.setAttribute('aria-label', 'Light induction in the zero-point medium. Drag to orbit; click a pair centre to pin it.');
    host.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.AmbientLight('#a9cfe0', 2));
    const light = new THREE.DirectionalLight('#ffffff', 2.5); light.position.set(2, 5, 6); this.scene.add(light);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.minDistance = 1.3; this.controls.maxDistance = 30;
    const sphere = new THREE.SphereGeometry(.062, 10, 8);
    this.positive = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: '#ffc29c', emissive: '#8c391a', emissiveIntensity: .25 }), BACKGROUND + 24);
    this.negative = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: '#8bdaff', emissive: '#205773', emissiveIntensity: .25 }), BACKGROUND + 24);
    this.centres = new THREE.InstancedMesh(new THREE.TorusGeometry(.09, .012, 5, 16), new THREE.MeshBasicMaterial({ color: '#99c9c3', transparent: true, opacity: .6 }), 24);
    for (const mesh of [this.positive, this.negative, this.centres]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; this.scene.add(mesh); }
    const makeLine = (color: string) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SAMPLES * 3), 3).setUsage(THREE.DynamicDrawUsage));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })); line.frustumCulled = false; this.scene.add(line); return line;
    };
    this.electric = makeLine('#a2edc6'); this.magnetic = makeLine('#b4a1f1');
    for (let i = 0; i < 50; i++) {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, i % 2 ? '#b4a1f1' : '#a2edc6', .09, .045);
      this.arrows.push(arrow); this.response.add(arrow);
    }
    this.scene.add(this.response);
    this.envelope = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: '#6cdcb1', transparent: true, opacity: .065, depthWrite: false, wireframe: true }));
    this.probe = new THREE.Mesh(new THREE.TorusGeometry(.9, .009, 4, 48), new THREE.MeshBasicMaterial({ color: '#e8c77c', transparent: true, opacity: .65 }));
    this.probe.rotation.y = Math.PI / 2;
    this.selection = new THREE.Mesh(new THREE.SphereGeometry(.35, 16, 12), new THREE.MeshBasicMaterial({ color: '#d6f3a3', wireframe: true, transparent: true, opacity: .35 }));
    this.scene.add(this.envelope, this.probe, this.selection);
    const grid = new THREE.GridHelper(12, 24, '#2a4958', '#19303e'); grid.position.y = -1.8; grid.scale.z = .3;
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6, 0, 0), new THREE.Vector3(6, 0, 0)]), new THREE.LineDashedMaterial({ color: '#577b84', dashSize: .08, gapSize: .06 })); path.computeLineDistances();
    this.base.add(grid, path); this.scene.add(this.base);
    this.resize = new ResizeObserver(() => this.resizeCanvas()); this.resize.observe(host); this.resizeCanvas();
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.setOptions(options); this.cameraPreset('orbit'); this.animate();
  }
  private resizeCanvas() { const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); }
  private contextLost = (e: Event) => { e.preventDefault(); this.onError('The graphics context was lost. The experiment is paused; recover the viewport to continue.'); };
  private pointerDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };
  private pointerUp = (e: PointerEvent) => {
    if (!this.options.centres || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 4) return;
    const r = this.renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, 1 - (e.clientY - r.top) / r.height * 2), this.camera);
    const index = ray.intersectObject(this.centres)[0]?.instanceId;
    if (index !== undefined) this.onPick(index);
  };
  setOptions(options: LightView) { this.options = options; this.controls.enableDamping = !options.reducedMotion; if (this.data) this.update(this.data); }
  select(index: number | null) { this.selected = index; if (this.data) this.update(this.data); }
  cameraPreset(mode: 'side' | 'orbit' | 'pair') {
    this.cameraMode = mode;
    const x = mode === 'pair' && this.data ? pairAt(this.data.parameters, this.data.tick, this.selected ?? lightReadout(this.data).index).centre : this.data?.parameters.offset ?? 0;
    this.controls.target.set(x, 0, 0);
    const distance = mode === 'pair' ? 2.4 : Math.max(6, 7.5 / (Math.tan(this.camera.fov * Math.PI / 360) * this.camera.aspect));
    this.camera.position.set(x + (mode === 'orbit' ? distance * .1 : 0), mode === 'orbit' ? distance * .28 : .01, distance);
    this.controls.update();
    if (this.data) this.update(this.data);
  }
  private put(index: number, x: number, y: number, z: number, direction: number[], separation: number, scale: number, brightness: number) {
    this.dummy.scale.setScalar(scale);
    for (const [sign, mesh] of [[1, this.positive], [-1, this.negative]] as const) {
      this.dummy.position.set(x + sign * direction[0] * separation / 2, y + sign * direction[1] * separation / 2, z + sign * direction[2] * separation / 2);
      this.dummy.updateMatrix(); mesh.setMatrixAt(index, this.dummy.matrix); mesh.setColorAt(index, this.colour.setScalar(brightness));
    }
  }
  update(state: LightSnapshot) {
    if (this.disposed) return;
    this.data = state;
    const p = state.parameters, d = lightReadout(state), pol = p.polarization * Math.PI / 180;
    const selected = pairAt(p, state.tick, this.selected ?? d.index);
    let count = 0;
    // Fixed, reproducible spatial sample. Phase and response are prescribed, not integrated forces.
    for (let i = 0; i < BACKGROUND; i++) {
      const x = p.offset + (i % 30) * .4 - 5.8, y = (Math.floor(i / 30) % 6) * .55 - 1.375, z = Math.floor(i / 180) * .75 - .75;
      if (this.cameraMode === 'pair' && Math.hypot(x - selected.centre, y, z) > .8) continue;
      const w = waveAt(p, d.time, x), response = this.options.response ? w.envelope * Math.exp(-(y * y + z * z) / 1.5) : 0;
      if (!this.options.background && response < .04) continue;
      const phase = i * 2.39996 + d.time * (1 + (i % 7) / 8), a = phase + response * w.electric;
      const direction = [Math.sin(a) * (1 - response * .5), Math.cos(a) * Math.cos(pol), Math.cos(a) * Math.sin(pol)];
      const norm = Math.hypot(...direction); direction.forEach((v, j) => { direction[j] = v / norm; });
      this.put(count++, x, y, z, direction, (.13 + response * .12) * Math.abs(Math.sin(phase / 2)), .43 + response * .32, .16 + response * .8);
    }
    if (this.options.pairs && !d.finished) {
      const pair = d.pair;
      this.put(count++, pair.centre, 0, 0, pair.direction, pair.separation, this.options.reducedMotion ? 1 : Math.min(1, .25 + Math.sin(pair.progress * Math.PI) * 3), 1.5);
    }
    this.positive.count = this.negative.count = count;
    for (const mesh of [this.positive, this.negative]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    this.centres.count = pairCount(p); this.centres.visible = this.options.centres;
    for (let i = 0; i < this.centres.count; i++) { this.dummy.position.set(pairAt(p, state.tick, i).centre, 0, 0); this.dummy.scale.setScalar(1); this.dummy.updateMatrix(); this.centres.setMatrixAt(i, this.dummy.matrix); }
    this.centres.instanceMatrix.needsUpdate = true;
    this.base.position.x = p.offset;
    this.envelope.visible = this.options.envelope && !d.finished && this.cameraMode !== 'pair';
    this.envelope.position.set(d.x, 0, 0); this.envelope.scale.set(p.wavelength / 2, .85, .85);
    this.probe.position.x = p.probe;
    this.selection.visible = this.selected !== null;
    this.selection.position.set(selected.centre, 0, 0);
    if (this.cameraMode === 'pair') { const dx = selected.centre - this.controls.target.x; this.controls.target.x += dx; this.camera.position.x += dx; }
    this.electric.visible = this.magnetic.visible = this.response.visible = this.options.fields;
    const e = this.electric.geometry.attributes.position, b = this.magnetic.geometry.attributes.position;
    for (let i = 0; i < SAMPLES; i++) {
      const x = p.offset - 6 + i * 12 / (SAMPLES - 1), w = waveAt(p, d.time, x);
      e.setXYZ(i, x, w.electric * Math.cos(pol), w.electric * Math.sin(pol));
      b.setXYZ(i, x, -w.magnetic * Math.sin(pol), w.magnetic * Math.cos(pol));
    }
    e.needsUpdate = b.needsUpdate = true;
    for (let i = 0; i < this.arrows.length; i++) {
      const x = p.offset - 6 + Math.floor(i / 2) * .5, w = waveAt(p, d.time, x), value = i % 2 ? w.magnetic : w.electric;
      const arrow = this.arrows[i]; arrow.visible = Math.abs(value) > .025; arrow.position.set(x, 0, 0);
      const sign = Math.sign(value) || 1;
      arrow.setDirection(new THREE.Vector3(0, sign * (i % 2 ? -Math.sin(pol) : Math.cos(pol)), sign * (i % 2 ? Math.cos(pol) : Math.sin(pol))));
      arrow.setLength(Math.max(.01, Math.abs(value)), .08, .04);
    }
  }
  private animate = () => { if (this.disposed) return; this.frame = requestAnimationFrame(this.animate); this.controls.update(); this.renderer.render(this.scene, this.camera); };
  exportPNG() {
    this.renderer.render(this.scene, this.camera);
    const source = this.renderer.domElement, c = document.createElement('canvas'); c.width = source.width; c.height = source.height + 64;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#0a1420'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(source, 0, 0);
    ctx.fillStyle = '#c8e6db'; ctx.font = '13px sans-serif';
    ctx.fillText(`ZEROPOINT / Light induction · illustrative sequence · tick ${this.data?.tick ?? 0}`, 16, source.height + 24);
    ctx.fillText(`Wavelength ${(this.data?.parameters.wavelength ?? 2) * 250} nm · 1 L = 250 nm · prescribed speed c`, 16, source.height + 46);
    c.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'zeropoint-light.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.resize.disconnect(); this.controls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    const sharedArrowGeometries = new Set(this.arrows.flatMap(arrow => [arrow.line.geometry, arrow.cone.geometry]));
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry && !sharedArrowGeometries.has(mesh.geometry)) geometries.add(mesh.geometry); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    for (const mesh of [this.positive, this.negative, this.centres]) mesh.dispose();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
