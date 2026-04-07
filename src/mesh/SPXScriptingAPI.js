/**
 * SPX Scripting API
 * JavaScript-based scripting — run scripts against the scene
 * Equivalent to Blender Python API / Maya MEL
 */

export class SPXScriptingAPI {
  constructor(scene, engine, viewport) {
    this.scene    = scene;
    this.engine   = engine;
    this.viewport = viewport;
    this._listeners = new Map();
    this._scripts   = new Map();
    this._console   = [];
    this._maxLog    = 500;

    // Expose safe globals
    this.globals = {
      // Scene access
      scene:   () => scene,
      meshes:  () => {
        const out = [];
        scene.traverse(o => { if(o.isMesh && !o.name.startsWith("_")) out.push(o); });
        return out;
      },
      selected: () => viewport?.getSelected?.() || null,
      // Geometry
      createBox:    (w,h,d,name) => engine.createBox(w,h,d,name),
      createSphere: (r,name)     => engine.createSphere(r,name),
      createCylinder:(r,h,name)  => engine.createCylinder(r,h,name),
      createCone:   (r,h,name)   => engine.createCone(r,h,name),
      createTorus:  (R,r,name)   => engine.createTorus(R,r,name),
      createPlane:  (w,h,name)   => engine.createPlane(w,h,name),
      // Mesh ops
      extrude:   (mesh,amt)   => engine.extrude(mesh,amt),
      bevel:     (mesh,amt,s) => engine.bevel(mesh,amt,s),
      subdivide: (mesh,lvl)   => engine.subdivide(mesh,lvl),
      smooth:    (mesh,i,f)   => engine.smooth(mesh,i,f),
      knife:     (mesh,n,p)   => engine.knife(mesh,n,p),
      spin:      (mesh,s,a,ax)=> engine.spin(mesh,s,a,ax),
      screw:     (mesh,s,h,t,ax)=>engine.screw(mesh,s,h,t,ax),
      boolean:   (a,b,op)     => engine.boolean(a,b,op),
      // THREE helpers
      Vector3:   (...args)    => new (require("three").Vector3)(...args),
      Color:     (...args)    => new (require("three").Color)(...args),
      Euler:     (...args)    => new (require("three").Euler)(...args),
      // Math
      radToDeg: r => r * 180 / Math.PI,
      degToRad: d => d * Math.PI / 180,
      lerp: (a,b,t) => a + (b-a)*t,
      clamp: (v,mn,mx) => Math.max(mn,Math.min(mx,v)),
      // Print
      print: (...args) => {
        const msg = args.map(a => typeof a === "object" ? JSON.stringify(a,null,2) : String(a)).join(" ");
        this._log("info", msg);
        return msg;
      },
      warn:  (...args) => this._log("warn",  args.join(" ")),
      error: (...args) => this._log("error", args.join(" ")),
      // Selection
      select:   (name) => {
        let found = null;
        scene.traverse(o => { if(o.name===name)found=o; });
        return found;
      },
      delete:   (mesh) => { scene.remove(mesh); },
      duplicate:(mesh) => {
        const clone = mesh.clone();
        clone.name  = mesh.name + "_copy";
        clone.position.x += 2;
        scene.add(clone);
        return clone;
      },
      // Transform
      translate: (mesh, x, y, z) => { mesh.position.set(x,y,z); },
      rotate:    (mesh, x, y, z) => { mesh.rotation.set(x,y,z); },
      scale:     (mesh, x, y, z) => { mesh.scale.set(x,y,z); },
      // Material
      setColor:  (mesh, hex) => { if(mesh.material) mesh.material.color?.set(hex); },
      setRoughness:(mesh,v)  => { if(mesh.material) mesh.material.roughness=v; },
      setMetalness:(mesh,v)  => { if(mesh.material) mesh.material.metalness=v; },
      // Animation helpers
      keyframe: (mesh, time, props) => {
        // Simple keyframe insertion
        Object.entries(props).forEach(([k,v]) => {
          const parts = k.split(".");
          if(parts.length===2) mesh[parts[0]][parts[1]] = v;
        });
      },
    };
  }

  _log(level, msg) {
    const entry = { level, msg, time: Date.now() };
    this._console.push(entry);
    if (this._console.length > this._maxLog) this._console.shift();
    this._listeners.get("log")?.forEach(fn => fn(entry));
    if (level === "error") console.error("[SPX Script]", msg);
    else if (level === "warn") console.warn("[SPX Script]", msg);
    else console.log("[SPX Script]", msg);
  }

  // Run a script string
  run(code, scriptName = "script") {
    try {
      this._log("info", `▶ Running: ${scriptName}`);
      const fn = new Function(...Object.keys(this.globals), code);
      const result = fn(...Object.values(this.globals));
      this._log("info", `✓ Done${result !== undefined ? ": " + JSON.stringify(result) : ""}`);
      return { success: true, result };
    } catch(e) {
      this._log("error", `✗ ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  // Save a named script
  saveScript(name, code) {
    this._scripts.set(name, { name, code, created: Date.now() });
  }

  // Load and run a saved script
  runSaved(name) {
    const s = this._scripts.get(name);
    if (!s) { this._log("error", `Script not found: ${name}`); return; }
    return this.run(s.code, name);
  }

  listScripts() { return [...this._scripts.values()]; }
  getConsole()  { return [...this._console]; }
  clearConsole(){ this._console = []; }
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
  }
}

// ── Built-in example scripts ──────────────────────────────────────────────────
export const BUILTIN_SCRIPTS = [
  {
    name: "Array of spheres",
    code: `
// Create a 4x4 grid of spheres
for (let x = 0; x < 4; x++) {
  for (let z = 0; z < 4; z++) {
    const s = createSphere(0.4, \`Sphere_\${x}_\${z}\`);
    translate(s, x * 1.5 - 3, 0, z * 1.5 - 3);
    setColor(s, \`hsl(\${(x*4+z)*22},80%,60%)\`);
  }
}
print("Created 16 spheres");
`
  },
  {
    name: "Sine wave mesh",
    code: `
const plane = createPlane(10, 10, "SineWave");
const geo = plane.geometry;
const pos = geo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), z = pos.getZ(i);
  pos.setY(i, Math.sin(x * 1.5) * Math.cos(z * 1.5) * 0.5);
}
pos.needsUpdate = true;
geo.computeVertexNormals();
print("Sine wave applied");
`
  },
  {
    name: "Random forest",
    code: `
for (let i = 0; i < 30; i++) {
  const h = 1 + Math.random() * 2;
  const t = createCone(0.3 + Math.random() * 0.2, h, \`Tree_\${i}\`);
  translate(t, (Math.random()-0.5)*20, h/2, (Math.random()-0.5)*20);
  setColor(t, \`hsl(\${100+Math.random()*40},60%,30%)\`);
  const s = 0.7 + Math.random() * 0.6;
  scale(t, s, s, s);
}
print("Forest generated");
`
  },
  {
    name: "Spiral tower",
    code: `
for (let i = 0; i < 24; i++) {
  const b = createBox(1, 0.3, 1, \`Block_\${i}\`);
  const angle = i * 0.4;
  const r = 1.5;
  translate(b, Math.cos(angle)*r, i*0.35, Math.sin(angle)*r);
  rotate(b, 0, angle, 0);
  setColor(b, \`hsl(\${i*15},70%,50%)\`);
}
print("Spiral tower built");
`
  },
  {
    name: "Select and extrude",
    code: `
const sel = selected();
if (!sel) { print("No object selected"); }
else {
  extrude(sel, 0.5);
  print("Extruded: " + sel.name);
}
`
  },
];
