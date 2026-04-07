import React, { useState } from "react";

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="spx-prop-section">
      <button className="spx-prop-section-hdr" onClick={() => setOpen(v => !v)}>
        <svg className={`spx-prop-chevron${open ? " spx-prop-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>{title}</span>
      </button>
      {open && <div className="spx-prop-section-body">{children}</div>}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ label, children }) {
  return (
    <div className="spx-prop-row">
      <span className="spx-prop-label">{label}</span>
      <div className="spx-prop-control">{children}</div>
    </div>
  );
}

// ── Vec3 Input ────────────────────────────────────────────────────────────────
function Vec3({ value, onChange }) {
  return (
    <div className="spx-prop-vec3">
      {["x","y","z"].map((axis, i) => (
        <div key={axis} className="spx-prop-vec3-field">
          <span className={`spx-prop-axis spx-prop-axis--${axis}`}>{axis.toUpperCase()}</span>
          <input
            className="spx-prop-num"
            type="number"
            step="0.1"
            value={value[i].toFixed(3)}
            onChange={e => {
              const v = [...value];
              v[i] = parseFloat(e.target.value) || 0;
              onChange?.(v);
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Color Swatch ──────────────────────────────────────────────────────────────
function ColorSwatch({ value, onChange }) {
  return (
    <div className="spx-prop-color-row">
      <input
        className="spx-prop-color"
        type="color"
        value={value}
        onChange={e => onChange?.(e.target.value)}
      />
      <span className="spx-prop-color-hex">{value}</span>
    </div>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────
function Slider({ value, min, max, step, onChange }) {
  return (
    <div className="spx-prop-slider-row">
      <input
        className="spx-prop-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange?.(parseFloat(e.target.value))}
      />
      <span className="spx-prop-slider-val">{value}</span>
    </div>
  );
}

// ── PropertyInspector ─────────────────────────────────────────────────────────
export default function PropertyInspector({ selectedObject }) {
  const [location,  setLocation]  = useState([0, 0, 0]);
  const [rotation,  setRotation]  = useState([0, 0, 0]);
  const [scale,     setScale]     = useState([1, 1, 1]);
  const [dimensions,setDimensions]= useState([2, 2, 2]);
  const [matColor,  setMatColor]  = useState("#888aaa");
  const [metalness, setMetalness] = useState(0.1);
  const [roughness, setRoughness] = useState(0.6);
  const [emission,  setEmission]  = useState(0.0);
  const [objectName,setObjectName]= useState("DefaultCube");
  const [visible,   setVisible]   = useState(true);
  const [castShadow,setCastShadow]= useState(true);
  const [recvShadow,setRecvShadow]= useState(true);

  return (
    <div className="spx-inspector">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Properties</span>
      </div>

      {/* Object Name */}
      <div className="spx-prop-name-row">
        <input
          className="spx-prop-name-input"
          type="text"
          value={objectName}
          onChange={e => setObjectName(e.target.value)}
        />
      </div>

      {/* Transform */}
      <Section title="Transform">
        <Row label="Location"><Vec3 value={location} onChange={setLocation} /></Row>
        <Row label="Rotation"><Vec3 value={rotation} onChange={setRotation} /></Row>
        <Row label="Scale"><Vec3 value={scale} onChange={setScale} /></Row>
        <Row label="Dimensions"><Vec3 value={dimensions} onChange={setDimensions} /></Row>
      </Section>

      {/* Object */}
      <Section title="Object" defaultOpen={false}>
        <Row label="Visible">
          <input
            className="spx-prop-check"
            type="checkbox"
            checked={visible}
            onChange={e => setVisible(e.target.checked)}
          />
        </Row>
        <Row label="Cast Shadow">
          <input
            className="spx-prop-check"
            type="checkbox"
            checked={castShadow}
            onChange={e => setCastShadow(e.target.checked)}
          />
        </Row>
        <Row label="Recv Shadow">
          <input
            className="spx-prop-check"
            type="checkbox"
            checked={recvShadow}
            onChange={e => setRecvShadow(e.target.checked)}
          />
        </Row>
      </Section>

      {/* Material */}
      <Section title="Material">
        <Row label="Base Color"><ColorSwatch value={matColor} onChange={setMatColor} /></Row>
        <Row label="Metalness"><Slider value={metalness} min={0} max={1} step={0.01} onChange={setMetalness} /></Row>
        <Row label="Roughness"><Slider value={roughness} min={0} max={1} step={0.01} onChange={setRoughness} /></Row>
        <Row label="Emission"><Slider value={emission}  min={0} max={5} step={0.1}  onChange={setEmission}  /></Row>
        <div className="spx-prop-mat-btns">
          <button className="spx-prop-mat-btn">PBR</button>
          <button className="spx-prop-mat-btn">SSS</button>
          <button className="spx-prop-mat-btn">Glass</button>
          <button className="spx-prop-mat-btn">Toon</button>
          <button className="spx-prop-mat-btn">Holo</button>
        </div>
      </Section>

      {/* Geometry */}
      <Section title="Geometry" defaultOpen={false}>
        <div className="spx-prop-geo-btns">
          <button className="spx-prop-geo-btn">Subdivide</button>
          <button className="spx-prop-geo-btn">Triangulate</button>
          <button className="spx-prop-geo-btn">Voxel Remesh</button>
          <button className="spx-prop-geo-btn">Quad Remesh</button>
          <button className="spx-prop-geo-btn">Fix Normals</button>
          <button className="spx-prop-geo-btn">Fill Holes</button>
        </div>
      </Section>

    </div>
  );
}
