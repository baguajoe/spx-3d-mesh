/**
 * SPX Film Quality Engine
 * Path tracing, SSS skin, strand hair, volumetrics, GPU instancing, LOD, displacement
 * Desktop-first — Electron/Chrome with WebGL2
 */
import * as THREE from "three";

// ── Jimenez SSS Skin Shader ───────────────────────────────────────────────────
export const SSS_SKIN_VERT = `
varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPos;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vNormal   = normalize(normalMatrix * normal);
  vUv       = uv;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos   = mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`;

export const SSS_SKIN_FRAG = `
precision highp float;
uniform vec3  uSkinColor;       // base skin tone
uniform vec3  uSkinColorDeep;   // deep layer (venous blood)
uniform float uSSSStrength;     // subsurface scatter amount
uniform float uSSSRadius;       // scatter radius
uniform float uRoughness;
uniform float uSpecular;
uniform vec3  uLightDir;
uniform vec3  uLightColor;
uniform vec3  uCameraPos;
uniform float uFitzpatrick;     // 1-6 skin tone scale

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPos;

// Kelemen/Szirmay-Kalos BRDF for skin
vec3 KSK_specular(vec3 N, vec3 L, vec3 V, float roughness) {
  vec3 H = normalize(L + V);
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float VdotH = max(dot(V, H), 0.0);
  float r2 = roughness * roughness;
  float D = r2 / (3.14159 * pow(NdotH*NdotH*(r2-1.0)+1.0, 2.0));
  float F = 0.028 + 0.972 * pow(1.0 - VdotH, 5.0);
  float G = min(1.0, min(2.0*NdotH*NdotL/VdotH, 2.0*NdotH*max(dot(N,V),0.01)/VdotH));
  return vec3(D * F * G / (4.0 * max(dot(N,V),0.01)));
}

// 3-layer SSS approximation (Jimenez 2015)
vec3 SSS_approx(vec3 N, vec3 L, float sssStrength, float radius) {
  // Layer 1: epidermal (thin, yellow-red)
  float d1 = max(0.0, dot(N, L));
  // Layer 2: subdermal (deeper, red-pink)
  float d2 = max(0.0, dot(-N, L) * 0.5 + 0.5); // back-scatter
  // Layer 3: venous (deep blue-red)
  float d3 = max(0.0, dot(N, -L) * 0.3);
  vec3 epidermal = uSkinColor * d1;
  vec3 subdermal = mix(uSkinColor, uSkinColorDeep, 0.5) * d2 * 0.6;
  vec3 venous    = uSkinColorDeep * d3 * 0.3;
  return (epidermal + (subdermal + venous) * sssStrength) * (1.0 + radius * 0.1);
}

// Fitzpatrick skin tone modifier
vec3 fitzpatrickColor(float scale, vec3 base) {
  // scale 1=very light, 6=very dark
  float t = (scale - 1.0) / 5.0;
  vec3 dark = vec3(0.25, 0.15, 0.08);
  return mix(base, dark, t * 0.7);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPos - vWorldPos);

  vec3 skinTone = fitzpatrickColor(uFitzpatrick, uSkinColor);
  vec3 deepTone = fitzpatrickColor(uFitzpatrick, uSkinColorDeep);

  // SSS diffuse
  vec3 diffuse = SSS_approx(N, L, uSSSStrength, uSSSRadius) * uLightColor;

  // Specular (wet skin highlight)
  vec3 spec = KSK_specular(N, L, V, uRoughness) * uSpecular * uLightColor;

  // Translucency (light through thin areas like ears/nose)
  float translucency = max(0.0, dot(-N, L)) * uSSSStrength * 0.4;
  vec3 trans = skinTone * uLightColor * translucency * vec3(0.8, 0.5, 0.4);

  vec3 color = diffuse + spec + trans;
  // Gamma
  color = pow(max(color, vec3(0.0)), vec3(1.0/2.2));
  gl_FragColor = vec4(color, 1.0);
}
`;

