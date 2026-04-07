import React, { useState, useRef, useEffect } from "react";
import { BUILTIN_SCRIPTS } from "../../mesh/SPXScriptingAPI";

export default function ScriptingPanel({ onAction }) {
  const [code,     setCode]     = useState(BUILTIN_SCRIPTS[0].code.trim());
  const [output,   setOutput]   = useState([]);
  const [scripts,  setScripts]  = useState(BUILTIN_SCRIPTS);
  const [selScript,setSelScript]= useState(BUILTIN_SCRIPTS[0].name);
  const [saveName, setSaveName] = useState("");
  const [running,  setRunning]  = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const run = () => {
    setRunning(true);
    setOutput(prev => [...prev, { level:"info", msg:`▶ Running script…`, time:Date.now() }]);
    onAction?.("script_run", {
      code,
      onLog: (entry) => setOutput(prev => [...prev, entry]),
      onDone: () => setRunning(false),
    });
    // Fallback timeout
    setTimeout(() => setRunning(false), 5000);
  };

  const loadScript = (name) => {
    const s = scripts.find(s=>s.name===name);
    if (s) { setCode(s.code.trim()); setSelScript(name); }
  };

  const saveScript = () => {
    if (!saveName.trim()) return;
    const s = { name:saveName.trim(), code };
    setScripts(prev => [...prev.filter(s=>s.name!==saveName), s]);
    setSaveName("");
    onAction?.("script_save", s);
  };

  const clearOutput = () => setOutput([]);

  const LOG_COLORS = { info:"var(--text1)", warn:"var(--orange)", error:"#e44" };

  return (
    <div className="spx-script-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">SPX Script</span>
        <div className="spx-script-hdr-btns">
          <button className={`spx-panel-action-btn spx-film-apply-btn${running?" spx-script-running":""}`} onClick={run} disabled={running}>
            {running?"⏳ Running…":"▶ Run"}
          </button>
          <button className="spx-panel-action-btn" onClick={clearOutput}>Clear</button>
        </div>
      </div>

      {/* Script library */}
      <div className="spx-script-library">
        <span className="spx-script-lib-label">Scripts</span>
        <select className="spx-film-select" value={selScript} onChange={e=>loadScript(e.target.value)}>
          {scripts.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <input
          className="spx-nm-search"
          type="text"
          placeholder="Save as…"
          value={saveName}
          onChange={e=>setSaveName(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") saveScript(); }}
        />
        <button className="spx-tl-btn" onClick={saveScript} title="Save script">💾</button>
      </div>

      {/* Editor */}
      <div className="spx-script-editor-wrap">
        <textarea
          className="spx-script-editor"
          value={code}
          onChange={e=>setCode(e.target.value)}
          spellCheck={false}
          onKeyDown={e=>{
            if(e.key==="Tab"){e.preventDefault();const s=e.target.selectionStart,en=e.target.selectionEnd;setCode(c=>c.substring(0,s)+"  "+c.substring(en));setTimeout(()=>{e.target.selectionStart=e.target.selectionEnd=s+2;},0);}
            if(e.key==="Enter"&&e.ctrlKey){e.preventDefault();run();}
          }}
        />
      </div>

      {/* API reference */}
      <details className="spx-script-api">
        <summary className="spx-script-api-hdr">API Reference</summary>
        <div className="spx-script-api-body">
          {[
            ["scene()", "Get THREE.Scene"],
            ["meshes()", "Get all meshes array"],
            ["selected()", "Get selected mesh"],
            ["createBox(w,h,d,name)", "Create box mesh"],
            ["createSphere(r,name)", "Create sphere"],
            ["createCylinder(r,h,name)", "Create cylinder"],
            ["createCone(r,h,name)", "Create cone"],
            ["createTorus(R,r,name)", "Create torus"],
            ["createPlane(w,h,name)", "Create plane"],
            ["extrude(mesh,amt)", "Extrude mesh"],
            ["bevel(mesh,amt,segs)", "Bevel mesh"],
            ["subdivide(mesh,levels)", "Subdivide"],
            ["smooth(mesh,iter,factor)", "Smooth"],
            ["knife(mesh,normal,point)", "Knife cut"],
            ["spin(mesh,steps,angle,axis)", "Spin/lathe"],
            ["screw(mesh,steps,height,turns)", "Screw"],
            ["boolean(a,b,'union')", "Boolean op"],
            ["translate(mesh,x,y,z)", "Set position"],
            ["rotate(mesh,x,y,z)", "Set rotation"],
            ["scale(mesh,x,y,z)", "Set scale"],
            ["setColor(mesh,'#hex')", "Set color"],
            ["setRoughness(mesh,v)", "Set roughness"],
            ["setMetalness(mesh,v)", "Set metalness"],
            ["duplicate(mesh)", "Duplicate mesh"],
            ["delete(mesh)", "Remove mesh"],
            ["select('name')", "Get mesh by name"],
            ["print(...args)", "Log to console"],
            ["Vector3(x,y,z)", "Create vector"],
            ["Color('#hex')", "Create color"],
          ].map(([fn,desc])=>(
            <div key={fn} className="spx-script-api-row">
              <span className="spx-script-api-fn">{fn}</span>
              <span className="spx-script-api-desc">{desc}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Output console */}
      <div className="spx-script-output" ref={outputRef}>
        {output.length===0&&<span className="spx-script-empty">Output appears here…</span>}
        {output.map((entry,i)=>(
          <div key={i} className="spx-script-log-row" ref={el=>{if(el)el.style.color=LOG_COLORS[entry.level]||"var(--text1)";}}>
            <span className="spx-script-log-level">{entry.level==="error"?"✗":entry.level==="warn"?"⚠":"›"}</span>
            <span className="spx-script-log-msg">{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
