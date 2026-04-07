import React, { useState } from "react";

const DEFAULT_SHORTCUTS = [
  { action:"Select",         key:"Q",         category:"Select" },
  { action:"Move",           key:"G",         category:"Transform" },
  { action:"Rotate",         key:"R",         category:"Transform" },
  { action:"Scale",          key:"S",         category:"Transform" },
  { action:"Extrude",        key:"E",         category:"Mesh" },
  { action:"Inset",          key:"I",         category:"Mesh" },
  { action:"Bevel",          key:"Ctrl+B",    category:"Mesh" },
  { action:"Loop Cut",       key:"Ctrl+R",    category:"Mesh" },
  { action:"Delete",         key:"X",         category:"Edit" },
  { action:"Duplicate",      key:"Shift+D",   category:"Edit" },
  { action:"Undo",           key:"Ctrl+Z",    category:"Edit" },
  { action:"Redo",           key:"Ctrl+Y",    category:"Edit" },
  { action:"Select All",     key:"A",         category:"Select" },
  { action:"Edit Mode",      key:"Tab",       category:"Mode" },
  { action:"Vertex Select",  key:"1",         category:"Mode" },
  { action:"Edge Select",    key:"2",         category:"Mode" },
  { action:"Face Select",    key:"3",         category:"Mode" },
  { action:"Object Mode",    key:"4",         category:"Mode" },
  { action:"Focus Selected", key:"F",         category:"View" },
  { action:"Front View",     key:"Numpad 1",  category:"View" },
  { action:"Right View",     key:"Numpad 3",  category:"View" },
  { action:"Top View",       key:"Numpad 7",  category:"View" },
  { action:"Proportional",   key:"O",         category:"Edit" },
  { action:"Sculpt Mode",    key:"Ctrl+S",    category:"Mode" },
  { action:"Path Trace",     key:"F12",       category:"Render" },
  { action:"Screenshot",     key:"F11",       category:"Render" },
];

const THEMES = [
  { name:"SPX Dark",     bg:"#06060f", teal:"#00ffc8", orange:"#FF6600" },
  { name:"Blender Dark", bg:"#1d1d1d", teal:"#4772b3", orange:"#e87d0d" },
  { name:"Midnight",     bg:"#000008", teal:"#00aaff", orange:"#ff4400" },
  { name:"Forest",       bg:"#0a1a0a", teal:"#44ff88", orange:"#ffaa00" },
  { name:"Nord",         bg:"#2e3440", teal:"#88c0d0", orange:"#d08770" },
  { name:"Solarized",    bg:"#002b36", teal:"#2aa198", orange:"#cb4b16" },
];

const UNITS = ["Meters","Centimeters","Millimeters","Inches","Feet"];

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="spx-film-section">
      <button className="spx-film-section-hdr spx-film-section-hdr--teal" onClick={()=>setOpen(v=>!v)}>
        <svg className={`spx-film-chevron${open?" spx-film-chevron--open":""}`} viewBox="0 0 16 16" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>{title}</span>
      </button>
      {open&&<div className="spx-film-section-body">{children}</div>}
    </div>
  );
}

const TABS=[{id:"shortcuts",label:"Shortcuts"},{id:"theme",label:"Theme"},{id:"viewport",label:"Viewport"},{id:"units",label:"Units"},{id:"performance",label:"Performance"}];

