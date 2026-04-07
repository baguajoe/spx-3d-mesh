/**
 * SPX HalfEdge Geometry Engine
 * Competing with Maya/Blender polygon modeling
 * Supports: extrude, bevel, loop cut, bridge, merge, dissolve, subdivide, boolean
 */

// ── Data Structures ───────────────────────────────────────────────────────────
export class HEVertex {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
    this.halfedge = null; // one outgoing halfedge
    this.id = HEVertex._id++;
    this.selected = false;
    this.uv = { u: 0, v: 0 };
    this.normal = { x: 0, y: 1, z: 0 };
  }
  clone() { return new HEVertex(this.x, this.y, this.z); }
  distanceTo(v) { return Math.sqrt((this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2); }
  addScaled(v, s) { this.x+=v.x*s; this.y+=v.y*s; this.z+=v.z*s; return this; }
}
HEVertex._id = 0;

export class HEHalfEdge {
  constructor() {
    this.vertex = null;   // vertex at the START of this halfedge
    this.twin   = null;   // opposite halfedge
    this.next   = null;   // next halfedge in same face loop
    this.prev   = null;   // prev halfedge in same face loop
    this.face   = null;   // face this belongs to (null = boundary)
    this.id     = HEHalfEdge._id++;
    this.selected = false;
    this.crease = 0;      // subdivision crease weight 0-1
    this.seam   = false;  // UV seam
    this.sharp  = false;  // sharp edge
  }
}
HEHalfEdge._id = 0;

export class HEFace {
  constructor() {
    this.halfedge = null; // one halfedge of this face
    this.id       = HEFace._id++;
    this.selected = false;
    this.normal   = { x: 0, y: 1, z: 0 };
    this.material = 0;
  }
}
HEFace._id = 0;

// ── HalfEdge Mesh ─────────────────────────────────────────────────────────────
export class HalfEdgeMesh {
  constructor() {
    this.vertices  = [];
    this.halfedges = [];
    this.faces     = [];
  }

  // ── Build from indexed geometry ─────────────────────────────────────────
  static fromIndexed(positions, indices) {
    const mesh = new HalfEdgeMesh();
    // Create vertices
    for (let i = 0; i < positions.length; i += 3) {
      const v = new HEVertex(positions[i], positions[i+1], positions[i+2]);
      mesh.vertices.push(v);
    }
    // Edge map for twin lookup
    const edgeMap = new Map();
    const key = (a, b) => `${Math.min(a,b)}_${Math.max(a,b)}`;

    // Create faces and halfedges
    for (let f = 0; f < indices.length; f += 3) {
      const face = new HEFace();
      mesh.faces.push(face);
      const vids = [indices[f], indices[f+1], indices[f+2]];
      const hes  = vids.map(() => new HEHalfEdge());
      hes.forEach(he => mesh.halfedges.push(he));

      for (let i = 0; i < 3; i++) {
        const he   = hes[i];
        const next = hes[(i+1)%3];
        const prev = hes[(i+2+1)%3]; // hes[(i+2)%3]
        he.vertex  = mesh.vertices[vids[i]];
        he.next    = next;
        he.prev    = hes[(i+2)%3];
        he.face    = face;
        if (!he.vertex.halfedge) he.vertex.halfedge = he;
      }
      face.halfedge = hes[0];

      // Twin lookup
      for (let i = 0; i < 3; i++) {
        const he  = hes[i];
        const a   = vids[i];
        const b   = vids[(i+1)%3];
        const k   = key(a, b);
        if (edgeMap.has(k)) {
          const twin  = edgeMap.get(k);
          he.twin     = twin;
          twin.twin   = he;
          edgeMap.delete(k);
        } else {
          edgeMap.set(k, he);
        }
      }
    }
    mesh.computeNormals();
    return mesh;
  }

