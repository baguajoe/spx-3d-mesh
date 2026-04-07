import React, { useState, useRef, useEffect, useCallback } from "react";
import { AnimationEngine, AnimationClip } from "../../mesh/AnimationEngine";

const DEFAULT_FPS = 24;
const DEFAULT_END = 120;

let animEng = null; // singleton per session

function getEngine() {
  if (!animEng) animEng = new AnimationEngine(null);
  return animEng;
}

export default function Timeline({ targets = [], onTimeChange }) {
  const [frame,    setFrame]    = useState(0);
  const [start,    setStart]    = useState(0);
  const [end,      setEnd]      = useState(DEFAULT_END);
  const [fps,      setFps]      = useState(DEFAULT_FPS);
  const [playing,  setPlaying]  = useState(false);
  const [loop,     setLoop]     = useState(true);
  const [clips,    setClips]    = useState(["Main"]);
  const [activeClip, setActiveClip] = useState("Main");
  const [zoom,     setZoom]     = useState(1);
  const [panOffset,setPanOffset]= useState(0);
  const [channels, setChannels] = useState([
    { name:"Location X", prop:"position.x", color:"#e44", keyframes:[] },
    { name:"Location Y", prop:"position.y", color:"#4e4", keyframes:[] },
    { name:"Location Z", prop:"position.z", color:"#44e", keyframes:[] },
    { name:"Rotation X", prop:"rotation.x", color:"#e88", keyframes:[] },
    { name:"Rotation Y", prop:"rotation.y", color:"#8e8", keyframes:[] },
    { name:"Rotation Z", prop:"rotation.z", color:"#88e", keyframes:[] },
    { name:"Scale",      prop:"scale.x",    color:"#ee4", keyframes:[] },
  ]);
  const [selectedKf, setSelectedKf] = useState(null);
  const rafRef     = useRef(null);
  const lastRef    = useRef(performance.now());
  const scrubRef   = useRef(null);
  const eng        = getEngine();

  // ── Init animation engine ─────────────────────────────────────────────────
  useEffect(() => {
    eng.fps = fps;
    if (!eng.clips.has("Main")) {
      const clip = eng.createClip("Main", DEFAULT_END / DEFAULT_FPS);
      clip.fps = DEFAULT_FPS;
    }
  }, []);

  // ── Playback loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now  = performance.now();
      const dt   = (now - lastRef.current) / 1000;
      lastRef.current = now;
      if (playing) {
        setFrame(f => {
          let next = f + dt * fps;
          if (next > end) { if (loop) next = start; else { next = end; setPlaying(false); } }
          const time = next / fps;
          eng.setTime(time);
          onTimeChange?.(time, Math.round(next));
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, fps, start, end, loop]);

  // ── Insert keyframe at current frame ─────────────────────────────────────
  const insertKeyframe = useCallback(() => {
    const time = frame / fps;
    const clip = eng.clips.get(activeClip);
    if (!clip) return;
    setChannels(prev => prev.map(ch => {
      const existing = ch.keyframes.find(k => Math.abs(k.frame - frame) < 0.5);
      if (existing) return ch;
      // Get current value from targets
      let val = 0;
      if (targets.length > 0) {
        const t = targets[0];
        const parts = ch.prop.split(".");
        if (parts.length === 2) val = t[parts[0]]?.[parts[1]] ?? 0;
      }
      let fc = clip.fcurves.find(f => f.property === ch.prop);
      if (!fc) fc = clip.addFCurve(ch.prop, targets[0] || null);
      fc.addKeyframe(time, val);
      return { ...ch, keyframes: [...ch.keyframes, { frame: Math.round(frame), time, value: val }] };
    }));
  }, [frame, fps, activeClip, targets, eng]);

  // ── Delete keyframe ───────────────────────────────────────────────────────
  const deleteKeyframe = useCallback((chanIdx, kfFrame) => {
    setChannels(prev => prev.map((ch, i) => {
      if (i !== chanIdx) return ch;
      const time = kfFrame / fps;
      const clip = eng.clips.get(activeClip);
      if (clip) {
        const fc = clip.fcurves.find(f => f.property === ch.prop);
        fc?.removeKeyframe(time);
      }
      return { ...ch, keyframes: ch.keyframes.filter(k => k.frame !== kfFrame) };
    }));
  }, [fps, activeClip, eng]);

  // ── Scrubber drag ─────────────────────────────────────────────────────────
  const onScrubberDown = useCallback((e) => {
    const rect = scrubRef.current?.getBoundingClientRect();
    if (!rect) return;
    const setFromMouse = (clientX) => {
      const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const f = Math.round(start + t * (end - start));
      setFrame(f);
      const time = f / fps;
      eng.setTime(time);
      onTimeChange?.(time, f);
    };
    setFromMouse(e.clientX);
    const mv = (ev) => setFromMouse(ev.clientX);
    const up = () => { window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
    window.addEventListener("mousemove",mv);
    window.addEventListener("mouseup",up);
  }, [start, end, fps, eng, onTimeChange]);

  // ── Add clip ──────────────────────────────────────────────────────────────
  const addClip = () => {
    const name = `Clip_${clips.length+1}`;
    eng.createClip(name, end/fps);
    setClips(prev=>[...prev,name]);
    setActiveClip(name);
  };

  const totalFrames = end - start;
  const pct = totalFrames > 0 ? (frame - start) / totalFrames : 0;
  const framePx = (f) => ((f - start) / totalFrames) * 100;

  const INTERP_COLORS = { linear:"#888", bezier:"#0f8", constant:"#f80", ease_in:"#88f", ease_out:"#f88" };

  return (
    <div className="spx-tl-panel">

      {/* Top bar */}
      <div className="spx-tl-topbar">
        {/* Transport */}
        <div className="spx-tl-transport">
          <button className="spx-tl-btn" onClick={()=>{setFrame(start);eng.setTime(start/fps);}}>⏮</button>
          <button className="spx-tl-btn" onClick={()=>{setFrame(f=>Math.max(start,f-1));}} >⏪</button>
          <button className={`spx-tl-btn spx-tl-btn--play${playing?" spx-tl-btn--playing":""}`} onClick={()=>setPlaying(p=>!p)}>{playing?"⏸":"▶"}</button>
          <button className="spx-tl-btn" onClick={()=>{setFrame(f=>Math.min(end,f+1));}}>⏩</button>
          <button className="spx-tl-btn" onClick={()=>{setFrame(end);eng.setTime(end/fps);}}>⏭</button>
          <button className={`spx-tl-btn${loop?" spx-tl-btn--active":""}`} onClick={()=>setLoop(v=>!v)}>⟳</button>
        </div>

        {/* Frame counter */}
        <div className="spx-tl-frame-info">
          <span className="spx-tl-frame-label">Frame</span>
          <input className="spx-tl-frame-input" type="number" value={Math.round(frame)} min={start} max={end} onChange={e=>{const f=+e.target.value;setFrame(f);eng.setTime(f/fps);}}/>
          <span className="spx-tl-frame-label">/ {end}</span>
        </div>

        {/* Range */}
        <div className="spx-tl-range">
          <span className="spx-tl-frame-label">Start</span>
          <input className="spx-tl-frame-input" type="number" value={start} onChange={e=>setStart(+e.target.value)}/>
          <span className="spx-tl-frame-label">End</span>
          <input className="spx-tl-frame-input" type="number" value={end} onChange={e=>setEnd(+e.target.value)}/>
        </div>

        {/* FPS */}
        <select className="spx-tl-select" value={fps} onChange={e=>{setFps(+e.target.value);eng.fps=+e.target.value;}}>
          {[12,16,24,25,30,48,60,120].map(f=><option key={f} value={f}>{f}fps</option>)}
        </select>

        {/* Clip */}
        <select className="spx-tl-select" value={activeClip} onChange={e=>setActiveClip(e.target.value)}>
          {clips.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <button className="spx-tl-btn" onClick={addClip} title="New clip">+</button>

        {/* Keyframe actions */}
        <button className="spx-tl-btn spx-tl-btn--kf" onClick={insertKeyframe} title="Insert keyframe (I)">⬦ Key</button>
      </div>

      {/* Main area */}
      <div className="spx-tl-main">

        {/* Channel names */}
        <div className="spx-tl-channels">
          {channels.map((ch,i)=>(
            <div key={ch.prop} className="spx-tl-channel">
              <div className="spx-tl-channel-dot" ref={el=>{if(el)el.style.background=ch.color;}}/>
              <span className="spx-tl-channel-name">{ch.name}</span>
              <span className="spx-tl-channel-kf-count">{ch.keyframes.length}</span>
            </div>
          ))}
        </div>

        {/* Dope sheet */}
        <div className="spx-tl-dope">
          {/* Scrubber */}
          <div className="spx-tl-scrubber-track" ref={scrubRef} onMouseDown={onScrubberDown}>
            {/* Frame ticks */}
            {Array.from({length:Math.ceil(totalFrames/fps)+1},(_,i)=>i*fps).map(f=>(
              <div key={f} className="spx-tl-ruler-tick" ref={el=>{if(el)el.style.left=framePx(start+f)+"%";}}>
                <span className="spx-tl-ruler-label">{start+f}</span>
              </div>
            ))}
            {/* Playhead */}
            <div className="spx-tl-playhead" ref={el=>{if(el)el.style.left=pct*100+"%";}}/>
          </div>

          {/* Keyframe rows */}
          <div className="spx-tl-kf-rows">
            {channels.map((ch,ci)=>(
              <div key={ch.prop} className="spx-tl-kf-row">
                {ch.keyframes.map(kf=>(
                  <div
                    key={kf.frame}
                    className={`spx-tl-kf${selectedKf?.frame===kf.frame&&selectedKf?.chan===ci?" spx-tl-kf--selected":""}`}
                    ref={el=>{if(el){el.style.left=framePx(kf.frame)+"%";el.style.borderColor=ch.color;}}}
                    onClick={e=>{e.stopPropagation();setSelectedKf({frame:kf.frame,chan:ci});}}
                    onDoubleClick={e=>{e.stopPropagation();deleteKeyframe(ci,kf.frame);}}
                    title={`Frame ${kf.frame}: ${kf.value?.toFixed?.(3)??kf.value}\nDbl-click to delete`}
                  />
                ))}
              </div>
            ))}
            {/* Playline */}
            <div className="spx-tl-playline" ref={el=>{if(el)el.style.left=pct*100+"%";}}/>
          </div>
        </div>
      </div>

      {/* Selected keyframe inspector */}
      {selectedKf && (
        <div className="spx-tl-kf-inspector">
          <span className="spx-tl-kf-ins-label">{channels[selectedKf.chan]?.name} · Frame {selectedKf.frame}</span>
          <select className="spx-tl-select" onChange={e=>{
            const clip=eng.clips.get(activeClip);
            const fc=clip?.fcurves.find(f=>f.property===channels[selectedKf.chan]?.prop);
            const kf=fc?.keyframes.find(k=>Math.abs(k.time-selectedKf.frame/fps)<0.01);
            if(kf)kf.interpolation=e.target.value;
          }}>
            {["bezier","linear","constant","ease_in","ease_out"].map(i=><option key={i} value={i}>{i}</option>)}
          </select>
          <button className="spx-tl-btn" onClick={()=>{deleteKeyframe(selectedKf.chan,selectedKf.frame);setSelectedKf(null);}}>Delete</button>
          <button className="spx-tl-btn" onClick={()=>setSelectedKf(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
