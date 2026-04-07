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
import FilmMaterialsPanel  from "./components/panels/FilmMaterialsPanel";
import PathTracerPanel     from "./components/panels/PathTracerPanel";
import MocapPanel          from "./components/panels/MocapPanel";
import LeftToolbar         from "./components/panels/LeftToolbar";
import "./styles/spx-shell.css";
import "./styles/spx-panels.css";
import "./styles/spx-tools.css";
import "./styles/spx-generators.css";
import "./styles/spx-nodeeditor.css";
import "./styles/spx-sketch.css";
import "./styles/spx-film.css";
import "./styles/spx-asset-browser.css";
import "./styles/spx-toolbar-mocap.css";

const WORKSPACE_LAYOUTS = {
  Modeling:    { left:"scene",     right:"properties", bottom:"timeline" },
  Sculpt:      { left:"sculpt",    right:"properties", bottom:"timeline" },
  UV:          { left:"scene",     right:"uv",         bottom:"timeline" },
  Animation:   { left:"scene",     right:"properties", bottom:"timeline" },
  Rigging:     { left:"scene",     right:"rigging",    bottom:"timeline" },
  Shading:     { left:"scene",     right:"material",   bottom:"timeline" },
  Rendering:   { left:"scene",     right:"render",     bottom:"timeline" },
  VFX:         { left:"scene",     right:"modifiers",  bottom:"timeline" },
  Mocap:       { left:"scene",     right:"mocap",      bottom:"timeline" },
  Generators:  { left:"generators",right:"properties", bottom:"timeline" },
  Sketch:      { left:"scene",     right:"properties", bottom:"sketch"   },
  Camera:      { left:"scene",     right:"camera",     bottom:"timeline" },
  Lighting:    { left:"scene",     right:"lighting",   bottom:"timeline" },
  GeoNodes:    { left:"geonodes",  right:"properties", bottom:"timeline" },
  Assets:      { left:"assets",    right:"properties", bottom:"timeline" },
  FilmMat:     { left:"scene",     right:"filmmat",    bottom:"timeline" },
  PathTrace:   { left:"scene",     right:"pathtrace",  bottom:"timeline" },
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
    case "filmmat":    return <FilmMaterialsPanel onAction={onAction}/>;
    case "pathtrace":  return <PathTracerPanel onAction={onAction}/>;
    case "mocap":      return <MocapPanel onAction={onAction}/>;
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
  const viewportActionRef = useRef(null);

  const baseLayout = WORKSPACE_LAYOUTS[activeWorkspace] || WORKSPACE_LAYOUTS.Modeling;
  const layout     = { ...baseLayout, ...panelOverride };

  const handleSetWorkspace = useCallback((ws) => {
    setActiveWorkspace(ws);
    setPanelOverride({});
  }, []);

  const handleToolChange = useCallback((toolId) => {
    setActiveTool(toolId);
    viewportActionRef.current?.("tool_change", { tool: toolId });
  }, []);

  const handleMenuAction = useCallback((fn, params) => {
    switch(fn) {
      case "openUVEditor":   setPanelOverride(o=>({...o,right:"uv"}));      break;
      case "openMatEditor":  setPanelOverride(o=>({...o,right:"material"})); break;
      case "openGeoNodes":   handleSetWorkspace("GeoNodes");                 break;
      case "openAssets":     handleSetWorkspace("Assets");                   break;
      case "openCamera":     handleSetWorkspace("Camera");                   break;
      case "openLighting":   handleSetWorkspace("Lighting");                 break;
      case "openFilmMat":    handleSetWorkspace("FilmMat");                  break;
      case "openPathTrace":  handleSetWorkspace("PathTrace");                break;
      case "openMocap":      handleSetWorkspace("Mocap");                    break;
      case "cam_apply":      setFilmParams(params);                          break;
      case "lighting_apply": setLightingParams(params);                      break;
      case "render_start":   setRenderParams(params); handleSetWorkspace("Rendering"); break;
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
      case "ws_filmmat":     handleSetWorkspace("FilmMat");    break;
      case "ws_pathtrace":   handleSetWorkspace("PathTrace");  break;
      case "ws_mocap":       handleSetWorkspace("Mocap");      break;
      case "filmmat_skin": case "filmmat_hair": case "filmmat_hair_remove":
      case "filmmat_pbr":  case "filmmat_fog":  case "filmmat_fog_remove":
      case "filmmat_lod":  case "filmmat_instanced_foliage": case "filmmat_instanced_clear":
        viewportActionRef.current?.(fn, params); break;
      case "pt_start": case "pt_stop": case "pt_enable": case "pt_disable":
      case "pt_reset": case "pt_sky":  case "pt_env_intensity":
      case "pt_upgrade_materials": case "pt_export_png": case "pt_get_progress":
        viewportActionRef.current?.(fn, params);
        if(fn==="pt_start") handleSetWorkspace("PathTrace");
        break;
      case "gen_terrain": case "gen_city": case "gen_foliage":
      case "gen_crowd":   case "gen_vehicle": case "gen_clear":
        handleSetWorkspace("Generators");
        viewportActionRef.current?.(fn, params);
        break;
      case "mocap_pose":
        viewportActionRef.current?.(fn, params); break;
      case "mocap_apply_clip":
        viewportActionRef.current?.(fn, params); break;
      // Toolbar tool actions
      case "move": case "rotate": case "scale": case "transform":
        setActiveTool(fn);
        viewportActionRef.current?.("gizmo_mode", { mode: fn === "transform" ? "translate" : fn });
        break;
      case "select": case "select_box": case "select_circle": case "select_lasso":
        setActiveTool(fn); break;
      case "add_cube":     viewportActionRef.current?.("add_prim",{type:"cube"});     break;
      case "add_sphere":   viewportActionRef.current?.("add_prim",{type:"sphere"});   break;
      case "add_cylinder": viewportActionRef.current?.("add_prim",{type:"cylinder"}); break;
      case "add_cone":     viewportActionRef.current?.("add_prim",{type:"cone"});     break;
      case "add_torus":    viewportActionRef.current?.("add_prim",{type:"torus"});    break;
      case "add_plane":    viewportActionRef.current?.("add_prim",{type:"plane"});    break;
      case "add_armature": viewportActionRef.current?.("create_rig",{}); handleSetWorkspace("Rigging"); break;
      case "brush_draw": case "brush_clay": case "brush_smooth":
        handleSetWorkspace("Sculpt"); break;
      case "create_armature": case "ik_chain": case "heat_weights":
        handleSetWorkspace("Rigging"); break;
      case "sketch_open":  setPanelOverride(o=>({...o,bottom:"sketch"}));   break;
      case "sketch_close": setPanelOverride(o=>({...o,bottom:"timeline"})); break;
      case "newScene":
        if(window.confirm("Start new scene?")) window.location.reload(); break;
      case "showAbout":
        alert("SPX 3D Mesh Editor v2.0\nStreamPireX\n\nFilm Quality: SSS Skin, Strand Hair, Path Tracer\nMoCap: Body + Face (468pts) + Hands + Video\nSub-object: 1=Vert 2=Edge 3=Face\nTransform Gizmos: G=Move R=Rotate S=Scale"); break;
      default:
        console.log("SPX:", fn, params); break;
    }
  }, [handleSetWorkspace]);

  const handleImport = useCallback((asset) => {
    viewportActionRef.current?.("asset_import", asset);
  }, []);

  return (
    <div className="spx-app-root">
      <ProfessionalShell
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={handleSetWorkspace}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onMenuAction={handleMenuAction}
        leftToolbar={
          <LeftToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onAction={handleMenuAction}
          />
        }
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
            onRegisterAction={fn=>{ viewportActionRef.current=fn; }}
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
    </div>
  );
}
