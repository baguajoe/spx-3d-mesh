import '@testing-library/jest-dom';

// Mock THREE.js for unit tests
vi.mock('three', () => ({
  Vector3: class Vector3 {
    constructor(x=0, y=0, z=0) {
      this.x = x; this.y = y; this.z = z;
    }
    set(x,y,z) { this.x=x; this.y=y; this.z=z; return this; }
    copy(v) { this.x=v.x; this.y=v.y; this.z=v.z; return this; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    add() { return this; }
    sub() { return this; }
    length() { return 1; }
    normalize() { return this; }
    multiplyScalar() { return this; }
    addScaledVector() { return this; }
    distanceTo() { return 0; }
  },
  Quaternion: vi.fn().mockImplementation(() => ({
    x: 0, y: 0, z: 0, w: 1,
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
    invert: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
  Matrix4: vi.fn().mockImplementation(() => ({
    copy: vi.fn().mockReturnThis(),
    invert: vi.fn().mockReturnThis(),
  })),
  BufferGeometry: vi.fn().mockImplementation(() => ({
    setAttribute: vi.fn(),
    computeVertexNormals: vi.fn(),
    dispose: vi.fn(),
    attributes: { position: { needsUpdate: false } },
  })),
  Float32BufferAttribute: vi.fn(),
  BoxGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  SphereGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  CylinderGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  ConeGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  TorusGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  TorusKnotGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  PlaneGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  CircleGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  RingGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  CapsuleGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  IcosahedronGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  OctahedronGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  TetrahedronGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  DodecahedronGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  LatheGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  TubeGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  ExtrudeGeometry: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  Shape: vi.fn().mockImplementation(() => ({
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    closePath: vi.fn().mockReturnThis(),
    absarc: vi.fn().mockReturnThis(),
  })),
  CatmullRomCurve3: vi.fn().mockImplementation(() => ({ getPoint: vi.fn() })),
  Curve: vi.fn().mockImplementation(() => ({ getPoint: vi.fn() })),
  MeshStandardMaterial: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  ShaderMaterial: vi.fn().mockImplementation(() => ({
    uniforms: {},
    dispose: vi.fn(),
  })),
  Mesh: vi.fn().mockImplementation(() => ({
    position: { set: vi.fn(), copy: vi.fn(), x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { set: vi.fn(), x: 1, y: 1, z: 1 },
    castShadow: false,
    receiveShadow: false,
    userData: {},
    frustumCulled: true,
    renderOrder: 0,
    geometry: { dispose: vi.fn() },
    material: { dispose: vi.fn(), uniforms: {} },
  })),
  Color: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  AdditiveBlending: 2,
  PCFSoftShadowMap: 2,
  ACESFilmicToneMapping: 4,
  AnimationClip: vi.fn().mockImplementation((name, duration, tracks) => ({ name, duration, tracks })),
  QuaternionKeyframeTrack: vi.fn(),
  VectorKeyframeTrack: vi.fn(),
}));

// Suppress console errors/warnings in tests
global.console.error = vi.fn();
global.console.warn = vi.fn();
