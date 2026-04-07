import React, { useState } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconMesh    = () => <svg className="spx-ol-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5Z" fillOpacity="0.3" stroke="currentColor" strokeWidth="1"/></svg>;
const IconLight   = () => <svg className="spx-ol-icon" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="7" r="3.5" fillOpacity="0.3" stroke="currentColor" strokeWidth="1"/><line x1="8" y1="1" x2="8" y2="2.5" stroke="currentColor" strokeWidth="1.2"/><line x1="8" y1="11.5" x2="8" y2="13" stroke="currentColor" strokeWidth="1.2"/><line x1="1" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="1.2"/><line x1="13.5" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1.2"/></svg>;
const IconCamera  = () => <svg className="spx-ol-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="4" width="10" height="8" rx="1"/><polyline points="12,6 14,5 14,11 12,10"/></svg>;
const IconArmature= () => <svg className="spx-ol-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"><line x1="8" y1="2" x2="8" y2="14"/><circle cx="8" cy="2" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/></svg>;
const IconEmpty   = () => <svg className="spx-ol-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="8" cy="8" r="5" strokeDasharray="2,2"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>;
const IconCollection = () => <svg className="spx-ol-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="5" width="12" height="8" rx="1"/><path d="M5 5V4a3 3 0 016 0v1"/></svg>;
const IconChevron = ({ open }) => (
  <svg className={`spx-ol-chevron${open ? " spx-ol-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 4L10 8L6 12" strokeWidth="1.5" stroke="currentColor" fill="none"/>
  </svg>
);
const IconEye     = ({ visible }) => (
  <svg className="spx-ol-action-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
    {visible
      ? <><path d="M1 8C3 4 13 4 15 8C13 12 3 12 1 8Z"/><circle cx="8" cy="8" r="2.5" fill="currentColor"/></>
      : <><path d="M1 8C3 4 13 4 15 8" strokeDasharray="2,2"/><line x1="2" y1="2" x2="14" y2="14"/></>
    }
  </svg>
);

// ── Default scene data ────────────────────────────────────────────────────────
const DEFAULT_SCENE = [
  {
    id: "col_scene", name: "Scene Collection", type: "collection", open: true,
    children: [
      {
        id: "col_objects", name: "Objects", type: "collection", open: true,
        children: [
          { id: "obj_cube",   name: "DefaultCube",   type: "mesh",     selected: true,  visible: true },
          { id: "obj_plane",  name: "Ground",        type: "mesh",     selected: false, visible: true },
        ]
      },
      {
        id: "col_lights", name: "Lights", type: "collection", open: true,
        children: [
          { id: "light_sun",  name: "Sun",           type: "light",    selected: false, visible: true },
          { id: "light_fill", name: "Fill",          type: "light",    selected: false, visible: true },
          { id: "light_amb",  name: "Ambient",       type: "light",    selected: false, visible: true },
        ]
      },
      {
        id: "col_camera", name: "Cameras", type: "collection", open: false,
        children: [
          { id: "cam_main",   name: "MainCamera",    type: "camera",   selected: false, visible: true },
        ]
      },
    ]
  }
];

// ── Object type icon ──────────────────────────────────────────────────────────
function TypeIcon({ type }) {
  switch (type) {
    case "mesh":       return <IconMesh />;
    case "light":      return <IconLight />;
    case "camera":     return <IconCamera />;
    case "armature":   return <IconArmature />;
    case "empty":      return <IconEmpty />;
    case "collection": return <IconCollection />;
    default:           return <IconMesh />;
  }
}

// ── OutlinerNode ──────────────────────────────────────────────────────────────
function OutlinerNode({ node, depth, onSelect, onToggleVisible, onToggleOpen }) {
  const hasChildren = node.children?.length > 0;

  return (
    <>
      <div
        className={`spx-ol-row${node.selected ? " spx-ol-row--selected" : ""}`}
        style={{ "--depth": depth }}
        onClick={() => onSelect?.(node.id)}
      >
        <div className="spx-ol-row-left">
          <div className="spx-ol-indent" />
          {hasChildren
            ? <button className="spx-ol-chevron-btn" onClick={e => { e.stopPropagation(); onToggleOpen?.(node.id); }}>
                <IconChevron open={node.open} />
              </button>
            : <div className="spx-ol-chevron-spacer" />
          }
          <TypeIcon type={node.type} />
          <span className={`spx-ol-name${node.type === "collection" ? " spx-ol-name--collection" : ""}`}>
            {node.name}
          </span>
        </div>
        <div className="spx-ol-row-right">
          {node.visible !== undefined && (
            <button
              className="spx-ol-action-btn"
              onClick={e => { e.stopPropagation(); onToggleVisible?.(node.id); }}
            >
              <IconEye visible={node.visible} />
            </button>
          )}
        </div>
      </div>
      {hasChildren && node.open && node.children.map(child => (
        <OutlinerNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onSelect={onSelect}
          onToggleVisible={onToggleVisible}
          onToggleOpen={onToggleOpen}
        />
      ))}
    </>
  );
}

// ── SceneOutliner ─────────────────────────────────────────────────────────────
export default function SceneOutliner({ onSelectObject }) {
  const [scene,  setScene]  = useState(DEFAULT_SCENE);
  const [search, setSearch] = useState("");

  const updateNode = (nodes, id, updater) =>
    nodes.map(n => ({
      ...updater(n, id),
      children: n.children ? updateNode(n.children, id, updater) : n.children
    }));

  const handleSelect = (id) => {
    setScene(prev => updateNode(prev, id, (n, tid) => ({ ...n, selected: n.id === tid })));
    onSelectObject?.(id);
  };

  const handleToggleVisible = (id) => {
    setScene(prev => updateNode(prev, id, (n, tid) =>
      n.id === tid ? { ...n, visible: !n.visible } : n
    ));
  };

  const handleToggleOpen = (id) => {
    setScene(prev => updateNode(prev, id, (n, tid) =>
      n.id === tid ? { ...n, open: !n.open } : n
    ));
  };

  return (
    <div className="spx-outliner">
      <div className="spx-panel-header">
        <span className="spx-panel-title">Scene</span>
        <div className="spx-panel-header-actions">
          <button className="spx-panel-action-btn" title="Add Object">+</button>
        </div>
      </div>

      <div className="spx-ol-search-row">
        <input
          className="spx-ol-search"
          type="text"
          placeholder="Filter objects…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="spx-ol-tree">
        {scene.map(node => (
          <OutlinerNode
            key={node.id}
            node={node}
            depth={0}
            onSelect={handleSelect}
            onToggleVisible={handleToggleVisible}
            onToggleOpen={handleToggleOpen}
          />
        ))}
      </div>
    </div>
  );
}
