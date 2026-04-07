import React, { useState } from "react";

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="spx-film-row">
      <span className="spx-film-label">{label}</span>
      <div className="spx-film-slider-row">
        <input className="spx-film-range" type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)}/>
        <span className="spx-film-val">{value}{unit}</span>
      </div>
    </div>
  );
}

function Section({ title, color, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-film-section">
      <button className={`spx-film-section-hdr spx-film-section-hdr--${color}`} onClick={()=>setOpen(v=>!v)}>
        <svg className={`spx-film-chevron${open?" spx-film-chevron--open":""}`} viewBox="0 0 16 16" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>{title}</span>
      </button>
      {open && <div className="spx-film-section-body">{children}</div>}
    </div>
  );
}

// ── Cloth Tab ─────────────────────────────────────────────────────────────────
function ClothTab({ onAction }) {
  const [segsX,    setSegsX]    = useState(20);
  const [segsY,    setSegsY]    = useState(20);
  const [width,    setWidth]    = useState(4);
  const [height,   setHeight]   = useState(4);
  const [stiff,    setStiff]    = useState(0.9);
  const [mass,     setMass]     = useState(0.1);
  const [damping,  setDamping]  = useState(0.99);
  const [pinTop,   setPinTop]   = useState(true);
  const [windX,    setWindX]    = useState(0);
  const [windZ,    setWindZ]    = useState(0);
  const [gravY,    setGravY]    = useState(-9.8);
  const [running,  setRunning]  = useState(false);
  return (
    <div>
      <Section title="Cloth Settings" color="teal">
        <Slider label="Segments X"  value={segsX}   min={5}   max={50}  step={1}    unit=""  onChange={setSegsX}/>
        <Slider label="Segments Y"  value={segsY}   min={5}   max={50}  step={1}    unit=""  onChange={setSegsY}/>
        <Slider label="Width"       value={width}   min={0.5} max={20}  step={0.5}  unit="m" onChange={setWidth}/>
        <Slider label="Height"      value={height}  min={0.5} max={20}  step={0.5}  unit="m" onChange={setHeight}/>
        <Slider label="Stiffness"   value={stiff}   min={0.1} max={1}   step={0.01} unit=""  onChange={setStiff}/>
        <Slider label="Mass"        value={mass}    min={0.01}max={1}   step={0.01} unit=""  onChange={setMass}/>
        <Slider label="Damping"     value={damping} min={0.9} max={1}   step={0.001}unit=""  onChange={setDamping}/>
        <div className="spx-film-row">
          <span className="spx-film-label">Pin Top</span>
          <input className="spx-film-check" type="checkbox" checked={pinTop} onChange={e=>setPinTop(e.target.checked)}/>
        </div>
      </Section>
      <Section title="Forces" color="orange">
        <Slider label="Gravity Y"   value={gravY}   min={-20} max={0}   step={0.1}  unit=""  onChange={setGravY}/>
        <Slider label="Wind X"      value={windX}   min={-10} max={10}  step={0.1}  unit=""  onChange={e=>{setWindX(e);onAction?.("cloth_wind",{x:e,z:windZ});}}/>
        <Slider label="Wind Z"      value={windZ}   min={-10} max={10}  step={0.1}  unit=""  onChange={e=>{setWindZ(e);onAction?.("cloth_wind",{x:windX,z:e});}}/>
      </Section>
      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("cloth_create",{segmentsX:segsX,segmentsY:segsY,width,height,stiffness:stiff,mass,pinTop})}>Create Cloth</button>
        {!running
          ?<button className="spx-film-apply-full-btn" onClick={()=>{setRunning(true);onAction?.("cloth_start");}}>▶ Simulate</button>
          :<button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>{setRunning(false);onAction?.("cloth_stop");}}>⏹ Stop</button>
        }
        <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>onAction?.("cloth_reset")}>Reset</button>
      </div>
    </div>
  );
}

