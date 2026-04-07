import React, { useState } from "react";

// ── Character Generators ──────────────────────────────────────────────────────
function BodyGeneratorPanel({ onAction }) {
  const [gender,    setGender]    = useState("neutral");
  const [height,    setHeight]    = useState(170);
  const [weight,    setWeight]    = useState(70);
  const [muscular,  setMuscular]  = useState(50);
  const [age,       setAge]       = useState(30);
  const [ethnicity, setEthnicity] = useState("mixed");
  const ETHNICITIES = ["mixed","east_asian","south_asian","african","caucasian","latino","middle_eastern"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Body Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Gender</span>
        <div className="spx-gen-btns">
          {["male","female","neutral"].map(g => <button key={g} className={`spx-gen-btn${gender===g?" spx-gen-btn--active":""}`} onClick={()=>setGender(g)}>{g}</button>)}
        </div>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Ethnicity</span>
        <select className="spx-gen-select" value={ethnicity} onChange={e=>setEthnicity(e.target.value)}>
          {ETHNICITIES.map(e=><option key={e} value={e}>{e.replace("_"," ")}</option>)}
        </select>
      </div>
      {[["Height",height,setHeight,140,220,"cm"],["Weight",weight,setWeight,40,150,"kg"],["Muscular",muscular,setMuscular,0,100,"%"],["Age",age,setAge,1,100,"yr"]].map(([l,v,s,mn,mx,u])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={mn} max={mx} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}{u}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("body_generate")}>Generate Body</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("body_randomize")}>Randomize</button>
      </div>
    </div>
  );
}

function FaceGeneratorPanel({ onAction }) {
  const [faceShape, setFaceShape] = useState("oval");
  const [jawWidth,  setJawWidth]  = useState(50);
  const [cheekbone, setCheekbone] = useState(50);
  const [noseWidth, setNoseWidth] = useState(50);
  const [noseLen,   setNoseLen]   = useState(50);
  const [lipFull,   setLipFull]   = useState(50);
  const [eyeSize,   setEyeSize]   = useState(50);
  const [eyeDist,   setEyeDist]   = useState(50);
  const SHAPES = ["oval","round","square","heart","diamond","oblong","triangle"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Face Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Shape</span>
        <select className="spx-gen-select" value={faceShape} onChange={e=>setFaceShape(e.target.value)}>
          {SHAPES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {[["Jaw Width",jawWidth,setJawWidth],["Cheekbone",cheekbone,setCheekbone],["Nose Width",noseWidth,setNoseWidth],["Nose Length",noseLen,setNoseLen],["Lip Fullness",lipFull,setLipFull],["Eye Size",eyeSize,setEyeSize],["Eye Distance",eyeDist,setEyeDist]].map(([l,v,s])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={0} max={100} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("face_generate")}>Generate Face</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("face_randomize")}>Randomize</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("face_merge_body")}>Merge to Body</button>
      </div>
    </div>
  );
}

