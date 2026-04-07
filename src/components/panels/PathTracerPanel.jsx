import React, { useState, useEffect, useRef } from "react";

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="spx-film-row">
      <span className="spx-film-label">{label}</span>
      <div className="spx-film-slider-row">
        <input className="spx-film-range" type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)}/>
        <span className="spx-film-val">{value}{unit}</span>
      </div>
    </div>
  );
}

function Section({ title, color, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-film-section">
      <button className={`spx-film-section-hdr spx-film-section-hdr--${color}`} onClick={()=>setOpen(v=>!v)}>
        <svg className={`spx-film-chevron${open?" spx-film-chevron--open":""}`} viewBox="0 0 16 16" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>{title}</span>
      </button>
      {open && <div className="spx-film-section-body">{children}</div>}
    </div>
  );
}

const PRESETS = ["preview","production","cinematic","vfx","uber"];
const SKY_PRESETS = [
  { label:"Golden Hour",    top:0xffaa44, bottom:0xff6622 },
  { label:"Overcast",       top:0xaabbcc, bottom:0x8899aa },
  { label:"Clear Day",      top:0x4488ff, bottom:0xffeedd },
  { label:"Blue Hour",      top:0x223366, bottom:0x334477 },
  { label:"Studio",         top:0x888888, bottom:0x444444 },
  { label:"Night",          top:0x050510, bottom:0x101020 },
  { label:"Sunset",         top:0xff8833, bottom:0xcc4411 },
  { label:"Neon City",      top:0x110022, bottom:0x220011 },
];