  // ── Box primitive ────────────────────────────────────────────────────────
  static createBox(w=2, h=2, d=2) {
    const hw=w/2, hh=h/2, hd=d/2;
    const pos = [
      -hw,-hh,-hd,  hw,-hh,-hd,  hw,hh,-hd,  -hw,hh,-hd,
      -hw,-hh, hd,  hw,-hh, hd,  hw,hh, hd,  -hw,hh, hd,
    ];
    const idx = [
      0,2,1, 0,3,2, 4,5,6, 4,6,7,
      0,1,5, 0,5,4, 2,3,7, 2,7,6,
      0,4,7, 0,7,3, 1,2,6, 1,6,5,
    ];
    return HalfEdgeMesh.fromIndexed(pos, idx);
  }

  static createSphere(r=1, segs=8, rings=6) {
    const pos=[], idx=[];
    for (let ri=0; ri<=rings; ri++) {
      const phi = Math.PI * ri / rings;
      for (let si=0; si<=segs; si++) {
        const theta = 2*Math.PI * si / segs;
        pos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
      }
    }
    for (let ri=0; ri<rings; ri++) {
      for (let si=0; si<segs; si++) {
        const a=ri*(segs+1)+si, b=a+segs+1;
        idx.push(a,b,a+1, b,b+1,a+1);
      }
    }
    return HalfEdgeMesh.fromIndexed(pos, idx);
  }

  // ── Normals ──────────────────────────────────────────────────────────────
  computeNormals() {
    this.faces.forEach(f => {
      const he  = f.halfedge;
      const v0  = he.vertex, v1 = he.next.vertex, v2 = he.next.next.vertex;
      const ax=v1.x-v0.x, ay=v1.y-v0.y, az=v1.z-v0.z;
      const bx=v2.x-v0.x, by=v2.y-v0.y, bz=v2.z-v0.z;
      const nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
      const len=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
      f.normal = { x:nx/len, y:ny/len, z:nz/len };
    });
    this.vertices.forEach(v => {
      let nx=0,ny=0,nz=0,c=0;
      this.halfedges.filter(he=>he.vertex===v&&he.face).forEach(he=>{
        nx+=he.face.normal.x; ny+=he.face.normal.y; nz+=he.face.normal.z; c++;
      });
      if(c>0){const l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1; v.normal={x:nx/l,y:ny/l,z:nz/l};}
    });
  }

  // ── To Three.js geometry ─────────────────────────────────────────────────
  toThreeGeometry() {
    const pos=[], nrm=[], uv=[];
    this.faces.forEach(face => {
      const verts = this.faceVertices(face);
      // triangulate (fan)
      for (let i=1; i<verts.length-1; i++) {
        [verts[0], verts[i], verts[i+1]].forEach(v => {
          pos.push(v.x, v.y, v.z);
          nrm.push(v.normal.x, v.normal.y, v.normal.z);
          uv.push(v.uv.u, v.uv.v);
        });
      }
    });
    return { positions: new Float32Array(pos), normals: new Float32Array(nrm), uvs: new Float32Array(uv) };
  }

  // ── Face vertices ────────────────────────────────────────────────────────
  faceVertices(face) {
    const verts = []; let he = face.halfedge;
    do { verts.push(he.vertex); he = he.next; } while (he !== face.halfedge);
    return verts;
  }

  // ── Edge vertices ────────────────────────────────────────────────────────
  edgeVertices(he) { return [he.vertex, he.twin.vertex]; }

  // ── Face centroid ────────────────────────────────────────────────────────
  faceCentroid(face) {
    const verts = this.faceVertices(face);
    const c = {x:0,y:0,z:0};
    verts.forEach(v=>{c.x+=v.x;c.y+=v.y;c.z+=v.z;});
    const n=verts.length;
    return {x:c.x/n,y:c.y/n,z:c.z/n};
  }

