import React, { useState, useCallback } from "react";
import ProfessionalShell from "./pro-ui/ProfessionalShell";
import Viewport          from "./components/viewport/Viewport";
import SceneOutliner     from "./components/panels/SceneOutliner";
import PropertyInspector from "./components/panels/PropertyInspector";
import Timeline          from "./components/panels/Timeline";
import ProMeshPanel      from "./components/panels/ProMeshPanel";
import SculptPanel       from "./components/panels/SculptPanel";
import UVEditor          from "./components/panels/UVEditor";
import RiggingPanel      from "./components/panels/RiggingPanel";
import ModifierStack     from "./components/panels/ModifierStack";
import NodeMaterialEditor from "./components/panels/NodeMaterialEditor";
import GeneratorsPanel   from "./components/panels/GeneratorsPanel";
import SPXSketch         from "./components/panels/SPXSketch";
import "./styles/spx-shell.css";
import "./styles/spx-panels.css";
import "./styles/spx-tools.css";
import "./styles/spx-generators.css";
import "./styles/spx-nodeeditor.css";
import "./styles/spx-sketch.css";

// ── Workspace → panel layout map ──────────────────────────────────────────────
const WORKSPACE_LAYOUTS = {
  Modeling:    { left: "scene",    right: "properties", bottom: "timeline" },
  Sculpt:      { left: "sculpt",   right: "properties", bottom: "timeline" },
  UV:          { left: "scene",    right: "uv",         bottom: "timeline" },
  Animation:   { left: "scene",    right: "properties", bottom: "timeline" },
  Rigging:     { left: "scene",    right: "rigging",    bottom: "timeline" },
  Shading:     { left: "scene",    right: "material",   bottom: "timeline" },
  Rendering:   { left: "scene",    right: "properties", bottom: "timeline" },
  VFX:         { left: "scene",    right: "modifiers",  bottom: "timeline" },
  Mocap:       { left: "scene",    right: "rigging",    bottom: "timeline" },
  Performance: { left: "scene",    right: "properties", bottom: "timeline" },
  Generators:  { left: "generators",right:"properties", bottom: "timeline" },
  Sketch:      { left: "scene",    right: "properties", bottom: "sketch"   },
};

// ── Panel registry ────────────────────────────────────────────────────────────
function LeftPanel({ panel, onAction, onSelectObject }) {
  switch (panel) {
    case "scene":      return <SceneOutliner onSelectObject={onSelectObject} />;
    case "sculpt":     return <SculptPanel onAction={onAction} />;
    case "generators": return <GeneratorsPanel onAction={onAction} />;
    case "mesh":       return <ProMeshPanel onAction={onAction} />;
    default:           return <SceneOutliner onSelectObject={onSelectObject} />;
  }
}

function RightPanel({ panel, onAction, selectedObject }) {
  switch (panel) {
    case "properties": return <PropertyInspector selectedObject={selectedObject} />;
    case "uv":         return <UVEditor onAction={onAction} />;
    case "rigging":    return <RiggingPanel onAction={onAction} />;
    case "modifiers":  return <ModifierStack onAction={onAction} />;
    case "material":   return <NodeMaterialEditor onAction={onAction} />;
    case "mesh":       return <ProMeshPanel onAction={onAction} />;
    case "sculpt":     return <SculptPanel onAction={onAction} />;
    default:           return <PropertyInspector selectedObject={selectedObject} />;
  }
}