function EyeGeneratorPanel({ onAction }) {
  const [eyeType, setEyeType] = useState("realistic");
  const [irisColor, setIrisColor] = useState("#4488cc");
  const [pupilSize, setPupilSize] = useState(30);
  const [lashLen,   setLashLen]   = useState(50);
  const [lashCurl,  setLashCurl]  = useState(50);
  const TYPES = ["realistic","anime","stylized","toon","reptile","cat","alien"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Eye Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={eyeType} onChange={e=>setEyeType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Iris Color</span>
        <input className="spx-gen-color" type="color" value={irisColor} onChange={e=>setIrisColor(e.target.value)}/>
      </div>
      {[["Pupil Size",pupilSize,setPupilSize],["Lash Length",lashLen,setLashLen],["Lash Curl",lashCurl,setLashCurl]].map(([l,v,s])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={0} max={100} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("eye_generate")}>Generate Eyes</button>
      </div>
    </div>
  );
}

function HairGeneratorPanel({ onAction }) {
  const [hairType, setHairType] = useState("straight");
  const [length,   setLength]   = useState(60);
  const [density,  setDensity]  = useState(50);
  const [frizz,    setFrizz]    = useState(20);
  const [color,    setColor]    = useState("#3a2010");
  const TYPES = ["straight","wavy","curly","coily","locs","braids","afro","buzz","bald"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Hair Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={hairType} onChange={e=>setHairType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Color</span>
        <input className="spx-gen-color" type="color" value={color} onChange={e=>setColor(e.target.value)}/>
      </div>
      {[["Length",length,setLength,0,100,"cm"],["Density",density,setDensity,0,100,"%"],["Frizz",frizz,setFrizz,0,100,"%"]].map(([l,v,s,mn,mx,u])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={mn} max={mx} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}{u}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("hair_generate")}>Generate Hair</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("hair_simulate")}>Simulate</button>
      </div>
    </div>
  );
}

function CreatureGeneratorPanel({ onAction }) {
  const [creatureType, setCreatureType] = useState("humanoid");
  const [limbCount,    setLimbCount]    = useState(4);
  const [scale,        setScale]        = useState(100);
  const [mutation,     setMutation]     = useState(30);
  const TYPES = ["humanoid","quadruped","insect","reptile","fish","bird","cephalopod","alien","hybrid"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Creature Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={creatureType} onChange={e=>setCreatureType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {[["Limbs",limbCount,setLimbCount,0,12,""],["Scale",scale,setScale,10,500,"%"],["Mutation",mutation,setMutation,0,100,"%"]].map(([l,v,s,mn,mx,u])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={mn} max={mx} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}{u}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("creature_generate")}>Generate Creature</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("creature_randomize")}>Randomize</button>
      </div>
    </div>
  );
}

// ── Environment Generators ────────────────────────────────────────────────────
function TerrainGeneratorPanel({ onAction }) {
  const [terrainType, setTerrainType] = useState("mountains");
  const [resolution,  setResolution]  = useState(256);
  const [scale,       setScale]       = useState(100);
  const [roughness,   setRoughness]   = useState(50);
  const [erosion,     setErosion]     = useState(30);
  const [seaLevel,    setSeaLevel]    = useState(20);
  const TYPES = ["mountains","plains","desert","canyon","volcanic","arctic","coastal","island","crater"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Terrain Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={terrainType} onChange={e=>setTerrainType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {[["Resolution",resolution,setResolution,64,1024,""],["Scale",scale,setScale,10,1000,"m"],["Roughness",roughness,setRoughness,0,100,"%"],["Erosion",erosion,setErosion,0,100,"%"],["Sea Level",seaLevel,setSeaLevel,0,100,"%"]].map(([l,v,s,mn,mx,u])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={mn} max={mx} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}{u}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("terrain_generate")}>Generate Terrain</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("terrain_randomize")}>Randomize</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("terrain_scatter")}>Scatter Foliage</button>
      </div>
    </div>
  );
}

function CityGeneratorPanel({ onAction }) {
  const [cityType,   setCityType]   = useState("modern");
  const [blocks,     setBlocks]     = useState(8);
  const [density,    setDensity]    = useState(60);
  const [variation,  setVariation]  = useState(50);
  const [roads,      setRoads]      = useState(true);
  const [props,      setProps]      = useState(true);
  const TYPES = ["modern","medieval","cyberpunk","post_apocalyptic","futuristic","suburban","industrial"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">City Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Style</span>
        <select className="spx-gen-select" value={cityType} onChange={e=>setCityType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t.replace("_"," ")}</option>)}
        </select>
      </div>
      {[["Blocks",blocks,setBlocks,2,32,""],["Density",density,setDensity,0,100,"%"],["Variation",variation,setVariation,0,100,"%"]].map(([l,v,s,mn,mx,u])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={mn} max={mx} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}{u}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-row"><span className="spx-gen-label">Roads</span>
        <input className="spx-gen-check" type="checkbox" checked={roads} onChange={e=>setRoads(e.target.checked)}/>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Props</span>
        <input className="spx-gen-check" type="checkbox" checked={props} onChange={e=>setProps(e.target.checked)}/>
      </div>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("city_generate")}>Generate City</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("city_randomize")}>Randomize</button>
      </div>
    </div>
  );
}