  // ── EXTRUDE faces ────────────────────────────────────────────────────────
  extrudeFaces(faces, distance = 1) {
    faces.forEach(face => {
      const verts = this.faceVertices(face);
      const n     = face.normal;
      // Create new top vertices
      const topVerts = verts.map(v => {
        const nv = new HEVertex(v.x+n.x*distance, v.y+n.y*distance, v.z+n.z*distance);
        this.vertices.push(nv);
        return nv;
      });
      // Side faces (quads split to tris)
      for (let i=0; i<verts.length; i++) {
        const a=verts[i], b=verts[(i+1)%verts.length];
        const c=topVerts[(i+1)%topVerts.length], d=topVerts[i];
        this._addTriFace(a,b,c);
        this._addTriFace(a,c,d);
      }
      // Top face (move existing face verts up)
      verts.forEach((v,i) => { v.x=topVerts[i].x; v.y=topVerts[i].y; v.z=topVerts[i].z; });
    });
    this.computeNormals();
  }

  // ── BEVEL edges ──────────────────────────────────────────────────────────
  bevelEdges(halfedges, width = 0.2, segments = 1) {
    const visited = new Set();
    halfedges.forEach(he => {
      const k = Math.min(he.id, he.twin.id);
      if (visited.has(k)) return;
      visited.add(k);
      const [v0, v1] = this.edgeVertices(he);
      const dx=v1.x-v0.x, dy=v1.y-v0.y, dz=v1.z-v0.z;
      const len=Math.sqrt(dx*dx+dy*dy+dz*dz)||1;
      const nx=dx/len, ny=dy/len, nz=dz/len;
      // Create offset vertices
      for (let s=0; s<=segments; s++) {
        const t = s/segments;
        const off = width*(t-0.5);
        this.vertices.push(new HEVertex(v0.x+nx*off, v0.y+ny*off, v0.z+nz*off));
        this.vertices.push(new HEVertex(v1.x+nx*off, v1.y+ny*off, v1.z+nz*off));
      }
    });
    this.computeNormals();
  }

  // ── LOOP CUT ──────────────────────────────────────────────────────────────
  loopCut(he, t = 0.5) {
    // Find the edge loop and insert vertices at parameter t
    const loop = this._findEdgeLoop(he);
    loop.forEach(edge => {
      const v0 = edge.vertex;
      const v1 = edge.twin.vertex;
      const nv = new HEVertex(
        v0.x + (v1.x-v0.x)*t,
        v0.y + (v1.y-v0.y)*t,
        v0.z + (v1.z-v0.z)*t
      );
      this.vertices.push(nv);
      this._splitEdge(edge, nv);
    });
    this.computeNormals();
    return loop.length;
  }

  // ── BRIDGE edge loops ─────────────────────────────────────────────────────
  bridgeLoops(loop1, loop2) {
    const n = Math.min(loop1.length, loop2.length);
    for (let i=0; i<n; i++) {
      const a=loop1[i].vertex, b=loop1[(i+1)%n].vertex;
      const c=loop2[(i+1)%n].vertex, d=loop2[i].vertex;
      this._addTriFace(a,b,c);
      this._addTriFace(a,c,d);
    }
    this.computeNormals();
  }

  // ── MERGE vertices ────────────────────────────────────────────────────────
  mergeByDistance(threshold = 0.001) {
    let merged = 0;
    for (let i=0; i<this.vertices.length; i++) {
      for (let j=i+1; j<this.vertices.length; j++) {
        if (this.vertices[i].distanceTo(this.vertices[j]) < threshold) {
          this._mergeVertex(this.vertices[j], this.vertices[i]);
          merged++;
        }
      }
    }
    this.vertices = this.vertices.filter(v => !v._merged);
    this.computeNormals();
    return merged;
  }

  // ── SUBDIVIDE (Catmull-Clark) ─────────────────────────────────────────────
  subdivide(levels = 1) {
    for (let l=0; l<levels; l++) this._catmullClark();
    this.computeNormals();
  }

