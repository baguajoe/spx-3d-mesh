/**
 * SPX Denoiser
 * Bilateral filter post-pass for path tracer output
 * Reduces noise while preserving edges
 */
import * as THREE from "three";

export const DENOISE_FRAG = `
precision highp float;
uniform sampler2D tDiffuse;
uniform float     uSigmaColor;  // color similarity threshold
uniform float     uSigmaSpace;  // spatial falloff
uniform float     uStrength;    // blend 0-1
uniform vec2      uResolution;
varying vec2      vUv;

float gaussian(float x, float sigma) {
  return exp(-0.5 * (x*x) / (sigma*sigma));
}

void main() {
  vec2  uv     = vUv;
  vec4  center = texture2D(tDiffuse, uv);
  vec3  sum    = vec3(0.0);
  float wSum   = 0.0;
  vec2  px     = 1.0 / uResolution;
  int   radius = 4;

  for (int dx = -4; dx <= 4; dx++) {
    for (int dy = -4; dy <= 4; dy++) {
      vec2 offset = vec2(float(dx), float(dy)) * px;
      vec4 sample = texture2D(tDiffuse, uv + offset);
      float spaceDist = length(vec2(float(dx), float(dy)));
      float colorDist = length(sample.rgb - center.rgb);
      float w = gaussian(spaceDist, uSigmaSpace) * gaussian(colorDist, uSigmaColor);
      sum  += sample.rgb * w;
      wSum += w;
    }
  }

  vec3 denoised = sum / wSum;
  gl_FragColor  = vec4(mix(center.rgb, denoised, uStrength), center.a);
}
`;

export const DENOISE_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

export class DenoiserPass {
  constructor(renderer) {
    this.renderer   = renderer;
    this.enabled    = true;
    this.strength   = 0.8;
    this.sigmaColor = 0.1;
    this.sigmaSpace = 2.0;

    // Render target
    const size = renderer.getSize(new THREE.Vector2());
    this.rt  = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
      type:      THREE.HalfFloatType,
    });

    // Full-screen quad
    this.material = new THREE.ShaderMaterial({
      vertexShader:   DENOISE_VERT,
      fragmentShader: DENOISE_FRAG,
      uniforms: {
        tDiffuse:    { value: null },
        uSigmaColor: { value: this.sigmaColor },
        uSigmaSpace: { value: this.sigmaSpace },
        uStrength:   { value: this.strength },
        uResolution: { value: new THREE.Vector2(size.x, size.y) },
      },
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), this.material);
    this.quad.frustumCulled = false;
    this.fsScene  = new THREE.Scene();
    this.fsCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.fsScene.add(this.quad);
  }

  // Apply denoiser to current render target
  render(inputTexture, outputTarget=null) {
    if (!this.enabled) return;
    this.material.uniforms.tDiffuse.value   = inputTexture;
    this.material.uniforms.uStrength.value  = this.strength;
    this.material.uniforms.uSigmaColor.value= this.sigmaColor;
    this.material.uniforms.uSigmaSpace.value= this.sigmaSpace;
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.render(this.fsScene, this.fsCamera);
    this.renderer.setRenderTarget(null);
  }

  setSize(w, h) {
    this.rt.setSize(w, h);
    this.material.uniforms.uResolution.value.set(w, h);
  }

  dispose() {
    this.rt.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

// ── OIDN-style temporal accumulation denoiser ─────────────────────────────────
export class TemporalDenoiser {
  constructor(renderer) {
    this.renderer    = renderer;
    this.history     = null;
    this.frameCount  = 0;
    this.alpha       = 0.1; // blend factor per frame
    this.enabled     = true;
  }

  accumulate(currentTexture) {
    if (!this.enabled) return currentTexture;
    this.frameCount++;
    // After many samples, reduce blend to preserve detail
    const alpha = 1 / Math.min(this.frameCount, 32);
    return { texture: currentTexture, alpha };
  }

  reset() { this.frameCount = 0; }
  dispose() { this.history?.dispose(); }
}
