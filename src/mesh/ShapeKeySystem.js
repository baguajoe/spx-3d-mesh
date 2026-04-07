/**
 * SPX Shape Key / Blend Shape System
 * Morph targets — competing with Blender shape keys
 */
import * as THREE from "three";

export class ShapeKey {
  constructor(name, positions) {
    this.name      = name;
    this.positions = positions; // Float32Array of deltas from basis
    this.value     = 0;         // 0-1 influence
    this.muted     = false;
    this.relative  = true;
    this.min       = 0;
    this.max       = 1;
  }
}

export class ShapeKeySystem {
  constructor(scene) {
    this.scene  = scene;
    this.meshes = new Map(); // mesh → { basis, shapeKeys[], origPos }
  }

  // Register mesh with shape key system
  register(mesh) {
    const geo    = mesh.geometry;
    const pos    = geo.attributes.position;
    if (!pos) return;
    const basis  = new Float32Array(pos.array);
    const origPos= new Float32Array(pos.array);
    this.meshes.set(mesh.uuid, { mesh, basis, origPos, shapeKeys:[] });
    return this;
  }

  // Add shape key from current mesh state
  addShapeKey(mesh, name) {
    const data = this.meshes.get(mesh.uuid);
    if (!data) { this.register(mesh); return this.addShapeKey(mesh, name); }
    const pos    = mesh.geometry.attributes.position;
    const deltas = new Float32Array(pos.count * 3);
    // Store deltas from basis
    for (let i = 0; i < pos.count; i++) {
      deltas[i*3]   = pos.getX(i) - data.basis[i*3];
      deltas[i*3+1] = pos.getY(i) - data.basis[i*3+1];
      deltas[i*3+2] = pos.getZ(i) - data.basis[i*3+2];
    }
    const sk = new ShapeKey(name, deltas);
    data.shapeKeys.push(sk);
    return sk;
  }

  // Add shape key from positions array (for programmatic keys)
  addShapeKeyFromPositions(mesh, name, positions) {
    const data = this.meshes.get(mesh.uuid);
    if (!data) { this.register(mesh); }
    const d = this.meshes.get(mesh.uuid);
    const sk = new ShapeKey(name, new Float32Array(positions));
    d.shapeKeys.push(sk);
    return sk;
  }

  // Set value for a shape key
  setValue(mesh, name, value) {
    const data = this.meshes.get(mesh.uuid);
    if (!data) return;
    const sk = data.shapeKeys.find(k => k.name === name);
    if (sk) { sk.value = Math.max(sk.min, Math.min(sk.max, value)); this.apply(mesh); }
  }

  // Apply all shape keys to mesh geometry
  apply(mesh) {
    const data = this.meshes.get(mesh.uuid);
    if (!data) return;
    const pos   = mesh.geometry.attributes.position;
    const count = pos.count;
    // Start from basis
    for (let i = 0; i < count; i++) {
      pos.setXYZ(i, data.basis[i*3], data.basis[i*3+1], data.basis[i*3+2]);
    }
    // Add shape key influences
    data.shapeKeys.forEach(sk => {
      if (sk.muted || sk.value === 0) return;
      for (let i = 0; i < count && i*3+2 < sk.positions.length; i++) {
        pos.setX(i, pos.getX(i) + sk.positions[i*3]   * sk.value);
        pos.setY(i, pos.getY(i) + sk.positions[i*3+1] * sk.value);
        pos.setZ(i, pos.getZ(i) + sk.positions[i*3+2] * sk.value);
      }
    });
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  // Reset to basis
  resetToBasis(mesh) {
    const data = this.meshes.get(mesh.uuid);
    if (!data) return;
    data.shapeKeys.forEach(sk => sk.value = 0);
    this.apply(mesh);
  }

  // Create common facial expression shape keys
  createFacialKeys(mesh) {
    this.register(mesh);
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const count = pos.count;
    // Smile: move mouth corners up and out
    const smileDeltas = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
      if (y < -0.1 && y > -0.4 && Math.abs(x) > 0.1) {
        smileDeltas[i*3]   = x * 0.1;
        smileDeltas[i*3+1] = 0.05;
        smileDeltas[i*3+2] = z * 0.05;
      }
    }
    this.addShapeKeyFromPositions(mesh, "Smile", smileDeltas);
    // Blink: move upper eyelid down
    const blinkDeltas = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y=pos.getY(i), z=pos.getZ(i);
      if (y > 0.1 && y < 0.3 && z > 0.3) blinkDeltas[i*3+1] = -0.1;
    }
    this.addShapeKeyFromPositions(mesh, "Blink_L", blinkDeltas);
    this.addShapeKeyFromPositions(mesh, "Blink_R", blinkDeltas);
    // Jaw open
    const jawDeltas = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y=pos.getY(i);
      if (y < -0.1) jawDeltas[i*3+1] = -0.15 * (1 - (y+0.1)/(-0.4));
    }
    this.addShapeKeyFromPositions(mesh, "Jaw_Open", jawDeltas);
    // Brow raise
    const browDeltas = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y=pos.getY(i), z=pos.getZ(i);
      if (y > 0.2 && z < 0.3) browDeltas[i*3+1] = 0.08;
    }
    this.addShapeKeyFromPositions(mesh, "Brow_Raise", browDeltas);
    return this.getKeys(mesh);
  }

  getKeys(mesh) {
    return this.meshes.get(mesh.uuid)?.shapeKeys || [];
  }

  removeKey(mesh, name) {
    const data = this.meshes.get(mesh.uuid);
    if (data) { data.shapeKeys = data.shapeKeys.filter(k=>k.name!==name); this.apply(mesh); }
  }

  dispose() { this.meshes.clear(); }
}
