import React, { useState, useRef, useCallback } from "react";

const NODE_DEFS = {
  // Input
  "Group Input":       { cat:"Input",    col:"#333344", ins:[], outs:["Geometry","Value","Vector","Boolean"] },
  "Object Info":       { cat:"Input",    col:"#333344", ins:["Object"], outs:["Location","Rotation","Scale","Geometry"] },
  "Value":             { cat:"Input",    col:"#333344", ins:[], outs:["Value"] },
  "Integer":           { cat:"Input",    col:"#333344", ins:[], outs:["Integer"] },
  "Vector":            { cat:"Input",    col:"#333344", ins:[], outs:["Vector"] },
  "Boolean":           { cat:"Input",    col:"#333344", ins:[], outs:["Boolean"] },
  "Collection Info":   { cat:"Input",    col:"#333344", ins:["Collection"], outs:["Geometry","Index"] },
  // Output
  "Group Output":      { cat:"Output",   col:"#443333", ins:["Geometry"], outs:[] },
  // Geometry
  "Mesh Primitive":    { cat:"Geometry", col:"#1a4a2a", ins:["Size","Vertices","Radius"], outs:["Mesh"] },
  "Join Geometry":     { cat:"Geometry", col:"#1a4a2a", ins:["Geometry","Geometry"], outs:["Geometry"] },
  "Transform":         { cat:"Geometry", col:"#1a4a2a", ins:["Geometry","Translation","Rotation","Scale"], outs:["Geometry"] },
  "Set Position":      { cat:"Geometry", col:"#1a4a2a", ins:["Geometry","Selection","Position","Offset"], outs:["Geometry"] },
  "Delete Geometry":   { cat:"Geometry", col:"#1a4a2a", ins:["Geometry","Selection","Mode"], outs:["Geometry"] },
  "Merge by Distance": { cat:"Geometry", col:"#1a4a2a", ins:["Geometry","Selection","Distance"], outs:["Geometry"] },
  "Subdivide Mesh":    { cat:"Geometry", col:"#1a4a2a", ins:["Mesh","Level"], outs:["Mesh"] },
  "Dual Mesh":         { cat:"Geometry", col:"#1a4a2a", ins:["Mesh"], outs:["Dual Mesh"] },
  "Extrude Mesh":      { cat:"Geometry", col:"#1a4a2a", ins:["Mesh","Selection","Offset","Scale"], outs:["Mesh","Top","Side"] },
  "Flip Faces":        { cat:"Geometry", col:"#1a4a2a", ins:["Mesh","Selection"], outs:["Mesh"] },
  "Mesh Boolean":      { cat:"Geometry", col:"#1a4a2a", ins:["Mesh 1","Mesh 2","Operation"], outs:["Mesh"] },
  "Convex Hull":       { cat:"Geometry", col:"#1a4a2a", ins:["Geometry"], outs:["Convex Hull"] },
  // Instances
  "Instance on Points":{ cat:"Instances",col:"#1a2a4a", ins:["Points","Selection","Instance","Pick Instance","Index","Rotation","Scale"], outs:["Instances"] },
  "Realize Instances": { cat:"Instances",col:"#1a2a4a", ins:["Geometry"], outs:["Geometry"] },
  "Rotate Instances":  { cat:"Instances",col:"#1a2a4a", ins:["Instances","Selection","Rotation","Pivot Point","Local Space"], outs:["Instances"] },
  "Scale Instances":   { cat:"Instances",col:"#1a2a4a", ins:["Instances","Selection","Scale","Center","Local Space"], outs:["Instances"] },
  // Point
  "Distribute Points on Faces":{ cat:"Point",col:"#2a1a4a", ins:["Mesh","Selection","Distance Min","Density Max","Seed"], outs:["Points","Normal","Rotation"] },
  "Points":            { cat:"Point",    col:"#2a1a4a", ins:["Count","Position","Radius"], outs:["Points"] },
  // Curve
  "Curve Line":        { cat:"Curve",    col:"#2a2a1a", ins:["Start","End"], outs:["Curve"] },
  "Curve Circle":      { cat:"Curve",    col:"#2a2a1a", ins:["Resolution","Radius","Point 1","Point 2","Point 3"], outs:["Curve","Center","Normal","Radius"] },
  "Curve to Mesh":     { cat:"Curve",    col:"#2a2a1a", ins:["Curve","Profile Curve","Fill Caps"], outs:["Mesh"] },
  "Fill Curve":        { cat:"Curve",    col:"#2a2a1a", ins:["Curve","Mode"], outs:["Mesh"] },
  "Resample Curve":    { cat:"Curve",    col:"#2a2a1a", ins:["Curve","Selection","Mode","Count","Length"], outs:["Curve"] },
  // Math
  "Math":              { cat:"Utilities",col:"#3a2a1a", ins:["Value","Value"], outs:["Value"] },
  "Vector Math":       { cat:"Utilities",col:"#3a2a1a", ins:["Vector","Vector"], outs:["Vector","Value"] },
  "Boolean Math":      { cat:"Utilities",col:"#3a2a1a", ins:["Boolean","Boolean"], outs:["Boolean"] },
  "Random Value":      { cat:"Utilities",col:"#3a2a1a", ins:["Min","Max","ID","Seed"], outs:["Value","Boolean","Vector","Rotation"] },
  "Map Range":         { cat:"Utilities",col:"#3a2a1a", ins:["Value","From Min","From Max","To Min","To Max","Clamp"], outs:["Result"] },
  "Mix":               { cat:"Utilities",col:"#3a2a1a", ins:["Factor","A","B"], outs:["Result"] },
  // Attribute
  "Store Named Attribute":{ cat:"Attribute",col:"#2a3a2a", ins:["Geometry","Selection","Name","Value"], outs:["Geometry"] },
  "Named Attribute":   { cat:"Attribute",col:"#2a3a2a", ins:["Name"], outs:["Attribute","Exists"] },
  "Capture Attribute": { cat:"Attribute",col:"#2a3a2a", ins:["Geometry","Value","Domain"], outs:["Geometry","Attribute"] },
};

