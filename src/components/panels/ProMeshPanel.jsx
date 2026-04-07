import React, { useState } from "react";

const TOOL_GROUPS = [
  {
    label:"Transform", color:"teal", tools:[
      {id:"extrude",    label:"Extrude",     key:"E"},
      {id:"inset",      label:"Inset",       key:"I"},
      {id:"bevel",      label:"Bevel",       key:"Ctrl+B"},
      {id:"loop_cut",   label:"Loop Cut",    key:"Ctrl+R"},
      {id:"knife",      label:"Knife",       key:"K"},
      {id:"spin",       label:"Spin",        key:""},
      {id:"screw",      label:"Screw",       key:""},
    ]
  },
  {
    label:"Add/Remove", color:"orange", tools:[
      {id:"subdivide",  label:"Subdivide",   key:""},
      {id:"unsubdivide",label:"Unsubdivide", key:""},
      {id:"merge",      label:"Merge Verts", key:"M"},
      {id:"fill",       label:"Fill",        key:"F"},
      {id:"bridge",     label:"Bridge",      key:""},
      {id:"dissolve_edges",label:"Dissolve Edges",key:"Ctrl+X"},
      {id:"delete",     label:"Delete",      key:"X"},
    ]
  },
  {
    label:"Deform", color:"blue", tools:[
      {id:"smooth",     label:"Smooth",      key:""},
      {id:"laplacian",  label:"Laplacian Smooth",key:""},
      {id:"to_sphere",  label:"To Sphere",   key:"Shift+Alt+S"},
      {id:"shear",      label:"Shear",       key:"Shift+Ctrl+Alt+S"},
      {id:"push_pull",  label:"Push/Pull",   key:""},
      {id:"warp",       label:"Warp",        key:""},
      {id:"shrink_fatten",label:"Shrink/Fatten",key:"Alt+S"},
    ]
  },
  {
    label:"Boolean", color:"purple", tools:[
      {id:"bool_union", label:"Boolean Union",     key:""},
      {id:"bool_diff",  label:"Boolean Difference",key:""},
      {id:"bool_intersect",label:"Boolean Intersect",key:""},
    ]
  },
  {
    label:"Normals", color:"yellow", tools:[
      {id:"fix_normals",    label:"Fix Normals",       key:""},
      {id:"flip_normals",   label:"Flip Normals",      key:"Alt+N"},
      {id:"recalc_normals", label:"Recalculate",       key:"Shift+N"},
      {id:"split_normals",  label:"Split Normals",     key:""},
      {id:"merge_normals",  label:"Merge Normals",     key:""},
    ]
  },
  {
    label:"Cleanup", color:"green", tools:[
      {id:"merge_by_dist",  label:"Merge by Distance", key:"M"},
      {id:"fill_holes",     label:"Fill Holes",        key:""},
      {id:"triangulate",    label:"Triangulate",       key:"Ctrl+T"},
      {id:"quads",          label:"Tris to Quads",     key:"Alt+J"},
      {id:"limited_dissolve",label:"Limited Dissolve", key:""},
    ]
  },
  {
    label:"Modifiers", color:"teal", tools:[
      {id:"mod_mirror",     label:"Mirror",            key:""},
      {id:"mod_array",      label:"Array",             key:""},
      {id:"mod_solidify",   label:"Solidify",          key:""},
      {id:"mod_remesh",     label:"Remesh",            key:""},
      {id:"mod_decimate",   label:"Decimate",          key:""},
      {id:"mod_weld",       label:"Weld",              key:""},
    ]
  },
];

const COLOR_MAP = {
  teal:"rgba(0,255,200,0.08)","orange":"rgba(255,102,0,0.08)",
  blue:"rgba(68,136,255,0.08)","purple":"rgba(170,68,255,0.08)",
  yellow:"rgba(255,204,0,0.08)","green":"rgba(68,204,68,0.08)",
};
const BORDER_MAP = {
  teal:"rgba(0,255,200,0.25)",orange:"rgba(255,102,0,0.25)",
  blue:"rgba(68,136,255,0.25)",purple:"rgba(170,68,255,0.25)",
  yellow:"rgba(255,204,0,0.25)",green:"rgba(68,204,68,0.25)",
};

function ToolGroup({ group, onAction }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="spx-pm-group">
      <button className="spx-pm-group-hdr" onClick={()=>setOpen(v=>!v)}>
        <svg className={`spx-film-chevron${open?" spx-film-chevron--open":""}`} viewBox="0 0 16 16" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span className="spx-pm-group-label">{group.label}</span>
        <span className="spx-pm-group-count">{group.tools.length}</span>
      </button>
      {open&&(
        <div className="spx-pm-tools">
          {group.tools.map(t=>(
            <button
              key={t.id}
              className="spx-pm-tool-btn"
              onClick={()=>onAction?.(t.id)}
              title={t.key||t.label}
            >
              <span className="spx-pm-tool-label">{t.label}</span>
              {t.key&&<span className="spx-pm-tool-key">{t.key}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProMeshPanel({ onAction }) {
  const [search, setSearch] = useState("");
  const allTools = TOOL_GROUPS.flatMap(g=>g.tools);
  const filtered = search ? allTools.filter(t=>t.label.toLowerCase().includes(search.toLowerCase())) : null;

  return (
    <div className="spx-pm-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Mesh Tools</span>
      </div>
      <div className="spx-pm-search-wrap">
        <input className="spx-nm-search" type="text" placeholder="Search tools…" value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="spx-pm-content">
        {filtered
          ? filtered.map(t=>(
              <button key={t.id} className="spx-pm-tool-btn spx-pm-tool-btn--search" onClick={()=>onAction?.(t.id)} title={t.key}>
                <span className="spx-pm-tool-label">{t.label}</span>
                {t.key&&<span className="spx-pm-tool-key">{t.key}</span>}
              </button>
            ))
          : TOOL_GROUPS.map(g=><ToolGroup key={g.label} group={g} onAction={onAction}/>)
        }
      </div>
    </div>
  );
}
