import React, { useState, useRef, useCallback } from "react";

// ── Node Definitions ──────────────────────────────────────────────────────────
const NODE_DEFS = {
  "Material Output":    { cat:"Output",  col:"#8b2222", ins:["Surface","Volume","Displacement"], outs:[] },
  "Principled BSDF":    { cat:"Shader",  col:"#1a3a6b", ins:["Base Color","Metallic","Roughness","IOR","Alpha","Normal","Emission","Emission Strength","Subsurface","Subsurface Color","Anisotropic","Sheen","Clearcoat","Transmission"], outs:["BSDF"] },
  "Diffuse BSDF":       { cat:"Shader",  col:"#1a3a6b", ins:["Color","Roughness","Normal"], outs:["BSDF"] },
  "Glossy BSDF":        { cat:"Shader",  col:"#1a3a6b", ins:["Color","Roughness","Normal"], outs:["BSDF"] },
  "Glass BSDF":         { cat:"Shader",  col:"#1a3a6b", ins:["Color","Roughness","IOR","Normal"], outs:["BSDF"] },
  "Transparent BSDF":   { cat:"Shader",  col:"#1a3a6b", ins:["Color"], outs:["BSDF"] },
  "Emission":           { cat:"Shader",  col:"#1a3a6b", ins:["Color","Strength"], outs:["Emission"] },
  "Mix Shader":         { cat:"Shader",  col:"#1a3a6b", ins:["Fac","Shader A","Shader B"], outs:["Shader"] },
  "Add Shader":         { cat:"Shader",  col:"#1a3a6b", ins:["Shader A","Shader B"], outs:["Shader"] },
  "SSS":                { cat:"Shader",  col:"#1a3a6b", ins:["Color","Radius","Scale"], outs:["BSSRDF"] },
  "Refraction BSDF":    { cat:"Shader",  col:"#1a3a6b", ins:["Color","Roughness","IOR"], outs:["BSDF"] },
  "Volume Scatter":     { cat:"Shader",  col:"#1a3a6b", ins:["Color","Density","Anisotropy"], outs:["Volume"] },
  "Volume Absorption":  { cat:"Shader",  col:"#1a3a6b", ins:["Color","Density"], outs:["Volume"] },
  "Holdout":            { cat:"Shader",  col:"#1a3a6b", ins:[], outs:["Holdout"] },
  "Image Texture":      { cat:"Texture", col:"#1a5c1a", ins:["Vector"], outs:["Color","Alpha"] },
  "Noise Texture":      { cat:"Texture", col:"#1a5c1a", ins:["Vector","Scale","Detail","Roughness","Distortion"], outs:["Fac","Color"] },
  "Musgrave Texture":   { cat:"Texture", col:"#1a5c1a", ins:["Vector","Scale","Detail","Dimension","Lacunarity"], outs:["Fac"] },
  "Wave Texture":       { cat:"Texture", col:"#1a5c1a", ins:["Vector","Scale","Distortion","Detail"], outs:["Color","Fac"] },
  "Voronoi Texture":    { cat:"Texture", col:"#1a5c1a", ins:["Vector","Scale","Exponent"], outs:["Distance","Color","Position"] },
  "Checker Texture":    { cat:"Texture", col:"#1a5c1a", ins:["Vector","Color1","Color2","Scale"], outs:["Color","Fac"] },
  "Gradient Texture":   { cat:"Texture", col:"#1a5c1a", ins:["Vector"], outs:["Color","Fac"] },
  "Magic Texture":      { cat:"Texture", col:"#1a5c1a", ins:["Vector","Scale","Distortion"], outs:["Color","Fac"] },
  "Environment Texture":{ cat:"Texture", col:"#1a5c1a", ins:["Vector"], outs:["Color"] },
  "Sky Texture":        { cat:"Texture", col:"#1a5c1a", ins:["Vector"], outs:["Color"] },
  "Mix RGB":            { cat:"Color",   col:"#6b3a1a", ins:["Fac","Color1","Color2"], outs:["Color"] },
  "RGB Curves":         { cat:"Color",   col:"#6b3a1a", ins:["Fac","Color"], outs:["Color"] },
  "Hue/Saturation":     { cat:"Color",   col:"#6b3a1a", ins:["Fac","Hue","Saturation","Value","Color"], outs:["Color"] },
  "Invert":             { cat:"Color",   col:"#6b3a1a", ins:["Fac","Color"], outs:["Color"] },
  "Bright/Contrast":    { cat:"Color",   col:"#6b3a1a", ins:["Color","Bright","Contrast"], outs:["Color"] },
  "Gamma":              { cat:"Color",   col:"#6b3a1a", ins:["Color","Gamma"], outs:["Color"] },
  "Normal Map":         { cat:"Vector",  col:"#1a4a6b", ins:["Strength","Color"], outs:["Normal"] },
  "Bump":               { cat:"Vector",  col:"#1a4a6b", ins:["Strength","Distance","Height","Normal"], outs:["Normal"] },
  "Displacement":       { cat:"Vector",  col:"#1a4a6b", ins:["Height","Midlevel","Scale","Normal"], outs:["Displacement"] },
  "Mapping":            { cat:"Vector",  col:"#1a4a6b", ins:["Vector","Location","Rotation","Scale"], outs:["Vector"] },
  "Texture Coordinate": { cat:"Vector",  col:"#1a4a6b", ins:[], outs:["Generated","Normal","UV","Object","Camera","Window","Reflection"] },
  "Math":               { cat:"Convert", col:"#4a3a1a", ins:["Value A","Value B"], outs:["Value"] },
  "RGB to BW":          { cat:"Convert", col:"#4a3a1a", ins:["Color"], outs:["Val"] },
  "Combine RGB":        { cat:"Convert", col:"#4a3a1a", ins:["R","G","B"], outs:["Image"] },
  "Separate RGB":       { cat:"Convert", col:"#4a3a1a", ins:["Image"], outs:["R","G","B"] },
  "Value":              { cat:"Input",   col:"#3a3a3a", ins:[], outs:["Value"] },
  "RGB":                { cat:"Input",   col:"#3a3a3a", ins:[], outs:["Color"] },
  "Fresnel":            { cat:"Input",   col:"#3a3a3a", ins:["IOR","Normal"], outs:["Fac"] },
  "Layer Weight":       { cat:"Input",   col:"#3a3a3a", ins:["Blend","Normal"], outs:["Fresnel","Facing"] },
  "Light Path":         { cat:"Input",   col:"#3a3a3a", ins:[], outs:["Is Camera Ray","Is Shadow Ray","Is Diffuse Ray","Is Glossy Ray"] },
  "Geometry":           { cat:"Input",   col:"#3a3a3a", ins:[], outs:["Position","Normal","Tangent","True Normal","Backfacing"] },
  "UV Map":             { cat:"Input",   col:"#3a3a3a", ins:[], outs:["UV"] },
  "Vertex Color":       { cat:"Input",   col:"#3a3a3a", ins:[], outs:["Color","Alpha"] },
  "Object Info":        { cat:"Input",   col:"#3a3a3a", ins:[], outs:["Location","Color","Alpha","Random"] },
};

