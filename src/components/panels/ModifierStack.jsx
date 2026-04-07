import React, { useState } from "react";

// ── Modifier Definitions ──────────────────────────────────────────────────────
const MODIFIER_DEFS = {
  // Generate
  Array:         { cat: "Generate", props: [{ k: "count", label: "Count", type: "int", min: 1, max: 1000, def: 2 }, { k: "offset_x", label: "Offset X", type: "float", min: -100, max: 100, def: 1 }, { k: "offset_y", label: "Offset Y", type: "float", min: -100, max: 100, def: 0 }, { k: "offset_z", label: "Offset Z", type: "float", min: -100, max: 100, def: 0 }] },
  Bevel:         { cat: "Generate", props: [{ k: "width", label: "Width", type: "float", min: 0, max: 10, def: 0.1 }, { k: "segments", label: "Segments", type: "int", min: 1, max: 100, def: 1 }, { k: "limit", label: "Limit", type: "select", opts: ["None","Angle","Weight","Vertex Group"], def: "Angle" }] },
  Boolean:       { cat: "Generate", props: [{ k: "operation", label: "Operation", type: "select", opts: ["Union","Difference","Intersect"], def: "Difference" }, { k: "object", label: "Object", type: "text", def: "" }] },
  Build:         { cat: "Generate", props: [{ k: "start", label: "Start", type: "int", min: 1, max: 1000, def: 1 }, { k: "length", label: "Length", type: "int", min: 1, max: 1000, def: 100 }] },
  Decimate:      { cat: "Generate", props: [{ k: "ratio", label: "Ratio", type: "float", min: 0, max: 1, def: 0.5 }, { k: "mode", label: "Mode", type: "select", opts: ["Collapse","Un-Subdivide","Planar"], def: "Collapse" }] },
  EdgeSplit:     { cat: "Generate", props: [{ k: "angle", label: "Split Angle", type: "float", min: 0, max: 180, def: 30 }, { k: "sharp", label: "Sharp Edges", type: "bool", def: true }] },
  GeometryNodes: { cat: "Generate", props: [{ k: "node_group", label: "Node Group", type: "text", def: "" }] },
  Mask:          { cat: "Generate", props: [{ k: "mode", label: "Mode", type: "select", opts: ["Vertex Group","Armature"], def: "Vertex Group" }] },
  Mirror:        { cat: "Generate", props: [{ k: "axis_x", label: "X Axis", type: "bool", def: true }, { k: "axis_y", label: "Y Axis", type: "bool", def: false }, { k: "axis_z", label: "Z Axis", type: "bool", def: false }, { k: "clipping", label: "Clipping", type: "bool", def: false }, { k: "merge", label: "Merge", type: "bool", def: true }, { k: "merge_dist", label: "Merge Dist", type: "float", min: 0, max: 1, def: 0.001 }] },
  Multires:      { cat: "Generate", props: [{ k: "levels", label: "Levels", type: "int", min: 0, max: 6, def: 2 }, { k: "render", label: "Render Levels", type: "int", min: 0, max: 6, def: 2 }] },
  Remesh:        { cat: "Generate", props: [{ k: "mode", label: "Mode", type: "select", opts: ["Blocks","Smooth","Sharp","Voxel"], def: "Voxel" }, { k: "voxel_size", label: "Voxel Size", type: "float", min: 0.001, max: 1, def: 0.1 }] },
  Screw:         { cat: "Generate", props: [{ k: "angle", label: "Angle", type: "float", min: -720, max: 720, def: 360 }, { k: "steps", label: "Steps", type: "int", min: 1, max: 256, def: 16 }, { k: "screw", label: "Screw", type: "float", min: -100, max: 100, def: 0 }] },
  Skin:          { cat: "Generate", props: [{ k: "branch_smooth", label: "Branch Smooth", type: "float", min: 0, max: 1, def: 0 }] },
  Solidify:      { cat: "Generate", props: [{ k: "thickness", label: "Thickness", type: "float", min: -10, max: 10, def: 0.1 }, { k: "offset", label: "Offset", type: "float", min: -1, max: 1, def: -1 }, { k: "fill_rim", label: "Fill Rim", type: "bool", def: true }] },
  Subdivision:   { cat: "Generate", props: [{ k: "levels", label: "Viewport", type: "int", min: 0, max: 6, def: 1 }, { k: "render_levels", label: "Render", type: "int", min: 0, max: 6, def: 2 }, { k: "type", label: "Type", type: "select", opts: ["Catmull-Clark","Simple"], def: "Catmull-Clark" }] },
  Triangulate:   { cat: "Generate", props: [{ k: "quad_method", label: "Quad Method", type: "select", opts: ["Beauty","Fixed","Alternate","Shortest Diagonal"], def: "Beauty" }] },
  WireFrame:     { cat: "Generate", props: [{ k: "thickness", label: "Thickness", type: "float", min: 0, max: 1, def: 0.02 }, { k: "offset", label: "Offset", type: "float", min: -1, max: 1, def: 0.01 }] },
  // Deform
  Armature:      { cat: "Deform",   props: [{ k: "object", label: "Armature", type: "text", def: "" }, { k: "preserve_volume", label: "Preserve Vol", type: "bool", def: false }] },
  Cast:          { cat: "Deform",   props: [{ k: "type", label: "Type", type: "select", opts: ["Sphere","Cylinder","Cuboid"], def: "Sphere" }, { k: "factor", label: "Factor", type: "float", min: -10, max: 10, def: 0.5 }] },
  Curve:         { cat: "Deform",   props: [{ k: "object", label: "Curve", type: "text", def: "" }, { k: "deform_axis", label: "Axis", type: "select", opts: ["X","Y","Z","-X","-Y","-Z"], def: "Z" }] },
  Displace:      { cat: "Deform",   props: [{ k: "strength", label: "Strength", type: "float", min: -100, max: 100, def: 1 }, { k: "texture", label: "Texture", type: "text", def: "" }, { k: "direction", label: "Direction", type: "select", opts: ["X","Y","Z","Normal","Custom Normal","RGB to XYZ"], def: "Normal" }] },
  Hook:          { cat: "Deform",   props: [{ k: "object", label: "Object", type: "text", def: "" }, { k: "strength", label: "Strength", type: "float", min: 0, max: 1, def: 1 }] },
  LaplacianDeform:{ cat:"Deform",   props: [{ k: "iterations", label: "Iterations", type: "int", min: 1, max: 50, def: 1 }] },
  Lattice:       { cat: "Deform",   props: [{ k: "object", label: "Lattice", type: "text", def: "" }, { k: "strength", label: "Strength", type: "float", min: -100, max: 100, def: 1 }] },
  MeshDeform:    { cat: "Deform",   props: [{ k: "object", label: "Cage", type: "text", def: "" }, { k: "precision", label: "Precision", type: "int", min: 2, max: 10, def: 5 }] },
  ShapeKey:      { cat: "Deform",   props: [] },
  SimpleDeform:  { cat: "Deform",   props: [{ k: "mode", label: "Mode", type: "select", opts: ["Twist","Bend","Taper","Stretch"], def: "Bend" }, { k: "angle", label: "Angle", type: "float", min: -360, max: 360, def: 45 }, { k: "axis", label: "Axis", type: "select", opts: ["X","Y","Z"], def: "Z" }] },
  Smooth:        { cat: "Deform",   props: [{ k: "factor", label: "Factor", type: "float", min: -10, max: 10, def: 0.5 }, { k: "repeat", label: "Repeat", type: "int", min: 0, max: 100, def: 1 }] },
  SmoothCorrectiveSmooth:{ cat:"Deform", props: [{ k: "factor", label: "Factor", type: "float", min: -10, max: 10, def: 0.5 }, { k: "iterations", label: "Iterations", type: "int", min: 0, max: 200, def: 5 }] },
  SurfaceDeform: { cat: "Deform",   props: [{ k: "target", label: "Target", type: "text", def: "" }, { k: "strength", label: "Strength", type: "float", min: 0, max: 1, def: 1 }] },
  Warp:          { cat: "Deform",   props: [{ k: "strength", label: "Strength", type: "float", min: -100, max: 100, def: 1 }] },
  Wave:          { cat: "Deform",   props: [{ k: "height", label: "Height", type: "float", min: -10, max: 10, def: 0.5 }, { k: "width", label: "Width", type: "float", min: 0.1, max: 100, def: 1.5 }, { k: "speed", label: "Speed", type: "float", min: 0, max: 10, def: 0.5 }] },
  // Physics
  Cloth:         { cat: "Physics",  props: [{ k: "quality", label: "Quality", type: "int", min: 1, max: 50, def: 5 }, { k: "mass", label: "Mass", type: "float", min: 0, max: 100, def: 1 }] },
  Collision:     { cat: "Physics",  props: [{ k: "damping", label: "Damping", type: "float", min: 0, max: 1, def: 0.1 }, { k: "thickness", label: "Thickness", type: "float", min: 0, max: 1, def: 0.025 }] },
  Dynamic_Paint: { cat: "Physics",  props: [{ k: "type", label: "Type", type: "select", opts: ["Canvas","Brush"], def: "Canvas" }] },
  Explode:       { cat: "Physics",  props: [{ k: "particle_uv", label: "Particle UV", type: "text", def: "" }] },
  Fluid:         { cat: "Physics",  props: [{ k: "type", label: "Type", type: "select", opts: ["Domain","Flow","Effector"], def: "Domain" }] },
  Ocean:         { cat: "Physics",  props: [{ k: "resolution", label: "Resolution", type: "int", min: 1, max: 15, def: 6 }, { k: "wave_scale", label: "Wave Scale", type: "float", min: 0, max: 10, def: 1 }, { k: "time", label: "Time", type: "float", min: 0, max: 100, def: 1 }] },
  Particle:      { cat: "Physics",  props: [{ k: "system", label: "System", type: "text", def: "" }] },
  Soft_Body:     { cat: "Physics",  props: [{ k: "mass", label: "Mass", type: "float", min: 0, max: 100, def: 1 }, { k: "pull", label: "Pull", type: "float", min: 0, max: 1, def: 0.9 }, { k: "push", label: "Push", type: "float", min: 0, max: 1, def: 0.9 }] },
};

