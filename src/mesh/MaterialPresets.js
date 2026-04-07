/**
 * SPX Material Presets
 * 40+ physically accurate materials
 */
import * as THREE from "three";

export const MATERIAL_PRESETS = {
  // ── Skin tones (Fitzpatrick 1-6) ────────────────────────────────────────────
  "Skin Type I":   { type:"skin", color:"#fde8d8", deep:"#c87060", fitzpatrick:1, sss:0.9, roughness:0.4 },
  "Skin Type II":  { type:"skin", color:"#f0c8a0", deep:"#c06060", fitzpatrick:2, sss:0.85,roughness:0.4 },
  "Skin Type III": { type:"skin", color:"#d4a070", deep:"#a04040", fitzpatrick:3, sss:0.8, roughness:0.45},
  "Skin Type IV":  { type:"skin", color:"#b07840", deep:"#804030", fitzpatrick:4, sss:0.75,roughness:0.45},
  "Skin Type V":   { type:"skin", color:"#885030", deep:"#603020", fitzpatrick:5, sss:0.7, roughness:0.5 },
  "Skin Type VI":  { type:"skin", color:"#4a2818", deep:"#301808", fitzpatrick:6, sss:0.65,roughness:0.5 },
  // ── Metals ──────────────────────────────────────────────────────────────────
  "Gold":          { type:"pbr", color:"#ffd700", roughness:0.1,  metalness:1.0, clearcoat:0   },
  "Silver":        { type:"pbr", color:"#c0c0c0", roughness:0.05, metalness:1.0, clearcoat:0   },
  "Chrome":        { type:"pbr", color:"#e8e8f0", roughness:0.02, metalness:1.0, clearcoat:1.0 },
  "Copper":        { type:"pbr", color:"#b87333", roughness:0.15, metalness:1.0, clearcoat:0   },
  "Brass":         { type:"pbr", color:"#d4aa70", roughness:0.2,  metalness:0.9, clearcoat:0   },
  "Iron":          { type:"pbr", color:"#808080", roughness:0.6,  metalness:1.0, clearcoat:0   },
  "Rusty Metal":   { type:"pbr", color:"#8b4513", roughness:0.9,  metalness:0.7, clearcoat:0   },
  "Brushed Steel": { type:"pbr", color:"#aaaaaa", roughness:0.3,  metalness:1.0, clearcoat:0   },
  // ── Glass & Transparent ──────────────────────────────────────────────────────
  "Glass":         { type:"glass", ior:1.5,  transmission:0.95, roughness:0.02, color:"#e8f0f8" },
  "Water":         { type:"glass", ior:1.33, transmission:0.97, roughness:0.01, color:"#88bbdd" },
  "Ice":           { type:"glass", ior:1.31, transmission:0.9,  roughness:0.1,  color:"#ddeeff" },
  "Diamond":       { type:"glass", ior:2.42, transmission:0.95, roughness:0.01, color:"#f0f8ff" },
  "Tinted Glass":  { type:"glass", ior:1.5,  transmission:0.85, roughness:0.05, color:"#225533" },
  // ── Organic / Nature ────────────────────────────────────────────────────────
  "Stone":         { type:"pbr", color:"#808070", roughness:0.9,  metalness:0,   clearcoat:0   },
  "Marble":        { type:"pbr", color:"#f0ede8", roughness:0.1,  metalness:0,   clearcoat:0.4 },
  "Wood":          { type:"pbr", color:"#8b5e3c", roughness:0.8,  metalness:0,   clearcoat:0   },
  "Dark Wood":     { type:"pbr", color:"#3d1c02", roughness:0.7,  metalness:0,   clearcoat:0.2 },
  "Bark":          { type:"pbr", color:"#5c3a1e", roughness:0.95, metalness:0,   clearcoat:0   },
  "Dirt":          { type:"pbr", color:"#6b4423", roughness:1.0,  metalness:0,   clearcoat:0   },
  "Sand":          { type:"pbr", color:"#c2a36e", roughness:1.0,  metalness:0,   clearcoat:0   },
  "Grass":         { type:"pbr", color:"#4a7c29", roughness:0.9,  metalness:0,   clearcoat:0   },
  // ── Fabric ───────────────────────────────────────────────────────────────────
  "Fabric":        { type:"cloth", color:"#6688aa", roughness:0.9,  sheen:0.8, sheenColor:"#8899bb" },
  "Velvet":        { type:"cloth", color:"#4a1a6b", roughness:0.95, sheen:1.0, sheenColor:"#7a3a9b" },
  "Silk":          { type:"cloth", color:"#e8d8c0", roughness:0.2,  sheen:0.6, sheenColor:"#fff0e0" },
  "Leather":       { type:"pbr",   color:"#3d2010", roughness:0.7,  metalness:0,   clearcoat:0.1 },
  "Denim":         { type:"cloth", color:"#3a4a6b", roughness:0.95, sheen:0.3, sheenColor:"#4a5a7b" },
  // ── Synthetic ────────────────────────────────────────────────────────────────
  "Plastic":       { type:"pbr", color:"#cc4444", roughness:0.3,  metalness:0,   clearcoat:0.5 },
  "Rubber":        { type:"pbr", color:"#222222", roughness:0.95, metalness:0,   clearcoat:0   },
  "Ceramic":       { type:"pbr", color:"#f0ede8", roughness:0.05, metalness:0,   clearcoat:0.8 },
  "Concrete":      { type:"pbr", color:"#909090", roughness:0.95, metalness:0,   clearcoat:0   },
  "Carbon Fiber":  { type:"pbr", color:"#1a1a1a", roughness:0.2,  metalness:0.5, clearcoat:0.8 },
  // ── Emissive / Special ───────────────────────────────────────────────────────
  "Neon Red":      { type:"pbr", color:"#ff0040", roughness:0.5, metalness:0, emissive:"#ff0040", emissiveIntensity:3 },
  "Neon Blue":     { type:"pbr", color:"#0040ff", roughness:0.5, metalness:0, emissive:"#0080ff", emissiveIntensity:3 },
  "Neon Green":    { type:"pbr", color:"#00ff40", roughness:0.5, metalness:0, emissive:"#00ff40", emissiveIntensity:3 },
  "Neon Teal":     { type:"pbr", color:"#00ffc8", roughness:0.5, metalness:0, emissive:"#00ffc8", emissiveIntensity:2 },
  "Hot Lava":      { type:"pbr", color:"#ff2200", roughness:0.8, metalness:0, emissive:"#ff4400", emissiveIntensity:2 },
  "Hologram":      { type:"pbr", color:"#00aaff", roughness:0.1, metalness:0, transmission:0.5, emissive:"#0044ff", emissiveIntensity:1 },
  "Car Paint Red": { type:"car_paint", color:"#cc1111", roughness:0.05, clearcoat:1.0 },
  "Car Paint Blue":{ type:"car_paint", color:"#1144cc", roughness:0.05, clearcoat:1.0 },
  "Car Paint Black":{ type:"car_paint", color:"#111111", roughness:0.03, clearcoat:1.0 },
};

