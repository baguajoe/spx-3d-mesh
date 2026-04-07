import React, { useState, useRef, useCallback, useEffect } from "react";

// ── Frame ─────────────────────────────────────────────────────────────────────
const mkFrame = (n) => ({ frameNum:n, strokes:[], visible:true });

// ── Stroke rendering ──────────────────────────────────────────────────────────
function renderFrame(ctx, frame, opacity=1) {
  if (!frame||!ctx) return;
  frame.strokes.forEach(stroke => {
    if (!stroke.points||stroke.points.length<2) return;
    ctx.globalAlpha = opacity * (stroke.opacity??1);
    ctx.strokeStyle = stroke.color||"#00ffc8";
    ctx.lineWidth   = stroke.width||2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for(let i=1;i<stroke.points.length;i++){
      const p=stroke.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

export default function GreasePencilAnimator({ onExportToScene }) {
  const canvasRef  = useRef(null);
  const [frames,   setFrames]   = useState([mkFrame(1), mkFrame(2), mkFrame(3)]);
  const [curFrame, setCurFrame] = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const [fps,      setFps]      = useState(12);
  const [tool,     setTool]     = useState("draw");
  const [color,    setColor]    = useState("#00ffc8");
  const [width,    setWidth]    = useState(2);
  const [opacity,  setOpacity]  = useState(1);
  const [onionBefore, setOnionBefore] = useState(2);
  const [onionAfter,  setOnionAfter]  = useState(1);
  const [showOnion, setShowOnion]   = useState(true);
  const drawingRef  = useRef(false);
  const strokeRef   = useRef(null);
  const rafRef      = useRef(null);
  const lastRef     = useRef(performance.now());

  // Draw current frame + onion skin
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background
    ctx.fillStyle = "#06060f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Onion before
    if (showOnion) {
      for (let i=1; i<=onionBefore; i++) {
        const fi = curFrame - i;
        if (fi >= 0) renderFrame(ctx, frames[fi], 0.15/i);
      }
    }
    // Current frame
    renderFrame(ctx, frames[curFrame], 1);
    // Onion after
    if (showOnion) {
      for (let i=1; i<=onionAfter; i++) {
        const fi = curFrame + i;
        if (fi < frames.length) renderFrame(ctx, frames[fi], 0.1/i);
      }
    }
    // Frame number
    ctx.fillStyle = "rgba(0,255,200,0.5)";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText(`Frame ${frames[curFrame]?.frameNum||curFrame+1}`, 8, 16);
  }, [frames, curFrame, showOnion, onionBefore, onionAfter]);

  useEffect(() => { redraw(); }, [redraw]);

  // Playback
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const now = performance.now(), dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setCurFrame(f => {
        const next = f + dt * fps;
        return next >= frames.length ? 0 : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, fps, frames.length]);

  const onPointerDown = useCallback((e) => {
    if (tool !== "draw" && tool !== "erase") return;
    const rect = canvasRef.current.getBoundingClientRect();
    drawingRef.current = true;
    strokeRef.current = { color, width, opacity, points:[{x:e.clientX-rect.left, y:e.clientY-rect.top}] };
  }, [tool, color, width, opacity]);

  const onPointerMove = useCallback((e) => {
    if (!drawingRef.current || !strokeRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    strokeRef.current.points.push({ x:e.clientX-rect.left, y:e.clientY-rect.top });
    redraw();
    // Draw current stroke in progress
    const ctx = canvasRef.current.getContext("2d");
    renderFrame(ctx, { strokes:[strokeRef.current] }, 1);
  }, [redraw]);

  const onPointerUp = useCallback(() => {
    if (!drawingRef.current || !strokeRef.current) return;
    drawingRef.current = false;
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (tool === "erase") {
      setFrames(p => p.map((f,i) => i!==Math.floor(curFrame) ? f : {
        ...f, strokes: f.strokes.filter(s => {
          return !s.points.some(pt => stroke.points.some(ep => Math.hypot(pt.x-ep.x,pt.y-ep.y)<10));
        })
      }));
    } else {
      setFrames(p => p.map((f,i) => i!==Math.floor(curFrame) ? f : { ...f, strokes:[...f.strokes, stroke] }));
    }
  }, [tool, curFrame]);

  const addFrame  = () => setFrames(p=>[...p, mkFrame(p.length+1)]);
  const delFrame  = () => { if(frames.length>1){setFrames(p=>p.filter((_,i)=>i!==Math.floor(curFrame)));setCurFrame(0);} };
  const dupFrame  = () => {
    const f = frames[Math.floor(curFrame)];
    const clone = { ...f, frameNum:frames.length+1, strokes:f.strokes.map(s=>({...s,points:[...s.points]})) };
    setFrames(p=>[...p,clone]);
  };
  const clearFrame = () => setFrames(p=>p.map((f,i)=>i!==Math.floor(curFrame)?f:{...f,strokes:[]}));

  const exportScene = () => {
    // Export frames as data URLs
    const canvas = canvasRef.current;
    const exports = frames.map((f,i) => {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0,0,canvas.width,canvas.height);
      renderFrame(ctx, f, 1);
      return { frame:f.frameNum, dataUrl:canvas.toDataURL("image/png") };
    });
    onExportToScene?.(exports);
    redraw();
  };

  const fr = Math.floor(curFrame);

  return (
    <div className="spx-gp-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Grease Pencil</span>
        <div className="spx-gp-transport">
          <button className="spx-tl-btn" onClick={()=>{setPlaying(false);setCurFrame(0);}}>⏮</button>
          <button className={`spx-tl-btn${playing?" spx-tl-btn--playing":""}`} onClick={()=>setPlaying(v=>!v)}>{playing?"⏸":"▶"}</button>
          <span className="spx-nla-frame">{fr+1}/{frames.length}</span>
          <select className="spx-tl-btn" value={fps} onChange={e=>setFps(+e.target.value)}>
            {[8,12,24].map(f=><option key={f} value={f}>{f}fps</option>)}
          </select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="spx-gp-toolbar">
        {[["draw","✏ Draw"],["erase","⌫ Erase"],["select","⬜ Select"]].map(([t,l])=>(
          <button key={t} className={`spx-mc-btn${tool===t?" spx-mc-btn--primary":""}`} onClick={()=>setTool(t)}>{l}</button>
        ))}
        <input className="spx-film-color" type="color" value={color} onChange={e=>setColor(e.target.value)} title="Color"/>
        <div className="spx-gp-slider-wrap">
          <span className="spx-gp-slider-label">W</span>
          <input className="spx-film-range" type="range" min={1} max={20} step={0.5} value={width} onChange={e=>setWidth(+e.target.value)}/>
          <span className="spx-film-val">{width}</span>
        </div>
        <div className="spx-gp-slider-wrap">
          <span className="spx-gp-slider-label">O</span>
          <input className="spx-film-range" type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={e=>setOpacity(+e.target.value)}/>
        </div>
        <button className={`spx-mc-btn${showOnion?" spx-mc-btn--primary":""}`} onClick={()=>setShowOnion(v=>!v)} title="Onion skin">👁 Onion</button>
      </div>

      {/* Canvas */}
      <canvas
        className="spx-gp-canvas"
        ref={canvasRef}
        width={640}
        height={360}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Frame strip */}
      <div className="spx-gp-strip">
        {frames.map((f,i)=>(
          <div
            key={i}
            className={`spx-gp-frame${i===fr?" spx-gp-frame--active":""}`}
            onClick={()=>{setPlaying(false);setCurFrame(i);}}
            title={`Frame ${f.frameNum}`}
          >
            <span className="spx-gp-frame-num">{f.frameNum}</span>
            {f.strokes.length>0&&<div className="spx-gp-frame-dot"/>}
          </div>
        ))}
        <button className="spx-gp-add-frame" onClick={addFrame} title="Add frame">+</button>
      </div>

      {/* Frame actions */}
      <div className="spx-gp-actions">
        <button className="spx-mc-btn" onClick={dupFrame}>Dup</button>
        <button className="spx-mc-btn" onClick={clearFrame}>Clear</button>
        <button className="spx-mc-btn spx-mc-btn--danger" onClick={delFrame}>Del</button>
        <button className="spx-mc-btn spx-mc-btn--primary" onClick={exportScene}>Export to Scene</button>
      </div>
    </div>
  );
}
