/**
 * SPX Particle System
 * GPU-accelerated particles — competing with Blender particles
 */
import * as THREE from "three";

export class ParticleEmitter {
  constructor(scene, params = {}) {
    this.scene = scene;
    this.params = {
      maxParticles:  params.maxParticles  || 10000,
      emitRate:      params.emitRate      || 100,
      lifetime:      params.lifetime      || 2,
      speed:         params.speed         || 2,
      speedVariation:params.speedVariation|| 0.5,
      size:          params.size          || 0.05,
      sizeEnd:       params.sizeEnd       || 0,
      color:         params.color         || new THREE.Color(1,0.5,0),
      colorEnd:      params.colorEnd      || new THREE.Color(1,0,0),
      opacity:       params.opacity       || 1,
      opacityEnd:    params.opacityEnd    || 0,
      gravity:       params.gravity       || new THREE.Vector3(0,-9.8,0),
      wind:          params.wind          || new THREE.Vector3(0,0,0),
      turbulence:    params.turbulence    || 0,
      emitShape:     params.emitShape     || "point", // point|sphere|box|mesh
      emitRadius:    params.emitRadius    || 0.1,
      direction:     params.direction     || new THREE.Vector3(0,1,0),
      spread:        params.spread        || 0.3,
      name:          params.name          || `Particles_${Date.now()}`,
      type:          params.type          || "generic", // generic|fire|smoke|sparks|rain|snow|dust|magic
    };
    this.particles    = [];
    this.active       = false;
    this.time         = 0;
    this.emitAccum    = 0;
    this.position     = params.position || new THREE.Vector3();
    this._buildGeometry();
  }

  _buildGeometry() {
    const max = this.params.maxParticles;
    this.positions  = new Float32Array(max * 3);
    this.colors     = new Float32Array(max * 3);
    this.sizes      = new Float32Array(max);
    this.opacities  = new Float32Array(max);
    this.velocities = [];
    this.ages       = new Float32Array(max);
    this.lifetimes  = new Float32Array(max);
    this.alive      = new Uint8Array(max);
    this.count      = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color",    new THREE.BufferAttribute(this.colors,    3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("size",     new THREE.BufferAttribute(this.sizes,     1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("opacity",  new THREE.BufferAttribute(this.opacities, 1).setUsage(THREE.DynamicDrawUsage));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * (300.0 / -mv.z);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float r = dot(uv, uv);
          if (r > 0.25) discard;
          float alpha = vOpacity * (1.0 - r * 4.0);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
      transparent:  true,
      depthWrite:   false,
      blending:     THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.name = this.params.name;
    this.points.frustumCulled = false;
    this.geo = geo;
    this.scene.add(this.points);
  }

  _emit() {
    if (this.count >= this.params.maxParticles) return;
    const i   = this.count++;
    const p   = this.params;
    const dir = p.direction.clone().normalize();
    // Spread
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.random() * p.spread;
    const spread= new THREE.Vector3(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta));
    const vel   = dir.clone().lerp(spread, p.spread).normalize().multiplyScalar(p.speed + (Math.random()-0.5)*p.speedVariation);

    // Emit position
    let pos = this.position.clone();
    if (p.emitShape === "sphere") {
      const r = Math.random() * p.emitRadius;
      pos.add(new THREE.Vector3((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2).normalize().multiplyScalar(r));
    } else if (p.emitShape === "box") {
      pos.add(new THREE.Vector3((Math.random()-0.5)*p.emitRadius*2, (Math.random()-0.5)*p.emitRadius*2, (Math.random()-0.5)*p.emitRadius*2));
    }

    this.positions[i*3]   = pos.x;
    this.positions[i*3+1] = pos.y;
    this.positions[i*3+2] = pos.z;
    this.velocities[i]    = vel;
    this.ages[i]          = 0;
    this.lifetimes[i]     = p.lifetime + (Math.random()-0.5)*p.lifetime*0.3;
    this.alive[i]         = 1;
    this.sizes[i]         = p.size;
    const c = p.color;
    this.colors[i*3]=c.r; this.colors[i*3+1]=c.g; this.colors[i*3+2]=c.b;
    this.opacities[i] = p.opacity;
  }

