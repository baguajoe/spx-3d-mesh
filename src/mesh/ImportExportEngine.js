/**
 * SPX Import/Export Engine
 * OBJ, FBX, GLTF, BVH, STL, PLY, USD
 */
import * as THREE from "three";

// ── OBJ Exporter ──────────────────────────────────────────────────────────────
export function exportOBJ(scene, filename = "export.obj") {
  const lines = ["# SPX 3D Mesh Editor Export", "# OBJ format", ""];
  let vOffset = 1;
  scene.traverse(obj => {
    if (!obj.isMesh || obj.name.startsWith("_")) return;
    const geo  = obj.geometry;
    const pos  = geo.attributes.position;
    const nrm  = geo.attributes.normal;
    const uv   = geo.attributes.uv;
    if (!pos) return;
    lines.push(`o ${obj.name || "Object"}`);
    // Vertices
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)).applyMatrix4(obj.matrixWorld);
      lines.push(`v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`);
    }
    // Normals
    if (nrm) {
      for (let i = 0; i < nrm.count; i++) {
        lines.push(`vn ${nrm.getX(i).toFixed(6)} ${nrm.getY(i).toFixed(6)} ${nrm.getZ(i).toFixed(6)}`);
      }
    }
    // UVs
    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        lines.push(`vt ${uv.getX(i).toFixed(6)} ${uv.getY(i).toFixed(6)}`);
      }
    }
    // Faces
    lines.push("g default");
    const idx = geo.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const a = (idx ? idx.getX(i)   : i)   + vOffset;
      const b = (idx ? idx.getX(i+1) : i+1) + vOffset;
      const c = (idx ? idx.getX(i+2) : i+2) + vOffset;
      if (nrm && uv) lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
      else if (nrm)  lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
      else           lines.push(`f ${a} ${b} ${c}`);
    }
    lines.push("");
    vOffset += pos.count;
  });
  downloadText(lines.join("\n"), filename);
}

// ── STL Exporter ──────────────────────────────────────────────────────────────
export function exportSTL(scene, filename = "export.stl") {
  const lines = ["solid SPX_Export"];
  scene.traverse(obj => {
    if (!obj.isMesh || obj.name.startsWith("_")) return;
    const geo = obj.geometry;
    const pos = geo.attributes.position;
    if (!pos) return;
    const idx   = geo.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const ai = idx ? idx.getX(i)   : i;
      const bi = idx ? idx.getX(i+1) : i+1;
      const ci = idx ? idx.getX(i+2) : i+2;
      const a  = new THREE.Vector3(pos.getX(ai),pos.getY(ai),pos.getZ(ai)).applyMatrix4(obj.matrixWorld);
      const b  = new THREE.Vector3(pos.getX(bi),pos.getY(bi),pos.getZ(bi)).applyMatrix4(obj.matrixWorld);
      const c  = new THREE.Vector3(pos.getX(ci),pos.getY(ci),pos.getZ(ci)).applyMatrix4(obj.matrixWorld);
      const n  = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      lines.push(`  facet normal ${n.x.toFixed(6)} ${n.y.toFixed(6)} ${n.z.toFixed(6)}`);
      lines.push("    outer loop");
      lines.push(`      vertex ${a.x.toFixed(6)} ${a.y.toFixed(6)} ${a.z.toFixed(6)}`);
      lines.push(`      vertex ${b.x.toFixed(6)} ${b.y.toFixed(6)} ${b.z.toFixed(6)}`);
      lines.push(`      vertex ${c.x.toFixed(6)} ${c.y.toFixed(6)} ${c.z.toFixed(6)}`);
      lines.push("    endloop");
      lines.push("  endfacet");
    }
  });
  lines.push("endsolid SPX_Export");
  downloadText(lines.join("\n"), filename);
}

// ── GLTF Exporter ─────────────────────────────────────────────────────────────
export async function exportGLTF(scene, filename = "export.glb", binary = true) {
  try {
    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
    const exporter = new GLTFExporter();
    const opts = { binary, animations: [], includeCustomExtensions: false };
    exporter.parse(scene, result => {
      if (binary) {
        const blob = new Blob([result], { type: "application/octet-stream" });
        downloadBlob(blob, filename);
      } else {
        downloadText(JSON.stringify(result, null, 2), filename.replace(".glb",".gltf"));
      }
    }, err => console.error("GLTF export error:", err), opts);
  } catch(e) {
    console.error("GLTF exporter not available:", e.message);
  }
}

