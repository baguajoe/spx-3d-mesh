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

function Section({ title, color, children }) {
  const [open, setOpen] = useState(true);
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

// ── Skin tab ──────────────────────────────────────────────────────────────────
function SkinTab({ onApply }) {
  const [fitzpatrick,  setFitzpatrick]  = useState(2);
  const [sssStrength,  setSssStrength]  = useState(0.8);
  const [sssRadius,    setSssRadius]    = useState(0.5);
  const [roughness,    setRoughness]    = useState(0.4);
  const [specular,     setSpecular]     = useState(0.3);
  const [skinColor,    setSkinColor]    = useState("#f0c8a0");
  const [deepColor,    setDeepColor]    = useState("#c06060");
  const FITZPATRICK = ["I — Very Light","II — Light","III — Medium Light","IV — Medium","V — Medium Dark","VI — Dark"];
  return (
    <div>
      <Section title="Fitzpatrick Scale" color="teal">
        <div className="spx-film-row">
          <span className="spx-film-label">Scale</span>
          <select className="spx-film-select" value={fitzpatrick} onChange={e=>setFitzpatrick(+e.target.value)}>
            {FITZPATRICK.map((f,i)=><option key={i} value={i+1}>{f}</option>)}
          </select>
        </div>
        <div className="spx-film-row">
          <span className="spx-film-label">Skin Color</span>
          <input className="spx-film-color" type="color" value={skinColor} onChange={e=>setSkinColor(e.target.value)}/>
        </div>
        <div className="spx-film-row">
          <span className="spx-film-label">Deep Color</span>
          <input className="spx-film-color" type="color" value={deepColor} onChange={e=>setDeepColor(e.target.value)}/>
        </div>
      </Section>
      <Section title="Subsurface Scattering" color="orange">
        <Slider label="SSS Strength" value={sssStrength} min={0} max={1} step={0.01} unit="" onChange={setSssStrength}/>
        <Slider label="SSS Radius" value={sssRadius} min={0} max={2} step={0.01} unit="" onChange={setSssRadius}/>
        <Slider label="Roughness" value={roughness} min={0} max={1} step={0.01} unit="" onChange={setRoughness}/>
        <Slider label="Specular" value={specular} min={0} max={1} step={0.01} unit="" onChange={setSpecular}/>
      </Section>
      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={()=>onApply("skin",{fitzpatrick,sssStrength,sssRadius,roughness,specular,skinColor,deepColor})}>Apply SSS Skin</button>
      </div>
    </div>
  );
}

// ── Hair tab ──────────────────────────────────────────────────────────────────
function HairTab({ onApply }) {
  const [count,     setCount]     = useState(5000);
  const [length,    setLength]    = useState(0.15);
  const [segments,  setSegments]  = useState(6);
  const [curl,      setCurl]      = useState(0.2);
  const [gravity,   setGravity]   = useState(0.3);
  const [spread,    setSpread]    = useState(0.02);
  const [roughness, setRoughness] = useState(0.3);
  const [rootColor, setRootColor] = useState("#3a2010");
  const [tipColor,  setTipColor]  = useState("#6a4020");
  const TYPES = ["straight","wavy","curly","coily","locs","braids","afro"];
  const [hairType, setHairType] = useState("straight");
  return (
    <div>
      <Section title="Hair Type" color="teal">
        <div className="spx-film-row"><span className="spx-film-label">Type</span>
          <select className="spx-film-select" value={hairType} onChange={e=>setHairType(e.target.value)}>
            {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="spx-film-row"><span className="spx-film-label">Root</span><input className="spx-film-color" type="color" value={rootColor} onChange={e=>setRootColor(e.target.value)}/></div>
        <div className="spx-film-row"><span className="spx-film-label">Tip</span><input className="spx-film-color" type="color" value={tipColor} onChange={e=>setTipColor(e.target.value)}/></div>
      </Section>
      <Section title="Strand Settings" color="orange">
        <Slider label="Strand Count" value={count} min={100} max={50000} step={100} unit="" onChange={setCount}/>
        <Slider label="Length" value={length} min={0.01} max={1} step={0.01} unit="m" onChange={setLength}/>
        <Slider label="Segments" value={segments} min={2} max={12} step={1} unit="" onChange={setSegments}/>
        <Slider label="Curl" value={curl} min={0} max={2} step={0.01} unit="" onChange={setCurl}/>
        <Slider label="Gravity" value={gravity} min={0} max={1} step={0.01} unit="" onChange={setGravity}/>
        <Slider label="Spread" value={spread} min={0} max={0.1} step={0.001} unit="" onChange={setSpread}/>
        <Slider label="Roughness" value={roughness} min={0} max={1} step={0.01} unit="" onChange={setRoughness}/>
      </Section>
      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={()=>onApply("hair",{count,length,segments,curl,gravity,spread,roughness,hairColor:rootColor,hairColorTip:tipColor,hairType})}>Generate Hair</button>
        <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>onApply("hair_remove",{})}>Remove Hair</button>
      </div>
    </div>
  );
}

// ── PBR Materials tab ─────────────────────────────────────────────────────────
function PBRTab({ onApply }) {
  const [matType,   setMatType]   = useState("film_pbr");
  const [color,     setColor]     = useState("#cccccc");
  const [roughness, setRoughness] = useState(0.5);
  const [metalness, setMetalness] = useState(0);
  const [clearcoat, setClearcoat] = useState(0);
  const [sheen,     setSheen]     = useState(0);
  const [transmission,setTrans]   = useState(0);
  const [ior,       setIor]       = useState(1.5);
  const [emissive,  setEmissive]  = useState("#000000");
  const [emissiveInt,setEmissiveInt]=useState(0);
  const MAT_TYPES = ["film_pbr","glass","car_paint","cloth","metal","skin_prebuilt"];
  return (
    <div>
      <Section title="Material Type" color="teal">
        <div className="spx-film-row"><span className="spx-film-label">Type</span>
          <select className="spx-film-select" value={matType} onChange={e=>setMatType(e.target.value)}>
            {MAT_TYPES.map(t=><option key={t} value={t}>{t.replace("_"," ")}</option>)}
          </select>
        </div>
        <div className="spx-film-row"><span className="spx-film-label">Base Color</span><input className="spx-film-color" type="color" value={color} onChange={e=>setColor(e.target.value)}/></div>
      </Section>
      <Section title="PBR Properties" color="orange">
        <Slider label="Roughness" value={roughness} min={0} max={1} step={0.01} unit="" onChange={setRoughness}/>
        <Slider label="Metalness" value={metalness} min={0} max={1} step={0.01} unit="" onChange={setMetalness}/>
        <Slider label="Clearcoat" value={clearcoat} min={0} max={1} step={0.01} unit="" onChange={setClearcoat}/>
        <Slider label="Sheen" value={sheen} min={0} max={1} step={0.01} unit="" onChange={setSheen}/>
        <Slider label="Transmission" value={transmission} min={0} max={1} step={0.01} unit="" onChange={setTrans}/>
        <Slider label="IOR" value={ior} min={1} max={3} step={0.01} unit="" onChange={setIor}/>
      </Section>
      <Section title="Emission" color="yellow" >
        <div className="spx-film-row"><span className="spx-film-label">Emissive</span><input className="spx-film-color" type="color" value={emissive} onChange={e=>setEmissive(e.target.value)}/></div>
        <Slider label="Intensity" value={emissiveInt} min={0} max={20} step={0.1} unit="" onChange={setEmissiveInt}/>
      </Section>
      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={()=>onApply("pbr",{matType,color,roughness,metalness,clearcoat,sheen,transmission,ior,emissive,emissiveIntensity:emissiveInt})}>Apply Material</button>
      </div>
    </div>
  );
}

// ── Volume tab ────────────────────────────────────────────────────────────────
function VolumeTab({ onApply }) {
  const [fogDensity, setFogDensity] = useState(0.02);
  const [fogHeight,  setFogHeight]  = useState(0.1);
  const [scattering, setScattering] = useState(0.5);
  const [fogColor,   setFogColor]   = useState("#ccddee");
  const [volSize,    setVolSize]    = useState(50);
  return (
    <div>
      <Section title="Atmospheric Volume" color="blue">
        <div className="spx-film-row"><span className="spx-film-label">Fog Color</span><input className="spx-film-color" type="color" value={fogColor} onChange={e=>setFogColor(e.target.value)}/></div>
        <Slider label="Density" value={fogDensity} min={0} max={0.2} step={0.001} unit="" onChange={setFogDensity}/>
        <Slider label="Height Fade" value={fogHeight} min={0} max={1} step={0.01} unit="" onChange={setFogHeight}/>
        <Slider label="Scattering" value={scattering} min={0} max={1} step={0.01} unit="" onChange={setScattering}/>
        <Slider label="Volume Size" value={volSize} min={10} max={500} step={10} unit="m" onChange={setVolSize}/>
      </Section>
      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={()=>onApply("fog",{fogDensity,fogHeight,scattering,fogColor,size:volSize})}>Add Atmosphere</button>
        <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>onApply("fog_remove",{})}>Remove</button>
      </div>
    </div>
  );
}

