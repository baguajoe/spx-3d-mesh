/**
 * SPX Terrain Generator Presets
 * Extended terrain types for ProceduralEngine
 */
export const TERRAIN_PRESETS = {
  // ── Existing ─────────────────────────────────────────────────────────────────
  mountains:    { roughness:0.7, erosion:0.4, seaLevel:0.2, scale:20 },
  plains:       { roughness:0.2, erosion:0.1, seaLevel:0.1, scale:20 },
  desert:       { roughness:0.3, erosion:0.6, seaLevel:0.05,scale:25 },
  canyon:       { roughness:0.8, erosion:0.7, seaLevel:0.3, scale:30 },
  volcanic:     { roughness:0.9, erosion:0.3, seaLevel:0.4, scale:20 },
  coastal:      { roughness:0.4, erosion:0.3, seaLevel:0.35,scale:20 },
  island:       { roughness:0.6, erosion:0.4, seaLevel:0.45,scale:15 },
  arctic:       { roughness:0.5, erosion:0.1, seaLevel:0.1, scale:20 },
  crater:       { roughness:0.7, erosion:0.2, seaLevel:0.2, scale:18 },
  // ── New ──────────────────────────────────────────────────────────────────────
  tundra:       { roughness:0.25, erosion:0.15, seaLevel:0.08, scale:22, description:"Flat frozen ground with subtle variation" },
  savanna:      { roughness:0.15, erosion:0.2,  seaLevel:0.05, scale:28, description:"Flat grassland with scattered hills" },
  jungle_floor: { roughness:0.4,  erosion:0.5,  seaLevel:0.15, scale:15, description:"Dense organic ground cover" },
  ocean_floor:  { roughness:0.6,  erosion:0.3,  seaLevel:0.8,  scale:25, description:"Underwater terrain with trenches" },
  mesa:         { roughness:0.9,  erosion:0.8,  seaLevel:0.4,  scale:20, description:"Flat-topped rocky plateaus" },
  badlands:     { roughness:0.85, erosion:0.9,  seaLevel:0.25, scale:18, description:"Heavily eroded ridges and gullies" },
  swamp:        { roughness:0.2,  erosion:0.4,  seaLevel:0.48, scale:15, description:"Low wetland with minimal relief" },
  plateau:      { roughness:0.3,  erosion:0.5,  seaLevel:0.5,  scale:22, description:"High flat terrain with steep edges" },
  dunes:        { roughness:0.5,  erosion:0.7,  seaLevel:0.05, scale:20, description:"Wind-swept sand dunes" },
  glacial:      { roughness:0.6,  erosion:0.2,  seaLevel:0.2,  scale:25, description:"U-shaped valleys from glaciers" },
  rainforest:   { roughness:0.5,  erosion:0.4,  seaLevel:0.2,  scale:18, description:"Tropical terrain variation" },
  valley:       { roughness:0.5,  erosion:0.6,  seaLevel:0.3,  scale:20, description:"River valley with gentle slopes" },
};

export const ALL_TERRAIN_TYPES = Object.keys(TERRAIN_PRESETS);
export const NEW_TERRAIN_TYPES = [
  "tundra","savanna","jungle_floor","ocean_floor","mesa",
  "badlands","swamp","plateau","dunes","glacial","rainforest","valley"
];
