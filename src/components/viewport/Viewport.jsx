import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

const NEAR = 0.01;
const FAR  = 10000;
const FOV  = 60;

export default function Viewport({ activeTool, onSelectObject }) {
  const mountRef   = useRef(null);
  const rendererRef= useRef(null);
  const sceneRef   = useRef(null);
  const cameraRef  = useRef(null);
  const rafRef     = useRef(null);
  const mouseRef   = useRef({ x:0, y:0, button:-1, down:false });
  const orbitRef   = useRef({ theta:0.7, phi:1.1, radius:8, target:new THREE.Vector3() });
  const selectedRef= useRef(null);
  const meshesRef  = useRef([]);

  const [fps,       setFps]       = useState(0);
  const [polyCount, setPolyCount] = useState(0);
  const [viewMode,  setViewMode]  = useState("solid");
  const [editMode,  setEditMode]  = useState("OBJECT");
  const [statusMsg, setStatusMsg] = useState("Viewport Ready");

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(FOV, el.clientWidth/el.clientHeight, NEAR, FAR);
    camera.position.set(5,4,8); camera.lookAt(0,0,0);
    cameraRef.current = camera;

    scene.add(new THREE.GridHelper(20,20,0x1a1a2e,0x111120));
    scene.add(new THREE.AxesHelper(1));

    const addMesh = (geo, name, pos) => {
      const mat  = new THREE.MeshStandardMaterial({ color:0x888aaa, metalness:0.1, roughness:0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name  = name;
      mesh.position.copy(pos||new THREE.Vector3());
      mesh.castShadow = mesh.receiveShadow = true;
      const outM = new THREE.MeshBasicMaterial({ color:0x00ffc8, side:THREE.BackSide });
      const out  = new THREE.Mesh(new THREE.BoxGeometry(2.04,2.04,2.04), outM);
      out.name   = "SelectionOutline";
      out.visible= false;
      mesh.add(out);
      scene.add(mesh);
      meshesRef.current.push(mesh);
      return mesh;
    };

    const cube = addMesh(new THREE.BoxGeometry(2,2,2), "DefaultCube");
    cube.children[0].visible = true;
    selectedRef.current = cube;

    scene.add(new THREE.AmbientLight(0xffffff,0.4));
    const sun = new THREE.DirectionalLight(0xffffff,1.2);
    sun.position.set(5,10,5); sun.castShadow=true; scene.add(sun);
    scene.add(Object.assign(new THREE.DirectionalLight(0x8899ff,0.3), { position: new THREE.Vector3(-5,3,-5) }));

    setPolyCount(4);

    let last=performance.now(), frames=0, fpsTimer=0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const now=performance.now(), dt=(now-last)/1000; last=now; frames++; fpsTimer+=dt;
      if (fpsTimer>=0.5) { setFps(Math.round(frames/fpsTimer)); frames=0; fpsTimer=0; }
      const o=orbitRef.current, cam=cameraRef.current;
      if (cam) {
        const x=o.radius*Math.sin(o.phi)*Math.sin(o.theta), y=o.radius*Math.cos(o.phi), z=o.radius*Math.sin(o.phi)*Math.cos(o.theta);
        cam.position.set(x+o.target.x, y+o.target.y, z+o.target.z);
        cam.lookAt(o.target);
      }
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth/el.clientHeight;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);

  // ── Select outline helper ─────────────────────────────────────────────────
  const showOutline = (mesh, show) => {
    mesh?.children.forEach(c => { if (c.name==="SelectionOutline") c.visible=show; });
  };

  // ── Raypick ───────────────────────────────────────────────────────────────
  const doPick = useCallback((e) => {
    const el=mountRef.current, cam=cameraRef.current;
    if (!el||!cam) return;
    const rect=el.getBoundingClientRect();
    const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    const ray=new THREE.Raycaster();
    ray.setFromCamera(mouse, cam);
    const hits=ray.intersectObjects(meshesRef.current,true).filter(h=>h.object.name!=="SelectionOutline");
    if (hits.length>0) {
      const hit=hits[0].object.isMesh?hits[0].object:hits[0].object.parent;
      showOutline(selectedRef.current, false);
      selectedRef.current=hit;
      showOutline(hit, true);
      onSelectObject?.(hit.name);
      setStatusMsg(`Selected: ${hit.name}`);
    }
  }, [onSelectObject]);

  // ── Extrude ───────────────────────────────────────────────────────────────
  const doExtrude = useCallback(() => {
    const sel=selectedRef.current, scene=sceneRef.current;
    if (!sel||!scene) return;
    const clone=new THREE.Mesh(sel.geometry.clone(), sel.material.clone());
    clone.name=`Extrude_${Date.now()}`;
    clone.position.copy(sel.position);
    clone.position.y+=2.2;
    clone.castShadow=clone.receiveShadow=true;
    const outM=new THREE.MeshBasicMaterial({color:0x00ffc8,side:THREE.BackSide});
    const out=new THREE.Mesh(new THREE.BoxGeometry(2.04,2.04,2.04),outM);
    out.name="SelectionOutline"; out.visible=true;
    clone.add(out);
    showOutline(sel, false);
    scene.add(clone);
    meshesRef.current.push(clone);
    selectedRef.current=clone;
    onSelectObject?.(clone.name);
    setStatusMsg(`Extruded → ${clone.name}`);
  }, [onSelectObject]);

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const doDuplicate = useCallback(() => {
    const sel=selectedRef.current, scene=sceneRef.current;
    if (!sel||!scene) return;
    const clone=new THREE.Mesh(sel.geometry.clone(), sel.material.clone());
    clone.name=`${sel.name}_copy`;
    clone.position.copy(sel.position); clone.position.x+=2.5;
    clone.castShadow=clone.receiveShadow=true;
    const outM=new THREE.MeshBasicMaterial({color:0x00ffc8,side:THREE.BackSide});
    const out=new THREE.Mesh(new THREE.BoxGeometry(2.04,2.04,2.04),outM);
    out.name="SelectionOutline"; out.visible=true;
    clone.add(out);
    showOutline(sel,false);
    scene.add(clone);
    meshesRef.current.push(clone);
    selectedRef.current=clone;
    setStatusMsg(`Duplicated → ${clone.name}`);
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = useCallback(() => {
    const sel=selectedRef.current, scene=sceneRef.current;
    if (!sel||!scene) return;
    scene.remove(sel);
    meshesRef.current=meshesRef.current.filter(m=>m!==sel);
    const next=meshesRef.current[0]||null;
    selectedRef.current=next;
    showOutline(next,true);
    setStatusMsg("Deleted");
  }, []);

  // ── Add primitive ─────────────────────────────────────────────────────────
  const doAddPrim = useCallback((type) => {
    const geos = {
      cube:     new THREE.BoxGeometry(2,2,2),
      sphere:   new THREE.SphereGeometry(1,32,16),
      cylinder: new THREE.CylinderGeometry(1,1,2,32),
      torus:    new THREE.TorusGeometry(1,0.4,16,48),
      plane:    new THREE.PlaneGeometry(2,2),
      cone:     new THREE.ConeGeometry(1,2,32),
    };
    const geo  = geos[type]||geos.cube;
    const mat  = new THREE.MeshStandardMaterial({color:0x888aaa,metalness:0.1,roughness:0.6});
    const mesh = new THREE.Mesh(geo,mat);
    mesh.name  = `${type}_${Date.now()}`;
    mesh.castShadow=mesh.receiveShadow=true;
    const outM = new THREE.MeshBasicMaterial({color:0x00ffc8,side:THREE.BackSide});
    const out  = new THREE.Mesh(new THREE.BoxGeometry(2.2,2.2,2.2),outM);
    out.name   = "SelectionOutline"; out.visible=true;
    mesh.add(out);
    showOutline(selectedRef.current,false);
    sceneRef.current?.add(mesh);
    meshesRef.current.push(mesh);
    selectedRef.current=mesh;
    setStatusMsg(`Added ${type}`);
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)) return;
      const sel=selectedRef.current;
      switch(e.key.toLowerCase()) {
        case "e": doExtrude(); break;
        case "x": case "delete": doDelete(); break;
        case "d": if(e.shiftKey){e.preventDefault();doDuplicate();} break;
        case "tab": e.preventDefault(); setEditMode(m=>{const nm=m==="OBJECT"?"EDIT":"OBJECT"; setStatusMsg(nm+" Mode"); return nm;}); break;
        case "f": if(sel){orbitRef.current.target.copy(sel.position);setStatusMsg(`Focus: ${sel.name}`);} break;
        case "g": if(sel) setStatusMsg("Grab — use arrow keys or drag"); break;
        case "r": if(sel) setStatusMsg("Rotate — use arrow keys"); break;
        case "s": if(sel) setStatusMsg("Scale — use arrow keys"); break;
        case "arrowleft":  if(sel){sel.position.x-=0.1;} break;
        case "arrowright": if(sel){sel.position.x+=0.1;} break;
        case "arrowup":    if(sel){if(e.shiftKey)sel.position.z-=0.1;else sel.position.y+=0.1;} break;
        case "arrowdown":  if(sel){if(e.shiftKey)sel.position.z+=0.1;else sel.position.y-=0.1;} break;
        default: break;
      }
    };
    window.addEventListener("keydown",down);
    return ()=>window.removeEventListener("keydown",down);
  }, [doExtrude, doDelete, doDuplicate]);

  // ── Mouse ─────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    mouseRef.current={...mouseRef.current,x:e.clientX,y:e.clientY,button:e.button,down:true};
    if(e.button===0&&!e.altKey) doPick(e);
    e.preventDefault();
  },[doPick]);

  const onMouseMove = useCallback((e) => {
    if(!mouseRef.current.down) return;
    const dx=e.clientX-mouseRef.current.x, dy=e.clientY-mouseRef.current.y;
    mouseRef.current.x=e.clientX; mouseRef.current.y=e.clientY;
    const o=orbitRef.current;
    if(mouseRef.current.button===1||(mouseRef.current.button===0&&e.altKey)){
      o.theta-=dx*0.006;
      o.phi=Math.max(0.1,Math.min(Math.PI-0.1,o.phi+dy*0.006));
    } else if(mouseRef.current.button===2){
      const cam=cameraRef.current; if(!cam) return;
      const right=new THREE.Vector3().crossVectors(cam.getWorldDirection(new THREE.Vector3()),cam.up).normalize();
      const up=cam.up.clone().normalize();
      const spd=o.radius*0.001;
      o.target.addScaledVector(right,-dx*spd);
      o.target.addScaledVector(up,dy*spd);
    }
  },[]);

  const onMouseUp  = useCallback(()=>{mouseRef.current.down=false;},[]);
  const onWheel    = useCallback((e)=>{orbitRef.current.radius=Math.max(0.5,Math.min(500,orbitRef.current.radius*(1+e.deltaY*0.001)));e.preventDefault();},[]);
  const onCtxMenu  = useCallback((e)=>e.preventDefault(),[]);

  const setView = useCallback((preset) => {
    const o=orbitRef.current;
    const p={front:{theta:0,phi:Math.PI/2},back:{theta:Math.PI,phi:Math.PI/2},right:{theta:Math.PI/2,phi:Math.PI/2},left:{theta:-Math.PI/2,phi:Math.PI/2},top:{theta:0,phi:0.01},bottom:{theta:0,phi:Math.PI-0.01},persp:{theta:0.7,phi:1.1}};
    if(p[preset]){o.theta=p[preset].theta;o.phi=p[preset].phi;}
  },[]);

  const handleViewMode = (mode) => {
    setViewMode(mode);
    sceneRef.current?.traverse(o=>{if(o.isMesh&&o.name!=="SelectionOutline"&&o.material)o.material.wireframe=mode==="wireframe";});
  };

  return (
    <div className="spx-viewport">
      <div className="spx-viewport-canvas" ref={mountRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onWheel={onWheel} onContextMenu={onCtxMenu} />

      {/* Header */}
      <div className="spx-vp-header">
        <div className="spx-vp-header-left">
          <button className={`spx-vp-btn${editMode==="OBJECT"?" spx-vp-btn--active":""}`} onClick={()=>{setEditMode("OBJECT");setStatusMsg("Object Mode");}}>Object</button>
          <button className={`spx-vp-btn${editMode==="EDIT"?" spx-vp-btn--active":""}`} onClick={()=>{setEditMode("EDIT");setStatusMsg("Edit Mode");}}>Edit</button>
          <div className="spx-vp-sep"/>
          {["solid","wireframe","xray","rendered"].map(m=>(
            <button key={m} className={`spx-vp-btn${viewMode===m?" spx-vp-btn--active":""}`} onClick={()=>handleViewMode(m)}>{m[0].toUpperCase()+m.slice(1)}</button>
          ))}
        </div>
        <div className="spx-vp-header-right">
          <span className="spx-vp-stat">{fps} fps</span>
          <span className="spx-vp-stat">{polyCount.toLocaleString()} tris</span>
        </div>
      </div>

      {/* Quick tools */}
      <div className="spx-vp-quicktools">
        <button className="spx-vp-qt-btn" onClick={doExtrude} title="E">Extrude</button>
        <button className="spx-vp-qt-btn" onClick={doDuplicate} title="Shift+D">Duplicate</button>
        <button className="spx-vp-qt-btn" onClick={()=>doAddPrim("cube")}>+Cube</button>
        <button className="spx-vp-qt-btn" onClick={()=>doAddPrim("sphere")}>+Sphere</button>
        <button className="spx-vp-qt-btn" onClick={()=>doAddPrim("cylinder")}>+Cyl</button>
        <button className="spx-vp-qt-btn spx-vp-qt-btn--danger" onClick={doDelete} title="X">Delete</button>
      </div>

      {/* View presets */}
      <div className="spx-vp-presets">
        {["front","right","top","persp"].map(v=>(
          <button key={v} className="spx-vp-preset-btn" onClick={()=>setView(v)}>{v[0].toUpperCase()+v.slice(1)}</button>
        ))}
      </div>

      {/* Status */}
      <div className="spx-vp-status">{statusMsg}</div>

      {/* Gizmo */}
      <div className="spx-vp-gizmo">
        <svg viewBox="0 0 64 64" width="56" height="56">
          <line x1="32" y1="32" x2="54" y2="44" stroke="#e44" strokeWidth="2"/>
          <line x1="32" y1="32" x2="32" y2="8"  stroke="#4e4" strokeWidth="2"/>
          <line x1="32" y1="32" x2="12" y2="44" stroke="#44e" strokeWidth="2"/>
          <text x="55" y="48" fontSize="8" fill="#e44">X</text>
          <text x="30" y="6"  fontSize="8" fill="#4e4">Z</text>
          <text x="4"  y="48" fontSize="8" fill="#44e">Y</text>
        </svg>
      </div>

      {/* Hotkey hints */}
      <div className="spx-vp-hints">E=Extrude · G=Grab · R=Rotate · S=Scale · X=Delete · Shift+D=Dup · Tab=Edit · F=Focus · Arrows=Move</div>
    </div>
  );
}