// ── OBJ Importer ─────────────────────────────────────────────────────────────
export function importOBJ(text, name = "Imported") {
  const lines    = text.split("\n");
  const vertices = [], normals = [], uvs = [], faces = [];
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v")  vertices.push(new THREE.Vector3(+parts[1], +parts[2], +parts[3]));
    if (parts[0] === "vn") normals.push(new THREE.Vector3(+parts[1], +parts[2], +parts[3]));
    if (parts[0] === "vt") uvs.push(new THREE.Vector2(+parts[1], +parts[2]));
    if (parts[0] === "f") {
      const fverts = parts.slice(1).map(p => {
        const [vi,ti,ni] = p.split("/").map(Number);
        return { vi:vi-1, ti:ti?ti-1:-1, ni:ni?ni-1:-1 };
      });
      for (let i=1; i<fverts.length-1; i++) faces.push([fverts[0],fverts[i],fverts[i+1]]);
    }
  });
  const pos = [], nrm = [], uv = [];
  faces.forEach(([a,b,c]) => {
    [a,b,c].forEach(v => {
      const vert = vertices[v.vi] || new THREE.Vector3();
      pos.push(vert.x, vert.y, vert.z);
      const n = normals[v.ni] || new THREE.Vector3(0,1,0);
      nrm.push(n.x, n.y, n.z);
      const t = uvs[v.ti] || new THREE.Vector2();
      uv.push(t.x, t.y);
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("normal",   new THREE.BufferAttribute(new Float32Array(nrm), 3));
  geo.setAttribute("uv",       new THREE.BufferAttribute(new Float32Array(uv),  2));
  if (nrm.every(v=>v===0)) geo.computeVertexNormals();
  const mat  = new THREE.MeshStandardMaterial({ color:0x888aaa, roughness:0.5, metalness:0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name  = name;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// ── GLTF Importer ─────────────────────────────────────────────────────────────
export async function importGLTF(arrayBuffer, name = "Imported") {
  try {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    return new Promise((res, rej) => {
      const loader = new GLTFLoader();
      loader.parse(arrayBuffer, "", gltf => {
        gltf.scene.name = name;
        res(gltf.scene);
      }, rej);
    });
  } catch(e) {
    console.error("GLTF import failed:", e.message);
    return null;
  }
}

// ── BVH Importer ──────────────────────────────────────────────────────────────
export function importBVH(text) {
  const lines = text.split("\n").map(l=>l.trim()).filter(Boolean);
  const bones = [], frames = [];
  let inMotion = false, frameTime = 1/24, lineIdx = 0;
  const parseBone = (parent) => {
    const bone = { name:"", offset:new THREE.Vector3(), channels:[], children:[], parent };
    while (lineIdx < lines.length) {
      const line = lines[lineIdx++];
      if (line.startsWith("ROOT") || line.startsWith("JOINT")) {
        bone.name = line.split(" ")[1];
      } else if (line.startsWith("OFFSET")) {
        const p = line.split(/\s+/);
        bone.offset.set(+p[1], +p[2], +p[3]);
      } else if (line.startsWith("CHANNELS")) {
        const p = line.split(/\s+/);
        const count = +p[1];
        bone.channels = p.slice(2, 2+count);
      } else if (line === "{") {
        // continue
      } else if (line.startsWith("JOINT") || line.startsWith("End Site")) {
        lineIdx--;
        const child = parseBone(bone);
        bone.children.push(child);
        bones.push(child);
      } else if (line === "}") {
        break;
      }
    }
    return bone;
  };
  while (lineIdx < lines.length) {
    const line = lines[lineIdx++];
    if (line.startsWith("ROOT")) { lineIdx--; const root=parseBone(null); bones.unshift(root); }
    else if (line.startsWith("MOTION")) { inMotion=true; }
    else if (inMotion && line.startsWith("Frames:")) { /* frame count */ }
    else if (inMotion && line.startsWith("Frame Time:")) { frameTime=+line.split(":")[1].trim(); }
    else if (inMotion) {
      const vals = line.split(/\s+/).map(Number);
      frames.push(vals);
    }
  }
  return { bones, frames, frameTime };
}

// ── File helpers ──────────────────────────────────────────────────────────────
function downloadText(text, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type:"text/plain" }));
  a.download = filename; a.click();
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
}

export class ImportExportEngine {
  constructor(scene) { this.scene = scene; }

  exportOBJ(name)  { exportOBJ(this.scene, name || "spx_export.obj"); }
  exportSTL(name)  { exportSTL(this.scene, name || "spx_export.stl"); }
  exportGLTF(name) { exportGLTF(this.scene, name || "spx_export.glb"); }

  async importFile(file) {
    const ext  = file.name.split(".").pop().toLowerCase();
    const text = await file.text();
    if (ext === "obj") {
      const mesh = importOBJ(text, file.name.replace(".obj",""));
      this.scene.add(mesh);
      return mesh;
    }
    if (ext === "glb" || ext === "gltf") {
      const buf  = await file.arrayBuffer();
      const obj  = await importGLTF(buf, file.name);
      if (obj) this.scene.add(obj);
      return obj;
    }
    if (ext === "bvh") {
      return importBVH(text);
    }
    if (ext === "stl") {
      return this._importSTL(text, file.name);
    }
    console.warn("Unsupported format:", ext);
    return null;
  }

  _importSTL(text, name) {
    const lines = text.split("\n"), pos = [];
    lines.forEach(line => {
      const p = line.trim().split(/\s+/);
      if (p[0]==="vertex") pos.push(+p[1],+p[2],+p[3]);
    });
    const geo  = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos),3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x888aaa}));
    mesh.name  = name.replace(".stl","");
    this.scene.add(mesh);
    return mesh;
  }
}
