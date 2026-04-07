import React, { useState, useRef, useCallback } from "react";

let nlaId = 0;
const mkTrack = (name) => ({ id:++nlaId, name, muted:false, solo:false, strips:[] });
const mkStrip = (name, start, end, color="#00ffc8") => ({ id:++nlaId, name, start, end, color, scale:1, repeat:1, blendIn:0.1, blendOut:0.1, influence:1, muted:false });

export default function NLAEditor({ onAction }) {
  const [tracks,  setTracks]  = useState([
    { ...mkTrack("Body Action"),   strips:[mkStrip("Walk",0,60,"#00ffc8"), mkStrip("Run",80,120,"#00ffc8")] },
    { ...mkTrack("Face Action"),   strips:[mkStrip("Smile",0,30,"#ff6600"), mkStrip("Talk",40,100,"#ff6600")] },
    { ...mkTrack("Hand Action"),   strips:[mkStrip("Wave",0,48,"#4488ff")] },
    { ...mkTrack("Camera"),        strips:[mkStrip("Shot1",0,72,"#aa44ff")] },
  ]);
  const [frame,    setFrame]   = useState(0);
  const [playing,  setPlaying] = useState(false);
  const [end,      setEnd]     = useState(250);
  const [zoom,     setZoom]    = useState(1);
  const [panX,     setPanX]    = useState(0);
  const [selected, setSelected]= useState(null);
  const rafRef = useRef(null);
  const lastRef= useRef(performance.now());
  const FPS = 24;

  // Playback
  const play = () => {
    setPlaying(true);
    lastRef.current = performance.now();
    const tick=()=>{
      const now=performance.now(),dt=(now-lastRef.current)/1000;lastRef.current=now;
      setFrame(f=>{const n=f+dt*FPS;return n>end?0:n;});
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
  };
  const pause=()=>{ setPlaying(false); if(rafRef.current)cancelAnimationFrame(rafRef.current); };

  const addTrack=()=>setTracks(p=>[...p, mkTrack(`Track ${p.length+1}`)]);

  const addStrip=(trackId)=>{
    const name=`Action_${Date.now()%1000}`;
    const colors=["#00ffc8","#ff6600","#4488ff","#aa44ff","#ffcc00","#44cc44"];
    const color=colors[Math.floor(Math.random()*colors.length)];
    setTracks(p=>p.map(t=>t.id===trackId?{...t,strips:[...t.strips,mkStrip(name,frame,frame+48,color)]}:t));
  };

  const removeStrip=(trackId,stripId)=>{
    setTracks(p=>p.map(t=>t.id===trackId?{...t,strips:t.strips.filter(s=>s.id!==stripId)}:t));
    if(selected?.stripId===stripId)setSelected(null);
  };

  const toggleMuteTrack=(id)=>setTracks(p=>p.map(t=>t.id===id?{...t,muted:!t.muted}:t));
  const toggleSoloTrack=(id)=>setTracks(p=>p.map(t=>t.id===id?{...t,solo:!t.solo}:t));
  const removeTrack=(id)=>{ setTracks(p=>p.filter(t=>t.id!==id)); };

  const pct=frame/end;
  const frameToPx=(f)=>((f/end)*100*zoom)+panX;

  const sel = selected ? tracks.flatMap(t=>t.strips.map(s=>({...s,trackId:t.id}))).find(s=>s.id===selected?.stripId) : null;

  return (
    <div className="spx-nla-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">NLA Editor</span>
        <div className="spx-nla-transport">
          <button className="spx-tl-btn" onClick={()=>setFrame(0)}>⏮</button>
          <button className={`spx-tl-btn${playing?" spx-tl-btn--playing":""}`} onClick={playing?pause:play}>{playing?"⏸":"▶"}</button>
          <button className="spx-tl-btn" onClick={()=>setFrame(end)}>⏭</button>
          <span className="spx-nla-frame">{Math.round(frame)}</span>
          <button className="spx-tl-btn" onClick={addTrack}>+ Track</button>
        </div>
      </div>

      <div className="spx-nla-main">
        {/* Track headers */}
        <div className="spx-nla-headers">
          <div className="spx-nla-ruler-spacer"/>
          {tracks.map(t=>(
            <div key={t.id} className={`spx-nla-track-hdr${t.muted?" spx-nla-track-hdr--muted":""}`}>
              <span className="spx-nla-track-name">{t.name}</span>
              <div className="spx-nla-track-btns">
                <button className={`spx-nla-track-btn${t.muted?" spx-nla-track-btn--on":""}`} onClick={()=>toggleMuteTrack(t.id)} title="Mute">M</button>
                <button className={`spx-nla-track-btn${t.solo?" spx-nla-track-btn--on":""}`} onClick={()=>toggleSoloTrack(t.id)} title="Solo">S</button>
                <button className="spx-nla-track-btn" onClick={()=>addStrip(t.id)} title="Add strip">+</button>
                <button className="spx-nla-track-btn spx-nla-track-btn--del" onClick={()=>removeTrack(t.id)} title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div className="spx-nla-timeline">
          {/* Ruler */}
          <div className="spx-nla-ruler">
            {Array.from({length:Math.ceil(end/FPS)+1},(_,i)=>i*FPS).map(f=>(
              <div key={f} className="spx-nla-ruler-tick" ref={el=>{if(el)el.style.left=frameToPx(f)+"%";}}>{Math.round(f/FPS)}s</div>
            ))}
            {/* Playhead */}
            <div className="spx-nla-playhead" ref={el=>{if(el)el.style.left=frameToPx(frame)+"%;"}}/>
          </div>

          {/* Tracks */}
          <div className="spx-nla-tracks">
            {tracks.map(t=>(
              <div key={t.id} className="spx-nla-track">
                {t.strips.map(s=>(
                  <div
                    key={s.id}
                    className={`spx-nla-strip${selected?.stripId===s.id?" spx-nla-strip--selected":""}${s.muted?" spx-nla-strip--muted":""}`}
                    ref={el=>{if(el){el.style.left=frameToPx(s.start)+"%";el.style.width=((s.end-s.start)/end*100*zoom)+"%";el.style.background=s.color;}}}
                    onClick={e=>{e.stopPropagation();setSelected({stripId:s.id,trackId:t.id});}}
                    onDoubleClick={e=>{e.stopPropagation();removeStrip(t.id,s.id);}}
                    title={`${s.name} · ${s.start}–${s.end} · Dbl-click to delete`}
                  >
                    <span className="spx-nla-strip-name">{s.name}</span>
                  </div>
                ))}
              </div>
            ))}
            {/* Playline */}
            <div className="spx-nla-playline" ref={el=>{if(el)el.style.left=frameToPx(frame)+"%;"}}/>
          </div>
        </div>
      </div>

      {/* Strip inspector */}
      {sel&&(
        <div className="spx-nla-inspector">
          <span className="spx-nla-ins-name">{sel.name}</span>
          <span className="spx-nla-ins-range">{sel.start}–{sel.end}</span>
          <div className="spx-nla-ins-row">
            <span className="spx-nla-ins-label">Influence</span>
            <input className="spx-film-range" type="range" min={0} max={1} step={0.01} value={sel.influence}
              onChange={e=>{const v=+e.target.value;setTracks(p=>p.map(t=>t.id===selected.trackId?{...t,strips:t.strips.map(s=>s.id===sel.id?{...s,influence:v}:s)}:t));}}/>
            <span className="spx-film-val">{sel.influence.toFixed(2)}</span>
          </div>
          <div className="spx-nla-ins-row">
            <span className="spx-nla-ins-label">Scale</span>
            <input className="spx-film-range" type="range" min={0.1} max={4} step={0.01} value={sel.scale}
              onChange={e=>{const v=+e.target.value;setTracks(p=>p.map(t=>t.id===selected.trackId?{...t,strips:t.strips.map(s=>s.id===sel.id?{...s,scale:v}:s)}:t));}}/>
            <span className="spx-film-val">{sel.scale.toFixed(2)}</span>
          </div>
          <div className="spx-nla-ins-row">
            <span className="spx-nla-ins-label">Repeat</span>
            <input className="spx-film-range" type="range" min={1} max={10} step={1} value={sel.repeat}
              onChange={e=>{const v=+e.target.value;setTracks(p=>p.map(t=>t.id===selected.trackId?{...t,strips:t.strips.map(s=>s.id===sel.id?{...s,repeat:v}:s)}:t));}}/>
            <span className="spx-film-val">{sel.repeat}×</span>
          </div>
          <button className="spx-tl-btn" onClick={()=>setSelected(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
