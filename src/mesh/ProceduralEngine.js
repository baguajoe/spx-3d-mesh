/**
 * SPX Procedural Engine
 * Real terrain, city, foliage, crowd generators using noise and math
 */
import * as THREE from "three";

// ── Noise ─────────────────────────────────────────────────────────────────────
function fade(t) { return t*t*t*(t*(t*6-15)+10); }
function lerp(a,b,t) { return a+(b-a)*t; }
function grad(h,x,y,z) {
  h&=15;const u=h<8?x:y,v=h<4?y:h===12||h===14?x:z;
  return ((h&1)?-u:u)+((h&2)?-v:v);
}
const P = Array.from({length:256},(_,i)=>i).sort(()=>Math.random()-0.5);
const PE= [...P,...P];
function perlin(x,y,z=0) {
  const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;
  x-=Math.floor(x); y-=Math.floor(y); z-=Math.floor(z);
  const u=fade(x),v=fade(y),w=fade(z);
  const A=PE[X]+Y,AA=PE[A]+Z,AB=PE[A+1]+Z,B=PE[X+1]+Y,BA=PE[B]+Z,BB=PE[B+1]+Z;
  return lerp(lerp(lerp(grad(PE[AA],x,y,z),grad(PE[BA],x-1,y,z),u),lerp(grad(PE[AB],x,y-1,z),grad(PE[BB],x-1,y-1,z),u),v),lerp(lerp(grad(PE[AA+1],x,y,z-1),grad(PE[BA+1],x-1,y,z-1),u),lerp(grad(PE[AB+1],x,y-1,z-1),grad(PE[BB+1],x-1,y-1,z-1),u),v),w);
}

function fbm(x,y,octaves=6,lacunarity=2,gain=0.5) {
  let v=0,amp=0.5,freq=1;
  for(let i=0;i<octaves;i++){v+=amp*perlin(x*freq,y*freq);amp*=gain;freq*=lacunarity;}
  return v;
}

// ── Terrain Generator ─────────────────────────────────────────────────────────
export function generateTerrain({ resolution=64, scale=20, roughness=0.5, erosion=0.3, seaLevel=0.2, type="mountains" }) {
  const geo  = new THREE.PlaneGeometry(scale, scale, resolution-1, resolution-1);
  geo.rotateX(-Math.PI/2);
  const pos  = geo.attributes.position;
  const octaves = Math.round(4 + roughness * 4);
  const gain    = 0.5 - roughness * 0.1;
  const typeMap = { mountains:1.5, plains:0.3, desert:0.6, canyon:1.2, volcanic:1.8, coastal:0.8, island:1.0, arctic:0.7 };
  const heightScale = (typeMap[type] || 1.0) * scale * 0.3;

  for (let i=0; i<pos.count; i++) {
    const x=pos.getX(i)/scale*3, z=pos.getZ(i)/scale*3;
    let h = fbm(x, z, octaves, 2, gain);
    if (type==="island") { const d=Math.sqrt(x*x+z*z)/3; h=Math.max(0,h-d*0.8); }
    if (type==="canyon") { h=Math.abs(h)*1.5 - 0.3; }
    if (erosion>0) {
      const ex=fbm(x+100,z+100,3,2,0.5)*erosion*0.3;
      h=h*(1-erosion*0.3)+ex;
    }
    h = h < seaLevel*0.5 ? seaLevel*0.5 : h;
    pos.setY(i, h * heightScale);
  }

  pos.needsUpdate=true;
  geo.computeVertexNormals();

  // Vertex colors by height
  const colors=new Float32Array(pos.count*3);
  const minH=seaLevel*heightScale*0.5;
  for(let i=0;i<pos.count;i++){
    const h=pos.getY(i),t=Math.max(0,Math.min(1,(h-minH)/(heightScale-minH)));
    if(t<0.15){colors[i*3]=0.1;colors[i*3+1]=0.3;colors[i*3+2]=0.8;} // water
    else if(t<0.3){colors[i*3]=0.8;colors[i*3+1]=0.7;colors[i*3+2]=0.5;} // sand
    else if(t<0.6){colors[i*3]=0.2;colors[i*3+1]=0.5;colors[i*3+2]=0.15;} // grass
    else if(t<0.8){colors[i*3]=0.4;colors[i*3+1]=0.35;colors[i*3+2]=0.3;} // rock
    else{colors[i*3]=0.95;colors[i*3+1]=0.95;colors[i*3+2]=1.0;} // snow
  }
  geo.setAttribute("color",new THREE.BufferAttribute(colors,3));

  const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.8,metalness:0});
  return new THREE.Mesh(geo,mat);
}

