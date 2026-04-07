import React, { useState, useCallback, useRef } from "react";
import ProfessionalShell   from "./pro-ui/ProfessionalShell";
import Viewport            from "./components/viewport/Viewport";
import SceneOutliner       from "./components/panels/SceneOutliner";
import PropertyInspector   from "./components/panels/PropertyInspector";
import Timeline            from "./components/panels/Timeline";
import ProMeshPanel        from "./components/panels/ProMeshPanel";
import SculptPanel         from "./components/panels/SculptPanel";
import UVEditor            from "./components/panels/UVEditor";
import RiggingPanel        from "./components/panels/RiggingPanel";
import ModifierStack       from "./components/panels/ModifierStack";
import NodeMaterialEditor  from "./components/panels/NodeMaterialEditor";
import GeneratorsPanel     from "./components/panels/GeneratorsPanel";
import SPXSketch           from "./components/panels/SPXSketch";
import FilmCameraPanel     from "./components/panels/FilmCameraPanel";
import FilmLightingPanel   from "./components/panels/FilmLightingPanel";
import FilmRenderPanel     from "./components/panels/FilmRenderPanel";
import AssetBrowser        from "./components/panels/AssetBrowser";
import GeometryNodesPanel  from "./components/panels/GeometryNodesPanel";
import "./styles/spx-shell.css";
import "./styles/spx-panels.css";
import "./styles/spx-tools.css";
import "./styles/spx-generators.css";
import "./styles/spx-nodeeditor.css";
import "./styles/spx-sketch.css";
import "./styles/spx-film.css";
import "./styles/spx-asset-browser.css";

const WORKSPACE_LAYOUTS = {
  Modeling:    { left:"scene",     right:"properties", bottom:"timeline" },
  Sculpt:      { left:"sculpt",    right:"properties", bottom:"timeline" },
  UV:          { left:"scene",     right:"uv",         bottom:"timeline" },
  Animation:   { left:"scene",     right:"properties", bottom:"timeline" },
  Rigging:     { left:"scene",     right:"rigging",    bottom:"timeline" },
  Shading:     { left:"scene",     right:"material",   bottom:"timeline" },
  Rendering:   { left:"scene",     right:"render",     bottom:"timeline" },
  VFX:         { left:"scene",     right:"modifiers",  bottom:"timeline" },
  Mocap:       { left:"scene",     right:"rigging",    bottom:"timeline" },
  Generators:  { left:"generators",right:"properties", bottom:"timeline" },
  Sketch:      { left:"scene",     right:"properties", bottom:"sketch"   },
  Camera:      { left:"scene",     right:"camera",     bottom:"timeline" },
  Lighting:    { left:"scene",     right:"lighting",   bottom:"timeline" },
  GeoNodes:    { left:"geonodes",  right:"properties", bottom:"timeline" },
  Assets:      { left:"assets",    right:"properties", bottom:"timeline" },
};

function LeftPanel({ panel, onAction, onSelectObject, onImport }) {
  switch(panel) {
    case "scene":      return <SceneOutliner onSelectObject={onSelectObject}/>;
    case "sculpt":     return <SculptPanel onAction={onAction}/>;
    case "generators": return <GeneratorsPanel onAction={onAction}/>;
    case "mesh":       return <ProMeshPanel onAction={onAction}/>;
    case "geonodes":   return <GeometryNodesPanel onAction={onAction}/>;
    case "assets":     return <AssetBrowser onImport={onImport} onAction={onAction}/>;
    default:           return <SceneOutliner onSelectObject={onSelectObject}/>;
  }
}

function RightPanel({ panel, onAction, selectedObject }) {
  switch(panel) {
    case "properties": return <PropertyInspector selectedObject={selectedObject}/>;
    case "uv":         return <UVEditor onAction={onAction}/>;
    case "rigging":    return <RiggingPanel onAction={onAction}/>;
    case "modifiers":  return <ModifierStack onAction={onAction}/>;
    case "material":   return <NodeMaterialEditor onAction={onAction}/>;
    case "camera":     return <FilmCameraPanel onAction={onAction}/>;
    case "lighting":   return <FilmLightingPanel onAction={onAction}/>;
    case "render":     return <FilmRenderPanel onAction={onAction}/>;
    default:           return <PropertyInspector selectedObject={selectedObject}/>;
  }
}