function BottomPanel({ panel, onAction }) {
  switch (panel) {
    case "sketch":   return <SPXSketch />;
    case "timeline": return <Timeline />;
    default:         return <Timeline />;
  }
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState("Modeling");
  const [activeTool,      setActiveTool]      = useState("select");
  const [selectedObject,  setSelectedObject]  = useState(null);

  // Override panels per-session (menu actions can switch panels)
  const [panelOverride, setPanelOverride] = useState({});

  // Effective layout = workspace default + any overrides
  const baseLayout = WORKSPACE_LAYOUTS[activeWorkspace] || WORKSPACE_LAYOUTS.Modeling;
  const layout     = { ...baseLayout, ...panelOverride };

  // Switch workspace → reset overrides
  const handleSetWorkspace = (ws) => {
    setActiveWorkspace(ws);
    setPanelOverride({});
  };

  // ── Menu action router ──────────────────────────────────────────────────
  const handleMenuAction = useCallback((fn) => {
    switch (fn) {
      // Panel switches via menu
      case "openUVEditor":    setPanelOverride(o=>({...o, right:"uv"}));       break;
      case "openMatEditor":   setPanelOverride(o=>({...o, right:"material"})); break;
      case "toggleNPanel":    setPanelOverride(o=>({...o, right:"properties"})); break;

      // Workspace switches
      case "ws_modeling":    handleSetWorkspace("Modeling");    break;
      case "ws_sculpt":      handleSetWorkspace("Sculpt");      break;
      case "ws_uv":          handleSetWorkspace("UV");          break;
      case "ws_animation":   handleSetWorkspace("Animation");   break;
      case "ws_rigging":     handleSetWorkspace("Rigging");     break;
      case "ws_shading":     handleSetWorkspace("Shading");     break;
      case "ws_rendering":   handleSetWorkspace("Rendering");   break;
      case "ws_vfx":         handleSetWorkspace("VFX");         break;
      case "ws_generators":  handleSetWorkspace("Generators");  break;
      case "ws_sketch":      handleSetWorkspace("Sketch");      break;

      // Sketch
      case "sketch_open":    setPanelOverride(o=>({...o, bottom:"sketch"}));   break;
      case "sketch_close":   setPanelOverride(o=>({...o, bottom:"timeline"})); break;

      // Mesh tools → switch left to mesh panel
      case "extrude": case "loop_cut": case "bevel": case "inset":
      case "knife": case "edge_slide": case "bridge_loops":
        setPanelOverride(o=>({...o, left:"mesh"}));
        break;

      // Sculpt
      case "brush_draw": case "brush_clay": case "brush_smooth":
      case "brush_grab": case "dyntopo": case "voxel_remesh":
        handleSetWorkspace("Sculpt");
        break;

      // Rigging
      case "create_armature": case "ik_chain": case "heat_weights":
      case "mocap_retarget":
        handleSetWorkspace("Rigging");
        break;

      // Generators
      case "body_generate": case "face_generate": case "terrain_generate":
      case "city_generate": case "creature_generate": case "vehicle_generate":
      case "convert_3d_to_2d":
        handleSetWorkspace("Generators");
        break;

      // Rendering
      case "pt_start": case "pt_stop": case "takeSnapshot":
        handleSetWorkspace("Rendering");
        break;

      // File ops
      case "newScene":
        if (window.confirm("Start new scene? Unsaved work will be lost.")) {
          window.location.reload();
        }
        break;
      case "exportToStreamPireX":
        alert("Exporting to StreamPireX… (Connect StreamPireX account to enable)");
        break;
      case "showAbout":
        alert("SPX 3D Mesh Editor v2.0\nBuilt by StreamPireX\nCompeting with Maya & Blender");
        break;

      default:
        // Log unknown actions for wiring later
        console.log("SPX Action:", fn);
        break;
    }
  }, []);

  return (
    <ProfessionalShell
      activeWorkspace={activeWorkspace}
      setActiveWorkspace={handleSetWorkspace}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      onMenuAction={handleMenuAction}
      leftPanel={
        <LeftPanel
          panel={layout.left}
          onAction={handleMenuAction}
          onSelectObject={setSelectedObject}
        />
      }
      centerPanel={
        <Viewport
          activeTool={activeTool}
          onSelectObject={setSelectedObject}
        />
      }
      rightPanel={
        <RightPanel
          panel={layout.right}
          onAction={handleMenuAction}
          selectedObject={selectedObject}
        />
      }
      bottomPanel={
        <BottomPanel
          panel={layout.bottom}
          onAction={handleMenuAction}
        />
      }
    />
  );
}
import "./styles/spx-film.css";