  step(dt) {
    if (!this.active) return;
    this.time += dt;
    const p = this.params;

    // Emit new particles
    this.emitAccum += p.emitRate * dt;
    while (this.emitAccum >= 1) { this._emit(); this.emitAccum--; }

    // Update particles
    let alive = 0;
    for (let i = 0; i < this.count; i++) {
      if (!this.alive[i]) continue;
      this.ages[i] += dt;
      if (this.ages[i] >= this.lifetimes[i]) { this.alive[i]=0; continue; }
      alive++;
      const t    = this.ages[i] / this.lifetimes[i];
      const vel  = this.velocities[i];
      if (vel) {
        vel.addScaledVector(p.gravity, dt);
        vel.addScaledVector(p.wind,    dt * 0.1);
        if (p.turbulence > 0) {
          vel.x += (Math.random()-0.5) * p.turbulence * dt;
          vel.z += (Math.random()-0.5) * p.turbulence * dt;
        }
        this.positions[i*3]   += vel.x * dt;
        this.positions[i*3+1] += vel.y * dt;
        this.positions[i*3+2] += vel.z * dt;
      }
      // Lerp size, color, opacity
      this.sizes[i]    = p.size + (p.sizeEnd - p.size) * t;
      this.opacities[i]= p.opacity + (p.opacityEnd - p.opacity) * t;
      const c = new THREE.Color().lerpColors(p.color, p.colorEnd, t);
      this.colors[i*3]=c.r; this.colors[i*3+1]=c.g; this.colors[i*3+2]=c.b;
    }

    // Compact dead particles
    if (alive < this.count * 0.5) this._compact();

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate    = true;
    this.geo.attributes.size.needsUpdate     = true;
    this.geo.attributes.opacity.needsUpdate  = true;
    this.geo.setDrawRange(0, this.count);
  }

  _compact() {
    let w = 0;
    for (let r = 0; r < this.count; r++) {
      if (!this.alive[r]) continue;
      if (w !== r) {
        this.positions[w*3]=this.positions[r*3]; this.positions[w*3+1]=this.positions[r*3+1]; this.positions[w*3+2]=this.positions[r*3+2];
        this.velocities[w] = this.velocities[r];
        this.ages[w]=this.ages[r]; this.lifetimes[w]=this.lifetimes[r];
        this.alive[w]=1; this.sizes[w]=this.sizes[r]; this.opacities[w]=this.opacities[r];
        this.colors[w*3]=this.colors[r*3]; this.colors[w*3+1]=this.colors[r*3+1]; this.colors[w*3+2]=this.colors[r*3+2];
      }
      w++;
    }
    this.count = w;
  }

  start()  { this.active = true; }
  stop()   { this.active = false; }
  reset()  { this.count = 0; this.active = false; this.emitAccum = 0; }
  burst(n=100) { for(let i=0;i<n;i++) this._emit(); }

  dispose() {
    this.scene.remove(this.points);
    this.geo.dispose();
  }
}