export default function PathTracerPanel({ onAction }) {
  const [enabled,       setEnabled]       = useState(false);
  const [preset,        setPreset]        = useState("cinematic");
  const [maxSamples,    setMaxSamples]    = useState(1024);
  const [bounces,       setBounces]       = useState(12);
  const [caustics,      setCaustics]      = useState(true);
  const [filterGlossy,  setFilterGlossy]  = useState(0.05);
  const [envIntensity,  setEnvIntensity]  = useState(1);
  const [envRotation,   setEnvRotation]   = useState(0);
  const [skyPreset,     setSkyPreset]     = useState("Clear Day");
  // DOF
  const [dofEnabled,    setDofEnabled]    = useState(true);
  const [focalLength,   setFocalLength]   = useState(50);
  const [aperture,      setAperture]      = useState(2.8);
  const [focusDist,     setFocusDist]     = useState(5);
  const [bokehBlades,   setBokehBlades]   = useState(8);
  // Progress
  const [progress,      setProgress]      = useState(0);
  const [rendering,     setRendering]     = useState(false);
  const [samples,       setSamples]       = useState(0);
  const progressRef = useRef(null);

  // Poll progress when rendering
  useEffect(()=>{
    if(!rendering)return;
    const iv=setInterval(()=>{
      onAction?.("pt_get_progress",(p)=>{
        if(p){setSamples(p.samples);setProgress(p.pct);if(p.done)setRendering(false);}
      });
    },200);
    return()=>clearInterval(iv);
  },[rendering,onAction]);

  const handleStart=()=>{
    setRendering(true);setProgress(0);setSamples(0);
    onAction?.("pt_start",{enabled:true,preset,maxSamples,bounces,caustics,filterGlossy,envIntensity,dof:{enabled:dofEnabled,focalLength,aperture,focusDistance:focusDist,bokehBlades}});
  };
  const handleStop=()=>{setRendering(false);onAction?.("pt_stop");};
  const handleReset=()=>{setProgress(0);setSamples(0);onAction?.("pt_reset");};

  const handlePreset=(p)=>{
    setPreset(p);
    const map={preview:{maxSamples:64,bounces:4,caustics:false,filterGlossy:0.5},production:{maxSamples:512,bounces:10,caustics:true,filterGlossy:0.1},cinematic:{maxSamples:1024,bounces:12,caustics:true,filterGlossy:0.05},vfx:{maxSamples:2048,bounces:16,caustics:true,filterGlossy:0.01},uber:{maxSamples:4096,bounces:32,caustics:true,filterGlossy:0}};
    const v=map[p];if(v){setMaxSamples(v.maxSamples);setBounces(v.bounces);setCaustics(v.caustics);setFilterGlossy(v.filterGlossy);}
  };

  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Path Tracer</span>
        <div className="spx-film-header-btns">
          {!rendering
            ? <button className="spx-panel-action-btn spx-film-apply-btn" onClick={handleStart}>▶ Render</button>
            : <button className="spx-panel-action-btn spx-film-stop-btn" onClick={handleStop}>⏹ Stop</button>
          }
        </div>
      </div>

      {/* Progress */}
      <div className="spx-pt-progress-wrap">
        <div className="spx-pt-progress-bar" ref={el=>{if(el)el.style.width=progress+"%";}}/>
        <span className="spx-pt-progress-label">
          {rendering ? `Path Tracing… ${samples}/${maxSamples} samples (${progress}%)` : progress>0 ? `Complete — ${samples} samples` : "Ready"}
        </span>
      </div>

      {/* Enable toggle */}
      <div className="spx-film-section">
        <div className="spx-film-section-body">
          <div className="spx-film-row">
            <span className="spx-film-label">Path Tracing</span>
            <input className="spx-film-check" type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);onAction?.(e.target.checked?"pt_enable":"pt_disable");}}/>
          </div>
          <div className="spx-film-row">
            <span className="spx-film-label">Preset</span>
            <select className="spx-film-select" value={preset} onChange={e=>handlePreset(e.target.value)}>
              {PRESETS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Section title="Path Trace Settings" color="teal">
        <Slider label="Max Samples" value={maxSamples} min={1} max={4096} step={1} unit="" onChange={setMaxSamples}/>
        <Slider label="Light Bounces" value={bounces} min={1} max={32} step={1} unit="" onChange={setBounces}/>
        <Slider label="Filter Glossy" value={filterGlossy} min={0} max={1} step={0.01} unit="" onChange={setFilterGlossy}/>
        <div className="spx-film-row">
          <span className="spx-film-label">Caustics</span>
          <input className="spx-film-check" type="checkbox" checked={caustics} onChange={e=>{setCaustics(e.target.checked);}}/>
        </div>
      </Section>

      <Section title="Environment" color="orange">
        <div className="spx-film-row">
          <span className="spx-film-label">Sky Preset</span>
          <select className="spx-film-select" value={skyPreset} onChange={e=>{setSkyPreset(e.target.value);const p=SKY_PRESETS.find(s=>s.label===e.target.value);if(p)onAction?.("pt_sky",p);}}>
            {SKY_PRESETS.map(s=><option key={s.label} value={s.label}>{s.label}</option>)}
          </select>
        </div>
        <Slider label="Env Intensity" value={envIntensity} min={0} max={5} step={0.1} unit="" onChange={v=>{setEnvIntensity(v);onAction?.("pt_env_intensity",{value:v});}}/>
        <Slider label="Env Rotation" value={envRotation} min={0} max={360} step={1} unit="°" onChange={v=>{setEnvRotation(v);onAction?.("pt_env_rotation",{value:v});}}/>
      </Section>

      <Section title="Physical Camera / DOF" color="blue">
        <div className="spx-film-row">
          <span className="spx-film-label">DOF</span>
          <input className="spx-film-check" type="checkbox" checked={dofEnabled} onChange={e=>setDofEnabled(e.target.checked)}/>
        </div>
        {dofEnabled && <>
          <Slider label="Focal Length" value={focalLength} min={8} max={800} step={1} unit="mm" onChange={setFocalLength}/>
          <Slider label="Aperture" value={aperture} min={1} max={22} step={0.1} unit="f/" onChange={setAperture}/>
          <Slider label="Focus Dist" value={focusDist} min={0.1} max={100} step={0.1} unit="m" onChange={setFocusDist}/>
          <Slider label="Bokeh Blades" value={bokehBlades} min={3} max={16} step={1} unit="" onChange={setBokehBlades}/>
        </>}
      </Section>

      <Section title="Render Actions" color="purple">
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={handleStart}>▶ Start Render</button>
          <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={handleReset}>↺ Reset</button>
        </div>
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("pt_upgrade_materials")}>Upgrade Scene Materials</button>
        </div>
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("pt_export_png")}>Export PNG</button>
          <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>onAction?.("pt_export_exr")}>Export EXR</button>
        </div>
      </Section>

      <Section title="Quality Guide" color="yellow" defaultOpen={false}>
        <div className="spx-pt-guide">
          <div className="spx-pt-guide-row"><span className="spx-pt-guide-preset">Preview</span><span className="spx-pt-guide-desc">64 samples · Fast · Viewport</span></div>
          <div className="spx-pt-guide-row"><span className="spx-pt-guide-preset">Production</span><span className="spx-pt-guide-desc">512 · GI + caustics</span></div>
          <div className="spx-pt-guide-row"><span className="spx-pt-guide-preset">Cinematic</span><span className="spx-pt-guide-desc">1024 · Film quality</span></div>
          <div className="spx-pt-guide-row"><span className="spx-pt-guide-preset">VFX</span><span className="spx-pt-guide-desc">2048 · Studio quality</span></div>
          <div className="spx-pt-guide-row"><span className="spx-pt-guide-preset">Uber</span><span className="spx-pt-guide-desc">4096 · Arnold-level</span></div>
        </div>
      </Section>
    </div>
  );
}
