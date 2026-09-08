import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ELECTRON_SAMPLES, LATTICE_SAMPLES, SHELL_RADII, add, cross, dipoleAt, electronX, norm, probePosition, referenceFields, sampleCentre, scale, spinAxis, unit, velocity } from './model';
import type { ElectronSnapshot, ElectronView, Vec } from './model';
import { faradayLines } from './fieldLines';

export class ElectronRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(43, 1, .05, 100);
  private renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  private controls: OrbitControls;
  private positive: THREE.InstancedMesh; private negative: THREE.InstancedMesh;
  private core = new THREE.Group(); private radius: THREE.Mesh; private selection: THREE.Mesh; private probe: THREE.Mesh;
  private electric = new THREE.Group(); private magnetic = new THREE.Group(); private intrinsic = new THREE.Group();
  private eArrows: THREE.ArrowHelper[] = []; private bArrows: THREE.ArrowHelper[] = []; private sArrows: THREE.ArrowHelper[] = [];
  private rings = new THREE.Group(); private rotation: THREE.LineSegments; private path: THREE.Line;
  private faraday: THREE.LineSegments; private faradayKey = '';
  private shells = new THREE.Group(); private chargeMotion: THREE.LineSegments[] = [];
  private dummy = new THREE.Object3D(); private colour = new THREE.Color();
  private resize: ResizeObserver; private frame = 0; private data: ElectronSnapshot | null = null;
  private keys: number[] = []; private selected: number | null = null;
  private cameraMode: 'front' | 'orbit' | 'probe' | 'shell' = 'front'; private down = { x: 0, y: 0 }; private disposed = false;
  constructor(private host: HTMLElement, private view: ElectronView, private pick: (id: number) => void, private fail: (message: string) => void) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.setClearColor('#0a1420');
    this.renderer.domElement.setAttribute('role', 'img'); this.renderer.domElement.setAttribute('aria-label', 'Electron field in three dimensions. Positive zepton lobes face the electron. Drag to orbit; click a lobe to inspect its fixed centre.'); host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.minDistance = 1.4; this.controls.maxDistance = 32;
    this.scene.add(new THREE.AmbientLight('#c4d6e6', 2)); const light = new THREE.DirectionalLight('#ffffff', 2.8); light.position.set(3, 6, 8); this.scene.add(light);
    const sphere = new THREE.SphereGeometry(.065, 10, 8);
    this.positive = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: '#ffc199', emissive: '#672e17', emissiveIntensity: .3 }), ELECTRON_SAMPLES);
    this.negative = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: '#87d4f3', emissive: '#1c4c6c', emissiveIntensity: .3 }), ELECTRON_SAMPLES);
    for (const mesh of [this.positive, this.negative]) { mesh.count = 0; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; this.scene.add(mesh); }
    const centre = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 16), new THREE.MeshStandardMaterial({ color: '#c8b3ff', emissive: '#7e42ce', emissiveIntensity: .8 }));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#e1d8ff'; ctx.font = 'bold 70px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('e⁻', 64, 85);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false })); label.scale.set(.48, .48, 1); label.position.y = .42;
    this.core.add(centre, label); this.scene.add(this.core);
    this.radius = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: '#997ebf', wireframe: true, transparent: true, opacity: .18 })); this.scene.add(this.radius);
    this.selection = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), new THREE.MeshBasicMaterial({ color: '#f5da8f', wireframe: true, transparent: true, opacity: .65 })); this.selection.visible = false; this.scene.add(this.selection);
    this.probe = new THREE.Mesh(new THREE.OctahedronGeometry(.14), new THREE.MeshBasicMaterial({ color: '#e6ca7b', wireframe: true })); this.scene.add(this.probe);
    for (let i = 0; i < 100; i++) { const arrow = this.arrow('#93dec0'); this.eArrows.push(arrow); this.electric.add(arrow); }
    for (let i = 0; i < 72; i++) { const arrow = this.arrow('#a894ef'); this.bArrows.push(arrow); this.magnetic.add(arrow); }
    for (let i = 0; i < 48; i++) { const arrow = this.arrow('#efa5c1'); this.sArrows.push(arrow); this.intrinsic.add(arrow); }
    for (const x of [-1.8, 0, 1.8]) for (const r of [1.1, 2.25, 3.3]) {
      const points = Array.from({ length: 65 }, (_, i) => new THREE.Vector3(x, r * Math.cos(i * Math.PI / 32), r * Math.sin(i * Math.PI / 32)));
      this.rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#8b74c7', transparent: true, opacity: .28 })));
    }
    this.magnetic.add(this.rings); this.scene.add(this.electric, this.magnetic, this.intrinsic);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(80 * 28 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage)); geometry.setDrawRange(0, 0);
    this.rotation = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#f0bd85', transparent: true, opacity: .7 })); this.rotation.frustumCulled = false; this.scene.add(this.rotation);
    const lines = new THREE.BufferGeometry(); lines.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 164 * 6), 3).setUsage(THREE.DynamicDrawUsage)); lines.setDrawRange(0, 0);
    this.faraday = new THREE.LineSegments(lines, new THREE.LineBasicMaterial({ color: '#a3ead0', transparent: true, opacity: .65 })); this.faraday.frustumCulled = false; this.scene.add(this.faraday);
    for (const colour of ['#ffc199', '#87d4f3']) {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(320 * 6 * 3), 3).setUsage(THREE.DynamicDrawUsage)); geometry.setDrawRange(0, 0);
      const motion = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: colour })); motion.frustumCulled = false; this.chargeMotion.push(motion); this.scene.add(motion);
    }
    for (const radius of SHELL_RADII) for (const sign of [-1, 1]) {
      const r = radius + sign * .095, material = new THREE.LineBasicMaterial({ color: sign < 0 ? '#ffc199' : '#87d4f3', transparent: true, opacity: .2 });
      for (let ring = 0; ring < 5; ring++) {
        const points = Array.from({ length: 65 }, (_, i) => {
          const a = i * Math.PI / 32;
          if (ring < 3) { const z = (ring - 1) * .72, rho = Math.sqrt(1 - z * z); return new THREE.Vector3(r * rho * Math.cos(a), r * rho * Math.sin(a), r * z); }
          return ring === 3 ? new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)) : new THREE.Vector3(0, r * Math.cos(a), r * Math.sin(a));
        });
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material); line.userData.equator = ring === 1; this.shells.add(line);
      }
    }
    this.scene.add(this.shells);
    this.path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4.8, 0, 0), new THREE.Vector3(4.8, 0, 0)]), new THREE.LineDashedMaterial({ color: '#a592c4', dashSize: .12, gapSize: .1 })); this.path.computeLineDistances(); this.scene.add(this.path);
    const grid = new THREE.GridHelper(12, 24, '#2c4755', '#1b303e'); grid.position.y = -3.6; grid.scale.z = .6; this.scene.add(grid);
    this.resize = new ResizeObserver(() => this.resizeCanvas()); this.resize.observe(host); this.resizeCanvas(); this.setView(view);
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown); this.renderer.domElement.addEventListener('pointerup', this.pointerUp); this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.animate();
  }
  private arrow(colour: string) { return new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), .3, colour, .08, .04); }
  private setArrow(a: THREE.ArrowHelper, position: Vec, vector: Vec, length: number) { a.visible = norm(vector) > 1e-10; a.position.fromArray(position); a.setDirection(new THREE.Vector3(...unit(vector))); a.setLength(Math.max(.01, length), .08, .045); }
  private resizeCanvas() { if (!this.host.clientWidth || !this.host.clientHeight) return; this.camera.aspect = this.host.clientWidth / this.host.clientHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(this.host.clientWidth, this.host.clientHeight); this.cameraPreset(this.cameraMode); }
  cameraPreset(mode: 'front' | 'orbit' | 'probe' | 'shell') {
    this.cameraMode = mode; const target: Vec = mode === 'probe' && this.data ? this.selected === null ? probePosition(this.data.parameters) : sampleCentre(this.selected) : [0, 0, 0];
    const distance = mode === 'probe' ? 2.6 : mode === 'shell' ? Math.max(9.5, 3.6 / (Math.tan(this.camera.fov * Math.PI / 360) * this.camera.aspect)) : Math.max(11, 7.2 / (Math.tan(this.camera.fov * Math.PI / 360) * this.camera.aspect));
    const tiltedShell = mode === 'shell' && !this.view.cutaway;
    this.controls.target.fromArray(target); this.camera.position.set(target[0] + (mode === 'orbit' || tiltedShell ? 2 : 0), target[1] + (mode === 'orbit' ? 5 : tiltedShell ? 1.2 : .01), target[2] + distance); this.controls.update(); if (this.data) this.update(this.data);
  }
  setView(view: ElectronView) { this.view = view; this.controls.enableDamping = !view.reducedMotion; if (this.data) this.update(this.data); }
  select(id: number | null) { this.selected = id; if (this.data) this.update(this.data); }
  private contextLost = (e: Event) => { e.preventDefault(); this.fail('Graphics context lost. The electron experiment is paused. Recover the viewport to continue.'); };
  private pointerDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };
  private pointerUp = (e: PointerEvent) => {
    if (!this.view.dipoles || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 4) return;
    const r = this.renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, 1 - (e.clientY - r.top) / r.height * 2), this.camera);
    const i = ray.intersectObjects([this.positive, this.negative])[0]?.instanceId; if (i !== undefined) this.pick(this.keys[i]);
  };
  update(s: ElectronSnapshot) {
    if (this.disposed) return; this.data = s; const x = electronX(s), p = s.parameters, beta = velocity(p), selected = this.selected === null ? null : sampleCentre(this.selected);
    this.core.position.x = this.radius.position.x = x; this.radius.visible = this.view.radius; this.probe.position.fromArray(probePosition(p));
    this.path.visible = p.mode === 'moving'; this.path.scale.x = Math.abs(beta) / .2;
    this.positive.visible = this.negative.visible = this.view.dipoles;
    const shellView = this.view.shells && p.mode === 'spin';
    this.selection.scale.setScalar(shellView ? .6 : 1);
    this.shells.visible = shellView; this.shells.children.forEach(line => { line.visible = !this.view.cutaway || line.userData.equator; });
    this.chargeMotion.forEach(line => { line.visible = shellView && this.view.rotation; }); const motionVertices = [0, 0];
    this.electric.visible = this.view.electric; this.magnetic.visible = this.view.magnetic && beta !== 0;
    this.intrinsic.visible = this.view.intrinsic && p.mode !== 'electric'; this.rotation.visible = this.view.rotation && p.mode !== 'electric' && !shellView;
    this.selection.visible = !!selected; if (selected) this.selection.position.fromArray(selected);
    const rotationData = this.rotation.geometry.attributes.position, target = selected ?? probePosition(p); let count = 0, vertices = 0, arcs = 0;
    this.keys = [];
    for (let i = 0; i < ELECTRON_SAMPLES; i++) {
      const d = dipoleAt(s, i), c = d.centre;
      if ((shellView ? i < LATTICE_SAMPLES : i >= LATTICE_SAMPLES) || !d.field.valid || (this.view.cutaway && Math.abs(c[2]) > (shellView ? .08 : .85)) || (this.cameraMode === 'probe' && norm(add(c, scale(target, -1))) > 1)) continue;
      this.keys.push(i); const visibility = this.view.reducedMotion ? .85 : Math.min(1, .2 + Math.sin(Math.PI * d.progress) * 3);
      this.dummy.scale.setScalar(visibility * (shellView ? .8 : 1)); this.colour.setScalar(.32 + .65 / (1 + d.field.radius * .18));
      for (const [mesh, position] of [[this.positive, d.positive], [this.negative, d.negative]] as const) { this.dummy.position.fromArray(position); this.dummy.updateMatrix(); mesh.setMatrixAt(count, this.dummy.matrix); mesh.setColorAt(count, this.colour); }
      count++;
      if (shellView && this.view.rotation) {
        for (let charge = 0; charge < 2; charge++) {
          const pos = charge ? d.negative : d.positive, v = charge ? d.spinNegativeVelocity : d.spinPositiveVelocity;
          if (norm(v) < 1e-5) continue;
          const dir = unit(v), end = add(pos, scale(dir, .06 + Math.min(.2, Math.abs(d.spinRate) * .55)));
          const side = unit(cross(dir, d.localAxis)), data = this.chargeMotion[charge].geometry.attributes.position;
          const put = (v: Vec) => data.setXYZ(motionVertices[charge]++, ...v);
          put(pos); put(end);
          for (const sign of [-1, 1]) { put(end); put(add(add(end, scale(dir, -.04)), scale(side, sign * .025))); }
        }
      }
      if (i % 5 !== 0 || arcs >= 80 || d.field.radius > 4.4 || !this.rotation.visible) continue;
      const axis = unit(add(scale(d.localAxis, d.spinTurn), scale(d.motionAxis, d.motionTurn))); if (!norm(axis)) continue;
      const u = unit(cross(axis, Math.abs(axis[2]) < .9 ? [0, 0, 1] : [0, 1, 0])), v = cross(axis, u);
      const at = (angle: number) => add(c, add(scale(u, Math.cos(angle) * .18), scale(v, Math.sin(angle) * .18)));
      const sweep = Math.min(1.6, Math.max(.12, Math.abs(d.spinTurn) + d.motionTurn));
      for (let j = 0; j < 24; j++) { rotationData.setXYZ(vertices++, ...at(j * sweep / 24)); rotationData.setXYZ(vertices++, ...at((j + 1) * sweep / 24)); }
      const end = at(sweep), tangent = add(scale(u, -Math.sin(sweep)), scale(v, Math.cos(sweep)));
      for (const sign of [-1, 1]) { rotationData.setXYZ(vertices++, ...end); rotationData.setXYZ(vertices++, ...add(add(end, scale(tangent, -.07)), scale(axis, sign * .035))); }
      arcs++;
    }
    this.positive.count = this.negative.count = count;
    this.selection.visible = this.selected !== null && this.keys.includes(this.selected);
    this.chargeMotion.forEach((line, i) => { line.geometry.setDrawRange(0, motionVertices[i]); line.geometry.attributes.position.needsUpdate = true; });
    for (const mesh of [this.positive, this.negative]) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    this.rotation.geometry.setDrawRange(0, vertices); rotationData.needsUpdate = true;
    this.faraday.visible = this.view.faraday;
    const lineKey = JSON.stringify([s.running ? Math.floor(s.tick / 12) : s.tick, p, this.view.cutaway]);
    if (this.view.faraday && lineKey !== this.faradayKey) {
      this.faradayKey = lineKey; const data = this.faraday.geometry.attributes.position; let n = 0;
      for (const points of faradayLines(s, this.view.cutaway)) {
        for (let i = 1; i < points.length; i++) { data.setXYZ(n++, ...points[i - 1]); data.setXYZ(n++, ...points[i]); }
        if (points.length < 8) continue;
        const i = Math.min(18, Math.floor(points.length / 2)), end = points[i], backward = unit(add(points[i + 1], scale(end, -1)));
        const side = unit(cross(backward, Math.abs(backward[2]) < .9 ? [0, 0, 1] : [0, 1, 0]));
        for (const sign of [-1, 1]) { data.setXYZ(n++, ...end); data.setXYZ(n++, ...add(add(end, scale(backward, .12)), scale(side, sign * .05))); }
      }
      this.faraday.geometry.setDrawRange(0, n); data.needsUpdate = true;
    }
    this.eArrows.forEach((a, i) => { const angle = (i % 20) * Math.PI / 10, r = .65 + Math.floor(i / 20) * .82, pos: Vec = [x + r * Math.cos(angle), r * Math.sin(angle), 0]; this.setArrow(a, pos, referenceFields(s, pos).electric, .2 + .23 / r); });
    this.rings.position.x = x;
    this.bArrows.forEach((a, i) => { const angle = (i % 8) * Math.PI / 4, r = [1.1, 2.25, 3.3][Math.floor(i / 8) % 3], dx = [-1.8, 0, 1.8][Math.floor(i / 24)]; const pos: Vec = [x + dx, r * Math.cos(angle), r * Math.sin(angle)]; this.setArrow(a, pos, referenceFields(s, pos).motion, .35); });
    this.sArrows.forEach((a, i) => { const angle = (i % 12) * Math.PI / 6, r = .9 + Math.floor(i / 12) * .8, axis = spinAxis(p), transverse = unit(cross(axis, p.axis === 'x' ? [0, 0, 1] : [1, 0, 0])); const pos = add([x, 0, 0], add(scale(axis, r * Math.cos(angle)), scale(transverse, r * Math.sin(angle)))); this.setArrow(a, pos, referenceFields(s, pos).intrinsic, .28); });
  }
  private animate = () => { if (this.disposed) return; this.frame = requestAnimationFrame(this.animate); this.controls.update(); this.renderer.render(this.scene, this.camera); };
  exportPNG() {
    this.renderer.render(this.scene, this.camera); const source = this.renderer.domElement, canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height + 60;
    const c = canvas.getContext('2d')!; c.fillStyle = '#0a1420'; c.fillRect(0, 0, canvas.width, canvas.height); c.drawImage(source, 0, 0); c.fillStyle = '#d4dedc'; c.font = '12px sans-serif'; c.fillText(`ZEROPOINT / Electron polarization · ${this.data?.parameters.mode} · tick ${this.data?.tick}`, 15, source.height + 24); c.fillText('Fixed zepton centres | R = half Compton wavelength | local turns illustrative; field arrows analytic reference', 15, source.height + 44);
    canvas.toBlob(blob => { if (!blob) return; const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'zeropoint-electron.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.resize.disconnect(); this.controls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse(o => { const mesh = o as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => { const map = (m as THREE.SpriteMaterial).map; map?.dispose(); m.dispose(); }); this.positive.dispose(); this.negative.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
