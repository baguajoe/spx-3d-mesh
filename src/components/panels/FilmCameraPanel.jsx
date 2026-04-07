import React, { useState } from "react";

const SENSOR_PRESETS = [
  { label: "Full Frame 35mm", w: 36,   h: 24   },
  { label: "APS-C",           w: 23.5, h: 15.6 },
  { label: "Micro 4/3",       w: 17.3, h: 13   },
  { label: "Super 35",        w: 24.89,h: 18.66 },
  { label: "IMAX 70mm",       w: 70.4, h: 52.6  },
  { label: "VistaVision",     w: 37.7, h: 25.2  },
  { label: "8K Digital",      w: 35.9, h: 20.2  },
  { label: "Custom",          w: null, h: null   },
];

const LENS_PRESETS = [
  { label: "14mm Ultra Wide",  fl: 14  },
  { label: "24mm Wide",        fl: 24  },
  { label: "35mm Standard",    fl: 35  },
  { label: "50mm Normal",      fl: 50  },
  { label: "85mm Portrait",    fl: 85  },
  { label: "135mm Short Tele", fl: 135 },
  { label: "200mm Tele",       fl: 200 },
  { label: "400mm Super Tele", fl: 400 },
  { label: "Custom",           fl: null },
];

const APERTURE_STOPS = [
  "f/1.0","f/1.2","f/1.4","f/1.8","f/2.0","f/2.8","f/4","f/5.6","f/8","f/11","f/16","f/22"
];

const SHUTTER_ANGLES = [45, 90, 120, 144, 172.8, 180, 270, 360];
const ASPECT_RATIOS  = ["1.33:1 (4:3)","1.78:1 (16:9)","1.85:1 (Flat)","2.00:1","2.35:1 (Scope)","2.39:1 (Scope)","2.76:1 (Ultra Panavision)"];

