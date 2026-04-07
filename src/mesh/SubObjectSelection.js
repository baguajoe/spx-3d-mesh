/**
 * SPX Sub-Object Selection Engine
 * Vertex, Edge, Face picking in the viewport using raycasting + highlight overlays
 */
import * as THREE from "three";

export const SELECT_MODE = { OBJECT: "OBJECT", VERTEX: "VERTEX", EDGE: "EDGE", FACE: "FACE" };

export class SubObjectSelection {
  constructor(scene, renderer, camera) {
    this.scene    = scene;
    this.renderer = renderer;
    this.camera   = camera;
    this.mode     = SELECT_MODE.OBJECT;
    this.selected = new Set(); // indices
    this.mesh     = null;

    // Highlight materials
    this.vertMat  = new THREE.PointsMaterial({ color: 0x00ffc8, size: 6, sizeAttenuation: false, depthTest: false });
    this.edgeMat  = new THREE.LineBasicMaterial({ color: 0x00ffc8, depthTest: false, linewidth: 2 });
    this.faceMat  = new THREE.MeshBasicMaterial({ color: 0x00ffc8, transparent: true, opacity: 0.3, depthTest: false, side: THREE.DoubleSide });

    // Overlay objects
    this.vertOverlay = null;
    this.edgeOverlay = null;
    this.faceOverlay = null;

    // All vertices/faces dot overlay
    this.allVertsOverlay = null;
  }

  setMesh(mesh) {
    this.mesh = mesh;
    this.selected.clear();
    this._clearOverlays();
    this._buildAllVertsOverlay();
  }

  setMode(mode) {
    this.mode = mode;
    this.selected.clear();
    this._clearOverlays();
    if (mode !== SELECT_MODE.OBJECT && this.mesh) this._buildAllVertsOverlay();
  }

  // Pick from mouse event
  pick(event, container, additive = false) {
    if (!this.mesh || this.mode === SELECT_MODE.OBJECT) return null;
    const rect   = container.getBoundingClientRect();
    const mouse  = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width)  * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.params.Points.threshold = 0.1;
    ray.setFromCamera(mouse, this.camera);