const CATS = ["Generate", "Deform", "Physics"];

// ── PropControl ───────────────────────────────────────────────────────────────
function PropControl({ prop, value, onChange }) {
  if (prop.type === "bool") return (
    <input className="spx-mod-check" type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
  );
  if (prop.type === "select") return (
    <select className="spx-mod-select" value={value} onChange={e => onChange(e.target.value)}>
      {prop.opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (prop.type === "text") return (
    <input className="spx-mod-text" type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="Object name…" />
  );
  return (
    <div className="spx-mod-num-row">
      <input
        className="spx-mod-range"
        type="range"
        min={prop.min}
        max={prop.max}
        step={prop.type === "int" ? 1 : (prop.max - prop.min) / 100}
        value={value}
        onChange={e => onChange(prop.type === "int" ? parseInt(e.target.value) : parseFloat(e.target.value))}
      />
      <input
        className="spx-mod-num"
        type="number"
        min={prop.min}
        max={prop.max}
        step={prop.type === "int" ? 1 : 0.01}
        value={value}
        onChange={e => onChange(prop.type === "int" ? parseInt(e.target.value) : parseFloat(e.target.value))}
      />
    </div>
  );
}

// ── ModifierCard ──────────────────────────────────────────────────────────────
function ModifierCard({ mod, index, onRemove, onMoveUp, onMoveDown, onToggle, onApply }) {
  const [open, setOpen] = useState(false);
  const def  = MODIFIER_DEFS[mod.type];
  const [vals, setVals] = useState(() => {
    const v = {};
    def?.props.forEach(p => { v[p.k] = p.def; });
    return v;
  });

  return (
    <div className={`spx-mod-card${mod.enabled ? "" : " spx-mod-card--disabled"}`}>
      <div className="spx-mod-card-hdr">
        <button className="spx-mod-toggle" onClick={() => setOpen(v => !v)}>
          <svg className={`spx-mod-chevron${open ? " spx-mod-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
        <span className="spx-mod-name">{mod.type}</span>
        <span className="spx-mod-cat">{def?.cat}</span>
        <div className="spx-mod-card-actions">
          <button className={`spx-mod-eye${mod.enabled ? "" : " spx-mod-eye--off"}`} onClick={() => onToggle(index)} title="Toggle">◉</button>
          <button className="spx-mod-action-btn" onClick={() => onMoveUp(index)} title="Move Up">↑</button>
          <button className="spx-mod-action-btn" onClick={() => onMoveDown(index)} title="Move Down">↓</button>
          <button className="spx-mod-action-btn spx-mod-apply-btn" onClick={() => onApply(index)} title="Apply">✓</button>
          <button className="spx-mod-action-btn spx-mod-remove-btn" onClick={() => onRemove(index)} title="Remove">✕</button>
        </div>
      </div>
      {open && def?.props.length > 0 && (
        <div className="spx-mod-card-body">
          {def.props.map(p => (
            <div key={p.k} className="spx-mod-prop-row">
              <span className="spx-mod-prop-label">{p.label}</span>
              <div className="spx-mod-prop-ctrl">
                <PropControl prop={p} value={vals[p.k]} onChange={v => setVals(prev => ({ ...prev, [p.k]: v }))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ModifierStack ─────────────────────────────────────────────────────────────
export default function ModifierStack({ onAction }) {
  const [mods,    setMods]    = useState([
    { type: "Mirror", enabled: true },
    { type: "Subdivision", enabled: true },
  ]);
  const [addCat,  setAddCat]  = useState("Generate");
  const [addType, setAddType] = useState("");

  const availTypes = Object.entries(MODIFIER_DEFS)
    .filter(([, v]) => v.cat === addCat)
    .map(([k]) => k);

  const add = () => {
    const type = addType || availTypes[0];
    if (!type) return;
    setMods(prev => [...prev, { type, enabled: true }]);
  };

  const remove   = (i) => setMods(prev => prev.filter((_, idx) => idx !== i));
  const toggle   = (i) => setMods(prev => prev.map((m, idx) => idx === i ? { ...m, enabled: !m.enabled } : m));
  const apply    = (i) => { onAction?.(`modifier_apply_${mods[i].type}`); remove(i); };
  const moveUp   = (i) => { if (i === 0) return; setMods(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); };
  const moveDown = (i) => { if (i === mods.length-1) return; setMods(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); };

  return (
    <div className="spx-modstack">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Modifiers</span>
        <button className="spx-panel-action-btn" onClick={() => onAction?.("modifier_apply_all")} title="Apply All">✓ All</button>
      </div>

      {/* Add modifier */}
      <div className="spx-modstack-add">
        <div className="spx-modstack-add-cats">
          {CATS.map(c => (
            <button
              key={c}
              className={`spx-modstack-cat-btn${addCat === c ? " spx-modstack-cat-btn--active" : ""}`}
              onClick={() => { setAddCat(c); setAddType(""); }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="spx-modstack-add-row">
          <select className="spx-modstack-select" value={addType} onChange={e => setAddType(e.target.value)}>
            <option value="">Select modifier…</option>
            {availTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="spx-modstack-add-btn" onClick={add}>Add</button>
        </div>
      </div>

      {/* Stack */}
      <div className="spx-modstack-list">
        {mods.length === 0 && <div className="spx-modstack-empty">No modifiers</div>}
        {mods.map((mod, i) => (
          <ModifierCard
            key={i}
            mod={mod}
            index={i}
            onRemove={remove}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onToggle={toggle}
            onApply={apply}
          />
        ))}
      </div>
    </div>
  );
}