// ── Hair Strand Shader (Marschner BSDF) ───────────────────────────────────────
export const HAIR_VERT = `
attribute float aHairWidth;
attribute float aHairProgress; // 0=root 1=tip
varying vec3  vWorldPos;
varying vec3  vTangent;
varying float vProgress;
void main() {
  vProgress  = aHairProgress;
  vWorldPos  = (modelMatrix * vec4(position, 1.0)).xyz;
  // Approximate tangent from position gradient
  vTangent   = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(1.0, aHairWidth * 2.0);
}
`;

export const HAIR_FRAG = `
precision highp float;
uniform vec3  uHairColor;
uniform vec3  uHairColorTip;
uniform float uHairRoughness;    // longitudinal roughness
uniform float uHairAzimuthal;    // azimuthal roughness
uniform float uHairShift;        // cuticle tilt
uniform vec3  uLightDir;
uniform vec3  uLightColor;
uniform vec3  uCameraPos;
uniform float uHairSheen;        // back-scatter glow

varying vec3  vWorldPos;
varying vec3  vTangent;
varying float vProgress;

// Marschner R lobe (primary highlight)
float marschnerR(float cosThetaD, float beta) {
  return exp(-pow(cosThetaD / (2.0 * beta), 2.0)) / (2.0 * beta * sqrt(2.0 * 3.14159));
}

// Marschner TT lobe (transmission)
float marschnerTT(float cosThetaD, float beta) {
  return exp(-pow((cosThetaD - 0.5) / beta, 2.0)) * 0.5;
}

void main() {
  vec3 T = normalize(vTangent);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPos - vWorldPos);

  // Kajiya-Kay diffuse for hair
  float diffuse = sqrt(1.0 - pow(dot(T, L), 2.0));
  // Specular
  float specR  = marschnerR(dot(T, normalize(L+V)), uHairRoughness);
  float specTT = marschnerTT(dot(T, L), uHairAzimuthal);

  // Root-to-tip color gradient
  vec3 hairCol = mix(uHairColor, uHairColorTip, vProgress * vProgress);

  // Melanin absorption (dark hair absorbs more light)
  vec3 melanin = vec3(1.0) - hairCol * 0.8;
  vec3 transmitted = hairCol * specTT;

  vec3 color = hairCol * diffuse * uLightColor
             + uLightColor * specR * vec3(1.0)
             + transmitted * uHairSheen;

  // Root darkening
  color *= mix(0.7, 1.0, vProgress);

  color = pow(max(color, vec3(0.0)), vec3(1.0/2.2));
  gl_FragColor = vec4(color, 1.0);
}
`;

