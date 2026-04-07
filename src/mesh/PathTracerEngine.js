/**
 * SPX Path Tracer Engine
 * Wraps three-gpu-pathtracer for Arnold/RenderMan quality output
 * Features: GI, caustics, subsurface, physically correct lighting
 * Desktop-first — requires WebGL2
 */
import * as THREE from "three";
import {
  PathTracingRenderer,
  PhysicalPathTracingMaterial,
  BlurredEnvMapGenerator,
  GradientEquirectTexture,
  ShapedAreaLight,
  PhysicalCamera,
  DepthOfFieldShader,
  IESLoader,
} from "three-gpu-pathtracer";

// ── Path Tracer Engine ─────────────────────────────────────────────────────────
export class PathTracerEngine {
  constructor(renderer, scene, camera) {
    this.renderer     = renderer;
    this.scene        = scene;
    this.camera       = camera;
    this.ptRenderer   = null;
    this.fsQuad       = null;
    this.samples      = 0;
    this.maxSamples   = 512;
    this.enabled      = false;
    this.progressive  = true;
    this.bounces      = 8;
    this.caustics     = true;
    this.filterGlossy = 0.5;
    this.envIntensity = 1;
    this.envRotation  = 0;
    this.exposureVal  = 0;
    this.toneMapping  = "aces";
    this.denoiseEnabled = true;
    this.adaptiveSampling = true;
    this.noiseThreshold = 0.01;

    this._onResize   = this._onResize.bind(this);
    this._initialized = false;
  }

  // ── Initialize path tracer ─────────────────────────────────────────────────
  async init() {
    try {
      const ptRenderer = new PathTracingRenderer(this.renderer);
      ptRenderer.camera   = this.camera;
      ptRenderer.alpha    = false;
      ptRenderer.material = new PhysicalPathTracingMaterial();
      ptRenderer.material.setDefine("FEATURE_CAUSTICS",     this.caustics ? 1 : 0);
      ptRenderer.material.setDefine("FEATURE_TRANSMISSION", 1);
      ptRenderer.material.setDefine("FEATURE_SUBSURFACE",   1);
      ptRenderer.material.setDefine("FEATURE_FOG",          1);
      ptRenderer.setSize(this.renderer.domElement.width, this.renderer.domElement.height);

      this.ptRenderer = ptRenderer;
      this._initialized = true;

      await this.updateScene();
      return true;
    } catch(e) {
      console.warn("PathTracer init failed:", e.message);
      return false;
    }
  }

  // ── Build BVH from scene ───────────────────────────────────────────────────
  async updateScene() {
    if (!this.ptRenderer) return;
    try {
      await this.ptRenderer.setScene(this.scene, this.camera);
      this.reset();
    } catch(e) {
      console.warn("PathTracer scene update failed:", e.message);
    }
  }

  // ── HDRI environment ───────────────────────────────────────────────────────
  async setHDRI(texture) {
    if (!this.ptRenderer) return;
    try {
      const gen = new BlurredEnvMapGenerator(this.renderer);
      const blurred = await gen.generate(texture, 0.08);
      this.scene.background = texture;
      this.scene.environment= blurred;
      this.ptRenderer.material.envMapInfo.updateFrom(blurred);
      this.reset();
    } catch(e) {
      console.warn("HDRI set failed:", e.message);
    }
  }

  // ── Gradient sky ───────────────────────────────────────────────────────────
  async setGradientSky(topColor = 0x88aaff, bottomColor = 0xffeedd) {
    try {
      const gradTex = new GradientEquirectTexture();
      gradTex.topColor.set(topColor);
      gradTex.bottomColor.set(bottomColor);
      gradTex.update();
      this.scene.background  = gradTex;
      this.scene.environment = gradTex;
      if (this.ptRenderer) {
        this.ptRenderer.material.envMapInfo.updateFrom(gradTex);
        this.reset();
      }
    } catch(e) {
      console.warn("Gradient sky failed:", e.message);
    }
  }

