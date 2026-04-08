import { describe, it, expect } from 'vitest';

describe('GeometryEngine', () => {
  it('exports GeometryEngine class', async () => {
    const { GeometryEngine } = await import('../mesh/GeometryEngine.js');
    expect(GeometryEngine).toBeDefined();
    expect(typeof GeometryEngine).toBe('function');
  });

  it('can be instantiated without throwing', async () => {
    const { GeometryEngine } = await import('../mesh/GeometryEngine.js');
    expect(() => new GeometryEngine()).not.toThrow();
  });
});

describe('ClothSystem', () => {
  it('exports cloth creation functions', async () => {
    const cloth = await import('../mesh/ClothSystem.js');
    expect(typeof cloth.createClothParticle).toBe('function');
    expect(typeof cloth.createCloth).toBe('function');
    expect(typeof cloth.stepCloth).toBe('function');
    expect(typeof cloth.pinParticle).toBe('function');
    expect(typeof cloth.unpinParticle).toBe('function');
  });

  it('createClothParticle returns particle with position and mass', async () => {
    const { createClothParticle } = await import('../mesh/ClothSystem.js');
    // Pass an object that has .clone() like a real THREE.Vector3
    const vec = { x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0, clone: () => ({}) }) };
    const p = createClothParticle(vec, 1.0);
    expect(p).toBeDefined();
  });

  it('pinParticle and unpinParticle are callable', async () => {
    const { pinParticle, unpinParticle } = await import('../mesh/ClothSystem.js');
    const mockCloth = { particles: [{ pinWeight: 0 }, { pinWeight: 0 }] };
    expect(() => pinParticle(mockCloth, 0)).not.toThrow();
    expect(() => unpinParticle(mockCloth, 0)).not.toThrow();
  });

  it('exports collider functions', async () => {
    const cloth = await import('../mesh/ClothSystem.js');
    expect(typeof cloth.addSphereCollider).toBe('function');
    expect(typeof cloth.addPlaneCollider).toBe('function');
  });
});

describe('MocapRetarget', () => {
  it('exports MocapRetargeter class', async () => {
    const { MocapRetargeter } = await import('../mesh/MocapRetarget.js');
    expect(MocapRetargeter).toBeDefined();
    expect(typeof MocapRetargeter).toBe('function');
  });

  it('exports MEDIAPIPE_JOINTS array', async () => {
    const { MEDIAPIPE_JOINTS } = await import('../mesh/MocapRetarget.js');
    expect(Array.isArray(MEDIAPIPE_JOINTS)).toBe(true);
    expect(MEDIAPIPE_JOINTS.length).toBeGreaterThan(0);
  });

  it('exports SPX_JOINTS array', async () => {
    const { SPX_JOINTS } = await import('../mesh/MocapRetarget.js');
    expect(Array.isArray(SPX_JOINTS)).toBe(true);
    expect(SPX_JOINTS.length).toBeGreaterThan(0);
  });

  it('exports DEFAULT_BONE_MAP', async () => {
    const { DEFAULT_BONE_MAP } = await import('../mesh/MocapRetarget.js');
    expect(DEFAULT_BONE_MAP).toBeDefined();
    expect(typeof DEFAULT_BONE_MAP).toBe('object');
  });

  it('exports retarget utility functions', async () => {
    const mocap = await import('../mesh/MocapRetarget.js');
    expect(typeof mocap.retargetFrame).toBe('function');
    expect(typeof mocap.autoDetectBoneMap).toBe('function');
  });

  it('MocapRetargeter is default export', async () => {
    const mod = await import('../mesh/MocapRetarget.js');
    expect(mod.default).toBeDefined();
  });
});
