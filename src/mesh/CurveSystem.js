/**
 * SPX Curve System
 * Bezier curves, NURBS, path objects, curve-to-mesh conversion
 */
import * as THREE from "three";

export class BezierCurve {
  constructor(name = "Curve") {
    this.name     = name;
    this.points   = []; // { pos, handleLeft, handleRight }
    this.closed   = false;
    this.resolution = 12;
    this.bevelDepth = 0;
    this.bevelRes   = 4;
    this.extrudeAmt = 0;
  }

  addPoint(pos, handleLeft=null, handleRight=null) {
    const hl = handleLeft  || pos.clone().add(new THREE.Vector3(-0.5,0,0));
    const hr = handleRight || pos.clone().add(new THREE.Vector3( 0.5,0,0));
    this.points.push({ pos:pos.clone(), handleLeft:hl.clone(), handleRight:hr.clone() });
    return this;
  }

  // Evaluate cubic bezier segment
  _evalSegment(p0, h0r, h1l, p1, t) {
    const u=1-t;
    return new THREE.Vector3(
      u*u*u*p0.x + 3*u*u*t*h0r.x + 3*u*t*t*h1l.x + t*t*t*p1.x,
      u*u*u*p0.y + 3*u*u*t*h0r.y + 3*u*t*t*h1l.y + t*t*t*p1.y,
      u*u*u*p0.z + 3*u*u*t*h0r.z + 3*u*t*t*h1l.z + t*t*t*p1.z,
    );
  }

  // Get all points along curve
  getPoints(steps=null) {
    const res = steps || this.resolution;
    const pts = [];
    const n   = this.closed ? this.points.length : this.points.length - 1;
    for (let s = 0; s < n; s++) {
      const p0  = this.points[s];
      const p1  = this.points[(s+1) % this.points.length];
      for (let i = 0; i < res; i++) {
        const t = i / res;
        pts.push(this._evalSegment(p0.pos, p0.handleRight, p1.handleLeft, p1.pos, t));
      }
    }
    if (!this.closed && this.points.length > 0) pts.push(this.points[this.points.length-1].pos.clone());
    return pts;
  }

  // Convert to tube mesh
  toMesh(scene, radius=0.05) {
    const pts   = this.getPoints();
    const curve = new THREE.CatmullRomCurve3(pts, this.closed);
    const geo   = this.bevelDepth > 0
      ? new THREE.TubeGeometry(curve, pts.length*2, this.bevelDepth, this.bevelRes, this.closed)
      : new THREE.TubeGeometry(curve, pts.length*2, radius, 8, this.closed);
    const mat  = new THREE.MeshStandardMaterial({ color:0x888aaa, roughness:0.5, metalness:0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name  = this.name;
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  // Convert to flat mesh (extrude along Z)
  toExtrudedMesh(scene) {
    const pts   = this.getPoints().map(p=>new THREE.Vector2(p.x, p.y));
    const shape = new THREE.Shape(pts);
    const geo   = new THREE.ExtrudeGeometry(shape, { depth:this.extrudeAmt||0.1, bevelEnabled:false });
    const mat   = new THREE.MeshStandardMaterial({ color:0x888aaa, roughness:0.5, metalness:0.1, side:THREE.DoubleSide });
    const mesh  = new THREE.Mesh(geo, mat);
    mesh.name   = this.name;
    scene.add(mesh);
    return mesh;
  }
}

export class NURBSCurve {
  constructor(name="NURBS") {
    this.name    = name;
    this.degree  = 3;
    this.points  = [];
    this.weights = [];
    this.knots   = [];
    this.closed  = false;
  }

  addPoint(pos, weight=1) {
    this.points.push(pos.clone());
    this.weights.push(weight);
    this._recalcKnots();
    return this;
  }

  _recalcKnots() {
    const n = this.points.length - 1;
    const d = Math.min(this.degree, n);
    this.knots = [];
    for (let i=0; i<=n+d+1; i++) {
      if(i<=d)this.knots.push(0);
      else if(i>n)this.knots.push(1);
      else this.knots.push((i-d)/(n-d+1));
    }
  }

  getPoints(steps=64) {
    if (this.points.length < 2) return this.points;
    const curve = new THREE.CatmullRomCurve3(this.points, this.closed, "catmullrom", 0.5);
    return curve.getPoints(steps);
  }

  toMesh(scene, radius=0.05) {
    const pts  = this.getPoints();
    const crv  = new THREE.CatmullRomCurve3(pts, this.closed);
    const geo  = new THREE.TubeGeometry(crv, pts.length*2, radius, 8, this.closed);
    const mat  = new THREE.MeshStandardMaterial({ color:0xaaa888, roughness:0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name  = this.name;
    scene.add(mesh);
    return mesh;
  }
}

export class CurveSystem {
  constructor(scene) {
    this.scene  = scene;
    this.curves = new Map();
  }

  createBezier(name="Curve") {
    const c = new BezierCurve(name);
    this.curves.set(name, c);
    return c;
  }

  createNURBS(name="NURBS") {
    const c = new NURBSCurve(name);
    this.curves.set(name, c);
    return c;
  }

  // Create a path from an array of Vector3
  createPath(points, name="Path", radius=0.05) {
    const c = new BezierCurve(name);
    points.forEach(p => c.addPoint(p));
    const mesh = c.toMesh(this.scene, radius);
    this.curves.set(name, c);
    return { curve:c, mesh };
  }

  // Circle curve
  createCircle(radius=1, name="Circle") {
    const pts=[];
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius));
    }
    return this.createPath(pts, name);
  }

  // Helix
  createHelix(radius=1, height=3, turns=3, name="Helix") {
    const pts=[];
    const steps=turns*16;
    for(let i=0;i<=steps;i++){
      const t=i/steps, a=t*turns*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*radius,t*height-height/2,Math.sin(a)*radius));
    }
    return this.createPath(pts, name);
  }

  convertToMesh(curveName, radius=0.05) {
    const c = this.curves.get(curveName);
    if (!c) return null;
    return c.toMesh(this.scene, radius);
  }

  dispose() { this.curves.clear(); }
}
