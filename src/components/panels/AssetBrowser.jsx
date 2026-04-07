import React, { useState, useCallback } from "react";

const CATEGORIES = ["All","Meshes","Materials","Textures","Rigs","Animations","Lights","Cameras","Collections","Audio"];

const BUILT_IN_ASSETS = [
  // Primitives
  { id:"cube",      cat:"Meshes",    name:"Cube",          tags:["primitive","box"],      icon:"⬜" },
  { id:"sphere",    cat:"Meshes",    name:"Sphere",        tags:["primitive","round"],    icon:"⚪" },
  { id:"cylinder",  cat:"Meshes",    name:"Cylinder",      tags:["primitive"],            icon:"⭕" },
  { id:"cone",      cat:"Meshes",    name:"Cone",          tags:["primitive"],            icon:"🔺" },
  { id:"torus",     cat:"Meshes",    name:"Torus",         tags:["primitive","ring"],     icon:"💍" },
  { id:"plane",     cat:"Meshes",    name:"Plane",         tags:["primitive","ground"],   icon:"▬" },
  { id:"capsule",   cat:"Meshes",    name:"Capsule",       tags:["primitive","character"],icon:"💊" },
  // Materials
  { id:"mat_pbr",   cat:"Materials", name:"PBR Default",   tags:["pbr","metal"],          icon:"🟤" },
  { id:"mat_glass", cat:"Materials", name:"Glass",         tags:["glass","transparent"],  icon:"🔵" },
  { id:"mat_emis",  cat:"Materials", name:"Emission",      tags:["glow","neon"],          icon:"💡" },
  { id:"mat_metal", cat:"Materials", name:"Brushed Metal", tags:["metal","industrial"],   icon:"🔘" },
  { id:"mat_skin",  cat:"Materials", name:"Skin SSS",      tags:["skin","character"],     icon:"🟡" },
  { id:"mat_toon",  cat:"Materials", name:"Toon",          tags:["stylized","cartoon"],   icon:"🟢" },
  // Rigs
  { id:"rig_human", cat:"Rigs",      name:"Humanoid Rig",  tags:["character","biped"],    icon:"🦴" },
  { id:"rig_hand",  cat:"Rigs",      name:"Hand Rig",      tags:["hand","finger"],        icon:"✋" },
  { id:"rig_face",  cat:"Rigs",      name:"Face Rig",      tags:["face","blend shapes"],  icon:"😐" },
  // Animations
  { id:"anim_idle", cat:"Animations",name:"Idle",          tags:["idle","loop"],          icon:"🚶" },
  { id:"anim_walk", cat:"Animations",name:"Walk Cycle",    tags:["walk","loop"],          icon:"🚶" },
  { id:"anim_run",  cat:"Animations",name:"Run Cycle",     tags:["run","loop"],           icon:"🏃" },
  { id:"anim_jump", cat:"Animations",name:"Jump",          tags:["jump","one-shot"],      icon:"⬆" },
  // Lights
  { id:"lt_3pt",    cat:"Lights",    name:"3-Point Studio",tags:["studio","portrait"],    icon:"☀" },
  { id:"lt_hdri",   cat:"Lights",    name:"HDRI Outdoor",  tags:["hdri","outdoor"],       icon:"🌅" },
  { id:"lt_neon",   cat:"Lights",    name:"Neon City",     tags:["neon","cyberpunk"],     icon:"🌃" },
  // Cameras
  { id:"cam_persp", cat:"Cameras",   name:"Perspective",   tags:["default"],              icon:"📷" },
  { id:"cam_ortho", cat:"Cameras",   name:"Orthographic",  tags:["technical"],            icon:"📐" },
  { id:"cam_cinema",cat:"Cameras",   name:"Cinematic",     tags:["film","anamorphic"],    icon:"🎬" },
];

let assetId = 1000;

