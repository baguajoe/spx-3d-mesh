import React, { useState, useRef } from "react";
import { ProceduralEngine, generateTerrain, generateCity, generateFoliage, generateCrowd, generateVehicle } from "../../mesh/ProceduralEngine";

// ── singleton engine ref ──────────────────────────────────────────────────────
let _procEng = null;
function getProcEng(scene) {
  if (!_procEng && scene) _procEng = new ProceduralEngine(scene);
  return _procEng;
}

function Slider({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="spx-gen-row">
      <span className="spx-gen-label">{label}</span>
      <div className="spx-gen-slider-row">
        <input className="spx-gen-range" type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)}/>
        <span className="spx-gen-val">{value}{unit}</span>
      </div>
    </div>
  );
}

// ── Terrain ───────────────────────────────────────────────────────────────────
function TerrainTab({ onGenerate }) {
  const [type,       setType]       = useState("mountains");
  const [resolution, setResolution] = useState(64);
  const [scale,      setScale]      = useState(20);
  const [roughness,  setRoughness]  = useState(0.5);
  const [erosion,    setErosion]    = useState(0.3);
  const [seaLevel,   setSeaLevel]   = useState(0.2);
  const TYPES = ["mountains","plains","desert","canyon","volcanic","coastal","island","arctic","crater"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr spx-gen-section-hdr--teal">Terrain Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={type} onChange={e=>setType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Slider label="Resolution" value={resolution} min={16} max={256} step={16} unit="" onChange={setResolution}/>
      <Slider label="Scale" value={scale} min={5} max={100} step={1} unit="m" onChange={setScale}/>
      <Slider label="Roughness" value={roughness} min={0} max={1} step={0.01} unit="" onChange={setRoughness}/>
      <Slider label="Erosion" value={erosion} min={0} max={1} step={0.01} unit="" onChange={setErosion}/>
      <Slider label="Sea Level" value={seaLevel} min={0} max={0.5} step={0.01} unit="" onChange={setSeaLevel}/>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn spx-gen-action-btn--teal" onClick={()=>onGenerate("terrain",{type,resolution,scale,roughness,erosion,seaLevel})}>Generate Terrain</button>
        <button className="spx-gen-action-btn" onClick={()=>onGenerate("terrain",{type,resolution:Math.floor(Math.random()*64)+16,scale,roughness:Math.random(),erosion:Math.random()*0.5,seaLevel:Math.random()*0.3})}>Randomize</button>
      </div>
    </div>
  );
}