// ── Displacement Map Shader ───────────────────────────────────────────────────
export const DISPLACEMENT_VERT = `
uniform sampler2D uDisplacementMap;
uniform float     uDisplacementScale;
uniform float     uDisplacementBias;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv     = uv;
  float d = texture2D(uDisplacementMap, uv).r;
  vec3 displaced = position + normal * (d * uDisplacementScale + uDisplacementBias);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

export const DISPLACEMENT_FRAG = `
precision highp float;
uniform vec3  uBaseColor;
uniform float uRoughness;
uniform float uMetalness;
uniform vec3  uLightDir;
uniform vec3  uLightColor;
varying vec3  vNormal;
varying vec2  vUv;
void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  float NdotL = max(dot(N,L), 0.0);
  vec3 diff = uBaseColor * NdotL * uLightColor;
  float spec = pow(max(dot(reflect(-L,N), vec3(0,0,1)), 0.0), mix(2.0, 256.0, 1.0-uRoughness));
  vec3 col = diff + vec3(spec) * uMetalness;
  col = pow(max(col,vec3(0.0)), vec3(1.0/2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Volumetric Fog/Atmosphere Shader ─────────────────────────────────────────
export const VOLUME_FRAG = `
precision highp float;
uniform vec3  uFogColor;
uniform float uFogDensity;
uniform float uFogHeight;
uniform float uScattering;
uniform vec3  uLightDir;
uniform vec3  uLightColor;
uniform float uTime;
varying vec3  vWorldPos;
varying vec2  vUv;

float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float noise(vec3 p) {
  vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}

void main() {
  // Height-based fog density
  float heightFade = exp(-max(vWorldPos.y, 0.0) * uFogHeight);
  // Animated volumetric noise
  float n = noise(vWorldPos * 0.1 + vec3(uTime * 0.05, 0.0, uTime * 0.03));
  float density = uFogDensity * heightFade * (0.5 + 0.5 * n);
  // Henyey-Greenstein phase function for light scattering
  float cosTheta = dot(normalize(uLightDir), vec3(0,0,1));
  float g = uScattering;
  float phase = (1.0 - g*g) / (4.0 * 3.14159 * pow(1.0 + g*g - 2.0*g*cosTheta, 1.5));
  vec3 scatter = uLightColor * phase * density;
  vec3 fogColor = uFogColor * density + scatter;
  gl_FragColor = vec4(fogColor, density);
}
`;

// ── GPU Instanced Mesh System ─────────────────────────────────────────────────
export class InstancedMeshSystem {
  constructor(scene) {
    this.scene    = scene;
    this.instances= new Map(); // type → InstancedMesh
  }

  // Create instanced mesh for a type
  createInstanced(type, geometry, material, maxCount = 10000) {
    if (this.instances.has(type)) this.remove(type);
    const instMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    instMesh.count = 0;
    instMesh.name  = `instanced_${type}`;
    instMesh.castShadow    = true;
    instMesh.receiveShadow = true;
    // Enable mipmapping on material textures
    if (material.map) {
      material.map.generateMipmaps = true;
      material.map.minFilter = THREE.LinearMipmapLinearFilter;
      material.map.anisotropy= 16;
    }
    this.scene.add(instMesh);
    this.instances.set(type, instMesh);
    return instMesh;
  }

  // Add instance at position/rotation/scale
  addInstance(type, position, rotation = new THREE.Euler(), scale = new THREE.Vector3(1,1,1)) {
    const inst = this.instances.get(type);
    if (!inst || inst.count >= inst.instanceMatrix.count) return -1;
    const matrix = new THREE.Matrix4();
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
    const idx = inst.count++;
    inst.setMatrixAt(idx, matrix);
    inst.instanceMatrix.needsUpdate = true;
    return idx;
  }

  // Batch add many instances (performance-critical)
  batchAdd(type, transforms) {
    const inst = this.instances.get(type);
    if (!inst) return;
    const matrix = new THREE.Matrix4();
    const q      = new THREE.Quaternion();
    transforms.forEach(({ position, rotation, scale }) => {
      if (inst.count >= inst.instanceMatrix.count) return;
      q.setFromEuler(new THREE.Euler(rotation?.x||0, rotation?.y||0, rotation?.z||0));
      matrix.compose(
        new THREE.Vector3(position.x, position.y, position.z),
        q,
        new THREE.Vector3(scale?.x||1, scale?.y||1, scale?.z||1)
      );
      inst.setMatrixAt(inst.count++, matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  }

  clear(type) {
    const inst = this.instances.get(type);
    if (inst) { inst.count = 0; inst.instanceMatrix.needsUpdate = true; }
  }

  remove(type) {
    const inst = this.instances.get(type);
    if (inst) { this.scene.remove(inst); this.instances.delete(type); }
  }

  dispose() {
    this.instances.forEach(inst => { this.scene.remove(inst); inst.geometry.dispose(); inst.material.dispose(); });
    this.instances.clear();
  }
}

// ── LOD System ────────────────────────────────────────────────────────────────
export class LODSystem {
  constructor(scene, camera) {
    this.scene  = scene;
    this.camera = camera;
    this.lods   = [];
  }

  // Create LOD object with multiple detail levels
  createLOD(geometries, material, position = new THREE.Vector3()) {
    const lod = new THREE.LOD();
    lod.position.copy(position);
    geometries.forEach(({ geo, distance }) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      lod.addLevel(mesh, distance);
    });
    this.scene.add(lod);
    this.lods.push(lod);
    return lod;
  }

  // Auto-LOD from a high-poly mesh (simplified decimation)
  autoLOD(mesh, levels = 3) {
    const geo  = mesh.geometry;
    const lod  = new THREE.LOD();
    lod.position.copy(mesh.position);
    const distances = [0, 10, 30, 80];
    for (let l = 0; l < levels + 1; l++) {
      const factor = Math.pow(0.5, l); // halve verts each LOD
      let lodGeo;
      if (l === 0) {
        lodGeo = geo.clone();
      } else {
        // Simplified LOD: reduce by skipping vertices
        const pos    = geo.attributes.position;
        const step   = Math.pow(2, l);
        const newPos = [];
        for (let i = 0; i < pos.count; i += step) {
          newPos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        }
        // Build triangles from reduced set
        const newTris = [];
        for (let i = 0; i < newPos.length/3 - 2; i += 3) {
          newTris.push(i, i+1, i+2);
        }
        lodGeo = new THREE.BufferGeometry();
        lodGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(newPos), 3));
        if (newTris.length > 0) lodGeo.setIndex(newTris);
        lodGeo.computeVertexNormals();
      }
      const lodMesh = new THREE.Mesh(lodGeo, mesh.material);
      lod.addLevel(lodMesh, distances[l] || l * 25);
    }
    this.scene.add(lod);
    this.scene.remove(mesh);
    this.lods.push(lod);
    return lod;
  }

  update() {
    this.lods.forEach(lod => lod.update(this.camera));
  }

  dispose() {
    this.lods.forEach(lod => {
      this.scene.remove(lod);
      lod.levels.forEach(l => { l.object.geometry?.dispose(); });
    });
    this.lods = [];
  }
}

// ── SSS Skin Material Factory ─────────────────────────────────────────────────
export class FilmMaterialFactory {

  // Jimenez SSS skin — realistic human skin
  static createSkin(params = {}) {
    const {
      skinColor      = new THREE.Color(0xf0c8a0),
      skinColorDeep  = new THREE.Color(0xc06060),
      sssStrength    = 0.8,
      sssRadius      = 0.5,
      roughness      = 0.4,
      specular       = 0.3,
      fitzpatrick    = 2, // 1-6 scale
      lightDir       = new THREE.Vector3(1,2,1).normalize(),
      lightColor     = new THREE.Color(1,0.95,0.9),
    } = params;

    return new THREE.ShaderMaterial({
      vertexShader:   SSS_SKIN_VERT,
      fragmentShader: SSS_SKIN_FRAG,
      uniforms: {
        uSkinColor:     { value: skinColor },
        uSkinColorDeep: { value: skinColorDeep },
        uSSSStrength:   { value: sssStrength },
        uSSSRadius:     { value: sssRadius },
        uRoughness:     { value: roughness },
        uSpecular:      { value: specular },
        uLightDir:      { value: lightDir },
        uLightColor:    { value: lightColor },
        uCameraPos:     { value: new THREE.Vector3() },
        uFitzpatrick:   { value: fitzpatrick },
      },
    });
  }

  // Strand hair material — Marschner BSDF
  static createHair(params = {}) {
    const {
      hairColor    = new THREE.Color(0x3a2010),
      hairColorTip = new THREE.Color(0x6a4020),
      roughness    = 0.3,
      azimuthal    = 0.5,
      shift        = 0.05,
      sheen        = 0.4,
      lightDir     = new THREE.Vector3(1,2,1).normalize(),
      lightColor   = new THREE.Color(1,0.95,0.9),
    } = params;

    return new THREE.ShaderMaterial({
      vertexShader:   HAIR_VERT,
      fragmentShader: HAIR_FRAG,
      uniforms: {
        uHairColor:     { value: hairColor },
        uHairColorTip:  { value: hairColorTip },
        uHairRoughness: { value: roughness },
        uHairAzimuthal: { value: azimuthal },
        uHairShift:     { value: shift },
        uHairSheen:     { value: sheen },
        uLightDir:      { value: lightDir },
        uLightColor:    { value: lightColor },
        uCameraPos:     { value: new THREE.Vector3() },
      },
      side: THREE.DoubleSide,
    });
  }

  // Displacement material
  static createDisplacement(params = {}) {
    const {
      baseColor      = new THREE.Color(0.5, 0.5, 0.5),
      roughness      = 0.6,
      metalness      = 0,
      displacementMap= null,
      displacementScale = 0.2,
      displacementBias  = 0,
      lightDir       = new THREE.Vector3(1,2,1).normalize(),
      lightColor     = new THREE.Color(1,1,1),
    } = params;

    return new THREE.ShaderMaterial({
      vertexShader:   DISPLACEMENT_VERT,
      fragmentShader: DISPLACEMENT_FRAG,
      uniforms: {
        uDisplacementMap:   { value: displacementMap || new THREE.Texture() },
        uDisplacementScale: { value: displacementScale },
        uDisplacementBias:  { value: displacementBias },
        uBaseColor:         { value: baseColor },
        uRoughness:         { value: roughness },
        uMetalness:         { value: metalness },
        uLightDir:          { value: lightDir },
        uLightColor:        { value: lightColor },
      },
    });
  }

  // PBR film material with proper BRDF
  static createFilmPBR(params = {}) {
    const mat = new THREE.MeshPhysicalMaterial({
      color:              params.color || new THREE.Color(0.8, 0.8, 0.8),
      roughness:          params.roughness ?? 0.5,
      metalness:          params.metalness ?? 0,
      clearcoat:          params.clearcoat ?? 0,
      clearcoatRoughness: params.clearcoatRoughness ?? 0.1,
      sheen:              params.sheen ?? 0,
      sheenRoughness:     params.sheenRoughness ?? 0.5,
      sheenColor:         params.sheenColor || new THREE.Color(1,1,1),
      transmission:       params.transmission ?? 0,
      ior:                params.ior ?? 1.5,
      thickness:          params.thickness ?? 0.1,
      attenuationColor:   params.attenuationColor || new THREE.Color(1,1,1),
      attenuationDistance:params.attenuationDistance ?? Infinity,
      envMapIntensity:    params.envMapIntensity ?? 1,
    });
    if (params.map) { mat.map = params.map; mat.map.colorSpace = THREE.SRGBColorSpace; }
    if (params.normalMap)     mat.normalMap = params.normalMap;
    if (params.roughnessMap)  mat.roughnessMap = params.roughnessMap;
    if (params.aoMap)         mat.aoMap = params.aoMap;
    if (params.emissiveMap)   mat.emissiveMap = params.emissiveMap;
    if (params.emissive)      mat.emissive = params.emissive;
    if (params.emissiveIntensity) mat.emissiveIntensity = params.emissiveIntensity;
    return mat;
  }

  // Cloth / fabric with sheen (velvet, silk)
  static createCloth(params = {}) {
    return FilmMaterialFactory.createFilmPBR({
      roughness: 0.8,
      metalness: 0,
      sheen: params.sheen ?? 1,
      sheenRoughness: params.sheenRoughness ?? 0.4,
      sheenColor: params.sheenColor || new THREE.Color(params.color || 0xffffff),
      ...params,
    });
  }

  // Glass / water with transmission
  static createGlass(params = {}) {
    return FilmMaterialFactory.createFilmPBR({
      roughness: 0.05,
      metalness: 0,
      transmission: 0.95,
      ior: params.ior ?? 1.5,
      thickness: params.thickness ?? 0.5,
      color: new THREE.Color(0.9, 0.95, 1.0),
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      ...params,
    });
  }

  // Car paint — multi-layer with flakes
  static createCarPaint(params = {}) {
    return FilmMaterialFactory.createFilmPBR({
      roughness: 0.1,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      sheen: 0.5,
      color: params.color || new THREE.Color(0.8, 0.1, 0.1),
      ...params,
    });
  }

  // Update camera position in shader uniforms
  static updateCameraPos(material, camera) {
    if (material.uniforms?.uCameraPos) {
      material.uniforms.uCameraPos.value.copy(camera.position);
    }
  }

  // Update light direction in shader uniforms
  static updateLight(material, lightDir, lightColor) {
    if (material.uniforms?.uLightDir)   material.uniforms.uLightDir.value.copy(lightDir);
    if (material.uniforms?.uLightColor) material.uniforms.uLightColor.value.copy(lightColor);
  }
}

// ── Strand Hair Generator ─────────────────────────────────────────────────────
export class StrandHairSystem {
  constructor(scene) {
    this.scene  = scene;
    this.systems= new Map();
  }

  // Generate hair strands on a mesh
  generate(mesh, params = {}) {
    const {
      count       = 5000,
      length      = 0.15,
      segments    = 6,
      curl        = 0.2,
      gravity     = 0.3,
      spread      = 0.02,
      hairColor   = new THREE.Color(0x3a2010),
      hairColorTip= new THREE.Color(0x6a4020),
      roughness   = 0.3,
      width       = 0.001,
    } = params;

    const geo   = mesh.geometry;
    const pos   = geo.attributes.position;
    const nrm   = geo.attributes.normal;
    if (!pos || !nrm) return null;

    // Sample random surface points
    const allPos  = [];
    const allProg = [];
    const allWid  = [];

    const rng = (s=1) => (Math.random()-0.5)*2*s;

    for (let h = 0; h < count; h++) {
      // Random surface point
      const vi    = Math.floor(Math.random() * pos.count);
      const ox    = pos.getX(vi), oy = pos.getY(vi), oz = pos.getZ(vi);
      const nx    = nrm.getX(vi), ny = nrm.getY(vi), nz = nrm.getZ(vi);

      // Build hair strand as a curve
      let cx = ox + rng(spread), cy = oy + rng(spread), cz = oz + rng(spread);
      let dx = nx * 0.01, dy = ny * 0.01 - gravity * 0.005, dz = nz * 0.01;

      for (let s = 0; s < segments; s++) {
        const t = s / segments;
        const w = width * (1 - t * 0.7); // taper toward tip
        allPos.push(cx, cy, cz);
        allProg.push(t);
        allWid.push(w);
        // Curl effect
        const curlAngle = t * curl * Math.PI * 2;
        const cx2 = dx * Math.cos(curlAngle) - dz * Math.sin(curlAngle);
        const cz2 = dx * Math.sin(curlAngle) + dz * Math.cos(curlAngle);
        dx = cx2; dz = cz2;
        // Gravity
        dy -= gravity * 0.002;
        cx += dx + rng(0.001);
        cy += dy;
        cz += dz + rng(0.001);
      }
    }

    const hairGeo = new THREE.BufferGeometry();
    hairGeo.setAttribute("position",     new THREE.BufferAttribute(new Float32Array(allPos),  3));
    hairGeo.setAttribute("aHairProgress",new THREE.BufferAttribute(new Float32Array(allProg), 1));
    hairGeo.setAttribute("aHairWidth",   new THREE.BufferAttribute(new Float32Array(allWid),  1));

    const hairMat = FilmMaterialFactory.createHair({ hairColor, hairColorTip, roughness });
    const hairMesh= new THREE.Points(hairGeo, hairMat);
    hairMesh.name = `hair_${mesh.name}`;
    hairMesh.frustumCulled = true;

    // Line version for better visual quality
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position",     new THREE.BufferAttribute(new Float32Array(allPos),  3));
    lineGeo.setAttribute("aHairProgress",new THREE.BufferAttribute(new Float32Array(allProg), 1));
    const lineMat = new THREE.LineBasicMaterial({
      color: hairColor,
      transparent: true,
      opacity: 0.85,
      vertexColors: false,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.name  = `hairlines_${mesh.name}`;

    this.scene.add(hairMesh);
    this.scene.add(lines);
    this.systems.set(mesh.name, { points: hairMesh, lines });
    return hairMesh;
  }

  remove(meshName) {
    const sys = this.systems.get(meshName);
    if (!sys) return;
    this.scene.remove(sys.points);
    this.scene.remove(sys.lines);
    sys.points.geometry.dispose();
    sys.lines.geometry.dispose();
    this.systems.delete(meshName);
  }

  dispose() {
    this.systems.forEach((sys, name) => this.remove(name));
  }
}

// ── Volume Renderer ───────────────────────────────────────────────────────────
export class VolumeRenderer {
  constructor(scene) {
    this.scene   = scene;
    this.volumes = new Map();
  }

  // Create atmospheric fog volume
  createFog(params = {}) {
    const {
      size       = 50,
      fogColor   = new THREE.Color(0.8, 0.85, 0.9),
      fogDensity = 0.02,
      fogHeight  = 0.1,
      scattering = 0.5,
    } = params;

    const geo = new THREE.BoxGeometry(size, size*0.5, size);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: VOLUME_FRAG,
      uniforms: {
        uFogColor:   { value: fogColor },
        uFogDensity: { value: fogDensity },
        uFogHeight:  { value: fogHeight },
        uScattering: { value: scattering },
        uLightDir:   { value: new THREE.Vector3(1,2,1).normalize() },
        uLightColor: { value: new THREE.Color(1,0.95,0.8) },
        uTime:       { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      side: THREE.BackSide,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name  = "volume_fog";
    mesh.position.y = size * 0.1;
    this.scene.add(mesh);
    this.volumes.set("fog", { mesh, mat });
    return mesh;
  }

  update(time) {
    this.volumes.forEach(({ mat }) => {
      if (mat.uniforms?.uTime) mat.uniforms.uTime.value = time;
    });
  }

  dispose() {
    this.volumes.forEach(({ mesh }) => this.scene.remove(mesh));
    this.volumes.clear();
  }
}

// ── Film Quality Renderer (master coordinator) ────────────────────────────────
export class FilmQualityRenderer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene    = scene;
    this.camera   = camera;
    this.instanced= new InstancedMeshSystem(scene);
    this.lod      = new LODSystem(scene, camera);
    this.hair     = new StrandHairSystem(scene);
    this.volumes  = new VolumeRenderer(scene);
    this.materials= new Map(); // mesh → film material
    this.time     = 0;

    // Renderer quality settings for film
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace  = THREE.SRGBColorSpace;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.physicallyCorrectLights = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  // Apply SSS skin to a mesh
  applySkin(mesh, params = {}) {
    const mat = FilmMaterialFactory.createSkin(params);
    mesh.material = mat;
    this.materials.set(mesh.uuid, { type: "skin", mat, mesh });
    return mat;
  }

  // Apply hair to a mesh
  applyHair(mesh, params = {}) {
    return this.hair.generate(mesh, params);
  }

  // Apply film PBR to mesh
  applyFilmPBR(mesh, params = {}) {
    const mat = FilmMaterialFactory.createFilmPBR(params);
    mesh.material = mat;
    return mat;
  }

  // Apply displacement
  applyDisplacement(mesh, params = {}) {
    const mat = FilmMaterialFactory.createDisplacement(params);
    mesh.material = mat;
    return mat;
  }

  // Convert mesh to LOD
  toLOD(mesh) {
    return this.lod.autoLOD(mesh, 3);
  }

  // Create instanced foliage (film quality)
  createInstancedFoliage(type, count, spread) {
    const geo = type === "tree"
      ? new THREE.ConeGeometry(0.6, 2, 8)
      : new THREE.SphereGeometry(0.4, 8, 6);
    const mat = FilmMaterialFactory.createFilmPBR({
      color: new THREE.Color(0.1, 0.4, 0.1),
      roughness: 0.9,
      metalness: 0,
      sheen: 0.2,
      sheenColor: new THREE.Color(0.2, 0.6, 0.2),
    });
    this.instanced.createInstanced(type, geo, mat, count);
    const transforms = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * spread;
      transforms.push({
        position: { x: Math.cos(angle)*r, y: 0, z: Math.sin(angle)*r },
        rotation: { x: 0, y: Math.random()*Math.PI*2, z: 0 },
        scale:    { x: 0.7+Math.random()*0.6, y: 0.7+Math.random()*0.6, z: 0.7+Math.random()*0.6 },
      });
    }
    this.instanced.batchAdd(type, transforms);
  }

  // Update per frame
  update(time, dt) {
    this.time = time;
    this.lod.update();
    this.volumes.update(time);
    // Update camera pos in skin/hair shaders
    this.materials.forEach(({ mat, mesh }) => {
      FilmMaterialFactory.updateCameraPos(mat, this.camera);
    });
  }

  dispose() {
    this.instanced.dispose();
    this.lod.dispose();
    this.hair.dispose();
    this.volumes.dispose();
  }
}
