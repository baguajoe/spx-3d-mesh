/**
 * SPX Rigging Engine v2
 * Skeleton, FABRIK IK, pole targets, constraints (20 types), auto weights, humanoid rig
 */
import * as THREE from "three";

// ── Constraint types ──────────────────────────────────────────────────────────
const CONSTRAINTS = {
  COPY_LOCATION:   "copy_location",
  COPY_ROTATION:   "copy_rotation",
  COPY_SCALE:      "copy_scale",
  COPY_TRANSFORMS: "copy_transforms",
  LIMIT_LOCATION:  "limit_location",
  LIMIT_ROTATION:  "limit_rotation",
  LIMIT_SCALE:     "limit_scale",
  LIMIT_DISTANCE:  "limit_distance",
  TRACK_TO:        "track_to",
  DAMPED_TRACK:    "damped_track",
  LOCKED_TRACK:    "locked_track",
  STRETCH_TO:      "stretch_to",
  CLAMP_TO:        "clamp_to",
  CHILD_OF:        "child_of",
  FLOOR:           "floor",
  FOLLOW_PATH:     "follow_path",
  IK:              "ik",
  SPLINE_IK:       "spline_ik",
  MAINTAIN_VOLUME: "maintain_volume",
  ACTION:          "action",
};

class Constraint {
  constructor(type, params={}) {
    this.type     = type;
    this.target   = params.target   || null;
    this.influence= params.influence|| 1;
    this.muted    = false;
    this.space    = params.space    || "world"; // world | local | pose
    this.params   = params;
  }
}

class RigBone {
  constructor(name, head, tail, parent=null) {
    this.name       = name;
    this.head       = head.clone();
    this.tail       = tail.clone();
    this.parent     = parent;
    this.children   = [];
    this.constraints= [];
    this.length     = head.distanceTo(tail);
    // Pose transforms
    this.poseMatrix = new THREE.Matrix4();
    this.restMatrix = new THREE.Matrix4();
    this.ikTarget   = null;
    this.ikPoleTarget= null;
    this.ikChainLen = 0;
    this.bendAxis   = new THREE.Vector3(1,0,0);
  }
  addConstraint(type, params={}) {
    const c=new Constraint(type,params); this.constraints.push(c); return c;
  }
}

export class RiggingEngine {
  constructor(scene) {
    this.scene     = scene;
    this.armatures = new Map(); // name → { bones, skeletonHelper }
    this.bones     = [];
    this.ikSolveIter= 10;
  }