export default function PreferencesPanel({ onAction }) {
  const [tab,        setTab]        = useState("shortcuts");
  const [shortcuts,  setShortcuts]  = useState(DEFAULT_SHORTCUTS);
  const [editingIdx, setEditingIdx] = useState(null);
  const [theme,      setTheme]      = useState("SPX Dark");
  const [units,      setUnits]      = useState("Meters");
  const [catFilter,  setCatFilter]  = useState("All");
  const [fps,        setFps]        = useState(true);
  const [grid,       setGrid]       = useState(true);
  const [axes,       setAxes]       = useState(true);
  const [overlays,   setOverlays]   = useState(true);
  const [aa,         setAa]         = useState(true);
  const [shadows,    setShadows]    = useState(true);
  const [ssao,       setSsao]       = useState(false);
  const [bloom,      setBloom]      = useState(false);
  const [maxLights,  setMaxLights]  = useState(8);
  const [pixelRatio, setPixelRatio] = useState(2);

  const cats=["All",...new Set(shortcuts.map(s=>s.category))];
  const filtered=catFilter==="All"?shortcuts:shortcuts.filter(s=>s.category===catFilter);

  const captureKey=(e,idx)=>{
    e.preventDefault();
    const parts=[];
    if(e.ctrlKey)parts.push("Ctrl");
    if(e.shiftKey)parts.push("Shift");
    if(e.altKey)parts.push("Alt");
    const k=e.key.length===1?e.key.toUpperCase():e.key;
    if(!["Control","Shift","Alt","Meta"].includes(e.key))parts.push(k);
    const newKey=parts.join("+");
    setShortcuts(p=>p.map((s,i)=>i===idx?{...s,key:newKey}:s));
    setEditingIdx(null);
    onAction?.("pref_shortcut",{action:shortcuts[idx].action,key:newKey});
  };

  const applyTheme=(t)=>{
    setTheme(t.name);
    document.documentElement.style.setProperty("--bg",    t.bg);
    document.documentElement.style.setProperty("--teal",  t.teal);
    document.documentElement.style.setProperty("--orange",t.orange);
    onAction?.("pref_theme",t);
  };

  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Preferences</span>
        <button className="spx-panel-action-btn" onClick={()=>{setShortcuts(DEFAULT_SHORTCUTS);setEditingIdx(null);}}>Reset All</button>
      </div>
      <div className="spx-gen-tabs">
        {TABS.map(t=><button key={t.id} className={`spx-gen-tab${tab===t.id?" spx-gen-tab--active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>

      {tab==="shortcuts"&&(
        <div className="spx-pref-shortcuts">
          <div className="spx-mc-lib-filters">
            {cats.map(c=><button key={c} className={`spx-mc-lib-filter${catFilter===c?" spx-mc-lib-filter--active":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
          </div>
          <div className="spx-pref-shortcut-list">
            {filtered.map((s,i)=>{
              const realIdx=shortcuts.indexOf(s);
              return (
                <div key={s.action} className="spx-pref-shortcut-row">
                  <span className="spx-pref-action">{s.action}</span>
                  <span className="spx-pref-cat">{s.category}</span>
                  {editingIdx===realIdx
                    ?<span className="spx-pref-key spx-pref-key--recording" tabIndex={0} onKeyDown={e=>captureKey(e,realIdx)} autoFocus>Press key…</span>
                    :<span className="spx-pref-key" onClick={()=>setEditingIdx(realIdx)}>{s.key}</span>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="theme"&&(
        <div className="spx-film-section-body">
          <div className="spx-pref-themes">
            {THEMES.map(t=>(
              <button key={t.name} className={`spx-pref-theme-btn${theme===t.name?" spx-pref-theme-btn--active":""}`} onClick={()=>applyTheme(t)}>
                <div className="spx-pref-theme-preview">
                  <div className="spx-pref-theme-swatch" ref={el=>{if(el)el.style.background=t.bg;}}/>
                  <div className="spx-pref-theme-swatch" ref={el=>{if(el)el.style.background=t.teal;}}/>
                  <div className="spx-pref-theme-swatch" ref={el=>{if(el)el.style.background=t.orange;}}/>
                </div>
                <span className="spx-pref-theme-name">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab==="viewport"&&(
        <div className="spx-film-section-body">
          {[["Show FPS",fps,setFps],["Show Grid",grid,setGrid],["Show Axes",axes,setAxes],["Overlays",overlays,setOverlays],["Anti-Aliasing",aa,setAa],["Shadows",shadows,setShadows],["SSAO",ssao,setSsao],["Bloom",bloom,setBloom]].map(([label,val,set])=>(
            <div key={label} className="spx-film-row">
              <span className="spx-film-label">{label}</span>
              <input className="spx-film-check" type="checkbox" checked={val} onChange={e=>{set(e.target.checked);onAction?.("pref_viewport",{key:label,value:e.target.checked});}}/>
            </div>
          ))}
          <div className="spx-film-row">
            <span className="spx-film-label">Pixel Ratio</span>
            <select className="spx-film-select" value={pixelRatio} onChange={e=>{setPixelRatio(+e.target.value);onAction?.("pref_pixelratio",{value:+e.target.value});}}>
              {[1,1.5,2,3].map(v=><option key={v} value={v}>{v}x</option>)}
            </select>
          </div>
        </div>
      )}

      {tab==="units"&&(
        <div className="spx-film-section-body">
          <div className="spx-film-row">
            <span className="spx-film-label">Unit System</span>
            <select className="spx-film-select" value={units} onChange={e=>{setUnits(e.target.value);onAction?.("pref_units",{units:e.target.value});}}>
              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="spx-film-row">
            <span className="spx-film-label">Scene Scale</span>
            <select className="spx-film-select">
              {["1:1 (1m = 1 unit)","1:10 (1m = 10 units)","1:100 (mm)"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="spx-film-row">
            <span className="spx-film-label">Angle</span>
            <select className="spx-film-select">
              {["Degrees","Radians"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {tab==="performance"&&(
        <div className="spx-film-section-body">
          <div className="spx-film-row">
            <span className="spx-film-label">Max Lights</span>
            <select className="spx-film-select" value={maxLights} onChange={e=>setMaxLights(+e.target.value)}>
              {[4,8,16,32,64].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="spx-film-row"><span className="spx-film-label">Shadow Maps</span><input className="spx-film-check" type="checkbox" defaultChecked/></div>
          <div className="spx-film-row"><span className="spx-film-label">LOD Auto</span><input className="spx-film-check" type="checkbox" defaultChecked/></div>
          <div className="spx-film-row"><span className="spx-film-label">Frustum Cull</span><input className="spx-film-check" type="checkbox" defaultChecked/></div>
          <div className="spx-film-row"><span className="spx-film-label">GPU Instancing</span><input className="spx-film-check" type="checkbox" defaultChecked/></div>
          <div className="spx-film-row"><span className="spx-film-label">Mipmaps</span><input className="spx-film-check" type="checkbox" defaultChecked/></div>
        </div>
      )}
    </div>
  );
}
