import { describe, it, expect } from 'vitest';

// useSceneObjects hook lives inline in App.jsx in this repo
// Testing the front/js hooks that do exist as files

describe('useFaceMocap hook', () => {
  it('exports useFaceMocap function', async () => {
    const mod = await import('../front/js/hooks/useFaceMocap.js');
    const fn = mod.default || mod.useFaceMocap;
    expect(fn).toBeDefined();
  });
});

describe('useHandMocap hook', () => {
  it('exports useHandMocap function', async () => {
    const mod = await import('../front/js/hooks/useHandMocap.js');
    const fn = mod.default || mod.useHandMocap;
    expect(fn).toBeDefined();
  });
});

describe('UV sync hook', () => {
  it('exports useUVSync function', async () => {
    const mod = await import('../mesh/uv/useUVSync.js');
    const fn = mod.default || mod.useUVSync;
    expect(fn).toBeDefined();
  });
});
