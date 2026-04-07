import React, { useState, useRef, useEffect, useCallback } from "react";

// ── Stroke types ──────────────────────────────────────────────────────────────
const TOOLS = [
  { id: "draw",     label: "Draw",      key: "D", cursor: "crosshair" },
  { id: "erase",    label: "Erase",     key: "E", cursor: "cell" },
  { id: "fill",     label: "Fill",      key: "F", cursor: "crosshair" },
  { id: "select",   label: "Select",    key: "S", cursor: "default" },
  { id: "move",     label: "Move",      key: "M", cursor: "move" },
];

const LAYER_BLEND = ["Normal","Multiply","Screen","Overlay","Add","Subtract","Darken","Lighten","Color Dodge","Color Burn","Hard Light","Soft Light"];

// ── Stroke smoothing ──────────────────────────────────────────────────────────
function smooth(pts, strength=0.3) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i=1; i<pts.length-1; i++) {
    const prev=pts[i-1], cur=pts[i], next=pts[i+1];
    out.push({
      x: cur.x*(1-strength) + (prev.x+next.x)*0.5*strength,
      y: cur.y*(1-strength) + (prev.y+next.y)*0.5*strength,
      p: cur.p,
    });
  }
  out.push(pts[pts.length-1]);
  return out;
}

// ── Draw stroke on canvas ─────────────────────────────────────────────────────
function drawStroke(ctx, pts, color, size, opacity, blend) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blend==="Normal"?"source-over":blend.toLowerCase().replace(/ /g,"-");
  ctx.strokeStyle = color;
  ctx.lineCap    = "round";
  ctx.lineJoin   = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i=1; i<pts.length; i++) {
    const p = pts[i];
    ctx.lineWidth = size * (p.p || 1);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

// ── Layer ─────────────────────────────────────────────────────────────────────
let layerId = 0;
const mkLayer = (name) => ({
  id: ++layerId, name, visible: true, locked: false,
  opacity: 1, blend: "Normal",
  strokes: [], // [{pts, color, size, opacity, blend}]
});

// ── Frame ─────────────────────────────────────────────────────────────────────
let frameId = 0;
const mkFrame = (num) => ({ id: ++frameId, num, keyframe: true });

// ── SPXSketch ─────────────────────────────────────────────────────────────────
export default function SPXSketch({ onClose }) {
  const canvasRef   = useRef(null);
  const ctxRef      = useRef(null);
  const drawingRef  = useRef(false);
  const currentPts  = useRef([]);

  const [tool,      setTool]      = useState("draw");
  const [color,     setColor]     = useState("#00ffc8");
  const [size,      setSize]      = useState(4);
  const [opacity,   setOpacity]   = useState(1);
  const [blend,     setBlend]     = useState("Normal");
  const [smoothAmt, setSmoothAmt] = useState(0.3);
  const [fill,      setFill]      = useState(false);
  const [layers,    setLayers]    = useState([mkLayer("Layer 1"), mkLayer("Layer 2")]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [frames,    setFrames]    = useState([mkFrame(1)]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [playing,   setPlaying]   = useState(false);
  const [fps,       setFps]       = useState(12);
  const [onion,     setOnion]     = useState(true);
  const [zoom,      setZoom]      = useState(1);
  const [pan,       setPan]       = useState({ x:0, y:0 });
  const [canvasSize]= useState({ w:1920, h:1080 });

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = canvasSize.w;
    canvas.height = canvasSize.h;
    ctxRef.current = canvas.getContext("2d");
    redraw();
  }, []);

  // Redraw all layers
  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0,0,canvasSize.w,canvasSize.h);
    // Onion skin (prev frame ghost)
    if (onion && activeFrame > 0) {
      ctx.save(); ctx.globalAlpha=0.2;
      layers.forEach(layer => {
        if (!layer.visible) return;
        layer.strokes.forEach(s => drawStroke(ctx, s.pts, s.color, s.size, s.opacity, s.blend));
      });
      ctx.restore();
    }
    // Active frame strokes
    layers.forEach(layer => {
      if (!layer.visible) return;
      layer.strokes.forEach(s => drawStroke(ctx, s.pts, s.color, s.size, s.opacity*layer.opacity, layer.blend==="Normal"?s.blend:layer.blend));
    });
  }, [layers, onion, activeFrame, canvasSize]);

  useEffect(() => { redraw(); }, [layers, redraw]);

  // ── Pointer events ──────────────────────────────────────────────────────
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvasSize.w / rect.width;
    const scaleY = canvasSize.h / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
      p: e.pressure || 1,
    };
  };

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    if (layers[activeLayer]?.locked) return;
    drawingRef.current = true;
    const pos = getPos(e);
    currentPts.current = [pos];
    canvasRef.current?.setPointerCapture(e.pointerId);
  }, [activeLayer, layers]);

  const onPointerMove = useCallback((e) => {
    if (!drawingRef.current) return;
    const pos = getPos(e);
    currentPts.current.push(pos);
    // Live preview
    const ctx = ctxRef.current;
    if (!ctx) return;
    redraw();
    if (tool === "draw") {
      drawStroke(ctx, smooth(currentPts.current, smoothAmt), color, size, opacity, blend);
    } else if (tool === "erase") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth   = size * 4;
      ctx.lineCap     = "round";
      ctx.beginPath();
      const pts = currentPts.current;
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }
  }, [tool, color, size, opacity, blend, smoothAmt, redraw]);

  const onPointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentPts.current.length < 2) return;
    const pts    = smooth(currentPts.current, smoothAmt);
    const stroke = { pts, color, size, opacity, blend };
    if (tool === "draw") {
      setLayers(prev => prev.map((l,i) => i===activeLayer ? { ...l, strokes:[...l.strokes, stroke] } : l));
    }
    currentPts.current = [];
  }, [tool, color, size, opacity, blend, smoothAmt, activeLayer]);

  // ── Layer ops ───────────────────────────────────────────────────────────
  const addLayer    = () => setLayers(prev => [...prev, mkLayer(`Layer ${prev.length+1}`)]);
  const removeLayer = (i) => { if (layers.length===1) return; setLayers(prev=>prev.filter((_,idx)=>idx!==i)); setActiveLayer(0); };
  const toggleVisible=(i)=>setLayers(prev=>prev.map((l,idx)=>idx===i?{...l,visible:!l.visible}:l));
  const toggleLocked =(i)=>setLayers(prev=>prev.map((l,idx)=>idx===i?{...l,locked:!l.locked}:l));
  const moveLayer=(i,dir)=>{
    setLayers(prev=>{const a=[...prev];const t=a[i+dir];if(!t)return prev;a[i+dir]=a[i];a[i]=t;return a;});
    setActiveLayer(i+dir);
  };
  const clearLayer=(i)=>setLayers(prev=>prev.map((l,idx)=>idx===i?{...l,strokes:[]}:l));

  // ── Frame ops ────────────────────────────────────────────────────────────
  const addFrame   = () => setFrames(prev=>[...prev, mkFrame(prev.length+1)]);
  const removeFrame= (i)=>{ if(frames.length===1)return; setFrames(prev=>prev.filter((_,idx)=>idx!==i)); setActiveFrame(Math.max(0,activeFrame-1)); };

  // ── Undo ─────────────────────────────────────────────────────────────────
  const undo = () => setLayers(prev=>prev.map((l,i)=>i===activeLayer?{...l,strokes:l.strokes.slice(0,-1)}:l));

  // ── Export ───────────────────────────────────────────────────────────────
  const exportPNG = () => {
    const a=document.createElement("a");
    a.href=canvasRef.current.toDataURL("image/png");
    a.download="spx-sketch.png"; a.click();
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down=(e)=>{
      if(e.ctrlKey&&e.key==="z"){e.preventDefault();undo();}
      if(e.key==="d")setTool("draw");
      if(e.key==="e")setTool("erase");
      if(e.key==="s")setTool("select");
      if(e.key==="[")setSize(s=>Math.max(1,s-1));
      if(e.key==="]")setSize(s=>Math.min(200,s+1));
    };
    window.addEventListener("keydown",down);
    return()=>window.removeEventListener("keydown",down);
  },[undo]);

  const activeTool = TOOLS.find(t=>t.id===tool);

  return (
    <div className="spx-sketch">

      {/* Header */}
      <div className="spx-sketch-header">
        <span className="spx-sketch-brand">SPX Sketch</span>
        <div className="spx-sketch-header-center">
          {TOOLS.map(t=>(
            <button
              key={t.id}
              className={`spx-sketch-tool-btn${tool===t.id?" spx-sketch-tool-btn--active":""}`}
              onClick={()=>setTool(t.id)}
              title={`${t.label} (${t.key})`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="spx-sketch-header-right">
          <button className="spx-sketch-hdr-btn" onClick={undo} title="Ctrl+Z">Undo</button>
          <button className="spx-sketch-hdr-btn" onClick={exportPNG}>Export PNG</button>
          {onClose && <button className="spx-sketch-hdr-btn spx-sketch-hdr-btn--close" onClick={onClose}>✕</button>}
        </div>
      </div>

      <div className="spx-sketch-body">

        {/* Left toolbar */}
        <div className="spx-sketch-toolbar">
          <div className="spx-sketch-toolbar-section">
            <span className="spx-sketch-toolbar-label">Color</span>
            <input className="spx-sketch-color" type="color" value={color} onChange={e=>setColor(e.target.value)}/>
          </div>

          <div className="spx-sketch-toolbar-section">
            <span className="spx-sketch-toolbar-label">Size {size}px</span>
            <input className="spx-sketch-range" type="range" min={1} max={200} value={size} onChange={e=>setSize(+e.target.value)}/>
          </div>

          <div className="spx-sketch-toolbar-section">
            <span className="spx-sketch-toolbar-label">Opacity {Math.round(opacity*100)}%</span>
            <input className="spx-sketch-range" type="range" min={1} max={100} value={Math.round(opacity*100)} onChange={e=>setOpacity(+e.target.value/100)}/>
          </div>

          <div className="spx-sketch-toolbar-section">
            <span className="spx-sketch-toolbar-label">Smooth {Math.round(smoothAmt*100)}%</span>
            <input className="spx-sketch-range" type="range" min={0} max={100} value={Math.round(smoothAmt*100)} onChange={e=>setSmoothAmt(+e.target.value/100)}/>
          </div>

          <div className="spx-sketch-toolbar-section">
            <span className="spx-sketch-toolbar-label">Blend</span>
            <select className="spx-sketch-select" value={blend} onChange={e=>setBlend(e.target.value)}>
              {LAYER_BLEND.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="spx-sketch-toolbar-section">
            <span className="spx-sketch-toolbar-label">Zoom {Math.round(zoom*100)}%</span>
            <input className="spx-sketch-range" type="range" min={10} max={400} value={Math.round(zoom*100)} onChange={e=>setZoom(+e.target.value/100)}/>
          </div>

          <div className="spx-sketch-toolbar-section">
            <button className={`spx-sketch-toggle${onion?" spx-sketch-toggle--on":""}`} onClick={()=>setOnion(v=>!v)}>Onion Skin</button>
          </div>

          {/* Quick colors */}
          <div className="spx-sketch-toolbar-section">
            <span className="spx-sketch-toolbar-label">Quick Colors</span>
            <div className="spx-sketch-quick-colors">
              {["#00ffc8","#ff6600","#ffffff","#000000","#ff4444","#4488ff","#ffcc00","#44cc44","#cc44cc","#888888"].map(c=>(
                <button key={c} className={`spx-sketch-qcolor${color===c?" spx-sketch-qcolor--active":""}`} onClick={()=>setColor(c)} ref={el=>{if(el)el.style.background=c;}} />
              ))}
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="spx-sketch-canvas-wrap">
          <div className="spx-sketch-canvas-inner" ref={el=>{if(el){el.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;el.style.transformOrigin="center center";}}}>
            <canvas
              className="spx-sketch-canvas"
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              ref={el=>{canvasRef.current=el;if(el)el.style.cursor=activeTool?.cursor||"crosshair";}}
            />
          </div>
        </div>

        {/* Right - layers */}
        <div className="spx-sketch-layers">
          <div className="spx-sketch-layers-hdr">
            <span>Layers</span>
            <button className="spx-sketch-layer-add-btn" onClick={addLayer}>+</button>
          </div>
          <div className="spx-sketch-layer-list">
            {[...layers].reverse().map((layer,ri)=>{
              const i=layers.length-1-ri;
              return (
                <div key={layer.id} className={`spx-sketch-layer${i===activeLayer?" spx-sketch-layer--active":""}`} onClick={()=>setActiveLayer(i)}>
                  <button className="spx-sketch-layer-vis" onClick={e=>{e.stopPropagation();toggleVisible(i);}}>{layer.visible?"◉":"○"}</button>
                  <button className="spx-sketch-layer-lock" onClick={e=>{e.stopPropagation();toggleLocked(i);}}>{layer.locked?"🔒":"🔓"}</button>
                  <span className="spx-sketch-layer-name">{layer.name}</span>
                  <span className="spx-sketch-layer-count">{layer.strokes.length}</span>
                  <div className="spx-sketch-layer-actions">
                    <button className="spx-sketch-layer-btn" onClick={e=>{e.stopPropagation();moveLayer(i,-1);}} title="Move Up">↑</button>
                    <button className="spx-sketch-layer-btn" onClick={e=>{e.stopPropagation();moveLayer(i,1);}} title="Move Down">↓</button>
                    <button className="spx-sketch-layer-btn" onClick={e=>{e.stopPropagation();clearLayer(i);}} title="Clear">⌫</button>
                    <button className="spx-sketch-layer-btn spx-sketch-layer-btn--del" onClick={e=>{e.stopPropagation();removeLayer(i);}} title="Delete">✕</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Layer opacity */}
          <div className="spx-sketch-layer-opts">
            <span className="spx-sketch-toolbar-label">Layer Opacity</span>
            <input className="spx-sketch-range" type="range" min={0} max={100} value={Math.round((layers[activeLayer]?.opacity||1)*100)}
              onChange={e=>setLayers(prev=>prev.map((l,i)=>i===activeLayer?{...l,opacity:+e.target.value/100}:l))}/>
            <span className="spx-sketch-toolbar-label">Blend Mode</span>
            <select className="spx-sketch-select" value={layers[activeLayer]?.blend||"Normal"}
              onChange={e=>setLayers(prev=>prev.map((l,i)=>i===activeLayer?{...l,blend:e.target.value}:l))}>
              {LAYER_BLEND.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Frame timeline */}
      <div className="spx-sketch-timeline">
        <div className="spx-sketch-tl-controls">
          <button className="spx-sketch-tl-btn" onClick={()=>setActiveFrame(0)}>⏮</button>
          <button className="spx-sketch-tl-btn" onClick={()=>setActiveFrame(f=>Math.max(0,f-1))}>⏪</button>
          <button className={`spx-sketch-tl-btn${playing?" spx-sketch-tl-btn--play":""}`} onClick={()=>setPlaying(v=>!v)}>{playing?"⏸":"▶"}</button>
          <button className="spx-sketch-tl-btn" onClick={()=>setActiveFrame(f=>Math.min(frames.length-1,f+1))}>⏩</button>
          <button className="spx-sketch-tl-btn" onClick={()=>setActiveFrame(frames.length-1)}>⏭</button>
          <span className="spx-sketch-tl-frame">{activeFrame+1} / {frames.length}</span>
          <span className="spx-sketch-tl-fps">
            <select className="spx-sketch-select" value={fps} onChange={e=>setFps(+e.target.value)}>
              {[6,8,12,24,25,30].map(f=><option key={f} value={f}>{f}fps</option>)}
            </select>
          </span>
          <button className="spx-sketch-tl-btn" onClick={addFrame}>+ Frame</button>
        </div>
        <div className="spx-sketch-tl-frames">
          {frames.map((f,i)=>(
            <button
              key={f.id}
              className={`spx-sketch-tl-frame-btn${i===activeFrame?" spx-sketch-tl-frame-btn--active":""}${f.keyframe?" spx-sketch-tl-frame-btn--key":""}`}
              onClick={()=>setActiveFrame(i)}
              onDoubleClick={()=>removeFrame(i)}
              title={`Frame ${f.num}${f.keyframe?" (key)":""}`}
            >
              {f.num}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