const CATS = ["Input","Output","Geometry","Instances","Point","Curve","Utilities","Attribute"];

let gnid = 0;
const mkNode = (type, x, y) => {
  const def = NODE_DEFS[type];
  return { id:++gnid, type, x, y, ins:def.ins.map((n,i)=>({id:`${gnid}-i${i}`,name:n})), outs:def.outs.map((n,i)=>({id:`${gnid}-o${i}`,name:n})) };
};

function GNNodeCard({ node, selected, onSelect, onDrag }) {
  const def = NODE_DEFS[node.type];
  return (
    <div
      className={`spx-gn-node${selected?" spx-gn-node--selected":""}`}
      ref={el=>{if(el){el.style.left=node.x+"px";el.style.top=node.y+"px";}}}
      onMouseDown={e=>{e.stopPropagation();onSelect(node.id);onDrag(e,node.id);}}
    >
      <div className="spx-gn-node-hdr" ref={el=>{if(el)el.style.background=def.col;}}>
        <span className="spx-gn-node-title">{node.type}</span>
        <span className="spx-gn-node-cat">{def.cat}</span>
      </div>
      <div className="spx-gn-node-body">
        {node.outs.map(o=>(
          <div key={o.id} className="spx-gn-socket-row spx-gn-socket-row--out">
            <span className="spx-gn-label">{o.name}</span>
            <div className="spx-gn-socket spx-gn-socket--out"/>
          </div>
        ))}
        {node.ins.map(i=>(
          <div key={i.id} className="spx-gn-socket-row spx-gn-socket-row--in">
            <div className="spx-gn-socket spx-gn-socket--in"/>
            <span className="spx-gn-label">{i.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GeometryNodesPanel({ onAction }) {
  const [nodes,   setNodes]   = useState(()=>[mkNode("Group Input",40,100),mkNode("Instance on Points",260,60),mkNode("Mesh Primitive",40,260),mkNode("Group Output",520,100)]);
  const [sel,     setSel]     = useState(null);
  const [addCat,  setAddCat]  = useState("Geometry");
  const [search,  setSearch]  = useState("");
  const [zoom,    setZoom]    = useState(1);
  const [pan,     setPan]     = useState({x:20,y:20});
  const canvasRef = useRef(null);

  const filtered = Object.entries(NODE_DEFS).filter(([n,d])=>d.cat===addCat&&(!search||n.toLowerCase().includes(search.toLowerCase())));

  const addNode=(type)=>setNodes(p=>[...p,mkNode(type,80-pan.x,80-pan.y)]);
  const delSel=()=>{if(!sel)return;setNodes(p=>p.filter(n=>n.id!==sel));setSel(null);};

  const onDrag=useCallback((e,id)=>{
    const node=nodes.find(n=>n.id===id);
    const sx=e.clientX-node.x,sy=e.clientY-node.y;
    const mv=(ev)=>setNodes(p=>p.map(n=>n.id===id?{...n,x:ev.clientX-sx,y:ev.clientY-sy}:n));
    const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
    window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
  },[nodes]);

  const onCanvasDown=(e)=>{
    if(e.target===canvasRef.current||e.target.classList.contains("spx-gn-canvas-inner")){
      setSel(null);
      const sx=e.clientX-pan.x,sy=e.clientY-pan.y;
      const mv=(ev)=>setPan({x:ev.clientX-sx,y:ev.clientY-sy});
      const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};
      window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);
    }
  };

  return (
    <div className="spx-gn-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Geometry Nodes</span>
        <div className="spx-gn-hdr-actions">
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(z=>Math.max(0.2,z-0.1))}>−</button>
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(1)}>1:1</button>
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(z=>Math.min(3,z+0.1))}>+</button>
          <button className="spx-nm-hdr-btn spx-nm-hdr-btn--danger" onClick={delSel} disabled={!sel}>Del</button>
          <button className="spx-nm-hdr-btn spx-nm-hdr-btn--teal" onClick={()=>onAction?.("gn_apply")}>Apply</button>
        </div>
      </div>
      <div className="spx-nm-body">
        <div className="spx-nm-canvas" ref={canvasRef} onMouseDown={onCanvasDown} onWheel={e=>{e.preventDefault();setZoom(z=>Math.max(0.2,Math.min(3,z-e.deltaY*0.001)));}}>
          <div className="spx-gn-canvas-inner" ref={el=>{if(el){el.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;el.style.transformOrigin="0 0";}}}>
            {nodes.map(n=><GNNodeCard key={n.id} node={n} selected={sel===n.id} onSelect={setSel} onDrag={onDrag}/>)}
          </div>
        </div>
        <div className="spx-nm-sidebar">
          <div className="spx-nm-sidebar-hdr">Add Node</div>
          <input className="spx-nm-search" type="text" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="spx-nm-cats">
            {CATS.map(c=><button key={c} className={`spx-nm-cat-btn${addCat===c?" spx-nm-cat-btn--active":""}`} onClick={()=>setAddCat(c)}>{c}</button>)}
          </div>
          <div className="spx-nm-node-list">
            {filtered.map(([name])=><button key={name} className="spx-nm-add-btn" onClick={()=>addNode(name)}>{name}</button>)}
          </div>
          <div className="spx-nm-presets-hdr">Presets</div>
          <div className="spx-nm-presets">
            {["Scatter on Surface","Procedural City","Wire Frame","Array Modifier","Random Placement","Voronoi Fracture","Hair System","Ivy Generator","Moss Scatter","Crystal Growth"].map(p=>(
              <button key={p} className="spx-nm-preset-btn" onClick={()=>onAction?.(`gn_preset_${p.toLowerCase().replace(/ /g,"_")}`)}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