function FoliageGeneratorPanel({ onAction }) {
  const [foliageType, setFoliageType] = useState("tree");
  const [count,       setCount]       = useState(50);
  const [spread,      setSpread]      = useState(10);
  const [scale,       setScale]       = useState(100);
  const [variation,   setVariation]   = useState(40);
  const TYPES = ["tree","bush","grass","flower","fern","cactus","mushroom","seaweed","vine","moss"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Foliage Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={foliageType} onChange={e=>setFoliageType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {[["Count",count,setCount,1,1000,""],["Spread",spread,setSpread,1,100,"m"],["Scale",scale,setScale,10,500,"%"],["Variation",variation,setVariation,0,100,"%"]].map(([l,v,s,mn,mx,u])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={mn} max={mx} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}{u}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("foliage_generate")}>Generate Foliage</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("foliage_scatter")}>Scatter</button>
      </div>
    </div>
  );
}

function CrowdGeneratorPanel({ onAction }) {
  const [count,     setCount]     = useState(20);
  const [diversity, setDiversity] = useState(80);
  const [spacing,   setSpacing]   = useState(2);
  const [animated,  setAnimated]  = useState(true);
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Crowd Generator</div>
      {[["Count",count,setCount,1,500,""],["Diversity",diversity,setDiversity,0,100,"%"],["Spacing",spacing,setSpacing,1,20,"m"]].map(([l,v,s,mn,mx,u])=>(
        <div key={l} className="spx-gen-row"><span className="spx-gen-label">{l}</span>
          <div className="spx-gen-slider-row">
            <input className="spx-gen-range" type="range" min={mn} max={mx} value={v} onChange={e=>s(+e.target.value)}/>
            <span className="spx-gen-val">{v}{u}</span>
          </div>
        </div>
      ))}
      <div className="spx-gen-row"><span className="spx-gen-label">Animated</span>
        <input className="spx-gen-check" type="checkbox" checked={animated} onChange={e=>setAnimated(e.target.checked)}/>
      </div>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("crowd_generate")}>Generate Crowd</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("crowd_randomize")}>Randomize</button>
      </div>
    </div>
  );
}

function VehicleGeneratorPanel({ onAction }) {
  const [vehicleType, setVehicleType] = useState("car");
  const [era,         setEra]         = useState("modern");
  const [damage,      setDamage]      = useState(0);
  const TYPES = ["car","truck","motorcycle","bus","van","aircraft","boat","spaceship","tank","mech"];
  const ERAS  = ["ancient","medieval","victorian","1920s","1950s","modern","futuristic","scifi"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Vehicle Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={vehicleType} onChange={e=>setVehicleType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Era</span>
        <select className="spx-gen-select" value={era} onChange={e=>setEra(e.target.value)}>
          {ERAS.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Damage</span>
        <div className="spx-gen-slider-row">
          <input className="spx-gen-range" type="range" min={0} max={100} value={damage} onChange={e=>setDamage(+e.target.value)}/>
          <span className="spx-gen-val">{damage}%</span>
        </div>
      </div>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("vehicle_generate")}>Generate Vehicle</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("vehicle_randomize")}>Randomize</button>
      </div>
    </div>
  );
}

function PropGeneratorPanel({ onAction }) {
  const [propType, setPropType] = useState("furniture");
  const [count,    setCount]    = useState(1);
  const [style,    setStyle]    = useState("modern");
  const TYPES = ["furniture","weapon","tool","food","plant","electronics","clothing","jewelry","book","container"];
  const STYLES = ["modern","medieval","sci-fi","fantasy","horror","minimalist","ornate","industrial","organic"];
  return (
    <div className="spx-gen-section">
      <div className="spx-gen-section-hdr">Prop Generator</div>
      <div className="spx-gen-row"><span className="spx-gen-label">Type</span>
        <select className="spx-gen-select" value={propType} onChange={e=>setPropType(e.target.value)}>
          {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Style</span>
        <select className="spx-gen-select" value={style} onChange={e=>setStyle(e.target.value)}>
          {STYLES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Count</span>
        <div className="spx-gen-slider-row">
          <input className="spx-gen-range" type="range" min={1} max={20} value={count} onChange={e=>setCount(+e.target.value)}/>
          <span className="spx-gen-val">{count}</span>
        </div>
      </div>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("prop_generate")}>Generate Props</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("prop_randomize")}>Randomize</button>
      </div>
    </div>
  );
}

