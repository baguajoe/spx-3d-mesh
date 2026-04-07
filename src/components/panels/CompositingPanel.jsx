import React, { useState, useRef, useCallback } from "react";

// ── Node definitions ──────────────────────────────────────────────────────────
const COMP_NODES = {
  // Input
  "Render Layers":   { cat:"Input",   col:"#333344", ins:[], outs:["Image","Depth","Normal","Diffuse","Specular","Shadow","AO","Emission"] },
  "Image":           { cat:"Input",   col:"#333344", ins:[], outs:["Image","Alpha"] },
  "Movie Clip":      { cat:"Input",   col:"#333344", ins:[], outs:["Image","Alpha"] },
  "Value":           { cat:"Input",   col:"#333344", ins:[], outs:["Value"] },
  "RGB":             { cat:"Input",   col:"#333344", ins:[], outs:["Color"] },
  "Time":            { cat:"Input",   col:"#333344", ins:[], outs:["Fac"] },
  "Texture":         { cat:"Input",   col:"#333344", ins:["Vector"], outs:["Color","Value"] },
  // Output
  "Composite":       { cat:"Output",  col:"#442222", ins:["Image","Alpha","Z"], outs:[] },
  "Viewer":          { cat:"Output",  col:"#442222", ins:["Image","Alpha"], outs:[] },
  "File Output":     { cat:"Output",  col:"#442222", ins:["Image"], outs:[] },
  "Split Viewer":    { cat:"Output",  col:"#442222", ins:["Image","Image"], outs:[] },
  // Color
  "Bright/Contrast": { cat:"Color",   col:"#884422", ins:["Image","Bright","Contrast"], outs:["Image"] },
  "Hue/Saturation":  { cat:"Color",   col:"#884422", ins:["Fac","Image","Hue","Saturation","Value"], outs:["Image"] },
  "Color Balance":   { cat:"Color",   col:"#884422", ins:["Fac","Image","Color Lift","Color Gamma","Color Gain"], outs:["Image"] },
  "Curves":          { cat:"Color",   col:"#884422", ins:["Fac","Image"], outs:["Image"] },
  "Exposure":        { cat:"Color",   col:"#884422", ins:["Image","Exposure"], outs:["Image"] },
  "Gamma":           { cat:"Color",   col:"#884422", ins:["Image","Gamma"], outs:["Image"] },
  "Invert":          { cat:"Color",   col:"#884422", ins:["Fac","Color"], outs:["Color"] },
  "Mix":             { cat:"Color",   col:"#884422", ins:["Fac","Image","Image"], outs:["Image"] },
  "Tone Map":        { cat:"Color",   col:"#884422", ins:["Image"], outs:["Image"] },
  // Filter
  "Blur":            { cat:"Filter",  col:"#226644", ins:["Image","Size"], outs:["Image"] },
  "Bokeh Blur":      { cat:"Filter",  col:"#226644", ins:["Image","Bokeh","Size","Bounding Box"], outs:["Image"] },
  "Vector Blur":     { cat:"Filter",  col:"#226644", ins:["Image","Z","Speed"], outs:["Image"] },
  "Directional Blur":{ cat:"Filter",  col:"#226644", ins:["Image","Center","Spin","Zoom","Samples","Use"], outs:["Image"] },
  "Glare":           { cat:"Filter",  col:"#226644", ins:["Image"], outs:["Image"] },
  "Despeckle":       { cat:"Filter",  col:"#226644", ins:["Image","Fac"], outs:["Image"] },
  "Sharpen":         { cat:"Filter",  col:"#226644", ins:["Image","Fac"], outs:["Image"] },
  "Soften":          { cat:"Filter",  col:"#226644", ins:["Image","Fac"], outs:["Image"] },
  "Median":          { cat:"Filter",  col:"#226644", ins:["Image","Size"], outs:["Image"] },
  "Laplacian":       { cat:"Filter",  col:"#226644", ins:["Image"], outs:["Image"] },
  "Sobel":           { cat:"Filter",  col:"#226644", ins:["Image"], outs:["Image"] },
  "Prewitt":         { cat:"Filter",  col:"#226644", ins:["Image"], outs:["Image"] },
  // Mask
  "Alpha Over":      { cat:"Mask",    col:"#224466", ins:["Fac","Image","Image"], outs:["Image"] },
  "Alpha Convert":   { cat:"Mask",    col:"#224466", ins:["Image"], outs:["Image"] },
  "Chroma Matte":    { cat:"Mask",    col:"#224466", ins:["Image","Key Color"], outs:["Image","Matte"] },
  "Color Matte":     { cat:"Mask",    col:"#224466", ins:["Image"], outs:["Image","Matte"] },
  "Luminance Matte": { cat:"Mask",    col:"#224466", ins:["Image"], outs:["Image","Matte"] },
  "Diff Matte":      { cat:"Mask",    col:"#224466", ins:["Image","Image"], outs:["Image","Matte"] },
  "Box Mask":        { cat:"Mask",    col:"#224466", ins:["Image","Mask Value"], outs:["Image","Mask"] },
  "Ellipse Mask":    { cat:"Mask",    col:"#224466", ins:["Image","Mask Value"], outs:["Image","Mask"] },
  // Transform
  "Crop":            { cat:"Transform",col:"#442266",ins:["Image"], outs:["Image"] },
  "Flip":            { cat:"Transform",col:"#442266",ins:["Image"], outs:["Image"] },
  "Rotate":          { cat:"Transform",col:"#442266",ins:["Image","Degr"], outs:["Image"] },
  "Scale":           { cat:"Transform",col:"#442266",ins:["Image","X","Y"], outs:["Image"] },
  "Transform":       { cat:"Transform",col:"#442266",ins:["Image","X","Y","Angle","Scale"], outs:["Image"] },
  "Translate":       { cat:"Transform",col:"#442266",ins:["Image","X","Y"], outs:["Image"] },
  "Lens Distortion": { cat:"Transform",col:"#442266",ins:["Image","Dispersion","Distortion"], outs:["Image"] },
  // Math
  "Math":            { cat:"Math",    col:"#664422", ins:["Value","Value"], outs:["Value"] },
  "Map Range":       { cat:"Math",    col:"#664422", ins:["Value","From Min","From Max","To Min","To Max"], outs:["Value"] },
  "Normalize":       { cat:"Math",    col:"#664422", ins:["Value"], outs:["Value"] },
  // Vector
  "Normal":          { cat:"Vector",  col:"#226688", ins:["Image"], outs:["Normal","Dot"] },
  "Map Value":       { cat:"Vector",  col:"#226688", ins:["Value"], outs:["Value"] },
};

