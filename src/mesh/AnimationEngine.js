/**
 * SPX Animation Engine v2
 * FCurves, bezier handles, graph editor data, NLA clip baking, keyframe interpolation
 */
import * as THREE from "three";

export const INTERP = { LINEAR:"linear", BEZIER:"bezier", CONSTANT:"constant", EASE_IN:"ease_in", EASE_OUT:"ease_out", EASE_INOUT:"ease_inout" };

export class Keyframe {
  constructor(time, value, interp=INTERP.BEZIER) {
    this.time   = time;
    this.value  = value;
    this.interp = interp;
    // Bezier handles (relative to keyframe)
    this.handleLeft  = { time:-0.1, value:0 };
    this.handleRight = { time: 0.1, value:0 };
  }
}

export class FCurve {
  constructor(property, target=null) {
    this.property  = property;
    this.target    = target;
    this.keyframes = [];
    this.extrapolation = "constant"; // constant | linear | cyclic
    this.muted     = false;
    this.color     = "#00ffc8";
  }

  addKeyframe(time, value, interp=INTERP.BEZIER) {
    const existing = this.keyframes.findIndex(k => Math.abs(k.time - time) < 0.001);
    if (existing >= 0) { this.keyframes[existing].value = value; return this.keyframes[existing]; }
    const kf = new Keyframe(time, value, interp);
    this.keyframes.push(kf);
    this.keyframes.sort((a,b) => a.time - b.time);
    return kf;
  }

  removeKeyframe(time) {
    this.keyframes = this.keyframes.filter(k => Math.abs(k.time - time) > 0.001);
  }

  evaluate(time) {
    const kfs = this.keyframes;
    if (kfs.length === 0) return 0;
    if (kfs.length === 1) return kfs[0].value;
    if (time <= kfs[0].time) return this._extrapolate(time, "start");
    if (time >= kfs[kfs.length-1].time) return this._extrapolate(time, "end");
    // Find segment
    let lo = 0, hi = kfs.length - 1;
    while (lo < hi - 1) { const mid=Math.floor((lo+hi)/2); if(kfs[mid].time<=time)lo=mid; else hi=mid; }
    const k0=kfs[lo], k1=kfs[hi];
    const t=(time-k0.time)/(k1.time-k0.time);
    return this._interpolate(k0, k1, t);
  }

  _interpolate(k0, k1, t) {
    switch(k0.interp) {
      case INTERP.LINEAR:   return k0.value + (k1.value - k0.value) * t;
      case INTERP.CONSTANT: return k0.value;
      case INTERP.EASE_IN:  return k0.value + (k1.value - k0.value) * (t*t);
      case INTERP.EASE_OUT: return k0.value + (k1.value - k0.value) * (1-(1-t)*(1-t));
      case INTERP.EASE_INOUT: { const s=t*t*(3-2*t); return k0.value+(k1.value-k0.value)*s; }
      case INTERP.BEZIER: {
        // Cubic bezier with handles
        const p0=k0.value, p3=k1.value;
        const p1=k0.value+k0.handleRight.value;
        const p2=k1.value+k1.handleLeft.value;
        return this._cubicBezier(t,p0,p1,p2,p3);
      }
      default: return k0.value + (k1.value - k0.value) * t;
    }
  }

  _cubicBezier(t,p0,p1,p2,p3) {
    const u=1-t;
    return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
  }

  _extrapolate(time, end) {
    const kfs=this.keyframes;
    if(this.extrapolation==="constant") return end==="start"?kfs[0].value:kfs[kfs.length-1].value;
    if(this.extrapolation==="cyclic"){
      const dur=kfs[kfs.length-1].time-kfs[0].time;
      if(dur<=0)return kfs[0].value;
      const t=((time-kfs[0].time)%dur+dur)%dur+kfs[0].time;
      return this.evaluate(t);
    }
    // Linear extrapolation
    if(end==="start"&&kfs.length>=2){
      const k0=kfs[0],k1=kfs[1];
      const slope=(k1.value-k0.value)/(k1.time-k0.time||1);
      return k0.value+slope*(time-k0.time);
    }
    if(end==="end"&&kfs.length>=2){
      const k0=kfs[kfs.length-2],k1=kfs[kfs.length-1];
      const slope=(k1.value-k0.value)/(k1.time-k0.time||1);
      return k1.value+slope*(time-k1.time);
    }
    return kfs[0].value;
  }