// ── Preset factory ────────────────────────────────────────────────────────────
export class ParticlePresets {
  static fire(scene, position) {
    return new ParticleEmitter(scene, {
      maxParticles:10000, emitRate:200, lifetime:1.5, speed:2, speedVariation:0.8,
      size:0.1, sizeEnd:0.3, color:new THREE.Color(1,0.8,0.1), colorEnd:new THREE.Color(0.8,0.1,0),
      opacity:0.9, opacityEnd:0, gravity:new THREE.Vector3(0,1,0),
      turbulence:0.5, emitShape:"sphere", emitRadius:0.2,
      direction:new THREE.Vector3(0,1,0), spread:0.4, position, name:"Fire", type:"fire",
    });
  }
  static smoke(scene, position) {
    return new ParticleEmitter(scene, {
      maxParticles:5000, emitRate:30, lifetime:5, speed:0.5, speedVariation:0.3,
      size:0.3, sizeEnd:1.5, color:new THREE.Color(0.3,0.3,0.3), colorEnd:new THREE.Color(0.6,0.6,0.6),
      opacity:0.4, opacityEnd:0, gravity:new THREE.Vector3(0,0.2,0),
      turbulence:0.3, emitShape:"sphere", emitRadius:0.3,
      direction:new THREE.Vector3(0,1,0), spread:0.2, position, name:"Smoke", type:"smoke",
    });
  }
  static sparks(scene, position) {
    return new ParticleEmitter(scene, {
      maxParticles:2000, emitRate:500, lifetime:0.8, speed:5, speedVariation:2,
      size:0.03, sizeEnd:0, color:new THREE.Color(1,0.9,0.5), colorEnd:new THREE.Color(1,0.3,0),
      opacity:1, opacityEnd:0, gravity:new THREE.Vector3(0,-9.8,0),
      turbulence:0.2, emitShape:"point",
      direction:new THREE.Vector3(0,1,0), spread:1.5, position, name:"Sparks", type:"sparks",
    });
  }
  static rain(scene, position) {
    return new ParticleEmitter(scene, {
      maxParticles:10000, emitRate:500, lifetime:2, speed:8, speedVariation:0.5,
      size:0.02, sizeEnd:0.01, color:new THREE.Color(0.6,0.7,0.9), colorEnd:new THREE.Color(0.6,0.7,0.9),
      opacity:0.6, opacityEnd:0.3, gravity:new THREE.Vector3(0,-9.8,0),
      turbulence:0.1, emitShape:"box", emitRadius:10,
      direction:new THREE.Vector3(0,-1,0), spread:0.05, position, name:"Rain", type:"rain",
    });
  }
  static snow(scene, position) {
    return new ParticleEmitter(scene, {
      maxParticles:5000, emitRate:100, lifetime:6, speed:0.5, speedVariation:0.3,
      size:0.04, sizeEnd:0.02, color:new THREE.Color(1,1,1), colorEnd:new THREE.Color(0.9,0.95,1),
      opacity:0.8, opacityEnd:0.5, gravity:new THREE.Vector3(0,-0.5,0),
      turbulence:0.5, emitShape:"box", emitRadius:10,
      direction:new THREE.Vector3(0,-1,0), spread:0.3, position, name:"Snow", type:"snow",
    });
  }
  static magic(scene, position) {
    return new ParticleEmitter(scene, {
      maxParticles:3000, emitRate:150, lifetime:2, speed:1.5, speedVariation:1,
      size:0.06, sizeEnd:0, color:new THREE.Color(0.5,0,1), colorEnd:new THREE.Color(0,0.8,1),
      opacity:1, opacityEnd:0, gravity:new THREE.Vector3(0,0.3,0),
      turbulence:1, emitShape:"sphere", emitRadius:0.3,
      direction:new THREE.Vector3(0,1,0), spread:2, position, name:"Magic", type:"magic",
    });
  }
  static dust(scene, position) {
    return new ParticleEmitter(scene, {
      maxParticles:3000, emitRate:50, lifetime:4, speed:0.3, speedVariation:0.2,
      size:0.03, sizeEnd:0.06, color:new THREE.Color(0.7,0.65,0.5), colorEnd:new THREE.Color(0.8,0.75,0.6),
      opacity:0.3, opacityEnd:0, gravity:new THREE.Vector3(0,0.05,0),
      turbulence:0.8, emitShape:"box", emitRadius:2,
      direction:new THREE.Vector3(0,1,0), spread:1.5, position, name:"Dust", type:"dust",
    });
  }
}

export class ParticleEngine {
  constructor(scene) {
    this.scene    = scene;
    this.emitters = new Map();
    this.rafId    = null;
    this.last     = performance.now();
    this.running  = false;
  }

  create(type = "fire", position = new THREE.Vector3(), params = {}) {
    const pos = position.clone();
    let emitter;
    switch(type) {
      case "fire":   emitter = ParticlePresets.fire(this.scene, pos);   break;
      case "smoke":  emitter = ParticlePresets.smoke(this.scene, pos);  break;
      case "sparks": emitter = ParticlePresets.sparks(this.scene, pos); break;
      case "rain":   emitter = ParticlePresets.rain(this.scene, pos);   break;
      case "snow":   emitter = ParticlePresets.snow(this.scene, pos);   break;
      case "magic":  emitter = ParticlePresets.magic(this.scene, pos);  break;
      case "dust":   emitter = ParticlePresets.dust(this.scene, pos);   break;
      default:       emitter = new ParticleEmitter(this.scene, { ...params, position:pos }); break;
    }
    this.emitters.set(emitter.params.name, emitter);
    return emitter;
  }

  startAll() {
    this.emitters.forEach(e => e.start());
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      const dt  = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.emitters.forEach(e => e.step(dt));
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopAll()  { this.running = false; if(this.rafId)cancelAnimationFrame(this.rafId); this.emitters.forEach(e=>e.stop()); }
  remove(name){ const e=this.emitters.get(name); if(e){e.dispose();this.emitters.delete(name);} }
  burst(name, n=100){ this.emitters.get(name)?.burst(n); }
  step(dt)   { this.emitters.forEach(e=>e.step(dt)); }

  dispose() {
    this.stopAll();
    this.emitters.forEach(e=>e.dispose());
    this.emitters.clear();
  }
}
