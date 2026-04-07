/**
 * SPX Text Objects
 * 3D text generation with extrude, bevel, font support
 */
import * as THREE from "three";

export class TextObject {
  constructor(scene) {
    this.scene   = scene;
    this.objects = new Map();
    this._fontCache = new Map();
  }

  // Create 3D text using TextGeometry-style approach with shapes
  async create(params = {}) {
    const {
      text       = "SPX",
      size       = 1,
      depth      = 0.2,
      curveSegments = 12,
      bevelEnabled  = true,
      bevelThickness= 0.03,
      bevelSize     = 0.02,
      bevelSegments = 3,
      color      = 0xffffff,
      roughness  = 0.3,
      metalness  = 0.0,
      name       = `Text_${Date.now()}`,
      position   = new THREE.Vector3(0,0,0),
    } = params;

    try {
      // Load font
      const { FontLoader } = await import("three/examples/jsm/loaders/FontLoader.js");
      const { TextGeometry } = await import("three/examples/jsm/geometries/TextGeometry.js");
      const loader = new FontLoader();
      return new Promise((res) => {
        loader.load(
          "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
          font => {
            const geo = new TextGeometry(text, {
              font, size, depth, curveSegments,
              bevelEnabled, bevelThickness, bevelSize, bevelSegments,
            });
            geo.computeBoundingBox();
            geo.center();
            const mat  = new THREE.MeshPhysicalMaterial({ color, roughness, metalness });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.name  = name;
            mesh.position.copy(position);
            mesh.castShadow = mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.objects.set(name, mesh);
            res(mesh);
          },
          undefined,
          () => {
            // Fallback: create text from basic geometry
            res(this._fallbackText(text, size, depth, color, name, position));
          }
        );
      });
    } catch(e) {
      return this._fallbackText(text, size, depth, color, name, position);
    }
  }

  // Fallback: render text as flat planes with canvas texture
  _fallbackText(text, size, depth, color, name, position) {
    const canvas   = document.createElement("canvas");
    canvas.width   = 512;
    canvas.height  = 128;
    const ctx      = canvas.getContext("2d");
    ctx.fillStyle  = "#000000";
    ctx.fillRect(0,0,512,128);
    ctx.fillStyle  = "#" + new THREE.Color(color).getHexString();
    ctx.font       = `bold ${Math.round(128*0.7)}px JetBrains Mono, monospace`;
    ctx.textAlign  = "center";
    ctx.textBaseline="middle";
    ctx.fillText(text, 256, 64);
    const tex  = new THREE.CanvasTexture(canvas);
    const geo  = new THREE.BoxGeometry(text.length * size * 0.6, size, depth);
    const mat  = new THREE.MeshStandardMaterial({ map:tex, roughness:0.3, metalness:0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name  = name;
    mesh.position.copy(position);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.objects.set(name, mesh);
    return mesh;
  }

  updateText(name, newText) {
    const mesh = this.objects.get(name);
    if (!mesh) return;
    const params = mesh.userData.textParams || {};
    this.scene.remove(mesh);
    this.objects.delete(name);
    return this.create({ ...params, text:newText, name });
  }

  dispose() {
    this.objects.forEach(m => this.scene.remove(m));
    this.objects.clear();
  }
}