  // ── Build humanoid rig ──────────────────────────────────────────────────────
  createHumanoid(name="Armature", height=2) {
    const h=height, s=h*0.5; // scale
    const bones={};
    const def=[
      // Spine chain
      ["hips",         [0,h*0.5,0],   [0,h*0.55,0]],
      ["spine",        [0,h*0.55,0],  [0,h*0.65,0],"hips"],
      ["spine1",       [0,h*0.65,0],  [0,h*0.75,0],"spine"],
      ["chest",        [0,h*0.75,0],  [0,h*0.85,0],"spine1"],
      ["neck",         [0,h*0.85,0],  [0,h*0.9,0], "chest"],
      ["head",         [0,h*0.9,0],   [0,h*1.0,0], "neck"],
      // Left arm
      ["shoulder.L",   [h*0.1,h*0.82,0],[h*0.22,h*0.82,0],"chest"],
      ["upper_arm.L",  [h*0.22,h*0.82,0],[h*0.22,h*0.58,0],"shoulder.L"],
      ["forearm.L",    [h*0.22,h*0.58,0],[h*0.22,h*0.34,0],"upper_arm.L"],
      ["hand.L",       [h*0.22,h*0.34,0],[h*0.22,h*0.28,0],"forearm.L"],
      // Right arm
      ["shoulder.R",   [-h*0.1,h*0.82,0],[-h*0.22,h*0.82,0],"chest"],
      ["upper_arm.R",  [-h*0.22,h*0.82,0],[-h*0.22,h*0.58,0],"shoulder.R"],
      ["forearm.R",    [-h*0.22,h*0.58,0],[-h*0.22,h*0.34,0],"upper_arm.R"],
      ["hand.R",       [-h*0.22,h*0.34,0],[-h*0.22,h*0.28,0],"forearm.R"],
      // Left leg
      ["thigh.L",      [h*0.1,h*0.5,0],[h*0.1,h*0.25,0],"hips"],
      ["shin.L",       [h*0.1,h*0.25,0],[h*0.1,0,0],"thigh.L"],
      ["foot.L",       [h*0.1,0,0],    [h*0.1,-0.04,h*0.12],"shin.L"],
      ["toe.L",        [h*0.1,-0.04,h*0.12],[h*0.1,-0.04,h*0.2],"foot.L"],
      // Right leg
      ["thigh.R",      [-h*0.1,h*0.5,0],[-h*0.1,h*0.25,0],"hips"],
      ["shin.R",       [-h*0.1,h*0.25,0],[-h*0.1,0,0],"thigh.R"],
      ["foot.R",       [-h*0.1,0,0],    [-h*0.1,-0.04,h*0.12],"shin.R"],
      ["toe.R",        [-h*0.1,-0.04,h*0.12],[-h*0.1,-0.04,h*0.2],"foot.R"],
    ];

    const threeBones=[];
    def.forEach(([bname,head,tail,parentName])=>{
      const bone=new THREE.Bone();
      bone.name=bname;
      bone.position.set(head[0],head[1],head[2]);
      bones[bname]=bone;
      threeBones.push(bone);
    });

    // Parent hierarchy
    def.forEach(([bname,head,tail,parentName])=>{
      if(parentName&&bones[parentName]){
        bones[parentName].add(bones[bname]);
        const ph=def.find(d=>d[0]===parentName);
        if(ph) bones[bname].position.sub(new THREE.Vector3(ph[1][0],ph[1][1],ph[1][2]));
      }
    });

    const skeleton=new THREE.Skeleton(threeBones);
    const helper=new THREE.SkeletonHelper(bones["hips"]);
    this.scene.add(bones["hips"]);
    this.scene.add(helper);

    const arm={name,bones:threeBones,skeleton,helper,rigBones:{}};
    this.armatures.set(name,arm);
    return arm;
  }

  // ── FABRIK IK solver ────────────────────────────────────────────────────────
  solveIK(chain, target, poleTarget=null, iterations=10) {
    if (!chain||chain.length<2) return;
    const positions=chain.map(b=>b.getWorldPosition(new THREE.Vector3()));
    const lengths=[];
    for(let i=0;i<positions.length-1;i++) lengths.push(positions[i].distanceTo(positions[i+1]));
    const totalLen=lengths.reduce((s,l)=>s+l,0);
    const rootPos=positions[0].clone();
    const targetPos=target.clone();
    const distToTarget=rootPos.distanceTo(targetPos);

    if(distToTarget>totalLen){
      // Fully extended
      const dir=targetPos.clone().sub(rootPos).normalize();
      for(let i=1;i<positions.length;i++) positions[i].copy(positions[i-1]).addScaledVector(dir,lengths[i-1]);
    } else {
      for(let iter=0;iter<iterations;iter++){
        // Forward pass
        positions[positions.length-1].copy(targetPos);
        for(let i=positions.length-2;i>=0;i--){
          const dir=positions[i].clone().sub(positions[i+1]).normalize();
          positions[i].copy(positions[i+1]).addScaledVector(dir,lengths[i]);
        }
        // Backward pass
        positions[0].copy(rootPos);
        for(let i=1;i<positions.length;i++){
          const dir=positions[i].clone().sub(positions[i-1]).normalize();
          positions[i].copy(positions[i-1]).addScaledVector(dir,lengths[i-1]);
        }
      }
    }

    // Pole target adjustment
    if(poleTarget&&chain.length>=3){
      const mid=Math.floor(chain.length/2);
      const poleDir=poleTarget.clone().sub(positions[mid]).normalize();
      positions[mid].addScaledVector(poleDir,lengths[mid-1]*0.3);
    }

    // Apply positions back to bones
    chain.forEach((bone,i)=>{
      if(i===0)return;
      const dir=positions[i].clone().sub(positions[i-1]).normalize();
      const up=new THREE.Vector3(0,1,0);
      const q=new THREE.Quaternion().setFromUnitVectors(up,dir);
      bone.quaternion.copy(q);
    });
  }