// ── 3D to 2D Converter ────────────────────────────────────────────────────────
function ThreeDTo2DPanel({ onAction }) {
  const [style,      setStyle]      = useState("toon");
  const [lineWeight, setLineWeight] = useState(2);
  const [shadows,    setShadows]    = useState(true);
  const [hatching,   setHatching]   = useState(false);
  const [color,      setColor]      = useState(true);
  const [resolution, setResolution] = useState("1920x1080");
  const STYLES = ["toon","ink","sketch","watercolor","oil","pixel","flat","isometric","blueprint","xray"];
  const RESOLUTIONS = ["1280x720","1920x1080","2560x1440","3840x2160","4096x4096","custom"];
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
          {RESOLUTIONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Line Weight</span>
        <div className="spx-gen-slider-row">
          <input className="spx-gen-range" type="range" min={0.5} max={10} step={0.5} value={lineWeight} onChange={e=>setLineWeight(+e.target.value)}/>
          <span className="spx-gen-val">{lineWeight}px</span>
        </div>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Shadows</span>
        <input className="spx-gen-check" type="checkbox" checked={shadows} onChange={e=>setShadows(e.target.checked)}/>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Hatching</span>
        <input className="spx-gen-check" type="checkbox" checked={hatching} onChange={e=>setHatching(e.target.checked)}/>
      </div>
      <div className="spx-gen-row"><span className="spx-gen-label">Color</span>
        <input className="spx-gen-check" type="checkbox" checked={color} onChange={e=>setColor(e.target.checked)}/>
      </div>
      <div className="spx-gen-actions">
        <button className="spx-gen-action-btn spx-gen-action-btn--teal" onClick={()=>onAction?.("convert_3d_to_2d")}>Convert 3D → 2D</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("export_2d_image")}>Export Image</button>
        <button className="spx-gen-action-btn" onClick={()=>onAction?.("export_2d_sequence")}>Export Sequence</button>
      </div>
    </div>
  );
}

// ── Main GeneratorsPanel ──────────────────────────────────────────────────────
const TABS = [
  { id: "character", label: "Character" },
  { id: "environment", label: "Environment" },
  { id: "props", label: "Props" },
  { id: "convert", label: "3D→2D" },
];

export default function GeneratorsPanel({ onAction }) {
  const [activeTab, setActiveTab] = useState("character");

  return (
    <div className="spx-gen-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Generators</span>
      </div>
      <div className="spx-gen-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`spx-gen-tab${activeTab === t.id ? " spx-gen-tab--active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="spx-gen-content">
        {activeTab === "character" && <>
          <BodyGeneratorPanel    onAction={onAction} />
          <FaceGeneratorPanel    onAction={onAction} />
          <EyeGeneratorPanel     onAction={onAction} />
          <HairGeneratorPanel    onAction={onAction} />
          <CreatureGeneratorPanel onAction={onAction} />
        </>}
        {activeTab === "environment" && <>
          <TerrainGeneratorPanel onAction={onAction} />
          <CityGeneratorPanel    onAction={onAction} />
          <FoliageGeneratorPanel onAction={onAction} />
          <CrowdGeneratorPanel   onAction={onAction} />
        </>}
        {activeTab === "props" && <>
          <VehicleGeneratorPanel onAction={onAction} />
          <PropGeneratorPanel    onAction={onAction} />
        </>}
        {activeTab === "convert" && <>
          <ThreeDTo2DPanel       onAction={onAction} />
        </>}
      </div>
    </div>
  );
}
