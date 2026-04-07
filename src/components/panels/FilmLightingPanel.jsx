import React, { useState } from "react";

const LIGHT_TYPES = [
  { id: "sun",   label: "Sun",         icon: "☀" },
  { id: "point", label: "Point",       icon: "●" },
  { id: "spot",  label: "Spot",        icon: "▼" },
  { id: "area",  label: "Area",        icon: "▣" },
  { id: "hdri",  label: "HDRI",        icon: "◎" },
  { id: "ies",   label: "IES Profile", icon: "💡" },
  { id: "mesh",  label: "Mesh Light",  icon: "⬡" },
];

const HDRI_PRESETS = [
  "Studio Soft Box","Overcast Sky","Golden Hour","Blue Hour/Dusk","Midday Sun","Interior Studio",
  "Neon City Night","Forest Ambient","Arctic Snow","Desert Noon","Underwater","Space Nebula",
  "Cinematic ACES","Filmic Outdoor","Indoor Tungsten","Fluorescent Office",
];

const COLOR_TEMPS = [
  { label: "1900K Candle",          k: 1900  },
  { label: "2700K Warm White",      k: 2700  },
  { label: "3200K Tungsten",        k: 3200  },
  { label: "4000K Cool White",      k: 4000  },
  { label: "5500K Daylight",        k: 5500  },
  { label: "6500K Overcast",        k: 6500  },
  { label: "7500K Blue Sky",        k: 7500  },
  { label: "10000K Clear Blue Sky", k: 10000 },
];

let lightId = 0;
const mkLight = (type) => ({
  id: ++lightId, type, name: `${type}_${lightId}`,
  color: "#ffffff", temperature: 5500, useTemp: true,
  intensity: 1, radius: 0.1, distance: 10, falloff: 2,
  castShadow: true, shadowSoftness: 0.1, shadowBias: 0.001,
  volumetric: false, volumeIntensity: 0.1, volumeScatter: 0.3,
  spotAngle: 45, spotBlend: 0.15,
  areaShape: "rectangle", areaW: 1, areaH: 1,
  hdriRotation: 0, hdriExposure: 0, hdriPreset: "Studio Soft Box",
  visible: true, selected: false,
});

