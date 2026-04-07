/**
 * SPX Animation Engine
 * Real keyframe interpolation, animation clips, mixer, graph editor data
 */
import * as THREE from "three";

export class Keyframe {
  constructor(time, value, interpolation = "bezier") {
    this.time = time;
    this.value = value; // number or {x,y,z} or {x,y,z,w}
    this.interpolation = interpolation; // linear | bezier | constant | ease_in | ease_out
    this.handleIn  = { time: -0.1, value: 0 };
    this.handleOut = { time:  0.1, value: 0 };
  }
}

export class FCurve {
  constructor(property, target) {
    this.property = property; // e.g. "position.x"
    this.target   = target;
    this.keyframes= [];
    this.muted    = false;
    this.locked   = false;
    this.color    = "#00ffc8";
  }

  addKeyframe(time, value, interp = "bezier") {
    const kf = new Keyframe(time, value, interp);
    this.keyframes.push(kf);
    this.keyframes.sort((a,b) => a.time - b.time);
    return kf;
  }

  removeKeyframe(time) {
    const idx = this.keyframes.findIndex(k => Math.abs(k.time - time) < 0.001);
    if (idx >= 0) this.keyframes.splice(idx, 1);
  }

  evaluate(time) {
    if (this.keyframes.length === 0) return 0;
    if (this.keyframes.length === 1) return this.keyframes[0].value;
    const kfs = this.keyframes;
    if (time <= kfs[0].time) return kfs[0].value;
    if (time >= kfs[kfs.length-1].time) return kfs[kfs.length-1].value;
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i], b = kfs[i+1];
      if (time >= a.time && time <= b.time) {
        const t = (time - a.time) / (b.time - a.time);
        return this._interpolate(a, b, t);
      }
    }
    return 0;
  }

  _interpolate(a, b, t) {
    switch (a.interpolation) {
      case "linear":   return a.value + (b.value - a.value) * t;
      case "constant": return a.value;
      case "ease_in":  return a.value + (b.value - a.value) * (t * t);
      case "ease_out": return a.value + (b.value - a.value) * (1 - (1-t)*(1-t));
      case "bezier":
      default: {
        const h = t * t * (3 - 2 * t); // smoothstep
        return a.value + (b.value - a.value) * h;
      }
    }
  }

  // Convert to THREE.KeyframeTrack
  toThreeTrack(targetName) {
    const times  = this.keyframes.map(k => k.time);
    const values = this.keyframes.map(k => k.value);
    return new THREE.NumberKeyframeTrack(`${targetName}.${this.property}`, times, values);
  }
}

export class AnimationClip {
  constructor(name, duration = 2) {
    this.name     = name;
    this.duration = duration;
    this.fcurves  = []; // FCurve[]
    this.fps      = 24;
    this.loop     = true;
  }

  addFCurve(property, target) {
    const fc = new FCurve(property, target);
    this.fcurves.push(fc);
    return fc;
  }

  removeFCurve(property) {
    this.fcurves = this.fcurves.filter(fc => fc.property !== property);
  }

  // Apply animation at given time to all targets
  apply(time) {
    this.fcurves.forEach(fc => {
      if (fc.muted || !fc.target) return;
      const val = fc.evaluate(time);
      const parts = fc.property.split(".");
      if (parts.length === 2) {
        const [obj, axis] = parts;
        if (fc.target[obj] !== undefined) fc.target[obj][axis] = val;
      } else if (parts.length === 1) {
        fc.target[fc.property] = val;
      }
    });
  }

  toThreeClip(targetName) {
    const tracks = this.fcurves.filter(fc => !fc.muted).map(fc => fc.toThreeTrack(targetName));
    return new THREE.AnimationClip(this.name, this.duration, tracks);
  }

  // Insert keyframe at current time for all selected objects
  insertKeyframe(time, targets) {
    targets.forEach(target => {
      ["position.x","position.y","position.z","rotation.x","rotation.y","rotation.z","scale.x","scale.y","scale.z"].forEach(prop => {
        let fc = this.fcurves.find(f => f.property === prop && f.target === target);
        if (!fc) fc = this.addFCurve(prop, target);
        const parts = prop.split(".");
        const val   = parts.length === 2 ? target[parts[0]]?.[parts[1]] ?? 0 : target[prop] ?? 0;
        fc.addKeyframe(time, val);
      });
    });
  }
}

export class AnimationEngine {
  constructor(scene) {
    this.scene   = scene;
    this.clips   = new Map();
    this.mixers  = new Map();
    this.current = null;
    this.time    = 0;
    this.playing = false;
    this.fps     = 24;
  }

  createClip(name, duration = 2) {
    const clip = new AnimationClip(name, duration);
    this.clips.set(name, clip);
    this.current = clip;
    return clip;
  }

  play()  { this.playing = true; }
  pause() { this.playing = false; }
  stop()  { this.playing = false; this.time = 0; }

  setTime(t) {
    this.time = t;
    if (this.current) this.current.apply(t);
  }

  update(dt) {
    if (!this.playing || !this.current) return;
    this.time += dt;
    if (this.current.loop && this.time > this.current.duration) this.time = 0;
    else if (this.time > this.current.duration) { this.time = this.current.duration; this.playing = false; }
    this.current.apply(this.time);
    this.mixers.forEach(m => m.update(dt));
  }

  // Insert keyframe at current time
  insertKeyframe(targets) {
    if (!this.current) return;
    this.current.insertKeyframe(this.time, targets);
  }

  // Wire to THREE.AnimationMixer for skeletal animation
  playThreeClip(object, clip) {
    const mixer = new THREE.AnimationMixer(object);
    this.mixers.set(object.uuid, mixer);
    const action = mixer.clipAction(clip);
    action.play();
    return { mixer, action };
  }

  getClip(name) { return this.clips.get(name); }
  listClips()   { return [...this.clips.keys()]; }

  // Export to GLTF-compatible animation
  exportClip(name, target) {
    const clip = this.clips.get(name);
    return clip ? clip.toThreeClip(target.name || "object") : null;
  }
}
