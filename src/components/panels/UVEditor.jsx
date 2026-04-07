import React, { useState, useRef, useCallback } from "react";

const UV_TOOLS = [
  { id: "select",      label: "Select",        key: "S" },
  { id: "move",        label: "Move",          key: "G" },
  { id: "rotate",      label: "Rotate",        key: "R" },
  { id: "scale",       label: "Scale",         key: "S" },
  { id: "pin",         label: "Pin",           key: "P" },
  { id: "relax",       label: "Relax",         key: "" },
  { id: "stitch",      label: "Stitch",        key: "V" },
];

const UNWRAP_METHODS = [
  { label: "Unwrap (Angle Based)", fn: "unwrap_angle" },
  { label: "Unwrap (Conformal)",   fn: "unwrap_conformal" },
  { label: "Smart UV Project",     fn: "smart_uv" },
  { label: "Lightmap Pack",        fn: "lightmap_pack" },
  { label: "Follow Active Quads",  fn: "follow_active_quads" },
  { label: "Cube Projection",      fn: "uv_cube" },
  { label: "Cylinder Projection",  fn: "uv_cylinder" },
  { label: "Sphere Projection",    fn: "uv_sphere" },
  { label: "Project From View",    fn: "project_from_view" },
];

const SEAM_OPS = [
  { label: "Mark Seam",            fn: "mark_seam",         key: "Ctrl+E" },
  { label: "Clear Seam",           fn: "clear_seam",        key: "" },
  { label: "Mark Sharp",           fn: "mark_sharp",        key: "" },
  { label: "Clear Sharp",          fn: "clear_sharp",       key: "" },
  { label: "Seams from Islands",   fn: "seams_from_islands",key: "" },
  { label: "Seams from Sharp",     fn: "seams_from_sharp",  key: "" },
];

const ARRANGE_OPS = [
  { label: "Pack Islands",         fn: "pack_islands",      key: "Ctrl+P" },
  { label: "Average Island Scale", fn: "average_scale",     key: "Ctrl+A" },
  { label: "Minimize Stretch",     fn: "minimize_stretch",  key: "Ctrl+V" },
  { label: "Align X",              fn: "align_uv_x",        key: "" },
  { label: "Align Y",              fn: "align_uv_y",        key: "" },
  { label: "Straighten",           fn: "straighten_uv",     key: "" },
  { label: "Weld UVs",             fn: "weld_uv",           key: "W" },
  { label: "Remove Doubles",       fn: "remove_uv_doubles", key: "" },
  { label: "Flip Horizontal",      fn: "flip_uv_x",         key: "" },
  { label: "Flip Vertical",        fn: "flip_uv_y",         key: "" },
  { label: "Rotate 90° CW",        fn: "rotate_uv_cw",      key: "" },
  { label: "Rotate 90° CCW",       fn: "rotate_uv_ccw",     key: "" },
];

const UDIM_OPS = [
  { label: "UDIM Layout",          fn: "udim_layout" },
  { label: "Build Atlas",          fn: "udim_atlas" },
  { label: "Fill UDIM Tiles",      fn: "udim_fill" },
  { label: "Move to UDIM",         fn: "udim_move" },
];

const SELECT_OPS = [
  { label: "Select All",           fn: "uv_select_all",     key: "A" },
  { label: "Deselect All",         fn: "uv_deselect_all",   key: "Alt+A" },
  { label: "Select Island",        fn: "uv_select_island",  key: "L" },
  { label: "Select Overlap",       fn: "uv_select_overlap", key: "" },
  { label: "Select Pinned",        fn: "uv_select_pinned",  key: "" },
  { label: "Invert Selection",     fn: "uv_invert_select",  key: "Ctrl+I" },
  { label: "Grow Selection",       fn: "uv_grow_select",    key: "Ctrl++" },
  { label: "Shrink Selection",     fn: "uv_shrink_select",  key: "Ctrl+-" },
];

