/**
 * SPX Snap System
 * Grid, vertex, edge, face, increment snapping — competing with Blender
 */
import * as THREE from "three";

export class SnapSystem {
  constructor(scene, camera) {
    this.scene    = scene;
    this.camera   = camera;
    this.enabled  = false;
    this.mode     = "grid";       // grid | vertex | edge | face | increment | surface
    this.gridSize = 0.5;
    this.increment= 0.1;
    this.threshold= 0.3;
    this.snapIndicator = null;
    this._buildIndicator();
  }

  _buildIndicator() {
    const geo = new THREE.SphereGeometry(0.06, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color:0xffff00, depthTest:false });
    this.snapIndicator = new THREE.Mesh(geo, mat);
    this.snapIndicator.name = "_snap_indicator";
    this.snapIndicator.visible = false;
    this.scene.add(this.snapIndicator);
  }

  setMode(mode)       { this.mode = mode; }
  setEnabled(enabled) { this.enabled = enabled; if(!enabled) this.snapIndicator.visible=false; }
  setGridSize(size)   { this.gridSize = size; }

  // Snap a world-space position
  snap(position, meshes = []) {
    if (!this.enabled) return position.clone();
    switch (this.mode) {
      case "grid":      return this._snapGrid(position);
      case "increment": return this._snapIncrement(position);
      case "vertex":    return this._snapVertex(position, meshes);
      case "face":      return this._snapFace(position, meshes);
      case "surface":   return this._snapSurface(position, meshes);
      default:          return position.clone();
    }
  }

  _snapGrid(pos) {
    const g = this.gridSize;
    return new THREE.Vector3(
      Math.round(pos.x / g) * g,
      Math.round(pos.y / g) * g,
      Math.round(pos.z / g) * g,
    );
  }

  _snapIncrement(pos) {
    const i = this.increment;
    return new THREE.Vector3(
      Math.round(pos.x / i) * i,
      Math.round(pos.y / i) * i,
      Math.round(pos.z / i) * i,
    );
  }

  _snapVertex(pos, meshes) {
    let closest    = null;
    let closestDist= Infinity;
    meshes.forEach(mesh => {
      if (mesh.name.startsWith("_")) return;
      const geo = mesh.geometry;
      const p   = geo.attributes.position;
      if (!p) return;
      for (let i = 0; i < p.count; i++) {
        const v    = new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(mesh.matrixWorld);
        const dist = pos.distanceTo(v);
        if (dist < closestDist && dist < this.threshold) { closestDist=dist; closest=v; }
      }
    });
    if (closest) {
      this.snapIndicator.position.copy(closest);
      this.snapIndicator.visible = true;
      return closest;
    }
    this.snapIndicator.visible = false;
    return this._snapGrid(pos);
  }

  _snapFace(pos, meshes) {
    const ray = new THREE.Raycaster();
    const dir = pos.clone().sub(this.camera.position).normalize();
    ray.set(this.camera.position, dir);
    const hits = ray.intersectObjects(meshes.filter(m=>!m.name.startsWith("_")), true);
    if (hits.length > 0) {
      const hit = hits[0];
      this.snapIndicator.position.copy(hit.point);
      this.snapIndicator.visible = true;
      return hit.point.clone();
    }
    this.snapIndicator.visible = false;
    return pos.clone();
  }

  _snapSurface(pos, meshes) {
    return this._snapFace(pos, meshes);
  }

  showIndicator(pos) {
    this.snapIndicator.position.copy(pos);
    this.snapIndicator.visible = true;
  }

  hideIndicator() { this.snapIndicator.visible = false; }

  dispose() { this.scene.remove(this.snapIndicator); }
}
