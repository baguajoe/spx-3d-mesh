import React, { useState } from "react";
import { MATERIAL_PRESETS, MATERIAL_CATEGORIES } from "../../mesh/MaterialPresets";

export default function MaterialPresetsPanel({ onAction }) {
  const [cat,     setCat]     = useState("Metal");
  const [search,  setSearch]  = useState("");
  const [hovered, setHovered] = useState(null);

  const allPresets = Object.keys(MATERIAL_PRESETS);
  const filtered   = search
    ? allPresets.filter(n=>n.toLowerCase().includes(search.toLowerCase()))
    : MATERIAL_CATEGORIES[cat] || [];

  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Material Presets</span>
        <span className="spx-panel-subtitle">{allPresets.length} presets</span>
      </div>
      <div className="spx-pm-search-wrap">
        <input className="spx-nm-search" type="text" placeholder="Search materials…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      {!search&&(
        <div className="spx-gen-tabs">
          {Object.keys(MATERIAL_CATEGORIES).map(c=>(
            <button key={c} className={`spx-gen-tab${cat===c?" spx-gen-tab--active":""}`} onClick={()=>setCat(c)}>{c}</button>
          ))}
        </div>
      )}
      <div className="spx-matpre-grid">
        {filtered.map(name=>{
          const preset=MATERIAL_PRESETS[name];
          return (
            <button
              key={name}
              className={`spx-matpre-item${hovered===name?" spx-matpre-item--hovered":""}`}
              onMouseEnter={()=>setHovered(name)}
              onMouseLeave={()=>setHovered(null)}
              onClick={()=>onAction?.("mat_preset_apply",{preset:name})}
              title={name}
            >
              <div className="spx-matpre-swatch" ref={el=>{
                if(!el)return;
                el.style.background=preset.color||"#888";
                if(preset.emissive)el.style.boxShadow=`0 0 8px ${preset.emissive}`;
                if(preset.type==="glass")el.style.opacity="0.6";
              }}/>
              <span className="spx-matpre-name">{name}</span>
            </button>
          );
        })}
      </div>
      {hovered&&(
        <div className="spx-matpre-info">
          <span className="spx-matpre-info-name">{hovered}</span>
          <span className="spx-matpre-info-type">{MATERIAL_PRESETS[hovered]?.type}</span>
        </div>
      )}
    </div>
  );
}
