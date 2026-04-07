import React, { useState } from "react";

// ── Render Passes ─────────────────────────────────────────────────────────────
const RENDER_PASSES = [
  { id: "beauty",     label: "Beauty (Combined)", enabled: true  },
  { id: "diffuse",    label: "Diffuse",           enabled: true  },
  { id: "specular",   label: "Specular",          enabled: false },
  { id: "emission",   label: "Emission",          enabled: false },
  { id: "ao",         label: "Ambient Occlusion", enabled: true  },
  { id: "shadow",     label: "Shadow",            enabled: false },
  { id: "depth",      label: "Depth (Z)",         enabled: true  },
  { id: "normal",     label: "Normal",            enabled: false },
  { id: "motion",     label: "Motion Vector",     enabled: false },
  { id: "crypto_obj", label: "Cryptomatte Object",enabled: false },
  { id: "crypto_mat", label: "Cryptomatte Mat",   enabled: false },
  { id: "volume",     label: "Volume",            enabled: false },
  { id: "subsurface", label: "Subsurface",        enabled: false },
  { id: "refraction", label: "Refraction",        enabled: false },
];

// ── Color Grading LUT Presets ─────────────────────────────────────────────────
const LUT_PRESETS = [
  "None","Cinematic Warm","Cinematic Cool","Teal & Orange","Desaturated Film",
  "Black & White","Vintage","Bleach Bypass","Cross Process","Day for Night",
  "Horror Green","Neo Noir","Sunset Gold","Arctic Cold","Futuristic Cyan",
  "Film Kodak 2383","Film Fuji 3510","Film Kodak 5218","Arri LogC","ACES AP0",
];

