import React, { useState } from "react";

// ── Tool Groups ───────────────────────────────────────────────────────────────
const VERTEX_TOOLS = [
  { label: "Merge Vertices",     fn: "merge_verts",       key: "M",        desc: "Merge selected vertices" },
  { label: "Merge at Center",    fn: "merge_center",      key: "Alt+M",    desc: "Merge to center" },
  { label: "Merge at Cursor",    fn: "merge_cursor",      key: "",         desc: "Merge to 3D cursor" },
  { label: "Connect Vertices",   fn: "connect_verts",     key: "J",        desc: "Connect vertices with edges" },
  { label: "Vertex Slide",       fn: "vert_slide",        key: "Shift+V",  desc: "Slide vertex along edge" },
  { label: "Bevel Vertex",       fn: "bevel_vert",        key: "Ctrl+Shift+B", desc: "Bevel individual vertices" },
  { label: "Smooth Vertex",      fn: "smooth_vert",       key: "",         desc: "Smooth vertex positions" },
  { label: "Remove Doubles",     fn: "rm_doubles",        key: "M",        desc: "Merge by distance" },
  { label: "Separate Loose",     fn: "separate_loose",    key: "P",        desc: "Separate loose geometry" },
  { label: "Rip Vertices",       fn: "rip_verts",         key: "V",        desc: "Rip vertices apart" },
  { label: "Rip & Fill",         fn: "rip_fill",          key: "Alt+V",    desc: "Rip and fill with faces" },
];

const EDGE_TOOLS = [
  { label: "Loop Cut",           fn: "loop_cut",          key: "Ctrl+R",   desc: "Add edge loop" },
  { label: "Edge Slide",         fn: "edge_slide",        key: "G G",      desc: "Slide edge along faces" },
  { label: "Bevel Edge",         fn: "bevel_edge",        key: "Ctrl+B",   desc: "Bevel selected edges" },
  { label: "Bridge Edge Loops",  fn: "bridge_loops",      key: "",         desc: "Bridge two edge loops" },
  { label: "Mark Seam",          fn: "mark_seam",         key: "Ctrl+E",   desc: "Mark edge as UV seam" },
  { label: "Clear Seam",         fn: "clear_seam",        key: "",         desc: "Remove UV seam" },
  { label: "Mark Sharp",         fn: "mark_sharp",        key: "",         desc: "Mark edge as sharp" },
  { label: "Clear Sharp",        fn: "clear_sharp",       key: "",         desc: "Remove sharp mark" },
  { label: "Crease Edge",        fn: "crease_edge",       key: "Shift+E",  desc: "Set subdivision crease" },
  { label: "Edge Ring Select",   fn: "select_ring",       key: "Ctrl+Alt+Click", desc: "Select edge ring" },
  { label: "Dissolve Edges",     fn: "dissolve_edges",    key: "Ctrl+X",   desc: "Dissolve selected edges" },
  { label: "Rotate Edge CW",     fn: "rotate_edge_cw",   key: "Ctrl+F",   desc: "Rotate edge clockwise" },
  { label: "Rotate Edge CCW",    fn: "rotate_edge_ccw",  key: "",         desc: "Rotate edge counter-clockwise" },
  { label: "Subdivide Edge",     fn: "subdivide_edge",    key: "",         desc: "Subdivide selected edges" },
  { label: "Un-Subdivide",       fn: "unsubdivide",       key: "",         desc: "Un-subdivide geometry" },
];

const FACE_TOOLS = [
  { label: "Extrude Faces",      fn: "extrude_faces",     key: "E",        desc: "Extrude selected faces" },
  { label: "Extrude Along Normals", fn: "extrude_normals",key: "Alt+E",    desc: "Extrude along face normals" },
  { label: "Extrude Individual", fn: "extrude_individual",key: "",         desc: "Extrude each face individually" },
  { label: "Inset Faces",        fn: "inset",             key: "I",        desc: "Inset faces" },
  { label: "Poke Faces",         fn: "poke",              key: "",         desc: "Poke faces to center" },
  { label: "Triangulate",        fn: "triangulate",       key: "Ctrl+T",   desc: "Convert to triangles" },
  { label: "Tris to Quads",      fn: "tris_to_quads",     key: "Alt+J",    desc: "Convert triangles to quads" },
  { label: "Solidify Faces",     fn: "solidify_faces",    key: "",         desc: "Add thickness to faces" },
  { label: "Flip Normals",       fn: "flip_normals",      key: "",         desc: "Flip face normals" },
  { label: "Recalc Outside",     fn: "recalc_normals",    key: "Shift+N",  desc: "Recalculate normals outward" },
  { label: "Recalc Inside",      fn: "recalc_normals_in", key: "Ctrl+Shift+N", desc: "Recalculate normals inward" },
  { label: "Fill Face",          fn: "fill_face",         key: "F",        desc: "Fill edge loop with face" },
  { label: "Grid Fill",          fn: "grid_fill",         key: "",         desc: "Fill with grid topology" },
  { label: "Beautify Fill",      fn: "beautify_fill",     key: "",         desc: "Optimize triangulation" },
  { label: "Intersect (Knife)",  fn: "intersect_knife",   key: "",         desc: "Intersect faces" },
  { label: "Intersect Boolean",  fn: "intersect_bool",    key: "",         desc: "Boolean intersection" },
  { label: "Weld Edges to Faces",fn: "weld_edges",        key: "",         desc: "Weld edge loops to faces" },
];