function OpGroup({ title, ops, onAction, color }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="spx-uv-group">
      <button className={`spx-uv-group-hdr spx-uv-group-hdr--${color}`} onClick={() => setOpen(v => !v)}>
        <svg className={`spx-uv-chevron${open ? " spx-uv-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>{title}</span>
      </button>
      {open && (
        <div className="spx-uv-group-body">
          {ops.map(op => (
            <button key={op.fn} className="spx-uv-op-btn" onClick={() => onAction?.(op.fn)} title={op.key || ""}>
              <span className="spx-uv-op-label">{op.label}</span>
              {op.key && <span className="spx-uv-op-key">{op.key}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UVEditor({ onAction }) {
  const [activeTool,   setActiveTool]   = useState("select");
  const [showChecker,  setShowChecker]  = useState(false);
  const [liveUnwrap,   setLiveUnwrap]   = useState(false);
  const [uvMode,       setUvMode]       = useState("uv"); // uv | vertex
  const [margin,       setMargin]       = useState(0.01);
  const [angle,        setAngle]        = useState(66);

  return (
    <div className="spx-uv-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">UV Editor</span>
      </div>

      {/* Mode */}
      <div className="spx-uv-modes">
        <button className={`spx-uv-mode-btn${uvMode === "uv" ? " spx-uv-mode-btn--active" : ""}`} onClick={() => setUvMode("uv")}>UV</button>
        <button className={`spx-uv-mode-btn${uvMode === "vertex" ? " spx-uv-mode-btn--active" : ""}`} onClick={() => setUvMode("vertex")}>Vertex</button>
      </div>

      {/* Tools */}
      <div className="spx-uv-tools">
        {UV_TOOLS.map(t => (
          <button
            key={t.id}
            className={`spx-uv-tool-btn${activeTool === t.id ? " spx-uv-tool-btn--active" : ""}`}
            onClick={() => setActiveTool(t.id)}
            title={t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toggles */}
      <div className="spx-uv-toggles">
        <button
          className={`spx-uv-toggle${showChecker ? " spx-uv-toggle--on" : ""}`}
          onClick={() => setShowChecker(v => !v)}
        >
          Checker
        </button>
        <button
          className={`spx-uv-toggle${liveUnwrap ? " spx-uv-toggle--on" : ""}`}
          onClick={() => { setLiveUnwrap(v => !v); onAction?.("live_unwrap"); }}
        >
          Live Unwrap
        </button>
      </div>

      {/* Settings */}
      <div className="spx-uv-settings">
        <div className="spx-uv-setting-row">
          <span className="spx-uv-setting-label">Margin</span>
          <input className="spx-uv-setting-range" type="range" min={0} max={0.1} step={0.001} value={margin} onChange={e => setMargin(+e.target.value)} />
          <span className="spx-uv-setting-val">{margin.toFixed(3)}</span>
        </div>
        <div className="spx-uv-setting-row">
          <span className="spx-uv-setting-label">Angle</span>
          <input className="spx-uv-setting-range" type="range" min={0} max={90} step={1} value={angle} onChange={e => setAngle(+e.target.value)} />
          <span className="spx-uv-setting-val">{angle}°</span>
        </div>
      </div>

      {/* Op Groups */}
      <div className="spx-uv-ops">
        <OpGroup title="Unwrap"  ops={UNWRAP_METHODS} onAction={onAction} color="teal" />
        <OpGroup title="Seams"   ops={SEAM_OPS}       onAction={onAction} color="orange" />
        <OpGroup title="Arrange" ops={ARRANGE_OPS}    onAction={onAction} color="blue" />
        <OpGroup title="Select"  ops={SELECT_OPS}     onAction={onAction} color="purple" />
        <OpGroup title="UDIM"    ops={UDIM_OPS}       onAction={onAction} color="yellow" />
      </div>
    </div>
  );
}
