import React, { useState } from "react";
import ProfessionalShell from "./pro-ui/ProfessionalShell";
import "./styles/spx-shell.css";

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState("Modeling");
  const [activeTool, setActiveTool] = useState("select");

  return (
    <ProfessionalShell
      activeWorkspace={activeWorkspace}
      setActiveWorkspace={setActiveWorkspace}
      activeTool={activeTool}
      setActiveTool={setActiveTool}
      onMenuAction={(fn) => console.log(fn)}
    />
  );
}