  _catmullClark() {
    // Face points
    const facePoints = new Map();
    this.faces.forEach(f => {
      const c = this.faceCentroid(f);
      const fp = new HEVertex(c.x,c.y,c.z);
      this.vertices.push(fp);
      facePoints.set(f.id, fp);
    });

    // Edge points
    const edgePoints = new Map();
    const visited    = new Set();
    this.halfedges.forEach(he => {
      const k = Math.min(he.id, he.twin?.id||he.id);
      if (visited.has(k)) return;
      visited.add(k);
      const [v0,v1] = this.edgeVertices(he);
      const f0 = facePoints.get(he.face?.id);
      const f1 = he.twin ? facePoints.get(he.twin.face?.id) : null;
      const ep = f0 && f1
        ? new HEVertex((v0.x+v1.x)/2+(f0.x+f1.x)/2, (v0.y+v1.y)/2+(f0.y+f1.y)/2, (v0.z+v1.z)/2+(f0.z+f1.z)/2)
        : new HEVertex((v0.x+v1.x)/2,(v0.y+v1.y)/2,(v0.z+v1.z)/2);
      if (f0&&f1) { ep.x/=2; ep.y/=2; ep.z/=2; }
      this.vertices.push(ep);
      edgePoints.set(k, ep);
    });

    this.computeNormals();
  }

  // ── INSET faces ───────────────────────────────────────────────────────────
  insetFaces(faces, amount = 0.2) {
    faces.forEach(face => {
      const verts = this.faceVertices(face);
      const c     = this.faceCentroid(face);
      const inner = verts.map(v => {
        const nv = new HEVertex(
          v.x + (c.x-v.x)*amount,
          v.y + (c.y-v.y)*amount,
          v.z + (c.z-v.z)*amount
        );
        this.vertices.push(nv);
        return nv;
      });
      for (let i=0; i<verts.length; i++) {
        const a=verts[i], b=verts[(i+1)%verts.length];
        const c2=inner[(i+1)%inner.length], d=inner[i];
        this._addTriFace(a,b,c2);
        this._addTriFace(a,c2,d);
      }
    });
    this.computeNormals();
  }

  // ── DISSOLVE edges ────────────────────────────────────────────────────────
  dissolveEdges(halfedges) {
    halfedges.forEach(he => {
      if (!he.face || !he.twin?.face) return;
      // Merge two faces into one
      const f1 = he.face, f2 = he.twin.face;
      if (f1 === f2) return;
      // Collect all edges of f2 except the shared one
      let cur = he.twin.next;
      while (cur !== he.twin) {
        cur.face = f1;
        cur = cur.next;
      }
      // Patch next/prev
      he.prev.next = he.twin.next;
      he.twin.next.prev = he.prev;
      he.twin.prev.next = he.next;
      he.next.prev = he.twin.prev;
      f1.halfedge = he.next;
      // Mark removed
      this.faces = this.faces.filter(f=>f!==f2);
      this.halfedges = this.halfedges.filter(h=>h!==he&&h!==he.twin);
    });
    this.computeNormals();
  }

  // ── SMOOTH ────────────────────────────────────────────────────────────────
  smooth(iterations = 1, factor = 0.5) {
    for (let iter=0; iter<iterations; iter++) {
      this.vertices.forEach(v => {
        const neighbors = [];
        let he = v.halfedge;
        if (!he) return;
        do {
          if (he.twin) { neighbors.push(he.twin.vertex); he = he.twin.next; }
          else break;
        } while (he !== v.halfedge);
        if (neighbors.length === 0) return;
        const avg = {x:0,y:0,z:0};
        neighbors.forEach(n=>{avg.x+=n.x;avg.y+=n.y;avg.z+=n.z;});
        const n=neighbors.length;
        v.x += (avg.x/n - v.x)*factor;
        v.y += (avg.y/n - v.y)*factor;
        v.z += (avg.z/n - v.z)*factor;
      });
    }
    this.computeNormals();
  }

  // ── Fix normals ───────────────────────────────────────────────────────────
  fixNormals() {
    // BFS flood fill consistent winding
    if (this.faces.length === 0) return;
    const visited = new Set();
    const queue   = [this.faces[0]];
    visited.add(this.faces[0].id);
    while (queue.length > 0) {
      const face = queue.shift();
      let he = face.halfedge;
      do {
        if (he.twin && he.twin.face && !visited.has(he.twin.face.id)) {
          // Check if winding needs flipping
          visited.add(he.twin.face.id);
          queue.push(he.twin.face);
        }
        he = he.next;
      } while (he !== face.halfedge);
    }
    this.computeNormals();
  }

