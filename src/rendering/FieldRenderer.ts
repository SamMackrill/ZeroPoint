import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAPACITY, SNAPSHOT_STRIDE } from '../model/types';
import type { ViewSettings } from '../model/types';
import { lobeScale } from '../model/pairMotion';
export interface PickedDipole { slot: number; generation: number; frequency: number; age: number; lifetime: number; separation: number; position: [number, number, number] }
export class FieldRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, .1, 150);
  readonly controls: OrbitControls;
  private positive: THREE.InstancedMesh; private negative: THREE.InstancedMesh; private points: THREE.Points;
  private bounds = new THREE.Group(); private selection: THREE.Mesh;
  private slice: THREE.Mesh; private texture: THREE.DataTexture;
  private dummy = new THREE.Object3D(); private up = new THREE.Vector3(0, 1, 0); private axis = new THREE.Vector3();
  private data: Float32Array = new Float32Array(0); private keys: string[] = []; private selected: string | null = null;
  private options: ViewSettings; private resize: ResizeObserver; private disposed = false; private frame = 0;
  private last = performance.now(); private intervals: number[] = []; private down = { x: 0, y: 0 };
  private pickListener: (p: PickedDipole | null) => void;
  private metrics: (fps: number, calls: number) => void;
  private contextListener: (message: string) => void;
  private sliceMax = 0;
  constructor(private host: HTMLElement, options: ViewSettings, onPick: (p: PickedDipole | null) => void, onMetrics: (fps: number, calls: number) => void, onError: (message: string) => void) {
    this.options = options; this.pickListener = onPick; this.metrics = onMetrics; this.contextListener = onError;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.setClearColor('#0b131d');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement); this.renderer.domElement.setAttribute('aria-label', 'Three-dimensional dipole field. Drag to orbit, scroll to zoom, click a dipole to inspect.');
    this.renderer.domElement.setAttribute('role', 'img');
    this.camera.position.set(10, 6.8, 11.5);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.dampingFactor = .08; this.controls.minDistance = 3; this.controls.maxDistance = 35;
    this.scene.add(new THREE.AmbientLight('#b5d3e7', 2));
    const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(4, 8, 5); this.scene.add(light);
    const geometry = new THREE.SphereGeometry(.052, 8, 6);
    this.positive = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffa77c', emissive: '#ad431e', emissiveIntensity: .35, roughness: .5 }), CAPACITY);
    this.negative = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#73c7ee', emissive: '#23638b', emissiveIntensity: .35, roughness: .5 }), CAPACITY);
    for (const mesh of [this.positive, this.negative]) { mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(mesh); }
    const pointGeometry = new THREE.BufferGeometry(); pointGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(THREE.DynamicDrawUsage)); pointGeometry.setDrawRange(0, 0);
    this.points = new THREE.Points(pointGeometry, new THREE.PointsMaterial({ color: '#7dbfd9', size: .065, sizeAttenuation: true })); this.points.frustumCulled = false; this.scene.add(this.points);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(8, 8, 8)), new THREE.LineBasicMaterial({ color: '#375468', transparent: true, opacity: .48 }));
    const grid = new THREE.GridHelper(8, 8, '#345466', '#1e3445'); grid.position.y = -4;
    this.bounds.add(edges, grid); this.scene.add(this.bounds);
    this.selection = new THREE.Mesh(new THREE.SphereGeometry(.19, 16, 12), new THREE.MeshBasicMaterial({ color: '#d9f8b0', wireframe: true, transparent: true, opacity: .7 })); this.selection.visible = false; this.scene.add(this.selection);
    this.texture = new THREE.DataTexture(new Uint8Array(32 * 32 * 4), 32, 32, THREE.RGBAFormat); this.texture.minFilter = THREE.LinearFilter; this.texture.magFilter = THREE.LinearFilter;
    this.slice = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: .8 })); this.slice.renderOrder = 2; this.scene.add(this.slice);
    this.resize = new ResizeObserver(() => this.resizeCanvas()); this.resize.observe(host); this.resizeCanvas();
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown); this.renderer.domElement.addEventListener('pointerup', this.pointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.setOptions(options); this.animate();
  }
  private resizeCanvas() { const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private contextLost = (e: Event) => { e.preventDefault(); this.contextListener('Graphics context was lost. The experiment is paused. Recover the viewport to continue.'); };
  private pointerDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };
  private pointerUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 4 || !this.options.medium) return;
    const rect = this.renderer.domElement.getBoundingClientRect(), mouse = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.params.Points.threshold = .12; ray.setFromCamera(mouse, this.camera);
    // The finite 10k view is pickable directly. A spatial broad phase is deferred until profiling warrants it.
    const hits = this.options.representation === 'dipoles' ? ray.intersectObjects([this.positive, this.negative]) : ray.intersectObject(this.points);
    const index = hits[0]?.instanceId ?? hits[0]?.index;
    this.select(index === undefined ? null : this.keys[index]);
  };
  select(key: string | null) { this.selected = key; this.refreshSelection(); }
  inspectFirst() { this.select(this.keys[0] ?? null); }
  private refreshSelection() {
    const index = this.selected ? this.keys.indexOf(this.selected) : -1;
    this.selection.visible = index >= 0 && this.options.medium;
    if (index < 0) { this.pickListener(null); return; }
    const n = index * SNAPSHOT_STRIDE, d = this.data;
    this.selection.position.set(d[n], d[n + 1], d[n + 2]);
    this.selection.scale.setScalar(Math.max(1, (d[n + 6] / 2 + .08) / .19));
    this.pickListener({ slot: d[n + 10], generation: d[n + 11], frequency: d[n + 7], age: d[n + 8], lifetime: d[n + 9], separation: d[n + 6], position: [d[n], d[n + 1], d[n + 2]] });
  }
  update(data: Float32Array) {
    if (this.disposed) return;
    this.data = data; const count = data.length / SNAPSHOT_STRIDE; this.keys = new Array(count);
    this.positive.count = count; this.negative.count = count;
    const positions = this.points.geometry.attributes.position.array as Float32Array;
    const density = new Float32Array(32 * 32);
    for (let i = 0; i < count; i++) {
      const n = i * SNAPSHOT_STRIDE, x = data[n], y = data[n + 1], z = data[n + 2]; this.keys[i] = `${data[n + 10]}:${data[n + 11]}`;
      const scale = lobeScale(data[n + 8], data[n + 9], this.options.reducedMotion);
      this.axis.set(data[n + 3], data[n + 4], data[n + 5]); this.dummy.quaternion.setFromUnitVectors(this.up, this.axis); this.dummy.scale.setScalar(scale);
      this.dummy.position.set(x, y, z).addScaledVector(this.axis, data[n + 6] / 2); this.dummy.updateMatrix(); this.positive.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(x, y, z).addScaledVector(this.axis, -data[n + 6] / 2); this.dummy.updateMatrix(); this.negative.setMatrixAt(i, this.dummy.matrix);
      positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
      const sliceDistance = Math.abs(z - this.options.sliceZ);
      if (this.options.slice && Math.min(sliceDistance, 8 - sliceDistance) < .25) {
        const gx = Math.min(31, Math.max(0, Math.floor((x + 4) * 4))), gy = Math.min(31, Math.max(0, Math.floor((y + 4) * 4)));
        density[gy * 32 + gx] += data[n + 7] / 2 / (.25 * .25 * .5);
      }
    }
    this.positive.instanceMatrix.needsUpdate = true; this.negative.instanceMatrix.needsUpdate = true;
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.setDrawRange(0, count);
    if (this.options.slice) {
      this.sliceMax = Math.max(1, ...density); const pixels = this.texture.image.data as Uint8Array;
      for (let i = 0; i < density.length; i++) { const v = Math.sqrt(density[i] / this.sliceMax); pixels[i * 4] = 40 + v * 175; pixels[i * 4 + 1] = 85 + v * 150; pixels[i * 4 + 2] = 110 + v * 60; pixels[i * 4 + 3] = 25 + v * 205; }
      this.texture.needsUpdate = true;
    }
    this.refreshSelection();
  }
  getSliceMax() { return this.sliceMax; }
  setOptions(options: ViewSettings) { this.options = options; this.positive.visible = this.negative.visible = options.medium && options.representation === 'dipoles'; this.points.visible = options.medium && options.representation === 'points'; this.bounds.visible = options.bounds; this.slice.visible = options.slice; this.slice.position.z = options.sliceZ; if (this.data.length) this.update(this.data); }
  cameraPreset(preset: 'perspective' | 'top' | 'front') { this.camera.position.copy(preset === 'top' ? new THREE.Vector3(0, 16, .01) : preset === 'front' ? new THREE.Vector3(0, 0, 17) : new THREE.Vector3(10, 6.8, 11.5)); this.controls.target.set(0, 0, 0); this.controls.update(); }
  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate); const now = performance.now(); this.intervals.push(now - this.last); this.last = now;
    this.controls.update(); this.renderer.render(this.scene, this.camera);
    if (this.intervals.length >= 60) { const average = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length; this.metrics(Math.round(1000 / average), this.renderer.info.render.calls); this.intervals = []; }
  };
  exportPNG(caption: string) {
    this.renderer.render(this.scene, this.camera);
    const source = this.renderer.domElement, canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height + 80;
    const c = canvas.getContext('2d')!; c.fillStyle = '#0b131d'; c.fillRect(0, 0, canvas.width, canvas.height); c.drawImage(source, 0, 0); c.fillStyle = '#d2e6e8'; c.font = '14px sans-serif'; c.fillText('ZEROPOINT / Reduced medium lifecycle model', 20, source.height + 30); c.font = '12px sans-serif'; c.fillText(caption, 20, source.height + 55);
    canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'zeropoint-field.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.resize.disconnect(); this.controls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); this.texture.dispose(); this.positive.dispose(); this.negative.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
