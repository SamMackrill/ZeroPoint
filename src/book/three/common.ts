// Helpers shared by the companion's three-dimensional figures (Figures 4-9 and 6-4).
import * as THREE from 'three';

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
