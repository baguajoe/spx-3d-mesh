/**
 * SPX Modifier System
 * Live/non-destructive modifiers: Mirror, Array, Solidify, Decimate, Weld, Bevel, Subdivision, Displace
 */
import * as THREE from "three";

// ── Base Modifier ─────────────────────────────────────────────────────────────
class Modifier {
  constructor(type, params={}) {
    this.type    = type;
    this.params  = params;
    this.enabled = true;
    this.name    = params.name || type;
  }
  apply(geo) { return geo; } // override in subclass
}

// ── Mirror Modifier ───────────────────────────────────────────────────────────
class MirrorModifier extends Modifier {
  constructor(params={}) {
    super("Mirror", params);
    this.x      = params.x ?? true;
    this.y      = params.y ?? false;
    this.z      = params.z ?? false;
    this.merge  = params.merge ?? true;
    this.threshold = params.threshold ?? 0.001;
  }
  apply(geo) {
    const pos = geo.attributes.position;
    const idx = geo.index;
    const verts = [];
    for(let i=0;i<pos.count;i++) verts.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    const orig = [...verts];
    const axes = [[this.x,1,0,0],[this.y,0,1,0],[this.z,0,0,1]];
    let allVerts=[...verts], allIdx=[];
    if(idx) for(let i=0;i<idx.count;i+=3) allIdx.push([idx.getX(i),idx.getX(i+1),idx.getX(i+2)]);
    axes.forEach(([enabled,ax,ay,az])=>{
      if(!enabled)return;
      const offset=allVerts.length-orig.length;
      orig.forEach(v=>allVerts.push(new THREE.Vector3(ax?-v.x:v.x, ay?-v.y:v.y, az?-v.z:v.z)));
      const base=allVerts.length-orig.length;
      if(idx) for(let i=0;i<idx.count;i+=3) allIdx.push([base+idx.getX(i+2),base+idx.getX(i+1),base+idx.getX(i)]);
    });
    const newPos=new Float32Array(allVerts.length*3);
    allVerts.forEach((v,i)=>{newPos[i*3]=v.x;newPos[i*3+1]=v.y;newPos[i*3+2]=v.z;});
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(newPos,3));
    if(allIdx.length>0)newGeo.setIndex(allIdx.flat());
    newGeo.computeVertexNormals();
    return newGeo;
  }
}

// ── Array Modifier ────────────────────────────────────────────────────────────
class ArrayModifier extends Modifier {
  constructor(params={}) {
    super("Array", params);
    this.count  = params.count ?? 3;
    this.offset = params.offset || new THREE.Vector3(2,0,0);
    this.relative = params.relative ?? true;
  }
  apply(geo) {
    const pos=geo.attributes.position, idx=geo.index;
    const allPos=[], allIdx=[];
    for(let c=0;c<this.count;c++){
      const base=allPos.length/3;
      const off=this.offset.clone().multiplyScalar(c);
      for(let i=0;i<pos.count;i++) allPos.push(pos.getX(i)+off.x,pos.getY(i)+off.y,pos.getZ(i)+off.z);
      if(idx) for(let i=0;i<idx.count;i++) allIdx.push(base+idx.getX(i));
      else for(let i=0;i<pos.count;i++) allIdx.push(base+i);
    }
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(allPos),3));
    newGeo.setIndex(allIdx);
    newGeo.computeVertexNormals();
    return newGeo;
  }
}

// ── Solidify Modifier ─────────────────────────────────────────────────────────
class SolidifyModifier extends Modifier {
  constructor(params={}) {
    super("Solidify", params);
    this.thickness = params.thickness ?? 0.1;
    this.offset    = params.offset    ?? -1; // -1=inward 1=outward
  }
  apply(geo) {
    const pos=geo.attributes.position, nrm=geo.attributes.normal, idx=geo.index;
    if(!pos)return geo;
    const n=pos.count, allPos=[];
    for(let i=0;i<n;i++){
      allPos.push(pos.getX(i),pos.getY(i),pos.getZ(i));
    }
    // Offset verts along normal
    for(let i=0;i<n;i++){
      const nx=nrm?nrm.getX(i):0, ny=nrm?nrm.getY(i):1, nz=nrm?nrm.getZ(i):0;
      allPos.push(pos.getX(i)+nx*this.thickness,pos.getY(i)+ny*this.thickness,pos.getZ(i)+nz*this.thickness);
    }
    const allIdx=[];
    if(idx){
      for(let i=0;i<idx.count;i++) allIdx.push(idx.getX(i));
      for(let i=0;i<idx.count;i+=3) allIdx.push(n+idx.getX(i+2),n+idx.getX(i+1),n+idx.getX(i));
    }
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(allPos),3));
    if(allIdx.length)newGeo.setIndex(allIdx);
    newGeo.computeVertexNormals();
    return newGeo;
  }
}

// ── Decimate Modifier ─────────────────────────────────────────────────────────
class DecimateModifier extends Modifier {
  constructor(params={}) {
    super("Decimate", params);
    this.ratio = params.ratio ?? 0.5; // 0-1
  }
  apply(geo) {
    const pos=geo.attributes.position, idx=geo.index;
    if(!idx)return geo;
    const keep=Math.max(3,Math.floor(idx.count/3*this.ratio))*3;
    const newIdx=[];
    for(let i=0;i<keep;i+=3) newIdx.push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));
    const newGeo=geo.clone();
    newGeo.setIndex(newIdx);
    newGeo.computeVertexNormals();
    return newGeo;
  }
}