// ── City ──────────────────────────────────────────────────────────────────────
function CityTab({ onGenerate }) {
  const [blocks,    setBlocks]    = useState(6);
  const [density,   setDensity]   = useState(0.7);
  const [variation, setVariation] = useState(0.5);
  const [roads,     setRoads]     = useState(true);
  const [style,     setStyle]     = useState("modern");
  const STYLES = ["modern","medieval","cyberpunk","post_apocalyptic","futuristic","suburban","industrial"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr spx-gen-section-hdr--orange">City Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Style</span>
        <select className="spx-gen-select" value={style} onChange={e=>setStyle(e.target.value)}>
          {STYLES.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
      </div>
      <Slider label="Blocks" value={blocks} min={2} max={16} step={1} unit="" onChange={setBlocks}/>
      <Slider label="Density" value={density} min={0.1} max={1} step={0.05} unit="" onChange={setDensity}/>
      <Slider label="Variation" value={variation} min={0} max={1} step={0.05} unit="" onChange={setVariation}/>
      <div className="spx-gen-row"><span className="spx-gen-label">Roads</span>
        <input className="spx-gen-check" type="checkbox" checked={roads} onChange={e=>setRoads(e.target.checked)}/>
      </div>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn spx-gen-action-btn--teal" onClick={()=>onGenerate("city",{blocks,density,variation,roads,style})}>Generate City</button>
        <button className="spx-gen-action-btn" onClick={()=>onGenerate("city",{blocks:Math.floor(Math.random()*8)+2,density:0.3+Math.random()*0.7,variation:Math.random(),roads,style})}>Randomize</button>
      </div>
    </div>
  );
}

// ── Foliage ───────────────────────────────────────────────────────────────────
function FoliageTab({ onGenerate }) {
  const [type,      setType]      = useState("tree");
  const [count,     setCount]     = useState(20);
  const [spread,    setSpread]    = useState(10);
  const [scale,     setScale]     = useState(1);
  const [variation, setVariation] = useState(0.4);
  const TYPES = ["tree","bush","grass","flower","fern","cactus","mushroom"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr spx-gen-section-hdr--green">Foliage Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={type} onChange={e=>setType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Slider label="Count" value={count} min={1} max={500} step={1} unit="" onChange={setCount}/>
      <Slider label="Spread" value={spread} min={1} max={100} step={1} unit="m" onChange={setSpread}/>
      <Slider label="Scale" value={scale} min={0.1} max={5} step={0.1} unit="x" onChange={setScale}/>
      <Slider label="Variation" value={variation} min={0} max={1} step={0.05} unit="" onChange={setVariation}/>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn spx-gen-action-btn--teal" onClick={()=>onGenerate("foliage",{type,count,spread,scale,variation})}>Generate Foliage</button>
        <button className="spx-gen-action-btn" onClick={()=>onGenerate("foliage",{type,count,spread,scale:0.5+Math.random()*2,variation:Math.random()})}>Randomize</button>
      </div>
    </div>
  );
}

// ── Crowd ─────────────────────────────────────────────────────────────────────
function CrowdTab({ onGenerate }) {
  const [count,     setCount]     = useState(20);
  const [spread,    setSpread]    = useState(10);
  const [diversity, setDiversity] = useState(0.8);
  const [spacing,   setSpacing]   = useState(2);
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr spx-gen-section-hdr--purple">Crowd Generator</div>
      <Slider label="Count" value={count} min={1} max={200} step={1} unit="" onChange={setCount}/>
      <Slider label="Spread" value={spread} min={1} max={50} step={1} unit="m" onChange={setSpread}/>
      <Slider label="Diversity" value={diversity} min={0} max={1} step={0.05} unit="" onChange={setDiversity}/>
      <Slider label="Spacing" value={spacing} min={0.5} max={5} step={0.1} unit="m" onChange={setSpacing}/>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn spx-gen-action-btn--teal" onClick={()=>onGenerate("crowd",{count,spread,diversity,spacing})}>Generate Crowd</button>
        <button className="spx-gen-action-btn" onClick={()=>onGenerate("crowd",{count:Math.floor(Math.random()*50)+5,spread,diversity:Math.random(),spacing})}>Randomize</button>
      </div>
    </div>
  );
}