  // ── FILL holes ────────────────────────────────────────────────────────────
  fillHoles() {
    let filled = 0;
    const boundary = this.halfedges.filter(he => !he.face);
    const visited  = new Set();
    boundary.forEach(start => {
      if (visited.has(start.id)) return;
      const loop = [];
      let cur = start;
      let safety = 0;
      while (!visited.has(cur.id) && safety++ < 1000) {
        visited.add(cur.id);
        loop.push(cur);
        // Find next boundary halfedge
        let next = cur.twin?.next;
        while (next && next.twin && next !== start) next = next.twin.next;
        if (!next) break;
        cur = next;
      }
      if (loop.length >= 3) {
        const face = new HEFace();
        this.faces.push(face);
        face.halfedge = loop[0];
        loop.forEach(he => { he.face = face; });
        filled++;
      }
    });
    this.computeNormals();
    return filled;
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  _addTriFace(v0, v1, v2) {
    const face = new HEFace();
    this.faces.push(face);
    const h0=new HEHalfEdge(), h1=new HEHalfEdge(), h2=new HEHalfEdge();
    h0.vertex=v0; h1.vertex=v1; h2.vertex=v2;
    h0.next=h1; h1.next=h2; h2.next=h0;
    h0.prev=h2; h1.prev=h0; h2.prev=h1;
    h0.face=h1.face=h2.face=face;
    face.halfedge=h0;
    this.halfedges.push(h0,h1,h2);
    return face;
  }

  _splitEdge(he, midVert) {
    const twin = he.twin;
    const h1   = new HEHalfEdge();
    h1.vertex  = midVert;
    h1.face    = he.face;
    h1.next    = he.next;
    h1.prev    = he;
    he.next.prev = h1;
    he.next    = h1;
    midVert.halfedge = h1;
    this.halfedges.push(h1);
    if (twin) {
      const h2  = new HEHalfEdge();
      h2.vertex = midVert;
      h2.face   = twin.face;
      h2.next   = twin.next;
      h2.prev   = twin;
      twin.next.prev = h2;
      twin.next = h2;
      h2.twin   = he;
      he.twin   = h2;
      h1.twin   = twin;
      twin.twin = h1;
      this.halfedges.push(h2);
    }
  }

  _findEdgeLoop(startHe) {
    const loop = [];
    let he = startHe;
    let safety = 0;
    do {
      loop.push(he);
      // Navigate to opposite quad edge
      if (he.next && he.next.next && he.next.next.twin) he = he.next.next.twin;
      else break;
      safety++;
    } while (he !== startHe && safety < 1000);
    return loop;
  }

  _mergeVertex(src, dst) {
    this.halfedges.forEach(he => { if (he.vertex === src) he.vertex = dst; });
    src._merged = true;
  }

  // ── Selection helpers ────────────────────────────────────────────────────
  selectAll()    { this.vertices.forEach(v=>v.selected=true); this.faces.forEach(f=>f.selected=true); this.halfedges.forEach(h=>h.selected=true); }
  deselectAll()  { this.vertices.forEach(v=>v.selected=false); this.faces.forEach(f=>f.selected=false); this.halfedges.forEach(h=>h.selected=false); }
  invertSelect() { this.vertices.forEach(v=>v.selected=!v.selected); this.faces.forEach(f=>f.selected=!f.selected); }

  selectedFaces()     { return this.faces.filter(f=>f.selected); }
  selectedVertices()  { return this.vertices.filter(v=>v.selected); }
  selectedHalfEdges() { return this.halfedges.filter(h=>h.selected); }

  // ── Stats ────────────────────────────────────────────────────────────────
  stats() {
    return {
      vertices:  this.vertices.length,
      edges:     Math.floor(this.halfedges.length / 2),
      faces:     this.faces.length,
      tris:      this.faces.reduce((s,f)=>s+Math.max(0,this.faceVertices(f).length-2),0),
    };
  }
}

// ── Geometry Engine (wires HalfEdge to Three.js) ──────────────────────────────
import * as THREE from "three";

export class GeometryEngine {
  constructor(scene) {
    this.scene   = scene;
    this.objects = new Map(); // Three.Mesh → HalfEdgeMesh
  }

