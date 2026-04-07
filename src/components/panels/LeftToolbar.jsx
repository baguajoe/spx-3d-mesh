import React, { useState } from "react";

const TOOLS = [
  {
    id:"select", label:"Select Box", icon:"⬜", group:"select", key:"Q",
    sub:[
      {id:"select_box",    label:"Select Box",    key:"Q"},
      {id:"select_circle", label:"Select Circle", key:"C"},
      {id:"select_lasso",  label:"Select Lasso",  key:"L"},
    ]
  },
  {
    id:"cursor", label:"Cursor", icon:"⊕", group:"cursor", key:"Shift+RMB",
    sub:[]
  },
  {
    id:"move", label:"Move", icon:"✛", group:"transform", key:"G",
    sub:[
      {id:"move",    label:"Move",    key:"G"},
    ]
  },
  {
    id:"rotate", label:"Rotate", icon:"↻", group:"transform", key:"R",
    sub:[
      {id:"rotate",  label:"Rotate",  key:"R"},
    ]
  },
  {
    id:"scale", label:"Scale", icon:"⤡", group:"transform", key:"S",
    sub:[
      {id:"scale",         label:"Scale",         key:"S"},
      {id:"scale_cage",    label:"Scale Cage",    key:""},
    ]
  },
  {
    id:"transform", label:"Transform", icon:"⊞", group:"transform", key:"",
    sub:[]
  },
  { id:"sep1", label:"", icon:"", group:"sep", key:"", sub:[] },
  {
    id:"annotate", label:"Annotate", icon:"✏", group:"annotate", key:"D",
    sub:[
      {id:"annotate",       label:"Annotate",       key:"D"},
      {id:"annotate_line",  label:"Annotate Line",  key:""},
      {id:"annotate_poly",  label:"Annotate Poly",  key:""},
      {id:"annotate_erase", label:"Annotate Erase", key:""},
    ]
  },
  {
    id:"measure", label:"Measure", icon:"📏", group:"measure", key:"",
    sub:[]
  },
  { id:"sep2", label:"", icon:"", group:"sep", key:"", sub:[] },
  {
    id:"add_cube",   label:"Add Cube",   icon:"⬜", group:"add", key:"",
    sub:[
      {id:"add_cube",      label:"Cube",      key:""},
      {id:"add_sphere",    label:"Sphere",    key:""},
      {id:"add_cylinder",  label:"Cylinder",  key:""},
      {id:"add_cone",      label:"Cone",      key:""},
      {id:"add_torus",     label:"Torus",     key:""},
      {id:"add_plane",     label:"Plane",     key:""},
      {id:"add_empty",     label:"Empty",     key:""},
      {id:"add_camera",    label:"Camera",    key:""},
      {id:"add_light",     label:"Light",     key:""},
      {id:"add_armature",  label:"Armature",  key:""},
    ]
  },
];

export default function LeftToolbar({ activeTool, onToolChange, onAction, editMode }) {
  const [hoveredTool,  setHoveredTool]  = useState(null);
  const [expandedTool, setExpandedTool] = useState(null);

  const handleToolClick = (tool) => {
    if (tool.group === "sep") return;
    if (tool.sub.length > 0) {
      setExpandedTool(prev => prev === tool.id ? null : tool.id);
    } else {
      onToolChange?.(tool.id);
      onAction?.(tool.id);
      setExpandedTool(null);
    }
  };

  const handleSubClick = (sub) => {
    onToolChange?.(sub.id);
    onAction?.(sub.id);
    setExpandedTool(null);
  };

  return (
    <div className="spx-lt-toolbar">
      {TOOLS.map(tool => {
        if (tool.group === "sep") return <div key={tool.id} className="spx-lt-sep"/>;
        const isActive = activeTool === tool.id || tool.sub.some(s=>s.id===activeTool);
        const isExpanded = expandedTool === tool.id;
        return (
          <div key={tool.id} className="spx-lt-tool-wrap">
            <button
              className={`spx-lt-btn${isActive?" spx-lt-btn--active":""}${isExpanded?" spx-lt-btn--expanded":""}`}
              onClick={() => handleToolClick(tool)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              title={`${tool.label}${tool.key?" ("+tool.key+")":""}`}
            >
              <span className="spx-lt-icon">{tool.icon}</span>
              {tool.sub.length > 0 && <span className="spx-lt-sub-indicator">▸</span>}
            </button>

            {/* Tooltip */}
            {hoveredTool === tool.id && !isExpanded && (
              <div className="spx-lt-tooltip">
                <span className="spx-lt-tooltip-name">{tool.label}</span>
                {tool.key && <span className="spx-lt-tooltip-key">{tool.key}</span>}
              </div>
            )}

            {/* Sub-tool flyout */}
            {isExpanded && tool.sub.length > 0 && (
              <div className="spx-lt-flyout">
                {tool.sub.map(sub => (
                  <button
                    key={sub.id}
                    className={`spx-lt-flyout-btn${activeTool===sub.id?" spx-lt-flyout-btn--active":""}`}
                    onClick={() => handleSubClick(sub)}
                  >
                    <span className="spx-lt-flyout-label">{sub.label}</span>
                    {sub.key && <span className="spx-lt-flyout-key">{sub.key}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
