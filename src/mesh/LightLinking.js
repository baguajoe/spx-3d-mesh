/**
 * SPX Light Linking
 * Assign lights to specific objects only — industry standard VFX feature
 */
import * as THREE from "three";

export class LightLinking {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene    = scene;
    this.links    = new Map(); // lightUuid → Set<meshUuid>
    this.excludes = new Map(); // lightUuid → Set<meshUuid>
  }

  // Link a light to only affect specific objects
  link(light, meshes) {
    if (!this.links.has(light.uuid)) this.links.set(light.uuid, new Set());
    const linkedSet = this.links.get(light.uuid);
    (Array.isArray(meshes)?meshes:[meshes]).forEach(m=>linkedSet.add(m.uuid));
  }

  // Exclude specific objects from a light
  exclude(light, meshes) {
    if (!this.excludes.has(light.uuid)) this.excludes.set(light.uuid, new Set());
    const exclSet = this.excludes.get(light.uuid);
    (Array.isArray(meshes)?meshes:[meshes]).forEach(m=>exclSet.add(m.uuid));
  }

  // Apply light linking — set layers
  apply() {
    const lights = [], meshes = [];
    this.scene.traverse(o=>{
      if(o.isLight)lights.push(o);
      if(o.isMesh&&!o.name.startsWith("_"))meshes.push(o);
    });

    lights.forEach(light=>{
      const linked  = this.links.get(light.uuid);
      const excluded= this.excludes.get(light.uuid);
      if(!linked&&!excluded)return;

      meshes.forEach(mesh=>{
        const isLinked   = !linked   || linked.has(mesh.uuid);
        const isExcluded = excluded  && excluded.has(mesh.uuid);
        if(isExcluded||!isLinked){
          mesh.layers.disable(light.layers.mask);
        } else {
          mesh.layers.enable(light.layers.mask);
        }
      });
    });
  }

  clear(light) {
    this.links.delete(light.uuid);
    this.excludes.delete(light.uuid);
  }

  clearAll() {
    this.links.clear();
    this.excludes.clear();
    // Reset all layers
    this.scene.traverse(o=>{ if(o.isMesh||o.isLight) o.layers.set(0); });
  }

  getLinks(light) {
    return {
      linked:   [...(this.links.get(light.uuid)||[])],
      excluded: [...(this.excludes.get(light.uuid)||[])],
    };
  }
}