function Section({ title, children, color = "teal", defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-film-section">
      <button className={`spx-film-section-hdr spx-film-section-hdr--${color}`} onClick={() => setOpen(v => !v)}>
        <svg className={`spx-film-chevron${open ? " spx-film-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>{title}</span>
      </button>
      {open && <div className="spx-film-section-body">{children}</div>}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="spx-film-row">
      <span className="spx-film-label">{label}</span>
      <div className="spx-film-control">{children}</div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange }) {
  return (
    <Row label={label}>
      <div className="spx-film-slider-row">
        <input className="spx-film-range" type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
        <span className="spx-film-val">{value}{unit}</span>
      </div>
    </Row>
  );
}

export default function FilmCameraPanel({ onAction }) {
  // ── Lens ─────────────────────────────────────────────────────────────────
  const [lensPreset,   setLensPreset]   = useState("50mm Normal");
  const [focalLength,  setFocalLength]  = useState(50);
  const [aperture,     setAperture]     = useState("f/2.8");
  const [focusDist,    setFocusDist]    = useState(5);
  const [fStop,        setFStop]        = useState(2.8);

  // ── Sensor ───────────────────────────────────────────────────────────────
  const [sensorPreset, setSensorPreset] = useState("Full Frame 35mm");
  const [sensorW,      setSensorW]      = useState(36);
  const [sensorH,      setSensorH]      = useState(24);
  const [aspect,       setAspect]       = useState("2.39:1 (Scope)");
  const [resolution,   setResolution]   = useState("4096x2160");
  const [fps,          setFps]          = useState(24);

  // ── DOF ──────────────────────────────────────────────────────────────────
  const [dofEnabled,   setDofEnabled]   = useState(true);
  const [dofFStop,     setDofFStop]     = useState(2.8);
  const [dofFocusDist, setDofFocusDist] = useState(5);
  const [bokehBlades,  setBokehBlades]  = useState(8);
  const [bokehRot,     setBokehRot]     = useState(0);
  const [bokehRatio,   setBokehRatio]   = useState(1);
  const [maxCOC,       setMaxCOC]       = useState(0.01);

  // ── Motion Blur ───────────────────────────────────────────────────────────
  const [motionBlur,   setMotionBlur]   = useState(true);
  const [shutterAngle, setShutterAngle] = useState(180);
  const [shutterOffset,setShutterOffset]= useState(0);
  const [mbSamples,    setMbSamples]    = useState(8);

  // ── Film Grain ────────────────────────────────────────────────────────────
  const [grainEnabled, setGrainEnabled] = useState(true);
  const [grainAmt,     setGrainAmt]     = useState(0.15);
  const [grainSize,    setGrainSize]    = useState(0.5);
  const [grainColor,   setGrainColor]   = useState(false);

  // ── Lens FX ───────────────────────────────────────────────────────────────
  const [chromaticAb,  setChromaticAb]  = useState(0.3);
  const [lensDist,     setLensDist]     = useState(0);
  const [vignette,     setVignette]     = useState(0.4);
  const [lensFlare,    setLensFlare]    = useState(false);
  const [anamorphic,   setAnamorphic]   = useState(false);

  // ── Camera Transform ──────────────────────────────────────────────────────
  const [camX,  setCamX]  = useState(0);
  const [camY,  setCamY]  = useState(0);
  const [camZ,  setCamZ]  = useState(0);
  const [tiltX, setTiltX] = useState(0);
  const [panY,  setPanY]  = useState(0);
  const [rollZ, setRollZ] = useState(0);
  const [shake, setShake] = useState(0);

  // ── Apply ─────────────────────────────────────────────────────────────────
  const apply = () => onAction?.("cam_apply", {
    focalLength, aperture, focusDist, sensorW, sensorH, fps,
    dof: { enabled: dofEnabled, fStop: dofFStop, focusDist: dofFocusDist, bokehBlades, bokehRot, bokehRatio, maxCOC },
    motionBlur: { enabled: motionBlur, shutterAngle, shutterOffset, samples: mbSamples },
    grain: { enabled: grainEnabled, amount: grainAmt, size: grainSize, color: grainColor },
    lens: { chromaticAberration: chromaticAb, distortion: lensDist, vignette, lensFlare, anamorphic },
    transform: { x: camX, y: camY, z: camZ, tiltX, panY, rollZ, shake },
  });

  const handleLensPreset = (label) => {
    setLensPreset(label);
    const p = LENS_PRESETS.find(p => p.label === label);
    if (p?.fl) setFocalLength(p.fl);
  };

  const handleSensorPreset = (label) => {
    setSensorPreset(label);
    const p = SENSOR_PRESETS.find(p => p.label === label);
    if (p?.w) { setSensorW(p.w); setSensorH(p.h); }
  };

  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Film Camera</span>
        <button className="spx-panel-action-btn spx-film-apply-btn" onClick={apply}>Apply</button>
      </div>

      {/* Lens */}
      <Section title="Lens" color="teal">
        <Row label="Preset">
          <select className="spx-film-select" value={lensPreset} onChange={e => handleLensPreset(e.target.value)}>
            {LENS_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </Row>
        <SliderRow label="Focal Length" value={focalLength} min={8} max={800} step={1} unit="mm" onChange={setFocalLength} />
        <Row label="Aperture">
          <select className="spx-film-select" value={aperture} onChange={e => setAperture(e.target.value)}>
            {APERTURE_STOPS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Row>
        <SliderRow label="Focus Dist" value={focusDist} min={0.1} max={1000} step={0.1} unit="m" onChange={setFocusDist} />
      </Section>

      {/* Sensor */}
      <Section title="Sensor & Format" color="orange">
        <Row label="Sensor">
          <select className="spx-film-select" value={sensorPreset} onChange={e => handleSensorPreset(e.target.value)}>
            {SENSOR_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </Row>
        <Row label="Size">
          <div className="spx-film-vec2">
            <input className="spx-film-num" type="number" step={0.1} value={sensorW} onChange={e => setSensorW(+e.target.value)} />
            <span className="spx-film-vec2-sep">×</span>
            <input className="spx-film-num" type="number" step={0.1} value={sensorH} onChange={e => setSensorH(+e.target.value)} />
            <span className="spx-film-vec2-unit">mm</span>
          </div>
        </Row>
        <Row label="Aspect">
          <select className="spx-film-select" value={aspect} onChange={e => setAspect(e.target.value)}>
            {ASPECT_RATIOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Row>
        <Row label="Resolution">
          <select className="spx-film-select" value={resolution} onChange={e => setResolution(e.target.value)}>
            {["1920x1080","2560x1440","3840x2160","4096x2160","6144x3240","8192x4320","12288x6480"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Row>
        <Row label="Frame Rate">
          <select className="spx-film-select" value={fps} onChange={e => setFps(+e.target.value)}>
            {[12,16,23.976,24,25,29.97,30,48,60,120,240].map(f => <option key={f} value={f}>{f}fps</option>)}
          </select>
        </Row>
      </Section>

      {/* DOF */}
      <Section title="Depth of Field" color="blue">
        <Row label="Enabled">
          <input className="spx-film-check" type="checkbox" checked={dofEnabled} onChange={e => setDofEnabled(e.target.checked)} />
        </Row>
        {dofEnabled && <>
          <Row label="f-Stop">
            <select className="spx-film-select" value={`f/${dofFStop}`} onChange={e => setDofFStop(parseFloat(e.target.value.replace("f/","")))}>
              {APERTURE_STOPS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Row>
          <SliderRow label="Focus Dist" value={dofFocusDist} min={0.1} max={1000} step={0.1} unit="m" onChange={setDofFocusDist} />
          <SliderRow label="Bokeh Blades" value={bokehBlades} min={3} max={16} step={1} unit="" onChange={setBokehBlades} />
          <SliderRow label="Bokeh Rotation" value={bokehRot} min={0} max={360} step={1} unit="°" onChange={setBokehRot} />
          <SliderRow label="Bokeh Ratio" value={bokehRatio} min={0.1} max={2} step={0.01} unit="x" onChange={setBokehRatio} />
          <SliderRow label="Max CoC" value={maxCOC} min={0.001} max={0.1} step={0.001} unit="" onChange={setMaxCOC} />
        </>}
      </Section>

      {/* Motion Blur */}
      <Section title="Motion Blur" color="purple">
        <Row label="Enabled">
          <input className="spx-film-check" type="checkbox" checked={motionBlur} onChange={e => setMotionBlur(e.target.checked)} />
        </Row>
        {motionBlur && <>
          <Row label="Shutter Angle">
            <select className="spx-film-select" value={shutterAngle} onChange={e => setShutterAngle(+e.target.value)}>
              {SHUTTER_ANGLES.map(a => <option key={a} value={a}>{a}°</option>)}
            </select>
          </Row>
          <SliderRow label="Shutter Offset" value={shutterOffset} min={-1} max={1} step={0.01} unit="" onChange={setShutterOffset} />
          <SliderRow label="Samples" value={mbSamples} min={1} max={64} step={1} unit="" onChange={setMbSamples} />
        </>}
      </Section>

      {/* Film Grain */}
      <Section title="Film Grain" color="yellow">
        <Row label="Enabled">
          <input className="spx-film-check" type="checkbox" checked={grainEnabled} onChange={e => setGrainEnabled(e.target.checked)} />
        </Row>
        {grainEnabled && <>
          <SliderRow label="Amount" value={grainAmt} min={0} max={1} step={0.01} unit="" onChange={setGrainAmt} />
          <SliderRow label="Size" value={grainSize} min={0.1} max={2} step={0.01} unit="" onChange={setGrainSize} />
          <Row label="Color Grain">
            <input className="spx-film-check" type="checkbox" checked={grainColor} onChange={e => setGrainColor(e.target.checked)} />
          </Row>
        </>}
      </Section>

      {/* Lens FX */}
      <Section title="Lens FX" color="red">
        <SliderRow label="Chromatic Ab" value={chromaticAb} min={0} max={2} step={0.01} unit="" onChange={setChromaticAb} />
        <SliderRow label="Distortion" value={lensDist} min={-1} max={1} step={0.01} unit="" onChange={setLensDist} />
        <SliderRow label="Vignette" value={vignette} min={0} max={1} step={0.01} unit="" onChange={setVignette} />
        <Row label="Lens Flare">
          <input className="spx-film-check" type="checkbox" checked={lensFlare} onChange={e => setLensFlare(e.target.checked)} />
        </Row>
        <Row label="Anamorphic">
          <input className="spx-film-check" type="checkbox" checked={anamorphic} onChange={e => setAnamorphic(e.target.checked)} />
        </Row>
      </Section>

      {/* Camera Transform */}
      <Section title="Camera Transform" color="green" defaultOpen={false}>
        {[["Pos X",camX,setCamX,-100,100,0.1,"m"],["Pos Y",camY,setCamY,-100,100,0.1,"m"],["Pos Z",camZ,setCamZ,-100,100,0.1,"m"],["Tilt",tiltX,setTiltX,-90,90,0.5,"°"],["Pan",panY,setPanY,-360,360,0.5,"°"],["Roll",rollZ,setRollZ,-180,180,0.5,"°"],["Shake",shake,setShake,0,5,0.01,""]].map(([l,v,s,mn,mx,st,u])=>(
          <SliderRow key={l} label={l} value={v} min={mn} max={mx} step={st} unit={u} onChange={s} />
        ))}
      </Section>

      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={apply}>Apply to Viewport</button>
        <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={() => onAction?.("cam_keyframe")}>Keyframe</button>
      </div>
    </div>
  );
}