// ── Vehicle ───────────────────────────────────────────────────────────────────
function VehicleTab({ onGenerate }) {
  const [type,   setType]   = useState("car");
  const [style,  setStyle]  = useState("modern");
  const [damage, setDamage] = useState(0);
  const TYPES  = ["car","truck","motorcycle","bus","van","aircraft","boat","tank"];
  const STYLES = ["modern","1950s","futuristic","scifi","post-apocalyptic"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr spx-gen-section-hdr--yellow">Vehicle Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={type} onChange={e=>setType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Style</span>
        <select className="spx-gen-select" value={style} onChange={e=>setStyle(e.target.value)}>
          {STYLES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Slider label="Damage" value={damage} min={0} max={1} step={0.05} unit="" onChange={setDamage}/>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn spx-gen-action-btn--teal" onClick={()=>onGenerate("vehicle",{type,style,damage})}>Generate Vehicle</button>
        <button className="spx-gen-action-btn" onClick={()=>onGenerate("vehicle",{type,style,damage:Math.random()})}>Randomize</button>
      </div>
    </div>
  );
}

// ── 3D to 2D ──────────────────────────────────────────────────────────────────
function Convert3DTab({ onAction }) {
  const [style,      setStyle]      = useState("toon");
  const [lineWeight, setLineWeight] = useState(2);
  const [shadows,    setShadows]    = useState(true);
  const [hatching,   setHatching]   = useState(false);
  const [color,      setColor]      = useState(true);
  const [resolution, setResolution] = useState("1920x1080");
  const STYLES = ["toon","ink","sketch","watercolor","oil","pixel","flat","isometric","blueprint","xray"];
  return (
    <div className="spx-gen-section spx-gen-section--highlight">
      <div className="spx-gen-section-hdr spx-gen-section-hdr--teal">3D → 2D Converter</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Style</span>
        <select className="spx-gen-select" value={style} onChange={e=>setStyle(e.target.value)}>
          {STYLES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Resolution</span>
        <select className="spx-gen-select" value={resolution} onChange={e=>setResolution(e.target.value)}>
          {["1280x720","1920x1080","2560x1440","3840x2160","4096x4096"].map(r=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <Slider label="Line Weight" value={lineWeight} min={0.5} max={10} step={0.5} unit="px" onChange={setLineWeight}/>
      <div className="spx-gen-row"><span className="spx-gen-label">Shadows</span><input className="spx-gen-check" type="checkbox" checked={shadows} onChange={e=>setShadows(e.target.checked)}/></div>
      <div className="spx-gen-row"><span className="spx-gen-label">Hatching</span><input className="spx-gen-check" type="checkbox" checked={hatching} onChange={e=>setHatching(e.target.checked)}/></div>
      <div className="spx-gen-row"><span className="spx-gen-label">Color</span><input className="spx-gen-check" type="checkbox" checked={color} onChange={e=>setColor(e.target.checked)}/></div>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn spx-gen-action-btn--teal" onClick={()=>onAction?.("convert_3d_to_2d",{style,lineWeight,shadows,hatching,color,resolution})}>Convert 3D → 2D</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("export_2d_image")}>Export Image</button>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
const TABS = [
  { id:"terrain",  label:"Terrain" },
  { id:"city",     label:"City"    },
  { id:"foliage",  label:"Foliage" },
  { id:"crowd",    label:"Crowd"   },
  { id:"vehicle",  label:"Vehicle" },
  { id:"convert",  label:"3D→2D"  },
];

export default function GeneratorsPanel({ onAction, scene }) {
  const [activeTab, setActiveTab] = useState("terrain");
  const [history,   setHistory]   = useState([]); // generated objects
  const generatedRef = useRef([]);

  const handleGenerate = (type, params) => {
    // Get or create engine — in real app scene comes from Viewport
    // We dispatch to App which dispatches to Viewport via onAction
    onAction?.(`gen_${type}`, params);
    setHistory(prev=>[{type,params,time:Date.now()},...prev.slice(0,9)]);
  };

  const handleClear = () => {
    onAction?.("gen_clear");
    setHistory([]);
  };

  return (
    <div className="spx-gen-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Generators</span>
        <button className="spx-panel-action-btn" onClick={handleClear} title="Clear all generated">Clear</button>
      </div>
      <div className="spx-gen-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`spx-gen-tab${activeTab===t.id?" spx-gen-tab--active":""}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="spx-gen-content">
        {activeTab==="terrain"  && <TerrainTab onGenerate={handleGenerate}/>}
        {activeTab==="city"     && <CityTab    onGenerate={handleGenerate}/>}
        {activeTab==="foliage"  && <FoliageTab onGenerate={handleGenerate}/>}
        {activeTab==="crowd"    && <CrowdTab   onGenerate={handleGenerate}/>}
        {activeTab==="vehicle"  && <VehicleTab onGenerate={handleGenerate}/>}
        {activeTab==="convert"  && <Convert3DTab onAction={onAction}/>}

        {/* History */}
        {history.length > 0 && (
          <div className="spx-gen-section">
            <div className="spx-gen-section-hdr">Recent</div>
            {history.map((h,i)=>(
              <div key={i} className="spx-gen-history-row">
                <span className="spx-gen-history-type">{h.type}</span>
                <button className="spx-gen-history-redo" onClick={()=>handleGenerate(h.type,h.params)}>↺ Redo</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
