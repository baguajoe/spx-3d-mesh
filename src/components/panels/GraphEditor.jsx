import React, { useRef, useEffect, useState, useCallback } from "react";

const W = 800, H = 300;
const PAD = 40;

// Convert time/value to canvas px
const toCanvas = (t, v, tMin, tMax, vMin, vMax) => ({
  x: PAD + ((t - tMin) / (tMax - tMin || 1)) * (W - PAD * 2),
  y: H - PAD - ((v - vMin) / (vMax - vMin || 1)) * (H - PAD * 2),
});

// Convert canvas px to time/value
const fromCanvas = (x, y, tMin, tMax, vMin, vMax) => ({
  t: tMin + ((x - PAD) / (W - PAD * 2)) * (tMax - tMin),
  v: vMin + ((H - PAD - y) / (H - PAD * 2)) * (vMax - vMin),
});

const INTERP_COLORS = {
  bezier:"#00ffc8", linear:"#ffcc00", constant:"#ff6600",
  ease_in:"#4488ff", ease_out:"#ff4488", ease_inout:"#aa44ff",
};

const CHANNEL_COLORS = ["#e44","#4e4","#44e","#e84","#4ee","#e4e","#ee4"];

export default function GraphEditor({ clips = [], activeClip, fps = 24, onKeyframeMove }) {
  const canvasRef  = useRef(null);
  const [zoom,     setZoom]     = useState(1);
  const [panT,     setPanT]     = useState(0);
  const [selKf,    setSelKf]    = useState(null); // {fcIdx, kfIdx}
  const [dragging, setDragging] = useState(false);
  const [channels, setChannels] = useState([
    { name:"Pos X", prop:"position.x", visible:true },
    { name:"Pos Y", prop:"position.y", visible:true },
    { name:"Pos Z", prop:"position.z", visible:true },
    { name:"Rot X", prop:"rotation.x", visible:false },
    { name:"Rot Y", prop:"rotation.y", visible:false },
    { name:"Rot Z", prop:"rotation.z", visible:false },
    { name:"Scale", prop:"scale.x",    visible:false },
  ]);

  // Demo keyframes for display
  const [fcData, setFcData] = useState([
    { prop:"position.x", kfs:[{t:0,v:0},{t:1,v:2},{t:2,v:1},{t:3,v:3}], interp:"bezier" },
    { prop:"position.y", kfs:[{t:0,v:0},{t:1,v:1},{t:2,v:0.5},{t:3,v:1.5}], interp:"bezier" },
    { prop:"position.z", kfs:[{t:0,v:0},{t:1,v:0},{t:2,v:1},{t:3,v:0}], interp:"linear" },
  ]);

  const tMin = 0, tMax = 4, vMin = -2, vMax = 4;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#06060f";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const gridT = 0.5, gridV = 1;
    for (let t = tMin; t <= tMax; t += gridT) {
      const {x} = toCanvas(t,0,tMin,tMax,vMin,vMax);
      ctx.beginPath(); ctx.moveTo(x,PAD); ctx.lineTo(x,H-PAD); ctx.stroke();
    }
    for (let v = Math.ceil(vMin); v <= vMax; v += gridV) {
      const {y} = toCanvas(0,v,tMin,tMax,vMin,vMax);
      ctx.beginPath(); ctx.moveTo(PAD,y); ctx.lineTo(W-PAD,y); ctx.stroke();
    }

    // Zero line
    const {y:zy} = toCanvas(0,0,tMin,tMax,vMin,vMax);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.moveTo(PAD,zy); ctx.lineTo(W-PAD,zy); ctx.stroke();

    // Axes labels
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px JetBrains Mono, monospace";
    for (let t = tMin; t <= tMax; t += 1) {
      const {x} = toCanvas(t,0,tMin,tMax,vMin,vMax);
      ctx.fillText(`${t}s`, x-8, H-PAD+12);
    }
    for (let v = Math.ceil(vMin); v <= vMax; v += 1) {
      const {y} = toCanvas(0,v,tMin,tMax,vMin,vMax);
      ctx.fillText(v.toFixed(0), 4, y+3);
    }

    // FCurves
    fcData.forEach((fc, fi) => {
      if (!channels[fi]?.visible) return;
      const color = CHANNEL_COLORS[fi % CHANNEL_COLORS.length];
      const kfs = fc.kfs;
      if (kfs.length < 2) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Draw curve via many samples
      const steps = 200;
      for (let s = 0; s <= steps; s++) {
        const t = tMin + (tMax - tMin) * s / steps;
        // Simple linear interpolation between keyframes
        let v = kfs[0].v;
        for (let k = 0; k < kfs.length - 1; k++) {
          if (t >= kfs[k].t && t <= kfs[k+1].t) {
            const lt = (t - kfs[k].t) / (kfs[k+1].t - kfs[k].t || 1);
            if (fc.interp === "bezier") {
              const s2 = lt*lt*(3-2*lt);
              v = kfs[k].v + (kfs[k+1].v - kfs[k].v) * s2;
            } else if (fc.interp === "constant") {
              v = kfs[k].v;
            } else {
              v = kfs[k].v + (kfs[k+1].v - kfs[k].v) * lt;
            }
            break;
          }
          if (t > kfs[kfs.length-1].t) v = kfs[kfs.length-1].v;
        }
        const {x,y} = toCanvas(t,v,tMin,tMax,vMin,vMax);
        s===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.stroke();

      // Draw keyframes + handles
      kfs.forEach((kf, ki) => {
        const {x,y} = toCanvas(kf.t, kf.v, tMin, tMax, vMin, vMax);
        const isSel = selKf?.fcIdx===fi && selKf?.kfIdx===ki;

        // Handle lines
        if (fc.interp === "bezier" && ki > 0) {
          const hLx = x - 20, hLy = y;
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(hLx,hLy); ctx.lineTo(x,y); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath(); ctx.arc(hLx,hLy,3,0,Math.PI*2); ctx.fill();
        }
        if (fc.interp === "bezier" && ki < kfs.length-1) {
          const hRx = x + 20, hRy = y;
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(hRx,hRy); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath(); ctx.arc(hRx,hRy,3,0,Math.PI*2); ctx.fill();
        }

        // Keyframe diamond
        ctx.save();
        ctx.translate(x,y);
        ctx.rotate(Math.PI/4);
        ctx.fillStyle = isSel ? "#fff" : color;
        ctx.strokeStyle = isSel ? color : "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        const sz = isSel ? 6 : 5;
        ctx.fillRect(-sz/2,-sz/2,sz,sz);
        ctx.strokeRect(-sz/2,-sz/2,sz,sz);
        ctx.restore();
      });
    });

    // Selected keyframe info
    if (selKf) {
      const fc = fcData[selKf.fcIdx];
      const kf = fc?.kfs[selKf.kfIdx];
      if (kf) {
        ctx.fillStyle = "rgba(0,255,200,0.9)";
        ctx.font = "bold 10px JetBrains Mono, monospace";
        ctx.fillText(`${fc.prop}: t=${kf.t.toFixed(3)} v=${kf.v.toFixed(3)}`, PAD, PAD-8);
      }
    }
  }, [fcData, channels, selKf]);

  useEffect(() => { draw(); }, [draw]);

  const onCanvasClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top)  * (H / rect.height);
    // Find nearest keyframe
    let best = null, bestDist = 15;
    fcData.forEach((fc, fi) => {
      if (!channels[fi]?.visible) return;
      fc.kfs.forEach((kf, ki) => {
        const {x,y} = toCanvas(kf.t, kf.v, tMin, tMax, vMin, vMax);
        const d = Math.hypot(cx-x, cy-y);
        if (d < bestDist) { bestDist=d; best={fcIdx:fi,kfIdx:ki}; }
      });
    });
    setSelKf(best);
  }, [fcData, channels]);

  const onCanvasDblClick = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top)  * (H / rect.height);
    const {t,v} = fromCanvas(cx,cy,tMin,tMax,vMin,vMax);
    // Add keyframe to first visible channel
    const fi = channels.findIndex(c=>c.visible);
    if (fi < 0) return;
    setFcData(prev => prev.map((fc,i) => i!==fi ? fc : {
      ...fc,
      kfs: [...fc.kfs, {t:parseFloat(t.toFixed(3)),v:parseFloat(v.toFixed(3))}].sort((a,b)=>a.t-b.t)
    }));
  }, [channels]);

  return (
    <div className="spx-ge-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Graph Editor</span>
        <div className="spx-ge-hdr-actions">
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(z=>Math.max(0.5,z-0.1))}>−</button>
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(1)}>1:1</button>
          <button className="spx-nm-hdr-btn" onClick={()=>setZoom(z=>Math.min(4,z+0.1))}>+</button>
        </div>
      </div>
      <div className="spx-ge-body">
        {/* Channel list */}
        <div className="spx-ge-channels">
          {channels.map((ch,i)=>(
            <div key={ch.prop} className="spx-ge-channel">
              <div className="spx-ge-channel-dot" ref={el=>{if(el)el.style.background=CHANNEL_COLORS[i%CHANNEL_COLORS.length];}}/>
              <span className="spx-ge-channel-name">{ch.name}</span>
              <button
                className={`spx-ge-vis-btn${ch.visible?" spx-ge-vis-btn--on":""}`}
                onClick={()=>setChannels(p=>p.map((c,j)=>j===i?{...c,visible:!c.visible}:c))}
              >●</button>
            </div>
          ))}
          {selKf&&(
            <div className="spx-ge-sel-info">
              <span className="spx-ge-sel-label">Interpolation</span>
              <select className="spx-film-select" value={fcData[selKf.fcIdx]?.interp||"bezier"}
                onChange={e=>setFcData(p=>p.map((fc,i)=>i===selKf.fcIdx?{...fc,interp:e.target.value}:fc))}>
                {["bezier","linear","constant","ease_in","ease_out","ease_inout"].map(v=><option key={v} value={v}>{v}</option>)}
              </select>
              <button className="spx-tl-btn" onClick={()=>{
                setFcData(p=>p.map((fc,i)=>i!==selKf.fcIdx?fc:{...fc,kfs:fc.kfs.filter((_,j)=>j!==selKf.kfIdx)}));
                setSelKf(null);
              }}>Del KF</button>
            </div>
          )}
        </div>
        {/* Canvas */}
        <canvas
          className="spx-ge-canvas"
          ref={canvasRef}
          width={W}
          height={H}
          onClick={onCanvasClick}
          onDoubleClick={onCanvasDblClick}
          onWheel={e=>{e.preventDefault();setZoom(z=>Math.max(0.5,Math.min(4,z-e.deltaY*0.001)));}}
        />
      </div>
      <div className="spx-ge-hints">Click=select keyframe · Dbl-click=add keyframe · Scroll=zoom · [ Change interpolation in panel ]</div>
    </div>
  );
}