const SELECT_TOOLS = [
  { label: "Select All",         fn: "select_all",        key: "A",        desc: "Select all geometry" },
  { label: "Deselect All",       fn: "deselect_all",      key: "Alt+A",    desc: "Deselect all" },
  { label: "Invert Selection",   fn: "invert_select",     key: "Ctrl+I",   desc: "Invert selection" },
  { label: "Select Loop",        fn: "select_loop",       key: "Alt+Click",desc: "Select edge/face loop" },
  { label: "Select Ring",        fn: "select_ring",       key: "Ctrl+Alt+Click", desc: "Select edge ring" },
  { label: "Select Linked",      fn: "select_linked",     key: "L",        desc: "Select linked geometry" },
  { label: "Select Linked Flat", fn: "select_flat",       key: "",         desc: "Select flat connected faces" },
  { label: "Select Checker",     fn: "select_checker",    key: "",         desc: "Checker deselect" },
  { label: "Grow Selection",     fn: "grow_select",       key: "Ctrl++",   desc: "Grow selection" },
  { label: "Shrink Selection",   fn: "shrink_select",     key: "Ctrl+-",   desc: "Shrink selection" },
  { label: "Select Boundary",    fn: "select_boundary",   key: "",         desc: "Select boundary loop" },
  { label: "Select Non-Manifold",fn: "select_non_manifold",key: "",        desc: "Select non-manifold geometry" },
  { label: "Select Interior",    fn: "select_interior",   key: "",         desc: "Select interior faces" },
  { label: "Select Perimeter",   fn: "select_perimeter",  key: "",         desc: "Select perimeter edges" },
  { label: "Select Sharp Edges", fn: "select_sharp",      key: "",         desc: "Select sharp edges" },
];

const BOOLEAN_TOOLS = [
  { label: "Boolean Union",      fn: "bool_union",        key: "",         desc: "Join two meshes" },
  { label: "Boolean Difference", fn: "bool_subtract",     key: "",         desc: "Subtract active from selected" },
  { label: "Boolean Intersect",  fn: "bool_intersect",    key: "",         desc: "Keep only overlap" },
  { label: "Knife Project",      fn: "knife_project",     key: "",         desc: "Project knife from object" },
];

const CLEANUP_TOOLS = [
  { label: "Fix Normals",        fn: "fix_normals",       key: "",         desc: "Auto-fix all normals" },
  { label: "Fill Holes",         fn: "fill_holes",        key: "",         desc: "Fill open holes" },
  { label: "Merge by Distance",  fn: "rm_doubles",        key: "M",        desc: "Weld overlapping verts" },
  { label: "Delete Loose",       fn: "delete_loose",      key: "",         desc: "Remove isolated geometry" },
  { label: "Degenerate Dissolve",fn: "degenerate_dissolve",key: "",        desc: "Remove degenerate faces" },
  { label: "Full Repair",        fn: "full_repair",       key: "",         desc: "Run all cleanup ops" },
  { label: "Decimate",           fn: "decimate",          key: "",         desc: "Reduce polygon count" },
  { label: "Limited Dissolve",   fn: "limited_dissolve",  key: "",         desc: "Dissolve by angle limit" },
];

const TRANSFORM_TOOLS = [
  { label: "Mirror X",           fn: "mirror_x",          key: "",         desc: "Mirror on X axis" },
  { label: "Mirror Y",           fn: "mirror_y",          key: "",         desc: "Mirror on Y axis" },
  { label: "Mirror Z",           fn: "mirror_z",          key: "",         desc: "Mirror on Z axis" },
  { label: "Symmetrize",         fn: "symmetrize",        key: "",         desc: "Make mesh symmetric" },
  { label: "Snap to Symmetry",   fn: "snap_symmetry",     key: "",         desc: "Snap to mirror plane" },
  { label: "To Sphere",          fn: "to_sphere",         key: "Shift+Alt+S", desc: "Cast to sphere" },
  { label: "Shear",              fn: "shear",             key: "Ctrl+Shift+Alt+S", desc: "Shear geometry" },
  { label: "Bend",               fn: "bend",              key: "",         desc: "Bend geometry" },
  { label: "Push/Pull",          fn: "push_pull",         key: "",         desc: "Push or pull geometry" },
  { label: "Randomize",          fn: "randomize",         key: "",         desc: "Randomize vertex positions" },
  { label: "Smooth",             fn: "smooth_mesh",       key: "",         desc: "Laplacian smooth" },
  { label: "Laplacian Smooth",   fn: "laplacian_smooth",  key: "",         desc: "Laplacian smoothing" },
];