// ── Shape Keys Tab ────────────────────────────────────────────────────────────
function ShapeKeysTab({ onAction }) {
  const [keys, setKeys]   = useState([]);
  const [name, setName]   = useState("ShapeKey");
  return (
    <div>
      <Section title="Shape Keys" color="teal">
        <div className="spx-film-row">
          <span className="spx-film-label">Name</span>
          <input className="spx-film-num" type="text" value={name} onChange={e=>setName(e.target.value)}/>
        </div>
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={()=>{onAction?.("sk_add",{name});setKeys(p=>[...p,{name,value:0}]);}}>+ Add from Current</button>
          <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("sk_facial_preset")}>Add Facial Preset</button>
        </div>
        {keys.map((k,i)=>(
          <div key={i} className="spx-film-row">
            <span className="spx-film-label">{k.name}</span>
            <div className="spx-film-slider-row">
              <input className="spx-film-range" type="range" min={0} max={1} step={0.01} value={k.value}
                onChange={e=>{const v=+e.target.value;setKeys(prev=>prev.map((sk,j)=>j===i?{...sk,value:v}:sk));onAction?.("sk_set",{name:k.name,value:v});}}/>
              <span className="spx-film-val">{k.value.toFixed(2)}</span>
            </div>
            <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>{onAction?.("sk_remove",{name:k.name});setKeys(prev=>prev.filter((_,j)=>j!==i));}}>✕</button>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ── Snap Tab ──────────────────────────────────────────────────────────────────
function SnapTab({ onAction }) {
  const [enabled,   setEnabled]   = useState(false);
  const [mode,      setMode]      = useState("grid");
  const [gridSize,  setGridSize]  = useState(0.5);
  const [increment, setIncrement] = useState(0.1);
  const [threshold, setThreshold] = useState(0.3);
  const MODES = ["grid","vertex","edge","face","surface","increment"];
  return (
    <div>
      <Section title="Snap Settings" color="teal">
        <div className="spx-film-row">
          <span className="spx-film-label">Enabled</span>
          <input className="spx-film-check" type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);onAction?.("snap_enabled",{enabled:e.target.checked});}}/>
        </div>
        <div className="spx-film-row">
          <span className="spx-film-label">Mode</span>
          <select className="spx-film-select" value={mode} onChange={e=>{setMode(e.target.value);onAction?.("snap_mode",{mode:e.target.value});}}>
            {MODES.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {mode==="grid"&&<Slider label="Grid Size" value={gridSize} min={0.1} max={5} step={0.1} unit="m" onChange={v=>{setGridSize(v);onAction?.("snap_grid",{size:v});}}/>}
        {mode==="increment"&&<Slider label="Increment" value={increment} min={0.01} max={1} step={0.01} unit="" onChange={v=>{setIncrement(v);onAction?.("snap_increment",{value:v});}}/>}
        {(mode==="vertex"||mode==="edge")&&<Slider label="Threshold" value={threshold} min={0.05} max={2} step={0.05} unit="m" onChange={v=>{setThreshold(v);onAction?.("snap_threshold",{value:v});}}/>}
      </Section>
    </div>
  );
}

// ── Import/Export Tab ─────────────────────────────────────────────────────────
function ImportExportTab({ onAction }) {
  return (
    <div>
      <Section title="Import" color="teal">
        <label className="spx-mc-upload-label">
          📁 Import File (OBJ, GLB, GLTF, STL, BVH)
          <input className="spx-mc-file-input" type="file" accept=".obj,.glb,.gltf,.stl,.bvh,.fbx"
            onChange={e=>{const f=e.target.files?.[0];if(f)onAction?.("import_file",{file:f});}}/>
        </label>
      </Section>
      <Section title="Export" color="orange">
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("export_obj")}>Export OBJ</button>
          <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("export_stl")}>Export STL</button>
        </div>
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("export_glb")}>Export GLB</button>
          <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("export_gltf")}>Export GLTF</button>
        </div>
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>onAction?.("export_png")}>Screenshot PNG</button>
        </div>
      </Section>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS=[
  {id:"cloth",  label:"Cloth"},
  {id:"shapekeys",label:"Shape Keys"},
  {id:"snap",   label:"Snap"},
  {id:"io",     label:"Import/Export"},
];

export default function SimulationPanel({ onAction }) {
  const [tab, setTab] = useState("cloth");
  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Simulation</span>
      </div>
      <div className="spx-gen-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`spx-gen-tab${tab===t.id?" spx-gen-tab--active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="spx-film-panel">
        {tab==="cloth"     && <ClothTab      onAction={onAction}/>}
        {tab==="shapekeys" && <ShapeKeysTab  onAction={onAction}/>}
        {tab==="snap"      && <SnapTab       onAction={onAction}/>}
        {tab==="io"        && <ImportExportTab onAction={onAction}/>}
      </div>
    </div>
  );
}
