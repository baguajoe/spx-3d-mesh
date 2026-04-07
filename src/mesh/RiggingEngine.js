/**
 * SPX Rigging Engine
 * THREE.Skeleton, bone hierarchy, IK, skinning, weight painting
 */
import * as THREE from "three";

export class Bone {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.children = [];
    this.threeBone = new THREE.Bone();
    this.threeBone.name = name;
    this.length = 1;
    this.selected = false;
    if (parent) { parent.children.push(this); parent.threeBone.add(this.threeBone); }
  }
  setPosition(x, y, z) { this.threeBone.position.set(x, y, z); return this; }
  setRotation(x, y, z) { this.threeBone.rotation.set(x, y, z); return this; }
}

export class Armature {
  constructor(name = "Armature") {
    this.name = name;
    this.bones = [];
    this.root = null;
    this.skeleton = null;
    this.skinnedMesh = null;
    this.threeGroup = new THREE.Group();
    this.threeGroup.name = name;
  }

  addBone(name, parent = null) {
    const bone = new Bone(name, parent || this.root);
    this.bones.push(bone);
    if (!this.root && !parent) {
      this.root = bone;
      this.threeGroup.add(bone.threeBone);
    }
    return bone;
  }

  buildSkeleton() {
    const threeBones = this.bones.map(b => b.threeBone);
    this.skeleton = new THREE.Skeleton(threeBones);
    return this.skeleton;
  }

  // Attach to a mesh for skinning
  attachMesh(mesh) {
    if (!this.skeleton) this.buildSkeleton();
    const skinnedMesh = new THREE.SkinnedMesh(mesh.geometry, mesh.material);
    skinnedMesh.name = mesh.name + "_skinned";
    skinnedMesh.add(this.bones[0].threeBone);
    skinnedMesh.bind(this.skeleton);
    this.skinnedMesh = skinnedMesh;
    return skinnedMesh;
  }

  // Auto-weight painting using heat diffusion (simplified)
  autoWeights(mesh) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    if (!pos || this.bones.length === 0) return;
    const verts = pos.count;
    const skinIndices = new Float32Array(verts * 4);
    const skinWeights = new Float32Array(verts * 4);
    for (let i = 0; i < verts; i++) {
      const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      // Find 4 closest bones
      const dists = this.bones.map((b, idx) => {
        const bp = b.threeBone.getWorldPosition(new THREE.Vector3());
        return { idx, d: Math.sqrt((vx-bp.x)**2+(vy-bp.y)**2+(vz-bp.z)**2) };
      }).sort((a,b) => a.d - b.d).slice(0, 4);
      const sum = dists.reduce((s, d) => s + 1/(d.d+0.001), 0);
      dists.forEach((d, j) => {
        skinIndices[i*4+j] = d.idx;
        skinWeights[i*4+j] = (1/(d.d+0.001)) / sum;
      });
    }
    geo.setAttribute("skinIndex",  new THREE.BufferAttribute(skinIndices, 4));
    geo.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeights, 4));
  }

  // IK solver (FABRIK algorithm)
  solveIK(tipBone, targetPos, iterations = 10) {
    const chain = [];
    let b = tipBone;
    while (b) { chain.unshift(b); b = b.parent; }
    if (chain.length < 2) return;
    const positions = chain.map(b => b.threeBone.getWorldPosition(new THREE.Vector3()));
    const lengths   = [];
    for (let i = 0; i < positions.length - 1; i++) lengths.push(positions[i].distanceTo(positions[i+1]));
    const target = targetPos.clone();

    for (let iter = 0; iter < iterations; iter++) {
      // Forward pass
      positions[positions.length-1].copy(target);
      for (let i = positions.length-2; i >= 0; i--) {
        const dir = positions[i].clone().sub(positions[i+1]).normalize();
        positions[i].copy(positions[i+1]).addScaledVector(dir, lengths[i]);
      }
      // Backward pass
      positions[0].copy(chain[0].threeBone.getWorldPosition(new THREE.Vector3()));
      for (let i = 1; i < positions.length; i++) {
        const dir = positions[i].clone().sub(positions[i-1]).normalize();
        positions[i].copy(positions[i-1]).addScaledVector(dir, lengths[i-1]);
      }
    }

    // Apply rotations
    for (let i = 0; i < chain.length - 1; i++) {
      const curr = positions[i], next = positions[i+1];
      const dir = next.clone().sub(curr).normalize();
      chain[i].threeBone.lookAt(curr.clone().add(dir));
    }
  }

  // FK pose
  setPose(boneName, rx, ry, rz) {
    const bone = this.bones.find(b => b.name === boneName);
    if (bone) bone.threeBone.rotation.set(rx, ry, rz);
  }

  // Reset pose
  resetPose() { this.bones.forEach(b => b.threeBone.rotation.set(0,0,0)); }

  // Bake animation to keyframes
  bakeAnimation(fps = 24, duration = 2) {
    const clip = new THREE.AnimationClip(this.name + "_baked", duration, []);
    this.bones.forEach(bone => {
      const times = [], values = [];
      for (let t = 0; t <= duration; t += 1/fps) {
        times.push(t);
        values.push(bone.threeBone.quaternion.x, bone.threeBone.quaternion.y, bone.threeBone.quaternion.z, bone.threeBone.quaternion.w);
      }
      clip.tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values));
    });
    return clip;
  }

  // Build humanoid rig
  static buildHumanoid() {
    const arm = new Armature("HumanoidRig");
    const root  = arm.addBone("root");      root.setPosition(0,0,0);
    const hips  = arm.addBone("hips",root); hips.setPosition(0,1,0);
    const spine = arm.addBone("spine",hips);spine.setPosition(0,0.3,0);
    const chest = arm.addBone("chest",spine);chest.setPosition(0,0.3,0);
    const neck  = arm.addBone("neck",chest);neck.setPosition(0,0.3,0);
    const head  = arm.addBone("head",neck); head.setPosition(0,0.15,0);
    // Arms
    const lShoulder=arm.addBone("l_shoulder",chest);lShoulder.setPosition(0.2,0.2,0);
    const lArm=arm.addBone("l_arm",lShoulder);lArm.setPosition(0.3,0,0);
    const lForearm=arm.addBone("l_forearm",lArm);lForearm.setPosition(0.25,0,0);
    const lHand=arm.addBone("l_hand",lForearm);lHand.setPosition(0.2,0,0);
    const rShoulder=arm.addBone("r_shoulder",chest);rShoulder.setPosition(-0.2,0.2,0);
    const rArm=arm.addBone("r_arm",rShoulder);rArm.setPosition(-0.3,0,0);
    const rForearm=arm.addBone("r_forearm",rArm);rForearm.setPosition(-0.25,0,0);
    const rHand=arm.addBone("r_hand",rForearm);rHand.setPosition(-0.2,0,0);
    // Legs
    const lHip=arm.addBone("l_hip",hips);lHip.setPosition(0.15,-0.1,0);
    const lThigh=arm.addBone("l_thigh",lHip);lThigh.setPosition(0,-0.4,0);
    const lShin=arm.addBone("l_shin",lThigh);lShin.setPosition(0,-0.4,0);
    const lFoot=arm.addBone("l_foot",lShin);lFoot.setPosition(0,-0.35,0);
    const rHip=arm.addBone("r_hip",hips);rHip.setPosition(-0.15,-0.1,0);
    const rThigh=arm.addBone("r_thigh",rHip);rThigh.setPosition(0,-0.4,0);
    const rShin=arm.addBone("r_shin",rThigh);rShin.setPosition(0,-0.4,0);
    const rFoot=arm.addBone("r_foot",rShin);rFoot.setPosition(0,-0.35,0);
    arm.buildSkeleton();
    return arm;
  }
}