const GROUPS = [
  { id: "vertex",    label: "Vertex",    color: "teal",   tools: VERTEX_TOOLS },
  { id: "edge",      label: "Edge",      color: "blue",   tools: EDGE_TOOLS },
  { id: "face",      label: "Face",      color: "orange", tools: FACE_TOOLS },
  { id: "select",    label: "Select",    color: "purple", tools: SELECT_TOOLS },
  { id: "boolean",   label: "Boolean",   color: "red",    tools: BOOLEAN_TOOLS },
  { id: "cleanup",   label: "Cleanup",   color: "yellow", tools: CLEANUP_TOOLS },
  { id: "transform", label: "Transform", color: "green",  tools: TRANSFORM_TOOLS },
];

// ── Edit Mode Selector ────────────────────────────────────────────────────────
const EDIT_MODES = ["OBJECT", "EDIT", "SCULPT", "VERTEX PAINT", "WEIGHT PAINT", "TEXTURE PAINT"];

// ── ToolButton ────────────────────────────────────────────────────────────────
function ToolButton({ tool, onAction }) {
  return (
    <button
      className="spx-mesh-tool-btn"
      onClick={() => onAction?.(tool.fn)}
      title={`${tool.desc}${tool.key ? `  (${tool.key})` : ""}`}
    >
      <span className="spx-mesh-tool-label">{tool.label}</span>
      {tool.key && <span className="spx-mesh-tool-key">{tool.key}</span>}
    </button>
  );
}

// ── Group Section ─────────────────────────────────────────────────────────────
function ToolGroup({ group, open, onToggle, onAction }) {
  return (
    <div className={`spx-mesh-group spx-mesh-group--${group.color}`}>
      <button className="spx-mesh-group-hdr" onClick={() => onToggle(group.id)}>
        <svg className={`spx-mesh-chevron${open ? " spx-mesh-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span className="spx-mesh-group-label">{group.label}</span>
        <span className="spx-mesh-group-count">{group.tools.length}</span>
      </button>
      {open && (
        <div className="spx-mesh-group-body">
          {group.tools.map(t => <ToolButton key={t.fn} tool={t} onAction={onAction} />)}
        </div>
      )}
    </div>
  );
}

// ── ProMeshPanel ──────────────────────────────────────────────────────────────
export default function ProMeshPanel({ onAction }) {
  const [editMode,  setEditMode]  = useState("EDIT");
  const [openGroups,setOpenGroups]= useState({ vertex: true, edge: true, face: false, select: false, boolean: false, cleanup: false, transform: false });
  const [propMode,  setPropMode]  = useState(false);
  const [snapMode,  setSnapMode]  = useState(false);
  const [xrayMode,  setXrayMode]  = useState(false);
  const [search,    setSearch]    = useState("");

  const toggle = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = search
    ? GROUPS.map(g => ({ ...g, tools: g.tools.filter(t => t.label.toLowerCase().includes(search.toLowerCase())) })).filter(g => g.tools.length > 0)
    : GROUPS;

  return (
    <div className="spx-mesh-panel">

      {/* Mode selector */}
      <div className="spx-mesh-modes">
        {EDIT_MODES.map(m => (
          <button
            key={m}
            className={`spx-mesh-mode-btn${editMode === m ? " spx-mesh-mode-btn--active" : ""}`}
            onClick={() => setEditMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Quick toggles */}
      <div className="spx-mesh-toggles">
        <button
          className={`spx-mesh-toggle${propMode ? " spx-mesh-toggle--on" : ""}`}
          onClick={() => { setPropMode(v => !v); onAction?.("proportional"); }}
          title="Proportional Editing (O)"
        >
          Proportional
        </button>
        <button
          className={`spx-mesh-toggle${snapMode ? " spx-mesh-toggle--on" : ""}`}
          onClick={() => { setSnapMode(v => !v); onAction?.("snap"); }}
          title="Snapping (Shift+Tab)"
        >
          Snap
        </button>
        <button
          className={`spx-mesh-toggle${xrayMode ? " spx-mesh-toggle--on" : ""}`}
          onClick={() => { setXrayMode(v => !v); onAction?.("toggleXRay"); }}
          title="X-Ray Mode (Alt+Z)"
        >
          X-Ray
        </button>
      </div>

      {/* Search */}
      <div className="spx-mesh-search-row">
        <input
          className="spx-mesh-search"
          type="text"
          placeholder="Search tools…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tool Groups */}
      <div className="spx-mesh-groups">
        {filtered.map(g => (
          <ToolGroup
            key={g.id}
            group={g}
            open={search ? true : openGroups[g.id]}
            onToggle={toggle}
            onAction={onAction}
          />
        ))}
      </div>

    </div>
  );
}