function Section({ title, color, children, defaultOpen = true }) {
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

export default function FilmRenderPanel({ onAction }) {
  // ── Renderer ──────────────────────────────────────────────────────────────
  const [engine,     setEngine]     = useState("Path Tracer");
  const [samples,    setSamples]    = useState(512);
  const [bounces,    setBounces]    = useState(8);
  const [caustics,   setCaustics]   = useState(true);
  const [denoiser,   setDenoiser]   = useState("AI Denoiser");
  const [adaptSamp,  setAdaptSamp]  = useState(true);
  const [noiseThresh,setNoiseThresh]= useState(0.01);

  // ── Output ────────────────────────────────────────────────────────────────
  const [format,     setFormat]     = useState("EXR 32-bit");
  const [colorspace, setColorspace] = useState("ACES AP0");
  const [resolution, setResolution] = useState("4096x2160");
  const [fps,        setFps]        = useState(24);
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame,   setEndFrame]   = useState(250);
  const [frameStep,  setFrameStep]  = useState(1);

  // ── Render Passes ─────────────────────────────────────────────────────────
  const [passes, setPasses] = useState(RENDER_PASSES);
  const togglePass = (id) => setPasses(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));

  // ── Post Processing ───────────────────────────────────────────────────────
  const [bloom,       setBloom]       = useState(true);
  const [bloomThresh, setBloomThresh] = useState(0.8);
  const [bloomIntens, setBloomIntens] = useState(0.3);
  const [bloomRad,    setBloomRad]    = useState(0.2);

  const [ssao,        setSsao]        = useState(true);
  const [ssaoRadius,  setSsaoRadius]  = useState(0.2);
  const [ssaoIntens,  setSsaoIntens]  = useState(0.8);

  const [ssr,         setSsr]         = useState(true);
  const [ssrIntens,   setSsrIntens]   = useState(0.8);
  const [ssrMaxDist,  setSsrMaxDist]  = useState(10);

  const [chrAb,       setChrAb]       = useState(0.2);
  const [lensFlare,   setLensFlare]   = useState(false);
  const [lensFlareInt,setLensFlareInt]= useState(0.5);
  const [vignette,    setVignette]    = useState(0.35);
  const [vignetteRnd, setVignetteRnd] = useState(1);
  const [filmGrain,   setFilmGrain]   = useState(0.12);
  const [scanlines,   setScanlines]   = useState(false);

  // ── Color Grading ─────────────────────────────────────────────────────────
  const [lut,         setLut]         = useState("Cinematic Warm");
  const [lutStrength, setLutStrength] = useState(0.8);
  const [exposure,    setExposure]    = useState(0);
  const [contrast,    setContrast]    = useState(1);
  const [saturation,  setSaturation]  = useState(1);
  const [hue,         setHue]         = useState(0);
  const [highlights,  setHighlights]  = useState(0);
  const [shadows,     setShadows]     = useState(0);
  const [midtones,    setMidtones]    = useState(0);
  const [lift,        setLift]        = useState(0);
  const [gamma,       setGamma]       = useState(1);
  const [gain,        setGain]        = useState(1);

  // ── Rendering State ───────────────────────────────────────────────────────
  const [rendering,  setRendering]   = useState(false);
  const [progress,   setProgress]    = useState(0);
  const [renderTime, setRenderTime]  = useState(null);

  const startRender = () => {
    setRendering(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setRendering(false); setRenderTime("2m 34s"); return 100; }
        return p + Math.random() * 3;
      });
    }, 100);
    onAction?.("render_start", { engine, samples, bounces });
  };

  return (
    <div className="spx-film-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Film Renderer</span>
        {!rendering
          ? <button className="spx-panel-action-btn spx-film-apply-btn" onClick={startRender}>Render</button>
          : <button className="spx-panel-action-btn spx-film-stop-btn" onClick={() => { setRendering(false); onAction?.("render_stop"); }}>Stop</button>
        }
      </div>

      {/* Render progress */}
      {(rendering || progress > 0) && (
        <div className="spx-render-progress">
          <div className="spx-render-progress-bar" ref={el => { if (el) el.style.width = progress + "%"; }} />
          <span className="spx-render-progress-label">{rendering ? `Rendering… ${Math.round(progress)}%` : `Done — ${renderTime}`}</span>
        </div>
      )}

      {/* Engine */}
      <Section title="Render Engine" color="teal">
        <Row label="Engine">
          <select className="spx-film-select" value={engine} onChange={e => setEngine(e.target.value)}>
            {["Path Tracer","Real-Time (WebGL)","Hybrid","Spectral","Photon Mapping"].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </Row>
        <SliderRow label="Samples" value={samples} min={1} max={4096} step={1} unit="" onChange={setSamples} />
        <SliderRow label="Light Bounces" value={bounces} min={1} max={32} step={1} unit="" onChange={setBounces} />
        <Row label="Caustics">
          <input className="spx-film-check" type="checkbox" checked={caustics} onChange={e => setCaustics(e.target.checked)} />
        </Row>
        <Row label="Denoiser">
          <select className="spx-film-select" value={denoiser} onChange={e => setDenoiser(e.target.value)}>
            {["None","AI Denoiser","OIDN","OptiX","Temporal","TAA"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </Row>
        <Row label="Adaptive">
          <input className="spx-film-check" type="checkbox" checked={adaptSamp} onChange={e => setAdaptSamp(e.target.checked)} />
        </Row>
        {adaptSamp && <SliderRow label="Noise Thresh" value={noiseThresh} min={0.001} max={0.1} step={0.001} unit="" onChange={setNoiseThresh} />}
      </Section>

      {/* Output */}
      <Section title="Output" color="orange">
        <Row label="Format">
          <select className="spx-film-select" value={format} onChange={e => setFormat(e.target.value)}>
            {["PNG 8-bit","PNG 16-bit","EXR 16-bit","EXR 32-bit","TIFF","JPEG","WebP","MP4 H.264","MP4 H.265","ProRes 4444","DPX"].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Row>
        <Row label="Color Space">
          <select className="spx-film-select" value={colorspace} onChange={e => setColorspace(e.target.value)}>
            {["sRGB","Linear","ACES AP0","ACES AP1","ACEScct","FilmLight T-Log","Rec.709","Rec.2020","DCI-P3"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Row>
        <Row label="Resolution">
          <select className="spx-film-select" value={resolution} onChange={e => setResolution(e.target.value)}>
            {["1280x720","1920x1080","2560x1440","3840x2160","4096x2160","6144x3160","8192x4320"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Row>
        <Row label="Frame Range">
          <div className="spx-film-vec3">
            <input className="spx-film-num" type="number" value={startFrame} onChange={e => setStartFrame(+e.target.value)} />
            <span className="spx-film-vec2-sep">→</span>
            <input className="spx-film-num" type="number" value={endFrame} onChange={e => setEndFrame(+e.target.value)} />
            <span className="spx-film-vec2-sep">by</span>
            <input className="spx-film-num" type="number" min={1} value={frameStep} onChange={e => setFrameStep(+e.target.value)} />
          </div>
        </Row>
      </Section>

      {/* Render Passes */}
      <Section title="Render Passes" color="purple" defaultOpen={false}>
        {passes.map(p => (
          <div key={p.id} className="spx-film-row">
            <span className="spx-film-label">{p.label}</span>
            <input className="spx-film-check" type="checkbox" checked={p.enabled} onChange={() => togglePass(p.id)} />
          </div>
        ))}
      </Section>

      {/* Post Processing */}
      <Section title="Post Processing" color="blue">
        {/* Bloom */}
        <div className="spx-film-subsection-hdr">Bloom</div>
        <Row label="Enabled"><input className="spx-film-check" type="checkbox" checked={bloom} onChange={e => setBloom(e.target.checked)} /></Row>
        {bloom && <>
          <SliderRow label="Threshold" value={bloomThresh} min={0} max={2} step={0.01} unit="" onChange={setBloomThresh} />
          <SliderRow label="Intensity" value={bloomIntens} min={0} max={2} step={0.01} unit="" onChange={setBloomIntens} />
          <SliderRow label="Radius" value={bloomRad} min={0} max={1} step={0.01} unit="" onChange={setBloomRad} />
        </>}

        {/* SSAO */}
        <div className="spx-film-subsection-hdr">Screen Space AO</div>
        <Row label="Enabled"><input className="spx-film-check" type="checkbox" checked={ssao} onChange={e => setSsao(e.target.checked)} /></Row>
        {ssao && <>
          <SliderRow label="Radius" value={ssaoRadius} min={0.01} max={2} step={0.01} unit="m" onChange={setSsaoRadius} />
          <SliderRow label="Intensity" value={ssaoIntens} min={0} max={2} step={0.01} unit="" onChange={setSsaoIntens} />
        </>}

        {/* SSR */}
        <div className="spx-film-subsection-hdr">Screen Space Reflections</div>
        <Row label="Enabled"><input className="spx-film-check" type="checkbox" checked={ssr} onChange={e => setSsr(e.target.checked)} /></Row>
        {ssr && <>
          <SliderRow label="Intensity" value={ssrIntens} min={0} max={1} step={0.01} unit="" onChange={setSsrIntens} />
          <SliderRow label="Max Dist" value={ssrMaxDist} min={0.1} max={100} step={0.1} unit="m" onChange={setSsrMaxDist} />
        </>}

        {/* Lens */}
        <div className="spx-film-subsection-hdr">Lens Effects</div>
        <SliderRow label="Chromatic Ab" value={chrAb} min={0} max={2} step={0.01} unit="" onChange={setChrAb} />
        <Row label="Lens Flare"><input className="spx-film-check" type="checkbox" checked={lensFlare} onChange={e => setLensFlare(e.target.checked)} /></Row>
        {lensFlare && <SliderRow label="Flare Intensity" value={lensFlareInt} min={0} max={1} step={0.01} unit="" onChange={setLensFlareInt} />}
        <SliderRow label="Vignette" value={vignette} min={0} max={1} step={0.01} unit="" onChange={setVignette} />
        <SliderRow label="Film Grain" value={filmGrain} min={0} max={1} step={0.01} unit="" onChange={setFilmGrain} />
        <Row label="Scanlines"><input className="spx-film-check" type="checkbox" checked={scanlines} onChange={e => setScanlines(e.target.checked)} /></Row>
      </Section>

      {/* Color Grading */}
      <Section title="Color Grading" color="yellow">
        <Row label="LUT">
          <select className="spx-film-select" value={lut} onChange={e => setLut(e.target.value)}>
            {LUT_PRESETS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Row>
        <SliderRow label="LUT Strength" value={lutStrength} min={0} max={1} step={0.01} unit="" onChange={setLutStrength} />
        <SliderRow label="Exposure" value={exposure} min={-5} max={5} step={0.1} unit=" EV" onChange={setExposure} />
        <SliderRow label="Contrast" value={contrast} min={0} max={2} step={0.01} unit="" onChange={setContrast} />
        <SliderRow label="Saturation" value={saturation} min={0} max={2} step={0.01} unit="" onChange={setSaturation} />
        <SliderRow label="Hue" value={hue} min={-180} max={180} step={1} unit="°" onChange={setHue} />
        <div className="spx-film-subsection-hdr">Lift / Gamma / Gain</div>
        <SliderRow label="Lift (Blacks)" value={lift} min={-1} max={1} step={0.01} unit="" onChange={setLift} />
        <SliderRow label="Gamma (Mids)" value={gamma} min={0.1} max={3} step={0.01} unit="" onChange={setGamma} />
        <SliderRow label="Gain (Whites)" value={gain} min={0} max={3} step={0.01} unit="" onChange={setGain} />
        <div className="spx-film-subsection-hdr">Tone</div>
        <SliderRow label="Highlights" value={highlights} min={-1} max={1} step={0.01} unit="" onChange={setHighlights} />
        <SliderRow label="Shadows" value={shadows} min={-1} max={1} step={0.01} unit="" onChange={setShadows} />
        <SliderRow label="Midtones" value={midtones} min={-1} max={1} step={0.01} unit="" onChange={setMidtones} />
      </Section>

      <div className="spx-film-apply-row">
        <button className="spx-film-apply-full-btn" onClick={() => onAction?.("render_preview")}>Preview Render</button>
        <button className="spx-film-apply-full-btn" onClick={startRender}>Full Render</button>
        <button className="spx-film-apply-full-btn spx-film-apply-full-btn--secondary" onClick={() => onAction?.("render_animation")}>Render Animation</button>
      </div>
    </div>
  );
}
