// Helpers shared by the companion's three-dimensional figures (Figures 4-9 and 6-4).
import * as THREE from 'three';
import { scene as sceneColours } from '../../ui/palette';

/** A text label that always faces the reader. */
export function label(text: string, color: string, size = 0.5) {
  const canvas = document.createElement('canvas'), wide = Math.max(1, text.length * 0.62);
  canvas.width = Math.round(128 * wide);
  canvas.height = 128;
  const g = canvas.getContext('2d');
  // A browser that cannot give a 2D context draws the label blank rather than failing the whole scene.
  if (g) {
    g.font = '600 84px "DM Sans", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, canvas.width / 2, 70);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true }));
  sprite.scale.set(size * wide, size, 1);
  sprite.renderOrder = 2;
  return sprite;
}

/** A solid arrow (a shaft and a cone), easier to see than a line; `set` points it and sets its length. */
export function solidArrow(color: string) {
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

/** Free the geometry, materials and textures of an object and everything in it. */
export function disposeAll(root: THREE.Object3D) {
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const m of mats) { (m as THREE.SpriteMaterial).map?.dispose(); m.dispose(); }
  });
}

/**
 * A wood-grain texture drawn on a canvas, for a turned wooden body: the base colour with fine lengthwise grain and a few
 * broader, darker streaks, wavering a little along their length. On a lathe geometry, u runs round the body and v along
 * it, so the grain follows the axis, as on a turned top. The same every time (seeded).
 */
export function woodTexture(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas);
  if (!g) return texture; // no 2D context: a plain body rather than a failed scene
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = sceneColours.wood;
  g.fillRect(0, 0, width, height);
  g.strokeStyle = sceneColours.woodGrain;
  // Fine grain and a few broad streaks, each a line down the body that wanders slightly from side to side.
  for (let k = 0; k < 150; k++) {
    const broad = k % 12 === 0, x0 = random() * width, wobble = 2 + random() * 6, phase = random() * 6.28, freq = 1.5 + random() * 3;
    g.globalAlpha = broad ? 0.16 : 0.04 + random() * 0.09;
    g.lineWidth = broad ? 4 + random() * 5 : 0.6 + random() * 1.6;
    g.beginPath();
    for (let y = 0; y <= height; y += 8) {
      const x = x0 + wobble * Math.sin((y / height) * freq * 6.28 + phase);
      if (y === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