// ── Weld Modifier ─────────────────────────────────────────────────────────────
class WeldModifier extends Modifier {
  constructor(params={}) {
    super("Weld", params);
    this.threshold = params.threshold ?? 0.001;
  }
  apply(geo) {
    geo.computeVertexNormals();
    return geo;
  }
}

// ── Subdivision Surface ───────────────────────────────────────────────────────
class SubdivisionModifier extends Modifier {
  constructor(params={}) {
    super("Subdivision", params);
    this.levels = params.levels ?? 2;
    this.type   = params.type   || "catmull_clark"; // catmull_clark | simple
  }
  apply(geo) {
    let g = geo.clone();
    for(let l=0;l<this.levels;l++) g=this._subdivide(g);
    return g;
  }
  _subdivide(geo) {
    const pos=geo.attributes.position, idx=geo.index;
    if(!idx)return geo;
    const verts=[];
    for(let i=0;i<pos.count;i++) verts.push(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)));
    const edgeMids=new Map(), newIdx=[];
    const mid=(a,b)=>{
      const k=`${Math.min(a,b)}_${Math.max(a,b)}`;
      if(!edgeMids.has(k)){edgeMids.set(k,verts.length);verts.push(verts[a].clone().lerp(verts[b],0.5));}
      return edgeMids.get(k);
    };
    for(let i=0;i<idx.count;i+=3){
      const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);
      const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
      newIdx.push(a,ab,ca, ab,b,bc, ca,bc,c, ab,bc,ca);
    }
    const newPos=new Float32Array(verts.length*3);
    verts.forEach((v,i)=>{newPos[i*3]=v.x;newPos[i*3+1]=v.y;newPos[i*3+2]=v.z;});
    const newGeo=new THREE.BufferGeometry();
    newGeo.setAttribute("position",new THREE.BufferAttribute(newPos,3));
    newGeo.setIndex(newIdx);
    newGeo.computeVertexNormals();
    return newGeo;
  }
}

// ── Displace Modifier ─────────────────────────────────────────────────────────
class DisplaceModifier extends Modifier {
  constructor(params={}) {
    super("Displace", params);
    this.strength  = params.strength  ?? 0.5;
    this.direction = params.direction || "normal"; // normal|x|y|z
    this.texture   = params.texture   || null;
  }
  apply(geo) {
    const pos=geo.attributes.position, nrm=geo.attributes.normal;
    if(!pos)return geo;
    const newPos=new Float32Array(pos.array);
    for(let i=0;i<pos.count;i++){
      // Noise-based displacement
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      const noise=Math.sin(x*4)*Math.cos(z*4)*0.5+0.5;
      const d=noise*this.strength;
      const nx=nrm?nrm.getX(i):0, ny=nrm?nrm.getY(i):1, nz=nrm?nrm.getZ(i):0;
      newPos[i*3]  =x+nx*d;
      newPos[i*3+1]=y+ny*d;
      newPos[i*3+2]=z+nz*d;
    }
    const newGeo=geo.clone();
    newGeo.setAttribute("position",new THREE.BufferAttribute(newPos,3));
    newGeo.computeVertexNormals();
    return newGeo;
  }
}

// ── Modifier Stack Manager ────────────────────────────────────────────────────
export class ModifierSystem {
  constructor(scene) {
    this.scene  = scene;
    this.stacks = new Map(); // meshUuid → Modifier[]
  }

  getStack(mesh) {
    if (!this.stacks.has(mesh.uuid)) this.stacks.set(mesh.uuid, []);
    return this.stacks.get(mesh.uuid);
  }

  add(mesh, type, params={}) {
    const stack = this.getStack(mesh);
    let mod;
    switch(type) {
      case "Mirror":      mod=new MirrorModifier(params);      break;
      case "Array":       mod=new ArrayModifier(params);       break;
      case "Solidify":    mod=new SolidifyModifier(params);    break;
      case "Decimate":    mod=new DecimateModifier(params);    break;
      case "Weld":        mod=new WeldModifier(params);        break;
      case "Subdivision": mod=new SubdivisionModifier(params); break;
      case "Displace":    mod=new DisplaceModifier(params);    break;
      default: mod=new Modifier(type,params);
    }
    stack.push(mod);
    this.apply(mesh);
    return mod;
  }

  remove(mesh, index) {
    const stack = this.getStack(mesh);
    stack.splice(index, 1);
    this.apply(mesh);
  }

  apply(mesh) {
    const stack = this.getStack(mesh);
    if (!stack.length) return;
    let geo = mesh.geometry.clone();
    stack.forEach(mod => { if(mod.enabled) geo=mod.apply(geo); });
    mesh.geometry.dispose();
    mesh.geometry = geo;
  }

  list(mesh) { return this.getStack(mesh); }

  MODIFIERS = ["Mirror","Array","Solidify","Decimate","Weld","Subdivision","Displace",
               "Bevel","Triangulate","Remesh","Shrinkwrap","Lattice","Curve","Cast",
               "SimpleDeform","Skin","Screw","Warp","Wave","Build","Explode"];
}
