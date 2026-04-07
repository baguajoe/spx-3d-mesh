import React, { useState } from "react";

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

const PRESETS=["fire","smoke","sparks","rain","snow","magic","dust"];

export default function ParticlePanel({ onAction }) {
  const [preset,    setPreset]    = useState("fire");
  const [emitRate,  setEmitRate]  = useState(200);
  const [lifetime,  setLifetime]  = useState(2);
  const [speed,     setSpeed]     = useState(2);
  const [size,      setSize]      = useState(0.1);
  const [turbulence,setTurbulence]= useState(0.5);
  const [gravY,     setGravY]     = useState(-9.8);
  const [windX,     setWindX]     = useState(0);
  const [windZ,     setWindZ]     = useState(0);
  const [emitShape, setEmitShape] = useState("sphere");
  const [color,     setColor]     = useState("#ff8811");
  const [colorEnd,  setColorEnd]  = useState("#ff2200");
  const [running,   setRunning]   = useState(false);
  const [systems,   setSystems]   = useState([]);

  const create=()=>{
    onAction?.("particle_create",{type:preset,params:{emitRate,lifetime,speed,size,turbulence,gravity:{x:0,y:gravY,z:0},wind:{x:windX,y:0,z:windZ},emitShape,color,colorEnd}});
    setSystems(p=>[...p,{name:`${preset}_${Date.now()%1000}`,type:preset,active:false}]);
  };

  const startAll=()=>{setRunning(true);onAction?.("particle_start_all");};
  const stopAll =()=>{setRunning(false);onAction?.("particle_stop_all");};

  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Particle System</span>
        <div className="spx-film-header-btns">
          {!running
            ?<button className="spx-panel-action-btn spx-film-apply-btn" onClick={startAll}>▶ Start All</button>
            :<button className="spx-panel-action-btn spx-film-stop-btn" onClick={stopAll}>⏹ Stop</button>
          }
        </div>
      </div>

      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--teal"><span>Preset</span></div>
        <div className="spx-film-section-body">
          <div className="spx-mc-lib-filters">
            {PRESETS.map(p=><button key={p} className={`spx-mc-lib-filter${preset===p?" spx-mc-lib-filter--active":""}`} onClick={()=>setPreset(p)}>{p}</button>)}
          </div>
        </div>
      </div>

      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--orange"><span>Emission</span></div>
        <div className="spx-film-section-body">
          <Slider label="Emit Rate" value={emitRate} min={1} max={2000} step={1} unit="/s" onChange={setEmitRate}/>
          <Slider label="Lifetime"  value={lifetime} min={0.1} max={10} step={0.1} unit="s" onChange={setLifetime}/>
          <Slider label="Speed"     value={speed}    min={0.1} max={20} step={0.1} unit="" onChange={setSpeed}/>
          <Slider label="Size"      value={size}     min={0.01} max={1} step={0.01} unit="" onChange={setSize}/>
          <div className="spx-film-row">
            <span className="spx-film-label">Shape</span>
            <select className="spx-film-select" value={emitShape} onChange={e=>setEmitShape(e.target.value)}>
              {["point","sphere","box","mesh"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--blue"><span>Forces</span></div>
        <div className="spx-film-section-body">
          <Slider label="Gravity Y"   value={gravY}     min={-20} max={5}  step={0.1} unit="" onChange={setGravY}/>
          <Slider label="Wind X"      value={windX}     min={-10} max={10} step={0.1} unit="" onChange={setWindX}/>
          <Slider label="Wind Z"      value={windZ}     min={-10} max={10} step={0.1} unit="" onChange={setWindZ}/>
          <Slider label="Turbulence"  value={turbulence}min={0}   max={5}  step={0.1} unit="" onChange={setTurbulence}/>
        </div>
      </div>

      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--yellow"><span>Color</span></div>
        <div className="spx-film-section-body">
          <div className="spx-film-row"><span className="spx-film-label">Start</span><input className="spx-film-color" type="color" value={color}    onChange={e=>setColor(e.target.value)}/></div>
          <div className="spx-film-row"><span className="spx-film-label">End</span>  <input className="spx-film-color" type="color" value={colorEnd} onChange={e=>setColorEnd(e.target.value)}/></div>
        </div>
      </div>

      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={create}>Create System</button>
        <button className="spx-film-apply-full-btn" onClick={()=>onAction?.("particle_burst",{type:preset})}>Burst</button>
        <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>onAction?.("particle_clear")}>Clear All</button>
      </div>

      {systems.length>0&&(
        <div className="spx-film-section">
          <div className="spx-film-section-hdr spx-film-section-hdr--teal"><span>Active ({systems.length})</span></div>
          <div className="spx-film-section-body">
            {systems.map((s,i)=>(
              <div key={i} className="spx-mc-lib-item">
                <span className="spx-mc-lib-name">{s.name}</span>
                <span className="spx-mc-lib-cat">{s.type}</span>
                <button className="spx-mc-lib-btn" onClick={()=>{onAction?.("particle_remove",{name:s.name});setSystems(p=>p.filter((_,j)=>j!==i));}}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