    if (this.mode === SELECT_MODE.FACE) return this._pickFace(ray, additive);
    if (this.mode === SELECT_MODE.VERTEX) return this._pickVertex(ray, mouse, additive);
    if (this.mode === SELECT_MODE.EDGE) return this._pickEdge(ray, additive);
    return null;
  }

  _pickFace(ray, additive) {
    const hits = ray.intersectObject(this.mesh, false);
    if (hits.length === 0) { if (!additive) this.selected.clear(); return null; }
    const faceIdx = hits[0].faceIndex;
    if (!additive) this.selected.clear();
    if (this.selected.has(faceIdx)) this.selected.delete(faceIdx);
    else this.selected.add(faceIdx);
    this._updateFaceOverlay();
    return faceIdx;
  }

  _pickVertex(ray, mouse, additive) {
    if (!additive) this.selected.clear();
    const geo = this.mesh.geometry;
    const pos = geo.attributes.position;
    if (!pos) return null;
    let closest = null, closestDist = Infinity;
    const projMat = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(this.mesh.matrixWorld).project(this.camera);
      const dist = Math.sqrt((v.x - mouse.x)**2 + (v.y - mouse.y)**2);
      if (dist < 0.05 && dist < closestDist) { closestDist = dist; closest = i; }
    }
    if (closest !== null) {
      if (this.selected.has(closest)) this.selected.delete(closest);
      else this.selected.add(closest);
    }
    this._updateVertexOverlay();
    return closest;
  }

  _pickEdge(ray, additive) {
    const hits = ray.intersectObject(this.mesh, false);
    if (hits.length === 0) { if (!additive) this.selected.clear(); return null; }
    const face = hits[0].face;
    // Select the 3 edges of the face (represented as pairs)
    const edges = [[face.a, face.b], [face.b, face.c], [face.c, face.a]];
    const pt    = hits[0].point;
    const geo   = this.mesh.geometry;
    const posAttr = geo.attributes.position;
    let closestEdge = null, closestDist = Infinity;
    edges.forEach(([ai, bi]) => {
      const a = new THREE.Vector3(posAttr.getX(ai), posAttr.getY(ai), posAttr.getZ(ai)).applyMatrix4(this.mesh.matrixWorld);
      const b = new THREE.Vector3(posAttr.getX(bi), posAttr.getY(bi), posAttr.getZ(bi)).applyMatrix4(this.mesh.matrixWorld);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const d   = pt.distanceTo(mid);
      const key = [Math.min(ai,bi), Math.max(ai,bi)].join("_");
      if (d < closestDist) { closestDist = d; closestEdge = key; }
    });
    if (!additive) this.selected.clear();
    if (closestEdge) {
      if (this.selected.has(closestEdge)) this.selected.delete(closestEdge);
      else this.selected.add(closestEdge);
    }
    this._updateEdgeOverlay();
    return closestEdge;
  }

  selectAll() {
    if (!this.mesh) return;
    const geo = this.mesh.geometry;
    if (this.mode === SELECT_MODE.VERTEX) {
      for (let i = 0; i < (geo.attributes.position?.count || 0); i++) this.selected.add(i);
      this._updateVertexOverlay();
    } else if (this.mode === SELECT_MODE.FACE) {
      const idx = geo.index;
      const count = idx ? idx.count / 3 : (geo.attributes.position?.count || 0) / 3;
      for (let i = 0; i < count; i++) this.selected.add(i);
      this._updateFaceOverlay();
    }
  }

  deselectAll() {
    this.selected.clear();
    this._clearOverlays();
    if (this.mesh && this.mode !== SELECT_MODE.OBJECT) this._buildAllVertsOverlay();
  }

  getSelectedVertexPositions() {
    if (!this.mesh || this.mode !== SELECT_MODE.VERTEX) return [];
    const pos = this.mesh.geometry.attributes.position;
    return [...this.selected].map(i => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(this.mesh.matrixWorld));
  }

  _buildAllVertsOverlay() {
    if (this.allVertsOverlay) this.scene.remove(this.allVertsOverlay);
    if (!this.mesh || this.mode === SELECT_MODE.OBJECT) return;
    const geo   = this.mesh.geometry;
    const pos   = geo.attributes.position;
    if (!pos) return;
    const pts   = new THREE.BufferGeometry();
    const posArr= new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { posArr[i*3]=pos.getX(i); posArr[i*3+1]=pos.getY(i); posArr[i*3+2]=pos.getZ(i); }
    pts.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const mat   = new THREE.PointsMaterial({ color: 0x888888, size: 4, sizeAttenuation: false, depthTest: false });
    this.allVertsOverlay = new THREE.Points(pts, mat);
    this.allVertsOverlay.name = "_subobj_allverts";
    this.allVertsOverlay.renderOrder = 999;
    this.allVertsOverlay.applyMatrix4(this.mesh.matrixWorld);
    this.scene.add(this.allVertsOverlay);
  }

  _updateVertexOverlay() {
    if (this.vertOverlay) this.scene.remove(this.vertOverlay);
    if (this.selected.size === 0) return;
    const pos = this.mesh.geometry.attributes.position;
    const pts = [];
    this.selected.forEach(i => { pts.push(pos.getX(i), pos.getY(i), pos.getZ(i)); });
    const geo  = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
    this.vertOverlay = new THREE.Points(geo, this.vertMat);
    this.vertOverlay.name = "_subobj_verts";
    this.vertOverlay.renderOrder = 1000;
    this.vertOverlay.applyMatrix4(this.mesh.matrixWorld);
    this.scene.add(this.vertOverlay);
  }

  _updateFaceOverlay() {
    if (this.faceOverlay) this.scene.remove(this.faceOverlay);
    if (this.selected.size === 0) return;
    const srcGeo = this.mesh.geometry;
    const srcPos = srcGeo.attributes.position;
    const pts    = [];
    this.selected.forEach(fi => {
      const idx = srcGeo.index;
      let ai, bi, ci;
      if (idx) { ai=idx.getX(fi*3); bi=idx.getX(fi*3+1); ci=idx.getX(fi*3+2); }
      else { ai=fi*3; bi=fi*3+1; ci=fi*3+2; }
      [ai,bi,ci].forEach(i => pts.push(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i)));
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
    this.faceOverlay = new THREE.Mesh(geo, this.faceMat);
    this.faceOverlay.name = "_subobj_faces";
    this.faceOverlay.renderOrder = 998;
    this.faceOverlay.applyMatrix4(this.mesh.matrixWorld);
    this.scene.add(this.faceOverlay);
  }

  _updateEdgeOverlay() {
    if (this.edgeOverlay) this.scene.remove(this.edgeOverlay);
    if (this.selected.size === 0) return;
    const pos = this.mesh.geometry.attributes.position;
    const pts = [];
    this.selected.forEach(key => {
      const [ai, bi] = key.split("_").map(Number);
      pts.push(pos.getX(ai), pos.getY(ai), pos.getZ(ai), pos.getX(bi), pos.getY(bi), pos.getZ(bi));
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
    this.edgeOverlay = new THREE.LineSegments(geo, this.edgeMat);
    this.edgeOverlay.name = "_subobj_edges";
    this.edgeOverlay.renderOrder = 999;
    this.edgeOverlay.applyMatrix4(this.mesh.matrixWorld);
    this.scene.add(this.edgeOverlay);
  }

  _clearOverlays() {
    [this.vertOverlay, this.edgeOverlay, this.faceOverlay, this.allVertsOverlay].forEach(o => { if (o) this.scene.remove(o); });
    this.vertOverlay = this.edgeOverlay = this.faceOverlay = this.allVertsOverlay = null;
  }

  dispose() { this._clearOverlays(); }
}