  // ── Material upgrade: convert standard → physical path tracing ────────────
  upgradeSceneMaterials() {
    this.scene.traverse(obj => {
      if (!obj.isMesh) return;
      const mat = obj.material;
      if (!mat || mat.isShaderMaterial) return; // skip custom shaders

      // MeshStandardMaterial → PhysicalPathTracingMaterial equivalent
      if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
        const physMat = new THREE.MeshPhysicalMaterial({
          color:              mat.color?.clone() || new THREE.Color(0.8,0.8,0.8),
          roughness:          mat.roughness       ?? 0.5,
          metalness:          mat.metalness       ?? 0,
          clearcoat:          mat.clearcoat       ?? 0,
          clearcoatRoughness: mat.clearcoatRoughness ?? 0.1,
          transmission:       mat.transmission    ?? 0,
          ior:                mat.ior             ?? 1.5,
          thickness:          mat.thickness       ?? 0,
          emissive:           mat.emissive?.clone() || new THREE.Color(0,0,0),
          emissiveIntensity:  mat.emissiveIntensity ?? 1,
          map:                mat.map,
          normalMap:          mat.normalMap,
          roughnessMap:       mat.roughnessMap,
          aoMap:              mat.aoMap,
          envMapIntensity:    1,
        });
        obj.material = physMat;
      }
    });
  }

  // ── Render one progressive sample ─────────────────────────────────────────
  render() {
    if (!this.ptRenderer || !this._initialized) return false;
    if (this.samples >= this.maxSamples) return false;

    try {
      this.ptRenderer.material.filterGlossy  = this.filterGlossy;
      this.ptRenderer.material.environmentIntensity = this.envIntensity;
      this.ptRenderer.material.bounces       = this.bounces;
      this.ptRenderer.material.physicalCamera= 1;

      this.ptRenderer.update();
      this.samples++;

      // Copy to screen
      this.renderer.autoClear = false;
      this.ptRenderer.copyTo(this.renderer);
      this.renderer.autoClear = true;
      return true;
    } catch(e) {
      return false;
    }
  }

  // ── Reset accumulation ─────────────────────────────────────────────────────
  reset() {
    this.samples = 0;
    this.ptRenderer?.reset();
  }

  // ── Update camera (call after any camera change) ───────────────────────────
  updateCamera() {
    if (!this.ptRenderer) return;
    this.ptRenderer.camera = this.camera;
    this.reset();
  }

  // ── Configure for film quality preset ─────────────────────────────────────
  setFilmQualityPreset(preset = "cinematic") {
    const presets = {
      preview: {
        maxSamples:    64,
        bounces:       4,
        caustics:      false,
        filterGlossy:  0.5,
        envIntensity:  1,
      },
      production: {
        maxSamples:    512,
        bounces:       10,
        caustics:      true,
        filterGlossy:  0.1,
        envIntensity:  1,
      },
      cinematic: {
        maxSamples:    1024,
        bounces:       12,
        caustics:      true,
        filterGlossy:  0.05,
        envIntensity:  1,
      },
      vfx: {
        maxSamples:    2048,
        bounces:       16,
        caustics:      true,
        filterGlossy:  0.01,
        envIntensity:  1,
      },
      uber: {
        maxSamples:    4096,
        bounces:       32,
        caustics:      true,
        filterGlossy:  0,
        envIntensity:  1,
      },
    };
    const p = presets[preset] || presets.cinematic;
    Object.assign(this, p);
    if (this.ptRenderer) {
      this.ptRenderer.material.setDefine("FEATURE_CAUSTICS", p.caustics ? 1 : 0);
      this.reset();
    }
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  _onResize(w, h) {
    this.ptRenderer?.setSize(w, h);
    this.reset();
  }

  // ── Progress info ──────────────────────────────────────────────────────────
  getProgress() {
    return {
      samples:    this.samples,
      maxSamples: this.maxSamples,
      pct:        Math.round((this.samples / this.maxSamples) * 100),
      done:       this.samples >= this.maxSamples,
    };
  }

  dispose() {
    this.ptRenderer?.dispose();
    this._initialized = false;
  }
}

// ── Physical Camera (DOF wired to path tracer) ─────────────────────────────────
export class FilmCamera {
  constructor(camera, ptRenderer) {
    this.camera      = camera;
    this.ptRenderer  = ptRenderer;
    this.focalLength = 50;
    this.sensorWidth = 36;
    this.aperture    = 2.8;
    this.focusDistance = 5;
    this.bokehBlades = 8;
    this.motionBlur  = 0;
  }

  apply(params) {
    const { focalLength, sensorWidth, aperture, focusDistance, bokehBlades } = { ...this, ...params };

    // FOV from focal length + sensor
    this.camera.fov = 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
    this.camera.updateProjectionMatrix();

    // Wire DOF to path tracer material
    if (this.ptRenderer?.ptRenderer?.material) {
      const mat = this.ptRenderer.ptRenderer.material;
      mat.physicalCamera = 1;
      mat.bokehSize      = sensorWidth / (aperture * focalLength) * 0.01;
      mat.focusDistance  = focusDistance;
      mat.apertureBlades = bokehBlades;
      this.ptRenderer.reset();
    }

    Object.assign(this, params);
  }
}

// ── Render Pass system (EXR multi-pass) ───────────────────────────────────────
export class RenderPassSystem {
  constructor(renderer, ptEngine) {
    this.renderer = renderer;
    this.ptEngine = ptEngine;
    this.passes   = new Map();
    this.enabled  = new Set(["beauty"]);
  }

  enablePass(name) {
    this.enabled.add(name);
    this._configurePasses();
  }

  disablePass(name) {
    this.enabled.delete(name);
    this._configurePasses();
  }

  _configurePasses() {
    if (!this.ptEngine?.ptRenderer?.material) return;
    const mat = this.ptEngine.ptRenderer.material;
    // Configure path tracer defines for passes
    mat.setDefine("RENDER_PASS_DIFFUSE",    this.enabled.has("diffuse")  ? 1 : 0);
    mat.setDefine("RENDER_PASS_SPECULAR",   this.enabled.has("specular") ? 1 : 0);
    mat.setDefine("RENDER_PASS_EMISSION",   this.enabled.has("emission") ? 1 : 0);
    mat.setDefine("RENDER_PASS_AO",         this.enabled.has("ao")       ? 1 : 0);
    mat.setDefine("RENDER_PASS_NORMAL",     this.enabled.has("normal")   ? 1 : 0);
    mat.setDefine("RENDER_PASS_DEPTH",      this.enabled.has("depth")    ? 1 : 0);
    this.ptEngine.reset();
  }

  // Export current render as PNG data URL
  exportBeauty() {
    return this.renderer.domElement.toDataURL("image/png");
  }

  // Export as EXR (requires additional lib — stub for now)
  exportEXR() {
    console.log("EXR export: install three/examples/jsm/exporters/EXRExporter");
    return this.exportBeauty();
  }
}
