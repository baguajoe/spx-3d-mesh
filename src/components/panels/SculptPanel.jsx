import React, { useState } from "react";

// ── Brushes ───────────────────────────────────────────────────────────────────
const BRUSHES = [
  { id: "draw",         label: "Draw",          key: "X",    desc: "Add or subtract volume" },
  { id: "draw_sharp",   label: "Draw Sharp",    key: "",     desc: "Sharp draw strokes" },
  { id: "clay",         label: "Clay",          key: "",     desc: "Clay buildup brush" },
  { id: "clay_strips",  label: "Clay Strips",   key: "",     desc: "Clay strips texture" },
  { id: "clay_thumb",   label: "Clay Thumb",    key: "",     desc: "Flatten with thumb" },
  { id: "layer",        label: "Layer",         key: "",     desc: "Build up in layers" },
  { id: "inflate",      label: "Inflate",       key: "I",    desc: "Inflate/deflate along normals" },
  { id: "blob",         label: "Blob",          key: "",     desc: "Blob inflate brush" },
  { id: "crease",       label: "Crease",        key: "Shift+C", desc: "Create creases and folds" },
  { id: "smooth",       label: "Smooth",        key: "S",    desc: "Smooth geometry" },
  { id: "flatten",      label: "Flatten",       key: "Shift+T", desc: "Flatten to average plane" },
  { id: "fill",         label: "Fill",          key: "",     desc: "Fill concavities" },
  { id: "scrape",       label: "Scrape",        key: "",     desc: "Scrape peaks" },
  { id: "multiplane",   label: "Multi-Plane Scrape", key: "",desc: "Scrape on multiple planes" },
  { id: "pinch",        label: "Pinch",         key: "P",    desc: "Pinch geometry together" },
  { id: "grab",         label: "Grab",          key: "G",    desc: "Grab and move geometry" },
  { id: "elastic_grab", label: "Elastic Grab",  key: "",     desc: "Elastic deformation grab" },
  { id: "snake_hook",   label: "Snake Hook",    key: "K",    desc: "Pull geometry like taffy" },
  { id: "thumb",        label: "Thumb",         key: "",     desc: "Smear geometry like clay" },
  { id: "pose",         label: "Pose",          key: "",     desc: "Pose-aware deformation" },
  { id: "push",         label: "Push",          key: "",     desc: "Push geometry away" },
  { id: "rotate",       label: "Rotate",        key: "",     desc: "Rotate around stroke" },
  { id: "slide_relax",  label: "Slide Relax",   key: "",     desc: "Slide and relax topology" },
  { id: "boundary",     label: "Boundary",      key: "",     desc: "Deform boundary edges" },
  { id: "cloth",        label: "Cloth",         key: "",     desc: "Cloth simulation brush" },
  { id: "simplify",     label: "Simplify",      key: "",     desc: "Reduce topology density" },
  { id: "mask",         label: "Mask",          key: "M",    desc: "Paint mask regions" },
  { id: "draw_face_sets",label:"Face Sets",     key: "",     desc: "Paint face set regions" },
  { id: "multires_disp",label: "Multires Disp", key: "",     desc: "Displace multires mesh" },
];

const STROKE_METHODS = ["Space", "Drag Dot", "Dots", "Anchored", "Line", "Curve", "Paint"];
const FALLOFFS       = ["Smooth", "Sphere", "Root", "Sharp", "Linear", "Constant", "Inverse Square"];