export const MATERIAL_CATEGORIES = {
  "Skin":        ["Skin Type I","Skin Type II","Skin Type III","Skin Type IV","Skin Type V","Skin Type VI"],
  "Metal":       ["Gold","Silver","Chrome","Copper","Brass","Iron","Rusty Metal","Brushed Steel"],
  "Glass":       ["Glass","Water","Ice","Diamond","Tinted Glass"],
  "Nature":      ["Stone","Marble","Wood","Dark Wood","Bark","Dirt","Sand","Grass"],
  "Fabric":      ["Fabric","Velvet","Silk","Leather","Denim"],
  "Synthetic":   ["Plastic","Rubber","Ceramic","Concrete","Carbon Fiber"],
  "Emissive":    ["Neon Red","Neon Blue","Neon Green","Neon Teal","Hot Lava","Hologram"],
  "Car Paint":   ["Car Paint Red","Car Paint Blue","Car Paint Black"],
};

// Apply a preset to a mesh
export function applyMaterialPreset(mesh, presetName, filmMatFactory) {
  const preset = MATERIAL_PRESETS[presetName];
  if (!preset || !mesh) return;

  switch(preset.type) {
    case "skin":
      if (filmMatFactory) {
        mesh.material = filmMatFactory.createSkin({
          skinColor:     new (require("three").Color)(preset.color),
          skinColorDeep: new (require("three").Color)(preset.deep),
          sssStrength:   preset.sss,
          roughness:     preset.roughness,
          fitzpatrick:   preset.fitzpatrick,
        });
      }
      break;
    case "glass":
      mesh.material = new THREE.MeshPhysicalMaterial({
        color:       new THREE.Color(preset.color),
        roughness:   preset.roughness,
        metalness:   0,
        transmission:preset.transmission,
        ior:         preset.ior,
        thickness:   0.5,
        transparent: true,
      });
      break;
    case "cloth":
      mesh.material = new THREE.MeshPhysicalMaterial({
        color:        new THREE.Color(preset.color),
        roughness:    preset.roughness,
        metalness:    0,
        sheen:        preset.sheen,
        sheenRoughness:0.5,
        sheenColor:   new THREE.Color(preset.sheenColor||preset.color),
      });
      break;
    case "car_paint":
      mesh.material = new THREE.MeshPhysicalMaterial({
        color:              new THREE.Color(preset.color),
        roughness:          preset.roughness,
        metalness:          0,
        clearcoat:          preset.clearcoat,
        clearcoatRoughness: 0.05,
      });
      break;
    default: // pbr
      mesh.material = new THREE.MeshPhysicalMaterial({
        color:            new THREE.Color(preset.color),
        roughness:        preset.roughness,
        metalness:        preset.metalness ?? 0,
        clearcoat:        preset.clearcoat ?? 0,
        transmission:     preset.transmission ?? 0,
        emissive:         preset.emissive ? new THREE.Color(preset.emissive) : new THREE.Color(0,0,0),
        emissiveIntensity:preset.emissiveIntensity ?? 0,
      });
  }
}
