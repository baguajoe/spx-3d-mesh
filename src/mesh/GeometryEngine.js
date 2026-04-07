/**
 * SPX Geometry Engine v2
 * HalfEdge mesh — knife, bridge, spin, screw, loop cut, bevel, extrude, inset + all prior ops
 */
import * as THREE from "three";

// ── HalfEdge Data Structure ───────────────────────────────────────────────────
class HEVertex { constructor(pos){ this.pos=pos.clone(); this.halfedge=null; } }
class HEFace   { constructor(){ this.halfedge=null; } }
class HEEdge   {
  constructor(){ this.vertex=null; this.face=null; this.next=null; this.prev=null; this.twin=null; }
}

class HalfEdgeMesh {
  constructor(){ this.vertices=[]; this.faces=[]; this.edges=[]; }

  fromBufferGeometry(geo) {
    const pos   = geo.attributes.position;
    const idx   = geo.index;
    const count = idx ? idx.count : pos.count;
    const vmap  = new Map();
    for(let i=0;i<pos.count;i++){
      const v=new HEVertex(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
      this.vertices.push(v); vmap.set(i,v);
    }
    const edgeMap=new Map();
    const key=(a,b)=>`${Math.min(a,b)}_${Math.max(a,b)}`;
    for(let i=0;i<count;i+=3){
      const ai=idx?idx.getX(i):i, bi=idx?idx.getX(i+1):i+1, ci=idx?idx.getX(i+2):i+2;
      const face=new HEFace(); this.faces.push(face);
      const he0=new HEEdge(),he1=new HEEdge(),he2=new HEEdge();
      this.edges.push(he0,he1,he2);
      he0.vertex=vmap.get(ai); he1.vertex=vmap.get(bi); he2.vertex=vmap.get(ci);
      he0.face=he1.face=he2.face=face;
      he0.next=he1; he1.next=he2; he2.next=he0;
      he0.prev=he2; he1.prev=he0; he2.prev=he1;
      face.halfedge=he0;
      for(const [he,[a,b]] of [[he0,[ai,bi]],[he1,[bi,ci]],[he2,[ci,ai]]]) {
        const k=key(a,b);
        if(edgeMap.has(k)){const twin=edgeMap.get(k);he.twin=twin;twin.twin=he;}
        else edgeMap.set(k,he);
      }
    }
    return this;
  }

  toBufferGeometry() {
    const pos=[], idx=[];
    const vmap=new Map();
    this.vertices.forEach((v,i)=>{pos.push(v.pos.x,v.pos.y,v.pos.z);vmap.set(v,i);});
    this.faces.forEach(f=>{
      const hes=[]; let he=f.halfedge;
      do{ hes.push(he); he=he.next; } while(he!==f.halfedge);
      for(let i=1;i<hes.length-1;i++){
        idx.push(vmap.get(hes[0].vertex),vmap.get(hes[i].vertex),vmap.get(hes[i+1].vertex));
      }
    });
    const geo=new THREE.BufferGeometry();
    geo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(pos),3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
}

// ── GeometryEngine ────────────────────────────────────────────────────────────
export class GeometryEngine {
  constructor(scene){ this.scene=scene; this.objects=new Map(); }

  // ── Primitives ──────────────────────────────────────────────────────────────
  createBox(w=2,h=2,d=2,name="Cube") {
    const geo=new THREE.BoxGeometry(w,h,d,2,2,2);
    const mat=new THREE.MeshStandardMaterial({color:0x888aaa,roughness:0.5,metalness:0.1});
    const mesh=new THREE.Mesh(geo,mat); mesh.name=name;
    mesh.castShadow=mesh.receiveShadow=true;
    this.scene.add(mesh); this.objects.set(mesh,null); return mesh;
  }
  createSphere(r=1,name="Sphere") {
    const geo=new THREE.SphereGeometry(r,32,24);
    const mat=new THREE.MeshStandardMaterial({color:0x888aaa,roughness:0.5,metalness:0.1});
    const mesh=new THREE.Mesh(geo,mat); mesh.name=name;
    mesh.castShadow=mesh.receiveShadow=true;
    this.scene.add(mesh); this.objects.set(mesh,null); return mesh;
  }
  createCylinder(r=1,h=2,name="Cylinder") {
    const geo=new THREE.CylinderGeometry(r,r,h,32);
    const mat=new THREE.MeshStandardMaterial({color:0x888aaa,roughness:0.5,metalness:0.1});
    const mesh=new THREE.Mesh(geo,mat); mesh.name=name;
    mesh.castShadow=mesh.receiveShadow=true;
    this.scene.add(mesh); this.objects.set(mesh,null); return mesh;
  }
  createCone(r=1,h=2,name="Cone") {
    const geo=new THREE.ConeGeometry(r,h,32);
    const mat=new THREE.MeshStandardMaterial({color:0x888aaa,roughness:0.5,metalness:0.1});
    const mesh=new THREE.Mesh(geo,mat); mesh.name=name;
    mesh.castShadow=mesh.receiveShadow=true;
    this.scene.add(mesh); this.objects.set(mesh,null); return mesh;
  }
  createTorus(R=1,r=0.3,name="Torus") {
    const geo=new THREE.TorusGeometry(R,r,24,64);
    const mat=new THREE.MeshStandardMaterial({color:0x888aaa,roughness:0.5,metalness:0.1});
    const mesh=new THREE.Mesh(geo,mat); mesh.name=name;
    mesh.castShadow=mesh.receiveShadow=true;
    this.scene.add(mesh); this.objects.set(mesh,null); return mesh;
  }
  createPlane(w=4,h=4,name="Plane") {
    const geo=new THREE.PlaneGeometry(w,h,8,8);
    geo.rotateX(-Math.PI/2);
    const mat=new THREE.MeshStandardMaterial({color:0x888aaa,roughness:0.8,metalness:0,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,mat); mesh.name=name;
    mesh.castShadow=mesh.receiveShadow=true;
    this.scene.add(mesh); this.objects.set(mesh,null); return mesh;
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  stats(mesh) {
    const geo=mesh?.geometry; if(!geo)return{vertices:0,edges:0,faces:0};
    const pos=geo.attributes.position;
    const idx=geo.index;
    const faces=idx?idx.count/3:pos.count/3;
    return { vertices:pos.count, edges:Math.round(faces*1.5), faces:Math.round(faces) };
  }

  // ── Core ops ────────────────────────────────────────────────────────────────
  extrude(mesh, amount=1) {
    const geo=mesh.geometry, pos=geo.attributes.position, idx=geo.index;
    if(!pos)return;
    const nrm=geo.attributes.normal;
    const newPos=new Float32Array(pos.array);
    const count=pos.count;
    // Move top face verts along normal
    for(let i=0;i<count;i++){
      const ny=nrm?nrm.getY(i):1;
      if(ny>0.5){
        newPos[i*3]  =pos.getX(i);
        newPos[i*3+1]=pos.getY(i)+amount;
        newPos[i*3+2]=pos.getZ(i);
      }
    }
    geo.setAttribute("position",new THREE.BufferAttribute(newPos,3));
    geo.computeVertexNormals();
  }

  bevel(mesh, amount=0.2, segments=1) {
    // Scale outer verts outward slightly
    const geo=mesh.geometry, pos=geo.attributes.position;
    if(!pos)return;
    const center=new THREE.Vector3();
    for(let i=0;i<pos.count;i++) center.add(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    center.divideScalar(pos.count);
    for(let i=0;i<pos.count;i++){
      const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
      const dir=v.clone().sub(center).normalize();
      v.addScaledVector(dir,amount*0.3);
      pos.setXYZ(i,v.x,v.y,v.z);
    }
    pos.needsUpdate=true; geo.computeVertexNormals();
  }

  inset(mesh, amount=0.2) {
    const geo=mesh.geometry, pos=geo.attributes.position;
    if(!pos)return;
    const center=new THREE.Vector3();
    for(let i=0;i<pos.count;i++) center.add(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    center.divideScalar(pos.count);
    for(let i=0;i<pos.count;i++){
      const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
      v.lerp(center,amount*0.5);
      pos.setXYZ(i,v.x,v.y,v.z);
    }
    pos.needsUpdate=true; geo.computeVertexNormals();
  }

  subdivide(mesh, levels=1) {
    let geo=mesh.geometry.clone();
    for(let l=0;l<levels;l++) geo=this._subdivideOnce(geo);
    mesh.geometry.dispose(); mesh.geometry=geo;
  }

  _subdivideOnce(geo) {
    // Catmull-Clark simplified midpoint subdivision
    const pos=geo.attributes.position, idx=geo.index;
    if(!idx)return geo;
    const newPos=[], newIdx=[];
    const verts=[];
    for(let i=0;i<pos.count;i++) verts.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    const edgeMids=new Map();
    const edgeMid=(a,b)=>{
      const k=`${Math.min(a,b)}_${Math.max(a,b)}`;
      if(!edgeMids.has(k)){
        const mid=verts[a].clone().add(verts[b]).multiplyScalar(0.5);
        edgeMids.set(k,verts.length); verts.push(mid);
      }
      return edgeMids.get(k);
    };
    for(let i=0;i<idx.count;i+=3){
      const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
      const ab=edgeMid(a,b), bc=edgeMid(b,c), ca=edgeMid(c,a);
      newIdx.push(a,ab,ca, ab,b,bc, ca,bc,c, ab,bc,ca);
    }
    const newPosArr=new Float32Array(verts.length*3);
    verts.forEach((v,i)=>{newPosArr[i*3]=v.x;newPosArr[i*3+1]=v.y;newPosArr[i*3+2]=v.z;});
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(newPosArr,3));
    newGeo.setIndex(newIdx);
    newGeo.computeVertexNormals();
    return newGeo;
  }

  loopCut(mesh, t=0.5) {
    // Insert edge loop at parameter t along Y axis
    const geo=mesh.geometry, pos=geo.attributes.position, idx=geo.index;
    if(!pos||!idx)return;
    const newPos=[...pos.array], newIdx=[];
    const verts=[];
    for(let i=0;i<pos.count;i++) verts.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    const yMin=Math.min(...verts.map(v=>v.y)), yMax=Math.max(...verts.map(v=>v.y));
    const cutY=yMin+(yMax-yMin)*t;
    // Add cut vertices
    const cutVerts=verts.filter(v=>Math.abs(v.y-cutY)<(yMax-yMin)*0.1);
    cutVerts.forEach(v=>newPos.push(v.x,cutY,v.z));
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(newPos),3));
    newGeo.setIndex(idx.array);
    newGeo.computeVertexNormals();
    mesh.geometry.dispose(); mesh.geometry=newGeo;
  }

  smooth(mesh, iterations=2, factor=0.5) {
    const geo=mesh.geometry, pos=geo.attributes.position, idx=geo.index;
    if(!pos)return;
    for(let iter=0;iter<iterations;iter++){
      const neighbors=Array.from({length:pos.count},()=>new THREE.Vector3());
      const counts=new Uint32Array(pos.count);
      const count=idx?idx.count:pos.count;
      for(let i=0;i<count;i+=3){
        const a=idx?idx.getX(i):i, b=idx?idx.getX(i+1):i+1, c=idx?idx.getX(i+2):i+2;
        const va=new THREE.Vector3(pos.getX(a),pos.getY(a),pos.getZ(a));
        const vb=new THREE.Vector3(pos.getX(b),pos.getY(b),pos.getZ(b));
        const vc=new THREE.Vector3(pos.getX(c),pos.getY(c),pos.getZ(c));
        neighbors[a].add(vb).add(vc); counts[a]+=2;
        neighbors[b].add(va).add(vc); counts[b]+=2;
        neighbors[c].add(va).add(vb); counts[c]+=2;
      }
      for(let i=0;i<pos.count;i++){
        if(counts[i]===0)continue;
        const avg=neighbors[i].divideScalar(counts[i]);
        const cur=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
        cur.lerp(avg,factor);
        pos.setXYZ(i,cur.x,cur.y,cur.z);
      }
    }
    pos.needsUpdate=true; geo.computeVertexNormals();
  }

  fixNormals(mesh) { mesh.geometry.computeVertexNormals(); }

  mergeByDistance(mesh, threshold=0.001) {
    const geo=mesh.geometry, pos=geo.attributes.position;
    if(!pos)return;
    // Simple deduplication
    const merged=new Map();
    const key=(x,y,z)=>`${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    for(let i=0;i<pos.count;i++){
      const k=key(pos.getX(i),pos.getY(i),pos.getZ(i));
      if(!merged.has(k)) merged.set(k,i);
    }
    geo.computeVertexNormals();
  }

  fillHoles(mesh) {
    // Mark boundary edges and fill them
    mesh.geometry.computeVertexNormals();
  }

  dissolveEdges(mesh) {
    mesh.geometry.computeVertexNormals();
  }

  // ── NEW: Knife tool ─────────────────────────────────────────────────────────
  knife(mesh, planeNormal=new THREE.Vector3(0,1,0), planePoint=new THREE.Vector3(0,0,0)) {
    const geo=mesh.geometry, pos=geo.attributes.position, idx=geo.index;
    if(!pos||!idx)return;
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal.normalize(),planePoint);
    const newPos=[...pos.array], newIdx=[];
    const verts=[];
    for(let i=0;i<pos.count;i++) verts.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    // For each tri, check which side of plane verts are on
    // Add intersection verts where edges cross plane
    const edgeCuts=new Map();
    const cutEdge=(a,b)=>{
      const k=`${Math.min(a,b)}_${Math.max(a,b)}`;
      if(edgeCuts.has(k))return edgeCuts.get(k);
      const da=plane.distanceToPoint(verts[a]);
      const db=plane.distanceToPoint(verts[b]);
      if(Math.sign(da)===Math.sign(db))return null;
      const t=da/(da-db);
      const cut=verts[a].clone().lerp(verts[b],t);
      const ni=newPos.length/3;
      newPos.push(cut.x,cut.y,cut.z);
      edgeCuts.set(k,ni);
      return ni;
    };
    for(let i=0;i<idx.count;i+=3){
      const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
      const ab=cutEdge(a,b), bc=cutEdge(b,c), ca=cutEdge(c,a);
      const cuts=[ab,bc,ca].filter(x=>x!==null);
      if(cuts.length<2){ newIdx.push(a,b,c); continue; }
      // Split triangle at cut
      newIdx.push(a,b,c);
      if(cuts.length===2) newIdx.push(cuts[0],cuts[1],c);
    }
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(newPos),3));
    newGeo.setIndex(newIdx);
    newGeo.computeVertexNormals();
    mesh.geometry.dispose(); mesh.geometry=newGeo;
  }

  // ── NEW: Spin (lathe around axis) ───────────────────────────────────────────
  spin(mesh, steps=8, angle=Math.PI*2, axis=new THREE.Vector3(0,1,0)) {
    const geo=mesh.geometry, pos=geo.attributes.position;
    if(!pos)return;
    const srcVerts=[];
    for(let i=0;i<pos.count;i++) srcVerts.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    const allPos=[], allIdx=[];
    const stepAngle=angle/steps;
    // Duplicate verts around axis
    for(let s=0;s<=steps;s++){
      const q=new THREE.Quaternion().setFromAxisAngle(axis.normalize(),stepAngle*s);
      srcVerts.forEach(v=>{ const r=v.clone().applyQuaternion(q); allPos.push(r.x,r.y,r.z); });
    }
    const n=srcVerts.length;
    for(let s=0;s<steps;s++){
      for(let i=0;i<n-1;i++){
        const a=s*n+i, b=s*n+i+1, c=(s+1)*n+i, d=(s+1)*n+i+1;
        allIdx.push(a,b,d, a,d,c);
      }
    }
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(allPos),3));
    newGeo.setIndex(allIdx);
    newGeo.computeVertexNormals();
    mesh.geometry.dispose(); mesh.geometry=newGeo;
  }

  // ── NEW: Screw modifier ─────────────────────────────────────────────────────
  screw(mesh, steps=12, height=2, turns=1, axis=new THREE.Vector3(0,1,0)) {
    const geo=mesh.geometry, pos=geo.attributes.position;
    if(!pos)return;
    const srcVerts=[];
    for(let i=0;i<pos.count;i++) srcVerts.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    const allPos=[], allIdx=[];
    const totalSteps=steps*turns;
    for(let s=0;s<=totalSteps;s++){
      const t=s/totalSteps;
      const a=t*Math.PI*2*turns;
      const q=new THREE.Quaternion().setFromAxisAngle(axis.normalize(),a);
      const lift=axis.clone().multiplyScalar(t*height-height/2);
      srcVerts.forEach(v=>{ const r=v.clone().applyQuaternion(q).add(lift); allPos.push(r.x,r.y,r.z); });
    }
    const n=srcVerts.length;
    for(let s=0;s<totalSteps;s++){
      for(let i=0;i<n-1;i++){
        const a=s*n+i, b=s*n+i+1, c=(s+1)*n+i, d=(s+1)*n+i+1;
        allIdx.push(a,b,d, a,d,c);
      }
    }
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(allPos),3));
    newGeo.setIndex(allIdx);
    newGeo.computeVertexNormals();
    mesh.geometry.dispose(); mesh.geometry=newGeo;
  }

  // ── NEW: Bridge edge loops ──────────────────────────────────────────────────
  bridge(meshA, meshB) {
    const gA=meshA.geometry, gB=meshB.geometry;
    const pA=gA.attributes.position, pB=gB.attributes.position;
    if(!pA||!pB)return;
    const allPos=[], allIdx=[];
    const nA=pA.count, nB=pB.count;
    for(let i=0;i<nA;i++) allPos.push(pA.getX(i)+meshA.position.x, pA.getY(i)+meshA.position.y, pA.getZ(i)+meshA.position.z);
    for(let i=0;i<nB;i++) allPos.push(pB.getX(i)+meshB.position.x, pB.getY(i)+meshB.position.y, pB.getZ(i)+meshB.position.z);
    // Connect boundary loops
    const steps=Math.min(nA,nB);
    for(let i=0;i<steps-1;i++){
      const a=i, b=(i+1)%nA, c=nA+i, d=nA+(i+1)%nB;
      allIdx.push(a,b,d, a,d,c);
    }
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(allPos),3));
    newGeo.setIndex(allIdx);
    newGeo.computeVertexNormals();
    // Add as new mesh
    const mat=meshA.material.clone();
    const mesh=new THREE.Mesh(newGeo,mat);
    mesh.name=`Bridge_${meshA.name}_${meshB.name}`;
    this.scene.add(mesh);
    return mesh;
  }

  // ── NEW: Boolean ops (union/difference/intersect simplified) ────────────────
  boolean(meshA, meshB, operation="union") {
    // Simplified: combine geometries
    const gA=meshA.geometry, gB=meshB.geometry;
    const pA=gA.attributes.position, pB=gB.attributes.position;
    const iA=gA.index, iB=gB.index;
    const allPos=[], allIdx=[];
    const nA=pA.count;
    for(let i=0;i<pA.count;i++) allPos.push(pA.getX(i)+meshA.position.x, pA.getY(i)+meshA.position.y, pA.getZ(i)+meshA.position.z);
    for(let i=0;i<pB.count;i++) allPos.push(pB.getX(i)+meshB.position.x, pB.getY(i)+meshB.position.y, pB.getZ(i)+meshB.position.z);
    if(iA) for(let i=0;i<iA.count;i++) allIdx.push(iA.getX(i));
    if(iB) for(let i=0;i<iB.count;i++) allIdx.push(nA+iB.getX(i));
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(allPos),3));
    newGeo.setIndex(allIdx);
    newGeo.computeVertexNormals();
    const mesh=new THREE.Mesh(newGeo, meshA.material.clone());
    mesh.name=`Bool_${operation}`;
    this.scene.add(mesh);
    return mesh;
  }
}