// ── City Generator ────────────────────────────────────────────────────────────
export function generateCity({ blocks=6, density=0.7, variation=0.5, roads=true, style="modern" }) {
  const group=new THREE.Group();group.name="GeneratedCity";
  const blockSize=10, roadWidth=2, total=blocks*blockSize+(blocks+1)*roadWidth;
  const offset=total/2;
  const styleColors={modern:0x8090a0,cyberpunk:0x102040,medieval:0x8b7355,industrial:0x506070,futuristic:0x204060};
  const baseColor=styleColors[style]||0x8090a0;

  for(let bx=0;bx<blocks;bx++){
    for(let bz=0;bz<blocks;bz++){
      if(Math.random()>density)continue;
      const wx=bx*(blockSize+roadWidth)+roadWidth-offset;
      const wz=bz*(blockSize+roadWidth)+roadWidth-offset;
      const buildCount=Math.floor(1+variation*3+Math.random()*3);
      for(let b=0;b<buildCount;b++){
        const bw=1+Math.random()*(blockSize/buildCount-1.5);
        const bd=1+Math.random()*(blockSize/buildCount-1.5);
        const bh=2+Math.random()*variation*30+(style==="cyberpunk"?20:0)+(style==="futuristic"?15:0);
        const bxoff=Math.random()*(blockSize-bw);
        const bzoff=Math.random()*(blockSize-bd);
        const geo=new THREE.BoxGeometry(bw,bh,bd);
        const col=new THREE.Color(baseColor).offsetHSL(0,0,(Math.random()-0.5)*0.2);
        const mat=new THREE.MeshStandardMaterial({color:col,roughness:0.7+Math.random()*0.2,metalness:style==="cyberpunk"?0.5:0.1});
        const mesh=new THREE.Mesh(geo,mat);
        mesh.position.set(wx+bxoff+bw/2,bh/2,wz+bzoff+bd/2);
        mesh.castShadow=mesh.receiveShadow=true;
        group.add(mesh);
        if(style==="cyberpunk"&&Math.random()>0.5){
          const signGeo=new THREE.BoxGeometry(bw*0.8,0.5,0.1);
          const signMat=new THREE.MeshStandardMaterial({color:Math.random()>0.5?0xff0088:0x00ffcc,emissive:Math.random()>0.5?0xff0088:0x00ffcc,emissiveIntensity:0.5});
          const sign=new THREE.Mesh(signGeo,signMat);
          sign.position.set(wx+bxoff+bw/2,bh+0.25,wz+bzoff+bd/2+bd/2+0.05);
          group.add(sign);
        }
      }
    }
  }

  if(roads){
    const roadMat=new THREE.MeshStandardMaterial({color:0x303035,roughness:0.95});
    for(let i=0;i<=blocks;i++){
      const pos=i*(blockSize+roadWidth)+roadWidth/2-offset;
      const hRoad=new THREE.Mesh(new THREE.BoxGeometry(total,0.05,roadWidth),roadMat);
      hRoad.position.set(0,0,pos);group.add(hRoad);
      const vRoad=new THREE.Mesh(new THREE.BoxGeometry(roadWidth,0.05,total),roadMat);
      vRoad.position.set(pos,0,0);group.add(vRoad);
    }
  }

  // Ground
  const groundMat=new THREE.MeshStandardMaterial({color:0x404045,roughness:0.95});
  const ground=new THREE.Mesh(new THREE.BoxGeometry(total,0.1,total),groundMat);
  ground.position.y=-0.05;group.add(ground);
  return group;
}