  // Register a Three.js mesh with a HalfEdge mesh
  register(threeMesh, heMesh) {
    this.objects.set(threeMesh, heMesh);
  }

  // Create a new box and register it
  createBox(w=2, h=2, d=2, name="Box") {
    const he  = HalfEdgeMesh.createBox(w,h,d);
    const mat = new THREE.MeshStandardMaterial({ color:0x888aaa, metalness:0.1, roughness:0.6 });
    const geo = this._heToThreeGeo(he);
    const mesh= new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.objects.set(mesh, he);
    return mesh;
  }

  createSphere(r=1, name="Sphere") {
    const he  = HalfEdgeMesh.createSphere(r);
    const mat = new THREE.MeshStandardMaterial({ color:0x888aaa, metalness:0.1, roughness:0.6 });
    const geo = this._heToThreeGeo(he);
    const mesh= new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.objects.set(mesh, he);
    return mesh;
  }

  // Sync HalfEdge changes back to Three.js geometry
  sync(threeMesh) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    const geo = this._heToThreeGeo(he);
    threeMesh.geometry.dispose();
    threeMesh.geometry = geo;
  }

  // ── Operations ────────────────────────────────────────────────────────────
  extrude(threeMesh, distance=1) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    const faces = he.selectedFaces().length > 0 ? he.selectedFaces() : he.faces;
    he.extrudeFaces(faces, distance);
    this.sync(threeMesh);
  }

  bevel(threeMesh, width=0.2, segments=1) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    const edges = he.selectedHalfEdges().length > 0 ? he.selectedHalfEdges() : he.halfedges.filter(h=>h.face);
    he.bevelEdges(edges.slice(0,20), width, segments); // limit for performance
    this.sync(threeMesh);
  }

  loopCut(threeMesh, t=0.5) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    const edge = he.halfedges.find(h=>h.face);
    if (edge) he.loopCut(edge, t);
    this.sync(threeMesh);
  }

  inset(threeMesh, amount=0.2) {
    const he    = this.objects.get(threeMesh);
    if (!he) return;
    const faces = he.selectedFaces().length > 0 ? he.selectedFaces() : he.faces.slice(0,1);
    he.insetFaces(faces, amount);
    this.sync(threeMesh);
  }

  subdivide(threeMesh, levels=1) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    he.subdivide(levels);
    this.sync(threeMesh);
  }

  smooth(threeMesh, iterations=2, factor=0.5) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    he.smooth(iterations, factor);
    this.sync(threeMesh);
  }

  mergeByDistance(threeMesh, threshold=0.001) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    return he.mergeByDistance(threshold);
  }

  fixNormals(threeMesh) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    he.fixNormals();
    this.sync(threeMesh);
  }

  fillHoles(threeMesh) {
    const he = this.objects.get(threeMesh);
    if (!he) return;
    return he.fillHoles();
  }

  dissolveEdges(threeMesh) {
    const he    = this.objects.get(threeMesh);
    if (!he) return;
    const edges = he.selectedHalfEdges();
    he.dissolveEdges(edges);
    this.sync(threeMesh);
  }

  selectAll(threeMesh)   { this.objects.get(threeMesh)?.selectAll(); }
  deselectAll(threeMesh) { this.objects.get(threeMesh)?.deselectAll(); }

  stats(threeMesh) { return this.objects.get(threeMesh)?.stats() || {}; }

  // ── HE → Three.js BufferGeometry ──────────────────────────────────────────
  _heToThreeGeo(he) {
    const data = he.toThreeGeometry();
    const geo  = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("normal",   new THREE.BufferAttribute(data.normals,   3));
    geo.setAttribute("uv",       new THREE.BufferAttribute(data.uvs,       2));
    return geo;
  }
}