  // Apply to target object property
  applyToTarget(time) {
    if (this.muted || !this.target) return;
    const val = this.evaluate(time);
    const parts = this.property.split(".");
    if (parts.length === 2) {
      const [obj, prop] = parts;
      if (this.target[obj] !== undefined) this.target[obj][prop] = val;
    } else if (parts.length === 1) {
      this.target[parts[0]] = val;
    }
  }

  getMinMax() {
    if (!this.keyframes.length) return { min:0, max:1, tMin:0, tMax:1 };
    return {
      min: Math.min(...this.keyframes.map(k=>k.value)),
      max: Math.max(...this.keyframes.map(k=>k.value)),
      tMin: this.keyframes[0].time,
      tMax: this.keyframes[this.keyframes.length-1].time,
    };
  }
}

export class AnimationClip {
  constructor(name, duration=4) {
    this.name     = name;
    this.duration = duration;
    this.fps      = 24;
    this.fcurves  = [];
    this.markers  = []; // { time, name }
  }

  addFCurve(property, target=null) {
    const fc = new FCurve(property, target);
    this.fcurves.push(fc);
    return fc;
  }

  removeFCurve(property) {
    this.fcurves = this.fcurves.filter(fc => fc.property !== property);
  }

  getFCurve(property) { return this.fcurves.find(fc=>fc.property===property); }

  addMarker(time, name) { this.markers.push({time,name}); this.markers.sort((a,b)=>a.time-b.time); }

  evaluate(time) {
    this.fcurves.forEach(fc => fc.applyToTarget(time));
  }

  // Insert keyframe for all tracked properties at current time
  insertKeyframe(time, target) {
    const props = ["position.x","position.y","position.z","rotation.x","rotation.y","rotation.z","scale.x","scale.y","scale.z"];
    props.forEach(prop => {
      let fc = this.getFCurve(prop);
      if (!fc) fc = this.addFCurve(prop, target);
      const parts = prop.split(".");
      const val = parts.length===2 ? target?.[parts[0]]?.[parts[1]] ?? 0 : 0;
      fc.addKeyframe(time, val);
    });
  }

  // Bake THREE.AnimationClip for export
  bakeThreeClip(target) {
    const tracks = [];
    const grouped = new Map();
    this.fcurves.forEach(fc => {
      const parts = fc.property.split(".");
      if (parts.length !== 2) return;
      const [obj, prop] = parts;
      if (!grouped.has(obj)) grouped.set(obj, {});
      grouped.get(obj)[prop] = fc;
    });
    // Position track
    if (grouped.has("position")) {
      const g = grouped.get("position");
      const times = [...new Set([...(g.x?.keyframes||[]), ...(g.y?.keyframes||[]), ...(g.z?.keyframes||[])].map(k=>k.time))].sort((a,b)=>a-b);
      const values = times.flatMap(t => [g.x?.evaluate(t)??0, g.y?.evaluate(t)??0, g.z?.evaluate(t)??0]);
      if (times.length) tracks.push(new THREE.VectorKeyframeTrack(".position", times, values));
    }
    return new THREE.AnimationClip(this.name, this.duration, tracks);
  }
}

export class AnimationEngine {
  constructor(scene) {
    this.scene   = scene;
    this.clips   = new Map();
    this.mixers  = new Map();
    this.time    = 0;
    this.fps     = 24;
    this.playing = false;
  }

  createClip(name, duration=4) {
    const clip = new AnimationClip(name, duration);
    this.clips.set(name, clip);
    return clip;
  }

  setTime(time) {
    this.time = time;
    this.clips.forEach(clip => clip.evaluate(time));
  }

  play()  { this.playing=true; }
  pause() { this.playing=false; }

  step(dt) {
    if (!this.playing) return;
    this.time += dt;
    this.clips.forEach(clip => {
      if (this.time > clip.duration) this.time = 0;
      clip.evaluate(this.time);
    });
    this.mixers.forEach(mixer => mixer.update(dt));
  }

  // Attach THREE.AnimationMixer to an object
  attachMixer(object, clip) {
    const threeClip = clip.bakeThreeClip(object);
    let mixer = this.mixers.get(object.uuid);
    if (!mixer) { mixer = new THREE.AnimationMixer(object); this.mixers.set(object.uuid, mixer); }
    const action = mixer.clipAction(threeClip);
    action.play();
    return action;
  }

  dispose() {
    this.mixers.forEach(m => m.stopAllAction());
    this.mixers.clear();
  }
}