// ── Foliage Generator ─────────────────────────────────────────────────────────
export function generateFoliage({ type="tree", count=20, spread=10, scale=1, variation=0.4 }) {
  const group=new THREE.Group();group.name="GeneratedFoliage";
  const types={
    tree: ()=>{
      const g=new THREE.Group();
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.15,1+Math.random()*0.5,8),new THREE.MeshStandardMaterial({color:0x5a3a1a,roughness:0.9}));
      g.add(trunk);
      const lh=0.8+Math.random()*0.5;
      const leaf=new THREE.Mesh(new THREE.ConeGeometry(0.6+Math.random()*0.3,lh,8),new THREE.MeshStandardMaterial({color:new THREE.Color(0.1+Math.random()*0.1,0.4+Math.random()*0.2,0.1),roughness:0.8}));
      leaf.position.y=0.6+lh/2;g.add(leaf);
      if(Math.random()>0.5){const l2=new THREE.Mesh(new THREE.ConeGeometry(0.5,lh*0.8,8),leaf.material.clone());l2.position.y=1.0+lh*0.6;g.add(l2);}
      return g;
    },
    bush: ()=>{
      const g=new THREE.Group();
      for(let i=0;i<3+Math.floor(Math.random()*3);i++){
        const r=0.2+Math.random()*0.3;
        const s=new THREE.Mesh(new THREE.SphereGeometry(r,6,6),new THREE.MeshStandardMaterial({color:new THREE.Color(0.1,0.35+Math.random()*0.15,0.05),roughness:0.9}));
        s.position.set((Math.random()-0.5)*0.4,(Math.random()*0.2),( Math.random()-0.5)*0.4);
        g.add(s);
      }
      return g;
    },
    grass: ()=>{
      const g=new THREE.Group();
      for(let i=0;i<5;i++){
        const h=0.3+Math.random()*0.4;
        const blade=new THREE.Mesh(new THREE.BoxGeometry(0.05,h,0.02),new THREE.MeshStandardMaterial({color:new THREE.Color(0.15,0.4+Math.random()*0.2,0.05),roughness:1}));
        blade.position.set((Math.random()-0.5)*0.2,h/2,(Math.random()-0.5)*0.2);
        blade.rotation.y=Math.random()*Math.PI;
        g.add(blade);
      }
      return g;
    },
  };
  const mkFn=types[type]||types.tree;
  for(let i=0;i<count;i++){
    const obj=mkFn();
    const s=scale*(0.7+Math.random()*variation*0.6);
    obj.scale.setScalar(s);
    const angle=Math.random()*Math.PI*2,r=Math.random()*spread;
    obj.position.set(Math.cos(angle)*r,0,Math.sin(angle)*r);
    obj.rotation.y=Math.random()*Math.PI*2;
    obj.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    group.add(obj);
  }
  return group;
}