function LightCard({ light, active, onSelect, onChange, onRemove }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`spx-light-card${active ? " spx-light-card--active" : ""}`} onClick={() => onSelect(light.id)}>
      <div className="spx-light-card-hdr">
        <button className="spx-light-toggle" onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
          <svg className={`spx-light-chevron${open ? " spx-light-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
        <span className="spx-light-icon">{LIGHT_TYPES.find(t => t.id === light.type)?.icon}</span>
        <span className="spx-light-name">{light.name}</span>
        <button className={`spx-light-vis${light.visible ? "" : " spx-light-vis--off"}`} onClick={e => { e.stopPropagation(); onChange(light.id, "visible", !light.visible); }}>◉</button>
        <button className="spx-light-del" onClick={e => { e.stopPropagation(); onRemove(light.id); }}>✕</button>
      </div>
      {open && (
        <div className="spx-light-card-body">
          {/* Color */}
          <div className="spx-light-row">
            <span className="spx-light-label">Use Temp</span>
            <input className="spx-film-check" type="checkbox" checked={light.useTemp} onChange={e => onChange(light.id, "useTemp", e.target.checked)} />
          </div>
          {light.useTemp ? (
            <div className="spx-light-row">
              <span className="spx-light-label">Temperature</span>
              <select className="spx-film-select" value={light.temperature} onChange={e => onChange(light.id, "temperature", +e.target.value)}>
                {COLOR_TEMPS.map(t => <option key={t.k} value={t.k}>{t.label}</option>)}
              </select>
            </div>
          ) : (
            <div className="spx-light-row">
              <span className="spx-light-label">Color</span>
              <input className="spx-film-color" type="color" value={light.color} onChange={e => onChange(light.id, "color", e.target.value)} />
            </div>
          )}

          {/* Intensity */}
          <div className="spx-light-row">
            <span className="spx-light-label">Intensity</span>
            <div className="spx-film-slider-row">
              <input className="spx-film-range" type="range" min={0} max={100} step={0.1} value={light.intensity} onChange={e => onChange(light.id, "intensity", +e.target.value)} />
              <span className="spx-film-val">{light.intensity}</span>
            </div>
          </div>

          {/* Type-specific */}
          {(light.type === "point" || light.type === "spot") && (
            <>
              <div className="spx-light-row">
                <span className="spx-light-label">Radius</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={0} max={5} step={0.01} value={light.radius} onChange={e => onChange(light.id, "radius", +e.target.value)} />
                  <span className="spx-film-val">{light.radius}m</span>
                </div>
              </div>
              <div className="spx-light-row">
                <span className="spx-light-label">Distance</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={0.1} max={1000} step={0.1} value={light.distance} onChange={e => onChange(light.id, "distance", +e.target.value)} />
                  <span className="spx-film-val">{light.distance}m</span>
                </div>
              </div>
            </>
          )}

          {light.type === "spot" && (
            <>
              <div className="spx-light-row">
                <span className="spx-light-label">Spot Angle</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={1} max={180} step={1} value={light.spotAngle} onChange={e => onChange(light.id, "spotAngle", +e.target.value)} />
                  <span className="spx-film-val">{light.spotAngle}°</span>
                </div>
              </div>
              <div className="spx-light-row">
                <span className="spx-light-label">Blend</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={0} max={1} step={0.01} value={light.spotBlend} onChange={e => onChange(light.id, "spotBlend", +e.target.value)} />
                  <span className="spx-film-val">{light.spotBlend}</span>
                </div>
              </div>
            </>
          )}

          {light.type === "area" && (
            <>
              <div className="spx-light-row">
                <span className="spx-light-label">Shape</span>
                <select className="spx-film-select" value={light.areaShape} onChange={e => onChange(light.id, "areaShape", e.target.value)}>
                  {["rectangle","square","disk","ellipse"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="spx-light-row">
                <span className="spx-light-label">Size</span>
                <div className="spx-film-vec2">
                  <input className="spx-film-num" type="number" step={0.1} value={light.areaW} onChange={e => onChange(light.id, "areaW", +e.target.value)} />
                  <span className="spx-film-vec2-sep">×</span>
                  <input className="spx-film-num" type="number" step={0.1} value={light.areaH} onChange={e => onChange(light.id, "areaH", +e.target.value)} />
                </div>
              </div>
            </>
          )}

          {light.type === "hdri" && (
            <>
              <div className="spx-light-row">
                <span className="spx-light-label">Preset</span>
                <select className="spx-film-select" value={light.hdriPreset} onChange={e => onChange(light.id, "hdriPreset", e.target.value)}>
                  {HDRI_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="spx-light-row">
                <span className="spx-light-label">Rotation</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={0} max={360} step={1} value={light.hdriRotation} onChange={e => onChange(light.id, "hdriRotation", +e.target.value)} />
                  <span className="spx-film-val">{light.hdriRotation}°</span>
                </div>
              </div>
              <div className="spx-light-row">
                <span className="spx-light-label">Exposure</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={-5} max={5} step={0.1} value={light.hdriExposure} onChange={e => onChange(light.id, "hdriExposure", +e.target.value)} />
                  <span className="spx-film-val">{light.hdriExposure} EV</span>
                </div>
              </div>
            </>
          )}

          {/* Shadow */}
          <div className="spx-light-row">
            <span className="spx-light-label">Cast Shadow</span>
            <input className="spx-film-check" type="checkbox" checked={light.castShadow} onChange={e => onChange(light.id, "castShadow", e.target.checked)} />
          </div>
          {light.castShadow && (
            <div className="spx-light-row">
              <span className="spx-light-label">Shadow Soft</span>
              <div className="spx-film-slider-row">
                <input className="spx-film-range" type="range" min={0} max={1} step={0.01} value={light.shadowSoftness} onChange={e => onChange(light.id, "shadowSoftness", +e.target.value)} />
                <span className="spx-film-val">{light.shadowSoftness}</span>
              </div>
            </div>
          )}

          {/* Volumetric */}
          <div className="spx-light-row">
            <span className="spx-light-label">Volumetric</span>
            <input className="spx-film-check" type="checkbox" checked={light.volumetric} onChange={e => onChange(light.id, "volumetric", e.target.checked)} />
          </div>
          {light.volumetric && (
            <>
              <div className="spx-light-row">
                <span className="spx-light-label">Vol Intensity</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={0} max={1} step={0.01} value={light.volumeIntensity} onChange={e => onChange(light.id, "volumeIntensity", +e.target.value)} />
                  <span className="spx-film-val">{light.volumeIntensity}</span>
                </div>
              </div>
              <div className="spx-light-row">
                <span className="spx-light-label">Scattering</span>
                <div className="spx-film-slider-row">
                  <input className="spx-film-range" type="range" min={0} max={1} step={0.01} value={light.volumeScatter} onChange={e => onChange(light.id, "volumeScatter", +e.target.value)} />
                  <span className="spx-film-val">{light.volumeScatter}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FilmLightingPanel({ onAction }) {
  const [lights,      setLights]      = useState([mkLight("sun"), mkLight("hdri")]);
  const [activeLight, setActiveLight] = useState(null);
  const [globalExp,   setGlobalExp]   = useState(0);
  const [globalGamma, setGlobalGamma] = useState(2.2);
  const [toneMap,     setToneMap]     = useState("ACES Filmic");
  const [ambientOcc,  setAmbientOcc]  = useState(true);
  const [aoRadius,    setAoRadius]    = useState(0.2);
  const [aoIntensity, setAoIntensity] = useState(0.8);
  const [globalIllum, setGlobalIllum] = useState(true);
  const [giIntensity, setGiIntensity] = useState(1);
  const [shadowQual,  setShadowQual]  = useState("High");
  const [shadowFilter,setShadowFilter]= useState("PCF");

  const addLight  = (type) => setLights(prev => [...prev, mkLight(type)]);
  const removeLight=(id) => setLights(prev => prev.filter(l => l.id !== id));
  const changeLight=(id, key, val) => setLights(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l));

  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Film Lighting</span>
        <button className="spx-panel-action-btn" onClick={() => onAction?.("lighting_apply")}>Apply</button>
      </div>

      {/* Global */}
      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--teal">
          <span>Global Settings</span>
        </div>
        <div className="spx-film-section-body">
          <div className="spx-film-row">
            <span className="spx-film-label">Tone Mapping</span>
            <select className="spx-film-select" value={toneMap} onChange={e => setToneMap(e.target.value)}>
              {["ACES Filmic","Filmic","AgX","Khronos PBR","Reinhard","Linear","Custom LUT"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="spx-film-row">
            <span className="spx-film-label">Exposure</span>
            <div className="spx-film-slider-row">
              <input className="spx-film-range" type="range" min={-5} max={5} step={0.1} value={globalExp} onChange={e => setGlobalExp(+e.target.value)} />
              <span className="spx-film-val">{globalExp} EV</span>
            </div>
          </div>
          <div className="spx-film-row">
            <span className="spx-film-label">Gamma</span>
            <div className="spx-film-slider-row">
              <input className="spx-film-range" type="range" min={1} max={3} step={0.01} value={globalGamma} onChange={e => setGlobalGamma(+e.target.value)} />
              <span className="spx-film-val">{globalGamma}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AO + GI */}
      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--orange"><span>Ambient Occlusion</span></div>
        <div className="spx-film-section-body">
          <div className="spx-film-row"><span className="spx-film-label">Enabled</span><input className="spx-film-check" type="checkbox" checked={ambientOcc} onChange={e => setAmbientOcc(e.target.checked)} /></div>
          {ambientOcc && <>
            <div className="spx-film-row"><span className="spx-film-label">Radius</span><div className="spx-film-slider-row"><input className="spx-film-range" type="range" min={0.01} max={2} step={0.01} value={aoRadius} onChange={e => setAoRadius(+e.target.value)} /><span className="spx-film-val">{aoRadius}m</span></div></div>
            <div className="spx-film-row"><span className="spx-film-label">Intensity</span><div className="spx-film-slider-row"><input className="spx-film-range" type="range" min={0} max={2} step={0.01} value={aoIntensity} onChange={e => setAoIntensity(+e.target.value)} /><span className="spx-film-val">{aoIntensity}</span></div></div>
          </>}
          <div className="spx-film-row"><span className="spx-film-label">Global Illum</span><input className="spx-film-check" type="checkbox" checked={globalIllum} onChange={e => setGlobalIllum(e.target.checked)} /></div>
          {globalIllum && <div className="spx-film-row"><span className="spx-film-label">GI Intensity</span><div className="spx-film-slider-row"><input className="spx-film-range" type="range" min={0} max={2} step={0.01} value={giIntensity} onChange={e => setGiIntensity(+e.target.value)} /><span className="spx-film-val">{giIntensity}</span></div></div>}
        </div>
      </div>

      {/* Shadow Quality */}
      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--purple"><span>Shadow Quality</span></div>
        <div className="spx-film-section-body">
          <div className="spx-film-row"><span className="spx-film-label">Quality</span><select className="spx-film-select" value={shadowQual} onChange={e => setShadowQual(e.target.value)}>{["Low","Medium","High","Ultra","Cinematic"].map(q => <option key={q} value={q}>{q}</option>)}</select></div>
          <div className="spx-film-row"><span className="spx-film-label">Filter</span><select className="spx-film-select" value={shadowFilter} onChange={e => setShadowFilter(e.target.value)}>{["Hard","PCF","PCSS","Ray Traced","MSAA"].map(f => <option key={f} value={f}>{f}</option>)}</select></div>
        </div>
      </div>

      {/* Add Light */}
      <div className="spx-film-section">
        <div className="spx-film-section-hdr spx-film-section-hdr--green"><span>Lights ({lights.length})</span></div>
        <div className="spx-film-section-body">
          <div className="spx-light-add-grid">
            {LIGHT_TYPES.map(t => (
              <button key={t.id} className="spx-light-add-btn" onClick={() => addLight(t.id)}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Light list */}
      <div className="spx-light-list">
        {lights.map(light => (
          <LightCard
            key={light.id}
            light={light}
            active={activeLight === light.id}
            onSelect={setActiveLight}
            onChange={changeLight}
            onRemove={removeLight}
          />
        ))}
      </div>
    </div>
  );
}
