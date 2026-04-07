/**
 * SPX Cloth Simulation
 * Mass-spring model — competing with Blender nCloth
 * Works in browser without Rapier dependency
 */
import * as THREE from "three";

class ClothParticle {
  constructor(x, y, z) {
    this.pos      = new THREE.Vector3(x, y, z);
    this.prevPos  = new THREE.Vector3(x, y, z);
    this.vel      = new THREE.Vector3();
    this.force    = new THREE.Vector3();
    this.pinned   = false;
    this.mass     = 1;
  }
  addForce(f) { if(!this.pinned) this.force.add(f); }
}

class Spring {
  constructor(a, b, restLen, stiffness=0.9, type="structural") {
    this.a        = a;
    this.b        = b;
    this.restLen  = restLen;
    this.stiffness= stiffness;
    this.type     = type; // structural | shear | bend
  }
}

export class ClothSimulation {
  constructor(scene) {
    this.scene      = scene;
    this.cloths     = new Map();
    this.gravity    = new THREE.Vector3(0, -9.8, 0);
    this.wind       = new THREE.Vector3(0, 0, 0);
    this.damping    = 0.99;
    this.iterations = 10;
    this.dt         = 1/60;
    this.enabled    = true;
  }

  createCloth(params = {}) {
    const {
      width       = 4,
      height      = 4,
      segmentsX   = 20,
      segmentsY   = 20,
      position    = new THREE.Vector3(0, 3, 0),
      pinTop      = true,
      pinCorners  = false,
      stiffness   = 0.9,
      mass        = 0.1,
      name        = `Cloth_${Date.now()}`,
    } = params;

    const particles = [];
    const springs   = [];

    // Create particle grid
    for (let y = 0; y <= segmentsY; y++) {
      for (let x = 0; x <= segmentsX; x++) {
        const px = position.x + (x/segmentsX - 0.5) * width;
        const py = position.y - (y/segmentsY) * height;
        const pz = position.z;
        const p  = new ClothParticle(px, py, pz);
        p.mass   = mass;
        // Pin top row
        if (pinTop && y === 0) p.pinned = true;
        if (pinCorners && y === 0 && (x === 0 || x === segmentsX)) p.pinned = true;
        particles.push(p);
      }
    }

    const idx = (x, y) => y * (segmentsX + 1) + x;

    // Structural springs (horizontal + vertical)
    for (let y = 0; y <= segmentsY; y++) {
      for (let x = 0; x <= segmentsX; x++) {
        if (x < segmentsX) {
          const a=particles[idx(x,y)], b=particles[idx(x+1,y)];
          springs.push(new Spring(a, b, a.pos.distanceTo(b.pos), stiffness, "structural"));
        }
        if (y < segmentsY) {
          const a=particles[idx(x,y)], b=particles[idx(x,y+1)];
          springs.push(new Spring(a, b, a.pos.distanceTo(b.pos), stiffness, "structural"));
        }
      }
    }
    // Shear springs (diagonal)
    for (let y = 0; y < segmentsY; y++) {
      for (let x = 0; x < segmentsX; x++) {
        const a=particles[idx(x,y)],   b=particles[idx(x+1,y+1)];
        const c=particles[idx(x+1,y)], d=particles[idx(x,y+1)];
        springs.push(new Spring(a, b, a.pos.distanceTo(b.pos), stiffness*0.7, "shear"));
        springs.push(new Spring(c, d, c.pos.distanceTo(d.pos), stiffness*0.7, "shear"));
      }
    }
    // Bend springs (skip-one)
    for (let y = 0; y <= segmentsY; y++) {
      for (let x = 0; x <= segmentsX; x++) {
        if (x+2 <= segmentsX) {
          const a=particles[idx(x,y)], b=particles[idx(x+2,y)];
          springs.push(new Spring(a, b, a.pos.distanceTo(b.pos), stiffness*0.5, "bend"));
        }
        if (y+2 <= segmentsY) {
          const a=particles[idx(x,y)], b=particles[idx(x,y+2)];
          springs.push(new Spring(a, b, a.pos.distanceTo(b.pos), stiffness*0.5, "bend"));
        }
      }
    }

    // Create Three.js mesh
    const geo     = new THREE.BufferGeometry();
    const posArr  = new Float32Array(particles.length * 3);
    const indices = [];
    for (let y = 0; y < segmentsY; y++) {
      for (let x = 0; x < segmentsX; x++) {
        const a=idx(x,y), b=idx(x+1,y), c=idx(x,y+1), d=idx(x+1,y+1);
        indices.push(a,b,c, b,d,c);
      }
    }
    geo.setAttribute("position", new THREE.BufferAttribute(posArr,3));
    geo.setIndex(indices);
    const mat  = new THREE.MeshStandardMaterial({ color:0xccaaff, side:THREE.DoubleSide, roughness:0.8, metalness:0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name  = name;
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);

    const cloth = { particles, springs, mesh, geo, segmentsX, segmentsY, name };
    this.cloths.set(name, cloth);
    this._syncMesh(cloth);
    return mesh;
  }

  // Step simulation
  step(dt = this.dt) {
    if (!this.enabled) return;
    this.cloths.forEach(cloth => this._stepCloth(cloth, dt));
  }

  _stepCloth(cloth, dt) {
    const { particles, springs } = cloth;
    const gravity = this.gravity;
    const wind    = this.wind;
    const damping = this.damping;

    // Apply forces
    particles.forEach(p => {
      if (p.pinned) return;
      p.force.copy(gravity).multiplyScalar(p.mass);
      p.force.addScaledVector(wind, 0.1 * Math.random());
    });

    // Verlet integration
    particles.forEach(p => {
      if (p.pinned) return;
      const newPos = p.pos.clone().multiplyScalar(2).sub(p.prevPos).addScaledVector(p.force, dt*dt/p.mass);
      p.prevPos.copy(p.pos);
      p.pos.copy(newPos);
      p.pos.multiplyScalar(damping).addScaledVector(p.prevPos, 1-damping);
      p.force.set(0,0,0);
    });

    // Satisfy constraints (iterative)
    for (let iter = 0; iter < this.iterations; iter++) {
      springs.forEach(s => {
        const delta = s.b.pos.clone().sub(s.a.pos);
        const dist  = delta.length() || 0.001;
        const diff  = (dist - s.restLen) / dist * s.stiffness;
        if (!s.a.pinned) s.a.pos.addScaledVector(delta,  diff * 0.5);
        if (!s.b.pinned) s.b.pos.addScaledVector(delta, -diff * 0.5);
      });
    }

    // Sync to mesh
    this._syncMesh(cloth);
  }

  _syncMesh(cloth) {
    const { particles, geo } = cloth;
    const pos = geo.attributes.position;
    particles.forEach((p, i) => { pos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z); });
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  setWind(x, y, z)    { this.wind.set(x,y,z); }
  setGravity(x, y, z) { this.gravity.set(x,y,z); }
  setEnabled(v)        { this.enabled = v; }

  reset(name) {
    const cloth = this.cloths.get(name);
    if (!cloth) return;
    this.scene.remove(cloth.mesh);
    this.cloths.delete(name);
  }

  dispose() {
    this.cloths.forEach(c => this.scene.remove(c.mesh));
    this.cloths.clear();
  }
}