function BottomPanel({ panel }) {
  switch(panel) {
    case "sketch":   return <SPXSketch/>;
    case "timeline": return <Timeline/>;
    default:         return <Timeline/>;
  }
}

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState("Modeling");
  const [activeTool,      setActiveTool]      = useState("select");
  const [selectedObject,  setSelectedObject]  = useState(null);
  const [panelOverride,   setPanelOverride]   = useState({});
  const [filmParams,      setFilmParams]      = useState(null);
  const [lightingParams,  setLightingParams]  = useState(null);
  const [renderParams,    setRenderParams]    = useState(null);
  // Generator actions forwarded to viewport via ref
  const viewportActionRef = useRef(null);

  const baseLayout = WORKSPACE_LAYOUTS[activeWorkspace] || WORKSPACE_LAYOUTS.Modeling;
  const layout     = { ...baseLayout, ...panelOverride };

  const handleSetWorkspace = useCallback((ws) => {
    setActiveWorkspace(ws);
    setPanelOverride({});
  }, []);

  const handleMenuAction = useCallback((fn, params) => {
    switch(fn) {
      // Panel switches
      case "openUVEditor":   setPanelOverride(o=>({...o,right:"uv"}));      break;
      case "openMatEditor":  setPanelOverride(o=>({...o,right:"material"})); break;
      case "openGeoNodes":   handleSetWorkspace("GeoNodes");                 break;
      case "openAssets":     handleSetWorkspace("Assets");                   break;
      case "openCamera":     handleSetWorkspace("Camera");                   break;
      case "openLighting":   handleSetWorkspace("Lighting");                 break;
      // Camera/lighting/render wiring
      case "cam_apply":      setFilmParams(params); break;
      case "lighting_apply": setLightingParams(params); break;
      case "render_start":   setRenderParams(params); handleSetWorkspace("Rendering"); break;
      // Workspace switches
      case "ws_modeling":    handleSetWorkspace("Modeling");   break;
      case "ws_sculpt":      handleSetWorkspace("Sculpt");     break;
      case "ws_uv":          handleSetWorkspace("UV");         break;
      case "ws_animation":   handleSetWorkspace("Animation");  break;
      case "ws_rigging":     handleSetWorkspace("Rigging");    break;
      case "ws_shading":     handleSetWorkspace("Shading");    break;
      case "ws_rendering":   handleSetWorkspace("Rendering");  break;
      case "ws_generators":  handleSetWorkspace("Generators"); break;
      case "ws_sketch":      handleSetWorkspace("Sketch");     break;
      case "ws_camera":      handleSetWorkspace("Camera");     break;
      case "ws_lighting":    handleSetWorkspace("Lighting");   break;
      case "ws_assets":      handleSetWorkspace("Assets");     break;
      case "ws_geonodes":    handleSetWorkspace("GeoNodes");   break;
      // Generators → switch workspace + forward to viewport
      case "gen_terrain": case "gen_city": case "gen_foliage":
      case "gen_crowd":   case "gen_vehicle":
        handleSetWorkspace("Generators");
        viewportActionRef.current?.(fn, params);
        break;
      case "gen_clear":
        viewportActionRef.current?.("gen_clear");
        break;
      // Sculpt
      case "brush_draw": case "brush_clay": case "brush_smooth":
        handleSetWorkspace("Sculpt"); break;
      // Rigging
      case "create_armature": case "ik_chain": case "heat_weights":
        handleSetWorkspace("Rigging"); break;
      // File
      case "newScene":
        if(window.confirm("Start new scene?")) window.location.reload(); break;
      case "showAbout":
        alert("SPX 3D Mesh Editor v2.0\nStreamPireX — Indie Film & AAA Quality\n\nSub-object: 1=Vert 2=Edge 3=Face\nSculpt: 9 brushes + X-symmetry\nRigging: FABRIK IK + auto weights"); break;
      case "sketch_open":  setPanelOverride(o=>({...o,bottom:"sketch"}));   break;
      case "sketch_close": setPanelOverride(o=>({...o,bottom:"timeline"})); break;
      default:
        console.log("SPX:", fn, params); break;
    }
  }, [handleSetWorkspace]);

  const handleImport = useCallback((asset) => {
    console.log("Import:", asset.name);
    viewportActionRef.current?.("asset_import", asset);
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
          onImport={handleImport}
        />
      }
      centerPanel={
        <Viewport
          activeTool={activeTool}
          onSelectObject={setSelectedObject}
          filmParams={filmParams}
          lightingParams={lightingParams}
          renderParams={renderParams}
          onRegisterAction={(fn)=>{ viewportActionRef.current=fn; }}
        />
      }
      rightPanel={
        <RightPanel
          panel={layout.right}
          onAction={handleMenuAction}
          selectedObject={selectedObject}
        />
      }
      bottomPanel={<BottomPanel panel={layout.bottom}/>}
    />
  );
}