export class RiggingEngine {
  constructor(scene) {
    this.scene    = scene;
    this.armatures= new Map(); // name → Armature
    this.mixers   = new Map(); // name → AnimationMixer
  }

  createArmature(name = "Armature") {
    const arm = new Armature(name);
    this.armatures.set(name, arm);
    this.scene.add(arm.threeGroup);
    return arm;
  }

  createHumanoid() {
    const arm = Armature.buildHumanoid();
    this.armatures.set(arm.name, arm);
    this.scene.add(arm.threeGroup);
    // Visualize bones
    this._visualizeBones(arm);
    return arm;
  }

  _visualizeBones(arm) {
    arm.bones.forEach(bone => {
      if (!bone.parent) return;
      const helper = new THREE.SkeletonHelper(bone.threeBone);
      helper.name = "_bone_helper_" + bone.name;
      this.scene.add(helper);
    });
  }

  attachMesh(armatureName, mesh) {
    const arm = this.armatures.get(armatureName);
    if (!arm) return null;
    arm.autoWeights(mesh);
    const skinned = arm.attachMesh(mesh);
    this.scene.add(skinned);
    return skinned;
  }

  playAnimation(armatureName, clip) {
    const arm = this.armatures.get(armatureName);
    if (!arm || !arm.skinnedMesh) return;
    const mixer = new THREE.AnimationMixer(arm.skinnedMesh);
    this.mixers.set(armatureName, mixer);
    const action = mixer.clipAction(clip);
    action.play();
    return mixer;
  }

  update(dt) {
    this.mixers.forEach(mixer => mixer.update(dt));
  }

  solveIK(armatureName, tipBoneName, targetPos) {
    const arm = this.armatures.get(armatureName);
    if (!arm) return;
    const tip = arm.bones.find(b => b.name === tipBoneName);
    if (tip) arm.solveIK(tip, targetPos);
  }

  getArmature(name) { return this.armatures.get(name); }
  listArmatures()   { return [...this.armatures.keys()]; }
}