const CATS = ["Output","Shader","Texture","Color","Vector","Convert","Input"];
const SOCKET_COLORS = { Color:"#c08020", Vector:"#6060c0", Value:"#808080", Shader:"#20c080", BSDF:"#20c080", Volume:"#20c0c0", Fac:"#808080", Normal:"#6060c0", Displacement:"#c06020", default:"#808080" };

let nid = 100;
const mkNode = (type, x, y) => {
  const def = NODE_DEFS[type];
  return { id:++nid, type, x, y, ins: def.ins.map((n,i)=>({id:`${nid}-i${i}`,name:n})), outs: def.outs.map((n,i)=>({id:`${nid}-o${i}`,name:n})) };
};

const sockColor = (name) => {
  for (const [k,v] of Object.entries(SOCKET_COLORS)) if (name.includes(k)) return v;
  return SOCKET_COLORS.default;
};

function NodeCard({ node, selected, onSelect, onDragStart }) {
  const def = NODE_DEFS[node.type];
  return (
    <div
      className={`spx-nm-node${selected?" spx-nm-node--selected":""}`}
      ref={el => { if(el){ el.style.left=node.x+"px"; el.style.top=node.y+"px"; } }}
      onMouseDown={e=>{e.stopPropagation();onSelect(node.id);onDragStart(e,node.id);}}
    >
      <div className="spx-nm-node-hdr" data-col={def.col} ref={el => { if(el) el.style.background=def.col; }}>
        <span className="spx-nm-node-title">{node.type}</span>
        <span className="spx-nm-node-cat">{def.cat}</span>
      </div>
      <div className="spx-nm-node-body">
        {node.outs.map(o=>(
          <div key={o.id} className="spx-nm-socket-row spx-nm-socket-row--out">
            <span className="spx-nm-socket-label">{o.name}</span>
            <div className="spx-nm-socket" ref={el => { if(el) el.style.background=sockColor(o.name); }} />
          </div>
        ))}
        {node.ins.map(i=>(
          <div key={i.id} className="spx-nm-socket-row spx-nm-socket-row--in">
            <div className="spx-nm-socket" ref={el => { if(el) el.style.background=sockColor(i.name); }} />
            <span className="spx-nm-socket-label">{i.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NodeMaterialEditor({ onAction }) {
  const [nodes,    setNodes]    = useState(()=>[mkNode("Material Output",600,200),mkNode("Principled BSDF",280,80),mkNode("Image Texture",30,80)]);
  const [selected, setSelected] = useState(null);
  const [addCat,   setAddCat]   = useState("Shader");
  const [search,   setSearch]   = useState("");
  const [zoom,     setZoom]     = useState(1);
  const [pan,      setPan]      = useState({x:20,y:20});
  const canvasRef  = useRef(null);

  const filteredDefs = Object.entries(NODE_DEFS).filter(([name,def])=>
    def.cat===addCat && (!search||name.toLowerCase().includes(search.toLowerCase()))
  );

  const addNode = (type) => setNodes(prev=>[...prev, mkNode(type, 80-pan.x, 80-pan.y)]);

  const removeSelected = () => { if(!selected) return; setNodes(prev=>prev.filter(n=>n.id!==selected)); setSelected(null); };

  const onDragStart = useCallback((e, id) => {
    const node = nodes.find(n=>n.id===id);
    const sx=e.clientX-node.x, sy=e.clientY-node.y;
    const onMove = (ev) => setNodes(prev=>prev.map(n=>n.id===id?{...n,x:ev.clientX-sx,y:ev.clientY-sy}:n));
    const onUp   = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  },[nodes]);

  const onCanvasMouseDown = (e) => {
    if(e.target===canvasRef.current||e.target.classList.contains("spx-nm-canvas-inner")){
      setSelected(null);
      const sx=e.clientX-pan.x, sy=e.clientY-pan.y;
      const onMove=(ev)=>setPan({x:ev.clientX-sx,y:ev.clientY-sy});
      const onUp=()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
      window.addEventListener("mousemove",onMove);
      window.addEventListener("mouseup",onUp);
    }
  };

  const onWheel = (e) => { e.preventDefault(); setZoom(z=>Math.max(0.15,Math.min(3,z-e.deltaY*0.001))); };

  return (
    <div className="spx-nm-editor">
      <div className="spx-nm-header">
        <span className="spx-nm-title">Node Material Editor</span>
        <div className="spx-nm-header-actions">
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(1)}>1:1</button>
          <button className="spx-nm-hdr-btn" onClick={()=>{setZoom(1);setPan({x:20,y:20});}}>Reset</button>
          <button className="spx-nm-hdr-btn spx-nm-hdr-btn--danger" onClick={removeSelected} disabled={!selected}>Del</button>
          <button className="spx-nm-hdr-btn spx-nm-hdr-btn--teal" onClick={()=>onAction?.("mat_apply")}>Apply</button>
        </div>
      </div>

      <div className="spx-nm-body">
        <div className="spx-nm-canvas" ref={canvasRef} onMouseDown={onCanvasMouseDown} onWheel={onWheel}>
          <div className="spx-nm-canvas-inner" ref={el => { if(el) el.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`; }}>
            {nodes.map(node=>(
              <NodeCard key={node.id} node={node} selected={selected===node.id} onSelect={setSelected} onDragStart={onDragStart} />
            ))}
          </div>
        </div>

        <div className="spx-nm-sidebar">
          <div className="spx-nm-sidebar-hdr">Add Node</div>
          <input className="spx-nm-search" type="text" placeholder="Search nodes…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="spx-nm-cats">
            {CATS.map(c=>(
              <button key={c} className={`spx-nm-cat-btn${addCat===c?" spx-nm-cat-btn--active":""}`} onClick={()=>setAddCat(c)}>{c}</button>
            ))}
          </div>
          <div className="spx-nm-node-list">
            {filteredDefs.map(([name])=>(
              <button key={name} className="spx-nm-add-btn" onClick={()=>addNode(name)}>{name}</button>
            ))}
          </div>
          <div className="spx-nm-presets-hdr">Material Presets</div>
          <div className="spx-nm-presets">
            {["PBR Metal","PBR Plastic","Glass","Car Paint","Skin SSS","Holographic","Toon","Dissolve","X-Ray","Lava","Ice","Gold","Water","Cloth","Concrete"].map(p=>(
              <button key={p} className="spx-nm-preset-btn" onClick={()=>onAction?.(`mat_preset_${p.toLowerCase().replace(/ /g,"_")}`)}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