  // ── Auto heat weights ───────────────────────────────────────────────────────
  autoWeights(mesh, armatureName) {
    const arm=this.armatures.get(armatureName);
    if(!arm||!mesh.geometry)return;
    const geo=mesh.geometry, pos=geo.attributes.position;
    const n=pos.count, nb=arm.bones.length;
    const skinWeights=new Float32Array(n*4);
    const skinIndices=new Uint16Array(n*4);
    for(let vi=0;vi<n;vi++){
      const vp=new THREE.Vector3(pos.getX(vi),pos.getY(vi),pos.getZ(vi));
      // Find 4 closest bones
      const dists=arm.bones.map((b,bi)=>{
        const bp=b.getWorldPosition(new THREE.Vector3());
        return{bi,dist:vp.distanceTo(bp)};
      }).sort((a,b)=>a.dist-b.dist).slice(0,4);
      // Inverse distance weighting
      const totalInv=dists.reduce((s,d)=>s+1/(d.dist+0.001),0);
      dists.forEach((d,j)=>{
        skinIndices[vi*4+j]=d.bi;
        skinWeights[vi*4+j]=(1/(d.dist+0.001))/totalInv;
      });
    }
    geo.setAttribute("skinIndex",  new THREE.BufferAttribute(skinIndices,4));
    geo.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeights,4));
    const skinnedMesh=new THREE.SkinnedMesh(geo,mesh.material);
    skinnedMesh.name=mesh.name+"_skinned";
    skinnedMesh.add(arm.bones[0]);
    skinnedMesh.bind(arm.skeleton);
    this.scene.remove(mesh);
    this.scene.add(skinnedMesh);
    return skinnedMesh;
  }

  // ── Attach mesh to armature (alias) ────────────────────────────────────────
  attachMesh(armatureName, mesh) { return this.autoWeights(mesh, armatureName); }
  listArmatures() { return [...this.armatures.keys()]; }

  // ── Pose bone ──────────────────────────────────────────────────────────────
  poseBone(armatureName, boneName, rotation) {
    const arm=this.armatures.get(armatureName);
    if(!arm)return;
    const bone=arm.bones.find(b=>b.name===boneName);
    if(bone) bone.rotation.set(rotation.x,rotation.y,rotation.z);
  }

  // ── Add IK constraint ──────────────────────────────────────────────────────
  addIKConstraint(armatureName, boneName, target, chainLen=2, poleTarget=null) {
    const arm=this.armatures.get(armatureName);
    if(!arm)return;
    const bone=arm.bones.find(b=>b.name===boneName);
    if(!bone)return;
    bone.userData.ikTarget=target;
    bone.userData.ikChainLen=chainLen;
    bone.userData.ikPoleTarget=poleTarget;
  }

  // ── Solve all IK constraints each frame ───────────────────────────────────
  update() {
    this.armatures.forEach(arm=>{
      arm.bones.forEach(bone=>{
        if(!bone.userData.ikTarget)return;
        const chain=[bone];
        let cur=bone;
        for(let i=0;i<(bone.userData.ikChainLen||2)-1;i++){
          if(cur.parent&&cur.parent.isBone){chain.unshift(cur.parent);cur=cur.parent;}
        }
        const tp=new THREE.Vector3();
        bone.userData.ikTarget.getWorldPosition(tp);
        this.solveIK(chain,tp,bone.userData.ikPoleTarget?new THREE.Vector3().setFromMatrixPosition(bone.userData.ikPoleTarget.matrixWorld):null);
      });
    });
  }
}
