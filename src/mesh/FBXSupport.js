/**
 * SPX FBX Support
 * FBX import via three.js FBXLoader + custom export
 */
import * as THREE from "three";

// ── FBX Import ────────────────────────────────────────────────────────────────
export async function importFBX(arrayBuffer, name = "FBX_Import") {
  try {
    const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
    return new Promise((res, rej) => {
      const loader = new FBXLoader();
      // FBXLoader expects a URL or binary — wrap buffer
      const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
      const url  = URL.createObjectURL(blob);
      loader.load(url, obj => {
        URL.revokeObjectURL(url);
        obj.name = name;
        // Upgrade all materials to MeshPhysicalMaterial
        obj.traverse(child => {
          if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
            if (child.material && !child.material.isMeshPhysicalMaterial) {
              const old = child.material;
              child.material = new THREE.MeshPhysicalMaterial({
                color:     old.color     || new THREE.Color(0.8,0.8,0.8),
                map:       old.map       || null,
                normalMap: old.normalMap || null,
                roughness: 0.5,
                metalness: 0,
              });
            }
          }
        });
        res(obj);
      }, undefined, rej);
    });
  } catch(e) {
    console.error("FBX import failed:", e.message);
    return null;
  }
}

// ── FBX Export (ASCII FBX 7.4) ────────────────────────────────────────────────
export function exportFBX(scene, filename = "export.fbx") {
  const lines = [];
  const now   = new Date();

  // FBX header
  lines.push(`; FBX 7.4.0 project file`);
  lines.push(`; Created by SPX 3D Mesh Editor`);
  lines.push(`; ${now.toISOString()}`);
  lines.push(``);
  lines.push(`FBXHeaderExtension: {`);
  lines.push(`\tFBXHeaderVersion: 1003`);
  lines.push(`\tFBXVersion: 7400`);
  lines.push(`\tCreationTimeStamp: {`);
  lines.push(`\t\tYear: ${now.getFullYear()}`);
  lines.push(`\t\tMonth: ${now.getMonth()+1}`);
  lines.push(`\t\tDay: ${now.getDate()}`);
  lines.push(`\t}`);
  lines.push(`\tCreator: "SPX 3D Mesh Editor"`);
  lines.push(`}`);
  lines.push(``);

  // Global settings
  lines.push(`GlobalSettings: {`);
  lines.push(`\tVersion: 1000`);
  lines.push(`\tProperties70: {`);
  lines.push(`\t\tP: "UpAxis", "int", "Integer", "",1`);
  lines.push(`\t\tP: "FrontAxis", "int", "Integer", "",2`);
  lines.push(`\t\tP: "UnitScaleFactor", "double", "Number", "",1`);
  lines.push(`\t}`);
  lines.push(`}`);
  lines.push(``);

  // Objects
  lines.push(`Objects: {`);
  let nodeId = 1000;

  scene.traverse(obj => {
    if (!obj.isMesh || obj.name.startsWith("_")) return;
    const geo = obj.geometry;
    const pos = geo.attributes.position;
    const nrm = geo.attributes.normal;
    const uv  = geo.attributes.uv;
    const idx = geo.index;
    if (!pos) return;

    const id = nodeId++;
    lines.push(`\tGeometry: ${id}, "Geometry::${obj.name}", "Mesh" {`);

    // Vertices
    lines.push(`\t\tVertices: *${pos.count * 3} {`);
    const verts = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(obj.matrixWorld);
      verts.push(`${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`);
    }
    lines.push(`\t\t\ta: ${verts.join(",")}`);
    lines.push(`\t\t}`);

    // Polygon vertex index
    const count = idx ? idx.count : pos.count;
    const pvi = [];
    for (let i = 0; i < count; i += 3) {
      const a = idx?idx.getX(i):i, b = idx?idx.getX(i+1):i+1, c = idx?idx.getX(i+2):i+2;
      pvi.push(a, b, ~c); // FBX uses bitwise NOT for last vert of polygon
    }
    lines.push(`\t\tPolygonVertexIndex: *${pvi.length} {`);
    lines.push(`\t\t\ta: ${pvi.join(",")}`);
    lines.push(`\t\t}`);

    // Normals
    if (nrm) {
      lines.push(`\t\tLayerElementNormal: 0 {`);
      lines.push(`\t\t\tMappingInformationType: "ByPolygonVertex"`);
      lines.push(`\t\t\tReferenceInformationType: "Direct"`);
      const norms = [];
      for (let i = 0; i < nrm.count; i++) norms.push(`${nrm.getX(i).toFixed(6)},${nrm.getY(i).toFixed(6)},${nrm.getZ(i).toFixed(6)}`);
      lines.push(`\t\t\tNormals: *${norms.length * 3} {`);
      lines.push(`\t\t\t\ta: ${norms.join(",")}`);
      lines.push(`\t\t\t}`);
      lines.push(`\t\t}`);
    }

    // UVs
    if (uv) {
      lines.push(`\t\tLayerElementUV: 0 {`);
      lines.push(`\t\t\tMappingInformationType: "ByPolygonVertex"`);
      lines.push(`\t\t\tReferenceInformationType: "IndexToDirect"`);
      const uvs = [];
      for (let i = 0; i < uv.count; i++) uvs.push(`${uv.getX(i).toFixed(6)},${uv.getY(i).toFixed(6)}`);
      lines.push(`\t\t\tUV: *${uvs.length * 2} { a: ${uvs.join(",")} }`);
      lines.push(`\t\t}`);
    }

    lines.push(`\t}`);

    // Model node
    const mid = nodeId++;
    lines.push(`\tModel: ${mid}, "Model::${obj.name}", "Mesh" {`);
    lines.push(`\t\tVersion: 232`);
    lines.push(`\t\tProperties70: {`);
    lines.push(`\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",${obj.position.x.toFixed(6)},${obj.position.y.toFixed(6)},${obj.position.z.toFixed(6)}`);
    lines.push(`\t\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A",${THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(6)},${THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(6)},${THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(6)}`);
    lines.push(`\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",${obj.scale.x.toFixed(6)},${obj.scale.y.toFixed(6)},${obj.scale.z.toFixed(6)}`);
    lines.push(`\t\t}`);
    lines.push(`\t}`);
  });

  lines.push(`}`);
  lines.push(``);
  lines.push(`Connections: {`);
  lines.push(`\tC: "OO", 0, 0`);
  lines.push(`}`);

  // Download
  const text = lines.join("\n");
  const blob = new Blob([text], { type:"text/plain" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