const CATS = ["Input","Output","Color","Filter","Mask","Transform","Math","Vector"];
const PRESETS = [
  "Film Look","Bloom + Glare","Depth of Field","Color Grade","Green Screen","Vignette","Sharpen",
  "Cinematic B&W","HDR Tonemapping","Night Vision","Infrared","Vintage Film",
];

let cnid = 0;
const mkNode = (type, x, y) => {
  const def = COMP_NODES[type];
  return { id:++cnid, type, x, y, ins:def.ins.map((n,i)=>({id:`${cnid}-i${i}`,name:n})), outs:def.outs.map((n,i)=>({id:`${cnid}-o${i}`,name:n})) };
};

function CompNode({ node, selected, onSelect, onDrag }) {
  const def = COMP_NODES[node.type];
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

export default function CompositingPanel({ onAction }) {
  const [nodes,   setNodes]   = useState(()=>[mkNode("Render Layers",40,100),mkNode("Tone Map",280,80),mkNode("Glare",280,200),mkNode("Mix",500,140),mkNode("Composite",720,120)]);
  const [sel,     setSel]     = useState(null);
  const [addCat,  setAddCat]  = useState("Color");
  const [search,  setSearch]  = useState("");
  const [zoom,    setZoom]    = useState(1);
  const [pan,     setPan]     = useState({x:20,y:20});
  const canvasRef = useRef(null);

  const filtered = Object.entries(COMP_NODES).filter(([n,d])=>d.cat===addCat&&(!search||n.toLowerCase().includes(search.toLowerCase())));

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
        <span className="spx-panel-title">Compositor</span>
        <div className="spx-gn-hdr-actions">
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(z=>Math.max(0.2,z-0.1))}>−</button>
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(1)}>1:1</button>
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(z=>Math.min(3,z+0.1))}>+</button>
          <button className="spx-nm-hdr-btn spx-nm-hdr-btn--danger" onClick={delSel} disabled={!sel}>Del</button>
          <button className="spx-nm-hdr-btn spx-nm-hdr-btn--teal" onClick={()=>onAction?.("composite_render")}>Render</button>
        </div>
      </div>
      <div className="spx-nm-body">
        <div className="spx-nm-canvas" ref={canvasRef} onMouseDown={onCanvasDown}
          onWheel={e=>{e.preventDefault();setZoom(z=>Math.max(0.2,Math.min(3,z-e.deltaY*0.001)));}}>
          <div className="spx-gn-canvas-inner" ref={el=>{if(el){el.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;el.style.transformOrigin="0 0";}}}>
            {nodes.map(n=><CompNode key={n.id} node={n} selected={sel===n.id} onSelect={setSel} onDrag={onDrag}/>)}
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
            {PRESETS.map(p=><button key={p} className="spx-nm-preset-btn" onClick={()=>onAction?.(`comp_preset_${p.toLowerCase().replace(/ /g,"_")}`)}>{p}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