// ── SculptPanel ───────────────────────────────────────────────────────────────
export default function SculptPanel({ onAction }) {
  const [activeBrush,  setActiveBrush]  = useState("draw");
  const [radius,       setRadius]       = useState(50);
  const [strength,     setStrength]     = useState(0.5);
  const [autosmooth,   setAutosmooth]   = useState(0);
  const [normal_weight,setNormalWeight] = useState(1.0);
  const [direction,    setDirection]    = useState("add"); // add | subtract
  const [stroke,       setStroke]       = useState("Space");
  const [falloff,      setFalloff]      = useState("Smooth");
  const [dyntopo,      setDyntopo]      = useState(false);
  const [dynaDetail,   setDynaDetail]   = useState(12);
  const [multires,     setMultires]     = useState(0);
  const [symmetryX,    setSymmetryX]    = useState(true);
  const [symmetryY,    setSymmetryY]    = useState(false);
  const [symmetryZ,    setSymmetryZ]    = useState(false);
  const [search,       setSearch]       = useState("");

  const filteredBrushes = search
    ? BRUSHES.filter(b => b.label.toLowerCase().includes(search.toLowerCase()))
    : BRUSHES;

  return (
    <div className="spx-sculpt-panel">

      {/* Search */}
      <div className="spx-panel-header">
        <span className="spx-panel-title">Sculpt</span>
      </div>

      <div className="spx-sculpt-search-row">
        <input
          className="spx-sculpt-search"
          type="text"
          placeholder="Search brushes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Brush Grid */}
      <div className="spx-sculpt-brushes">
        {filteredBrushes.map(b => (
          <button
            key={b.id}
            className={`spx-sculpt-brush${activeBrush === b.id ? " spx-sculpt-brush--active" : ""}`}
            onClick={() => { setActiveBrush(b.id); onAction?.(b.id); }}
            title={`${b.desc}${b.key ? `  (${b.key})` : ""}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Brush Settings */}
      <div className="spx-sculpt-section">
        <div className="spx-sculpt-section-hdr">Brush Settings</div>

        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Direction</span>
          <div className="spx-sculpt-dir-btns">
            <button className={`spx-sculpt-dir-btn${direction === "add" ? " spx-sculpt-dir-btn--active" : ""}`} onClick={() => setDirection("add")}>Add</button>
            <button className={`spx-sculpt-dir-btn${direction === "subtract" ? " spx-sculpt-dir-btn--active" : ""}`} onClick={() => setDirection("subtract")}>Subtract</button>
          </div>
        </div>

        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Radius</span>
          <div className="spx-sculpt-slider-row">
            <input className="spx-sculpt-slider" type="range" min={1} max={500} value={radius} onChange={e => setRadius(+e.target.value)} />
            <span className="spx-sculpt-val">{radius}px</span>
          </div>
        </div>

        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Strength</span>
          <div className="spx-sculpt-slider-row">
            <input className="spx-sculpt-slider" type="range" min={0} max={100} value={Math.round(strength*100)} onChange={e => setStrength(+e.target.value/100)} />
            <span className="spx-sculpt-val">{Math.round(strength*100)}%</span>
          </div>
        </div>

        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Autosmooth</span>
          <div className="spx-sculpt-slider-row">
            <input className="spx-sculpt-slider" type="range" min={0} max={100} value={autosmooth} onChange={e => setAutosmooth(+e.target.value)} />
            <span className="spx-sculpt-val">{autosmooth}%</span>
          </div>
        </div>

        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Normal Wt</span>
          <div className="spx-sculpt-slider-row">
            <input className="spx-sculpt-slider" type="range" min={0} max={100} value={Math.round(normal_weight*100)} onChange={e => setNormalWeight(+e.target.value/100)} />
            <span className="spx-sculpt-val">{Math.round(normal_weight*100)}%</span>
          </div>
        </div>

        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Stroke</span>
          <select className="spx-sculpt-select" value={stroke} onChange={e => setStroke(e.target.value)}>
            {STROKE_METHODS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Falloff</span>
          <select className="spx-sculpt-select" value={falloff} onChange={e => setFalloff(e.target.value)}>
            {FALLOFFS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Symmetry */}
      <div className="spx-sculpt-section">
        <div className="spx-sculpt-section-hdr">Symmetry</div>
        <div className="spx-sculpt-sym-row">
          {[["X", symmetryX, setSymmetryX], ["Y", symmetryY, setSymmetryY], ["Z", symmetryZ, setSymmetryZ]].map(([ax, val, set]) => (
            <button
              key={ax}
              className={`spx-sculpt-sym-btn${val ? ` spx-sculpt-sym-btn--${ax.toLowerCase()}` : ""}`}
              onClick={() => set(v => !v)}
            >
              {ax}
            </button>
          ))}
        </div>
      </div>

      {/* Dyntopo */}
      <div className="spx-sculpt-section">
        <div className="spx-sculpt-section-hdr">
          <span>Dynamic Topology</span>
          <button
            className={`spx-sculpt-toggle${dyntopo ? " spx-sculpt-toggle--on" : ""}`}
            onClick={() => { setDyntopo(v => !v); onAction?.("dyntopo"); }}
          >
            {dyntopo ? "ON" : "OFF"}
          </button>
        </div>
        {dyntopo && (
          <div className="spx-sculpt-row">
            <span className="spx-sculpt-label">Detail</span>
            <div className="spx-sculpt-slider-row">
              <input className="spx-sculpt-slider" type="range" min={1} max={100} value={dynaDetail} onChange={e => setDynaDetail(+e.target.value)} />
              <span className="spx-sculpt-val">{dynaDetail}</span>
            </div>
          </div>
        )}
      </div>

      {/* Remesh */}
      <div className="spx-sculpt-section">
        <div className="spx-sculpt-section-hdr">Remesh</div>
        <div className="spx-sculpt-remesh-btns">
          <button className="spx-sculpt-remesh-btn" onClick={() => onAction?.("voxel_remesh")}>Voxel Remesh</button>
          <button className="spx-sculpt-remesh-btn" onClick={() => onAction?.("quad_remesh")}>Quad Remesh</button>
          <button className="spx-sculpt-remesh-btn" onClick={() => onAction?.("decimate")}>Decimate</button>
        </div>
      </div>

      {/* Multires */}
      <div className="spx-sculpt-section">
        <div className="spx-sculpt-section-hdr">Multires</div>
        <div className="spx-sculpt-row">
          <span className="spx-sculpt-label">Level</span>
          <div className="spx-sculpt-multires-row">
            <button className="spx-sculpt-multires-btn" onClick={() => setMultires(v => Math.max(0, v-1))}>−</button>
            <span className="spx-sculpt-multires-val">{multires}</span>
            <button className="spx-sculpt-multires-btn" onClick={() => { setMultires(v => v+1); onAction?.("multires_add"); }}>+</button>
          </div>
        </div>
        <div className="spx-sculpt-remesh-btns">
          <button className="spx-sculpt-remesh-btn" onClick={() => onAction?.("multires_apply_base")}>Apply Base</button>
          <button className="spx-sculpt-remesh-btn" onClick={() => onAction?.("multires_reshape")}>Reshape</button>
        </div>
      </div>

    </div>
  );
}