// ── LOD + Instancing tab ──────────────────────────────────────────────────────
function PerformanceTab({ onApply }) {
  const [lodLevels,  setLodLevels]  = useState(3);
  const [instType,   setInstType]   = useState("tree");
  const [instCount,  setInstCount]  = useState(1000);
  const [instSpread, setInstSpread] = useState(30);
  return (
    <div>
      <Section title="LOD System" color="teal">
        <Slider label="LOD Levels" value={lodLevels} min={1} max={5} step={1} unit="" onChange={setLodLevels}/>
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={()=>onApply("lod",{levels:lodLevels})}>Apply LOD to Selected</button>
        </div>
      </Section>
      <Section title="GPU Instancing" color="orange">
        <div className="spx-film-row"><span className="spx-film-label">Type</span>
          <select className="spx-film-select" value={instType} onChange={e=>setInstType(e.target.value)}>
            {["tree","bush","grass","rock","building","crowd"].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Slider label="Count" value={instCount} min={10} max={100000} step={10} unit="" onChange={setInstCount}/>
        <Slider label="Spread" value={instSpread} min={5} max={500} step={5} unit="m" onChange={setInstSpread}/>
        <div className="spx-film-apply-row">
          <button className="spx-film-apply-full-btn" onClick={()=>onApply("instanced_foliage",{type:instType,count:instCount,spread:instSpread})}>Generate Instanced</button>
          <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={()=>onApply("instanced_clear",{type:instType})}>Clear</button>
        </div>
      </Section>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
const TABS = [
  { id:"skin",  label:"Skin SSS" },
  { id:"hair",  label:"Hair/Fur" },
  { id:"pbr",   label:"Film PBR" },
  { id:"volume",label:"Volume"   },
  { id:"perf",  label:"GPU Perf" },
];

export default function FilmMaterialsPanel({ onAction }) {
  const [activeTab, setActiveTab] = useState("skin");
  const handleApply = (type, params) => onAction?.(`filmmat_${type}`, params);
  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Film Materials</span>
      </div>
      <div className="spx-gen-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`spx-gen-tab${activeTab===t.id?" spx-gen-tab--active":""}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="spx-film-panel">
        {activeTab==="skin"   && <SkinTab onApply={handleApply}/>}
        {activeTab==="hair"   && <HairTab onApply={handleApply}/>}
        {activeTab==="pbr"    && <PBRTab  onApply={handleApply}/>}
        {activeTab==="volume" && <VolumeTab onApply={handleApply}/>}
        {activeTab==="perf"   && <PerformanceTab onApply={handleApply}/>}
      </div>
    </div>
  );
}