// ── Crowd Generator ───────────────────────────────────────────────────────────
export function generateCrowd({ count=20, spread=10, diversity=0.8, spacing=2 }) {
  const group=new THREE.Group();group.name="GeneratedCrowd";
  const skinTones=[0xf5c5a3,0xe8a87c,0xc68642,0x8d5524,0x4a2912,0xffdbac];
  const clothColors=[0x3355aa,0xaa3333,0x33aa55,0x888800,0xaa55aa,0x2a2a2a,0xffffff,0xcc7722];
  for(let i=0;i<count;i++){
    const p=new THREE.Group();
    const skin=skinTones[Math.floor(Math.random()*skinTones.length)];
    const cloth=clothColors[Math.floor(Math.random()*clothColors.length)];
    const h=1.5+Math.random()*0.4;
    const skinMat=new THREE.MeshStandardMaterial({color:skin,roughness:0.7});
    const clothMat=new THREE.MeshStandardMaterial({color:cloth,roughness:0.8});
    // Body
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.1,h*0.5,6),clothMat);body.position.y=h*0.4;p.add(body);
    // Head
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),skinMat);head.position.y=h*0.7;p.add(head);
    // Arms
    [-1,1].forEach(side=>{const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.03,h*0.3,5),skinMat);arm.position.set(side*0.18,h*0.4,0);arm.rotation.z=side*0.3;p.add(arm);});
    // Legs
    [-1,1].forEach(side=>{const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.04,h*0.4,5),clothMat);leg.position.set(side*0.07,h*0.15,0);p.add(leg);});
    // Position
    const angle=Math.random()*Math.PI*2,r=Math.random()*spread;
    p.position.set(Math.cos(angle)*r,0,Math.sin(angle)*r);
    p.rotation.y=Math.random()*Math.PI*2;
    const s=0.85+Math.random()*diversity*0.3;p.scale.setScalar(s);
    p.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    group.add(p);
  }
  return group;
}

// ── Vehicle Generator ─────────────────────────────────────────────────────────
export function generateVehicle({ type="car", style="modern", damage=0 }) {
  const group=new THREE.Group();group.name=`Generated_${type}`;
  const bodyCol=new THREE.Color().setHSL(Math.random(),0.6,0.4);
  const bodyMat=new THREE.MeshStandardMaterial({color:bodyCol,metalness:0.6,roughness:0.3});
  const glassMat=new THREE.MeshStandardMaterial({color:0x88bbff,transparent:true,opacity:0.4,metalness:0.1,roughness:0});
  const tireMat=new THREE.MeshStandardMaterial({color:0x111111,roughness:0.9});
  if(type==="car"){
    const body=new THREE.Mesh(new THREE.BoxGeometry(2,0.5,1),bodyMat);body.position.y=0.5;group.add(body);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.4,0.95),bodyMat);cab.position.set(0,0.9,0);group.add(cab);
    const windshield=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.38,0.05),glassMat);windshield.position.set(-0.2,0.9,0.5);group.add(windshield);
    [[0.7,0,-0.55],[0.7,0,0.55],[-0.7,0,-0.55],[-0.7,0,0.55]].forEach(([x,y,z])=>{
      const w=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.12,12),tireMat);w.rotation.z=Math.PI/2;w.position.set(x,0.18,z);group.add(w);
    });
  } else if(type==="truck"){
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.1),bodyMat);cab.position.set(1.2,0.8,0);group.add(cab);
    const bed=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.8,1.1),bodyMat);bed.position.set(-0.7,0.55,0);group.add(bed);
    [[1.2,0,-0.6],[1.2,0,0.6],[-0.3,0,-0.6],[-0.3,0,0.6],[-1.5,0,-0.6],[-1.5,0,0.6]].forEach(([x,y,z])=>{
      const w=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.15,12),tireMat);w.rotation.z=Math.PI/2;w.position.set(x,0.25,z);group.add(w);
    });
  }
  if(damage>0.3){
    group.traverse(c=>{if(c.isMesh&&c.material===bodyMat){c.material=bodyMat.clone();c.material.roughness=Math.min(1,bodyMat.roughness+damage*0.5);}});
  }
  return group;
}

export class ProceduralEngine {
  constructor(scene) { this.scene=scene; }
  addTerrain(params)  { const m=generateTerrain(params);  this.scene.add(m); return m; }
  addCity(params)     { const g=generateCity(params);     this.scene.add(g); return g; }
  addFoliage(params)  { const g=generateFoliage(params);  this.scene.add(g); return g; }
  addCrowd(params)    { const g=generateCrowd(params);    this.scene.add(g); return g; }
  addVehicle(params)  { const g=generateVehicle(params);  this.scene.add(g); return g; }
  remove(obj)         { this.scene.remove(obj); }
}
