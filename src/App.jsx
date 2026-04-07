import React, { useState } from "react";
import ProfessionalShell from "./pro-ui/ProfessionalShell";
import Viewport from "./components/viewport/Viewport";
import SceneOutliner from "./components/panels/SceneOutliner";
import PropertyInspector from "./components/panels/PropertyInspector";
import "./styles/spx-shell.css";
import "./styles/spx-panels.css";

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState("Modeling");
  const [activeTool, setActiveTool] = useState("select");
  const [selectedObject, setSelectedObject] = useState(null);

  return (
    <ProfessionalShell
      activeWorkspace={activeWorkspace}
      setActiveWorkspace={setActiveWorkspace}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      onMenuAction={(fn) => console.log(fn)}
      leftPanel={<SceneOutliner onSelectObject={setSelectedObject} />}
      centerPanel={<Viewport activeTool={activeTool} onSelectObject={setSelectedObject} />}
      rightPanel={<PropertyInspector selectedObject={selectedObject} />}
    />
  );
}