export default function AssetBrowser({ onImport, onAction }) {
  const [cat,      setCat]      = useState("All");
  const [search,   setSearch]   = useState("");
  const [view,     setView]     = useState("grid"); // grid | list
  const [selected, setSelected] = useState(null);
  const [userAssets, setUserAssets] = useState([]);
  const [dragging, setDragging] = useState(null);

  const allAssets = [...BUILT_IN_ASSETS, ...userAssets];

  const filtered = allAssets.filter(a => {
    const matchCat  = cat === "All" || a.cat === cat;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tags.some(t => t.includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const handleImport = useCallback((asset) => {
    onImport?.(asset);
    onAction?.(`asset_import_${asset.id}`);
  }, [onImport, onAction]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    files.forEach(file => {
      const ext = file.name.split(".").pop().toLowerCase();
      const catMap = { obj:"Meshes", fbx:"Meshes", gltf:"Meshes", glb:"Meshes", png:"Textures", jpg:"Textures", hdr:"Textures", exr:"Textures", mp3:"Audio", wav:"Audio" };
      const newAsset = {
        id: `user_${assetId++}`, name: file.name.replace(/\.[^.]+$/, ""),
        cat: catMap[ext] || "Meshes", tags: [ext], icon: "📁",
        file, url: URL.createObjectURL(file),
      };
      setUserAssets(prev => [...prev, newAsset]);
    });
  }, []);

  const removeUserAsset = (id) => setUserAssets(prev => prev.filter(a => a.id !== id));

  return (
    <div className="spx-ab-panel" onDragOver={e=>e.preventDefault()} onDrop={handleDrop}>
      <div className="spx-panel-header">
        <span className="spx-panel-title">Asset Browser</span>
        <div className="spx-ab-view-btns">
          <button className={`spx-ab-view-btn${view==="grid"?" spx-ab-view-btn--active":""}`} onClick={()=>setView("grid")}>⊞</button>
          <button className={`spx-ab-view-btn${view==="list"?" spx-ab-view-btn--active":""}`} onClick={()=>setView("list")}>☰</button>
        </div>
      </div>

      {/* Search */}
      <div className="spx-ab-search-row">
        <input className="spx-ab-search" type="text" placeholder="Search assets…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <span className="spx-ab-count">{filtered.length}</span>
      </div>

      {/* Categories */}
      <div className="spx-ab-cats">
        {CATEGORIES.map(c=>(
          <button key={c} className={`spx-ab-cat${cat===c?" spx-ab-cat--active":""}`} onClick={()=>setCat(c)}>{c}</button>
        ))}
      </div>

      {/* Drop zone hint */}
      <div className="spx-ab-drop-hint">Drop files here to import · OBJ, FBX, GLTF, PNG, HDR</div>

      {/* Assets */}
      <div className={`spx-ab-grid${view==="list"?" spx-ab-grid--list":""}`}>
        {filtered.map(asset => (
          <div
            key={asset.id}
            className={`spx-ab-item${selected===asset.id?" spx-ab-item--selected":""}${view==="list"?" spx-ab-item--list":""}`}
            onClick={()=>setSelected(asset.id)}
            onDoubleClick={()=>handleImport(asset)}
            draggable
            onDragStart={()=>setDragging(asset)}
            onDragEnd={()=>setDragging(null)}
          >
            <div className="spx-ab-item-icon">{asset.icon}</div>
            <div className="spx-ab-item-info">
              <span className="spx-ab-item-name">{asset.name}</span>
              <span className="spx-ab-item-cat">{asset.cat}</span>
              {view==="list" && <div className="spx-ab-item-tags">{asset.tags.slice(0,3).map(t=><span key={t} className="spx-ab-tag">{t}</span>)}</div>}
            </div>
            {asset.file && (
              <button className="spx-ab-item-del" onClick={e=>{e.stopPropagation();removeUserAsset(asset.id);}}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Selected asset detail */}
      {selected && (()=>{
        const a=allAssets.find(x=>x.id===selected);
        if(!a)return null;
        return (
          <div className="spx-ab-detail">
            <div className="spx-ab-detail-hdr">
              <span className="spx-ab-detail-icon">{a.icon}</span>
              <span className="spx-ab-detail-name">{a.name}</span>
            </div>
            <div className="spx-ab-detail-meta">
              <span className="spx-ab-detail-cat">{a.cat}</span>
              <div className="spx-ab-detail-tags">{a.tags.map(t=><span key={t} className="spx-ab-tag">{t}</span>)}</div>
            </div>
            <div className="spx-ab-detail-actions">
              <button className="spx-ab-action-btn spx-ab-action-btn--primary" onClick={()=>handleImport(a)}>Import to Scene</button>
              <button className="spx-ab-action-btn" onClick={()=>onAction?.(`asset_preview_${a.id}`)}>Preview</button>
              {a.file && <button className="spx-ab-action-btn" onClick={()=>removeUserAsset(a.id)}>Remove</button>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
