import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GeometryEngine } from "../../mesh/GeometryEngine";

const NEAR = 0.01;
const FAR  = 10000;
const FOV  = 60;

export default function Viewport({ activeTool, onSelectObject, onStatsUpdate }) {
  const mountRef  = useRef(null);
  const rendRef   = useRef(null);
  const sceneRef  = useRef(null);
  const camRef    = useRef(null);
  const rafRef    = useRef(null);
  const mouseRef  = useRef({ x:0, y:0, button:-1, down:false });
  const orbitRef  = useRef({ theta:0.7, phi:1.1, radius:8, target:new THREE.Vector3() });
  const selRef    = useRef(null);
  const meshesRef = useRef([]);
  const engRef    = useRef(null);

  const [fps,      setFps]      = useState(0);
  const [stats,    setStats]    = useState({ vertices:0, edges:0, faces:0 });
  const [viewMode, setViewMode] = useState("solid");
  const [editMode, setEditMode] = useState("OBJECT");
  const [status,   setStatus]   = useState("Viewport Ready");

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
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(FOV, el.clientWidth/el.clientHeight, NEAR, FAR);
    cam.position.set(5,4,8); cam.lookAt(0,0,0);
    camRef.current = cam;

    scene.add(new THREE.GridHelper(20,20,0x1a1a2e,0x111120));
    scene.add(new THREE.AxesHelper(1));

    scene.add(new THREE.AmbientLight(0xffffff,0.4));
    const sun = new THREE.DirectionalLight(0xffffff,1.2);
    sun.position.set(5,10,5); sun.castShadow=true;
    sun.shadow.mapSize.width=sun.shadow.mapSize.height=2048;
    scene.add(sun);
    scene.add(Object.assign(new THREE.DirectionalLight(0x8899ff,0.3),{position:new THREE.Vector3(-5,3,-5)}));

    const eng = new GeometryEngine(scene);
    engRef.current = eng;

    const cube = eng.createBox(2,2,2,"DefaultCube");
    addOutline(cube);
    showOutline(cube, true);
    meshesRef.current = [cube];
    selRef.current = cube;
    refreshStats(cube);

    let last=performance.now(), fr=0, ft=0;
    const animate=()=>{
      rafRef.current=requestAnimationFrame(animate);
      const now=performance.now(),dt=(now-last)/1000; last=now; fr++; ft+=dt;
      if(ft>=0.5){setFps(Math.round(fr/ft));fr=0;ft=0;}
      const o=orbitRef.current,c=camRef.current;
      if(c){const x=o.radius*Math.sin(o.phi)*Math.sin(o.theta),y=o.radius*Math.cos(o.phi),z=o.radius*Math.sin(o.phi)*Math.cos(o.theta);c.position.set(x+o.target.x,y+o.target.y,z+o.target.z);c.lookAt(o.target);}
      renderer.render(scene,cam);
    };
    animate();

    const ro=new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);cam.aspect=el.clientWidth/el.clientHeight;cam.updateProjectionMatrix();});
    ro.observe(el);
    return ()=>{cancelAnimationFrame(rafRef.current);ro.disconnect();renderer.dispose();if(el.contains(renderer.domElement))el.removeChild(renderer.domElement);};
  },[]);

  const addOutline=(mesh)=>{
    const m=new THREE.MeshBasicMaterial({color:0x00ffc8,side:THREE.BackSide});
    const o=new THREE.Mesh(mesh.geometry.clone(),m);
    o.name="SelectionOutline"; o.scale.setScalar(1.02); o.visible=false;
    mesh.add(o);
  };
  const showOutline=(mesh,show)=>mesh?.children.forEach(c=>{if(c.name==="SelectionOutline")c.visible=show;});
  const syncOutline=(mesh)=>mesh?.children.forEach(c=>{if(c.name==="SelectionOutline"){c.geometry.dispose();c.geometry=mesh.geometry.clone();}});
  const refreshStats=(mesh)=>{const s=engRef.current?.stats(mesh)||{};setStats(s);onStatsUpdate?.(s);};

  const doPick=useCallback((e)=>{
    const el=mountRef.current,cam=camRef.current; if(!el||!cam)return;
    const rect=el.getBoundingClientRect();
    const m=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
    const ray=new THREE.Raycaster(); ray.setFromCamera(m,cam);
    const hits=ray.intersectObjects(meshesRef.current,true).filter(h=>h.object.name!=="SelectionOutline");
    if(hits.length>0){
      const hit=hits[0].object.isMesh?hits[0].object:hits[0].object.parent;
      showOutline(selRef.current,false); selRef.current=hit; showOutline(hit,true);
      onSelectObject?.(hit.name); setStatus(`Selected: ${hit.name}`); refreshStats(hit);
    }
  },[onSelectObject]);

  const geoOp=useCallback((op,...args)=>{
    const sel=selRef.current,eng=engRef.current; if(!sel||!eng)return;
    try{eng[op]?.(sel,...args);syncOutline(sel);refreshStats(sel);setStatus(`${op} ✓`);}
    catch(e){setStatus(`${op} error: ${e.message}`);}
  },[]);

  const doAddPrim=useCallback((type)=>{
    const eng=engRef.current; if(!eng)return;
    const mesh=type==="sphere"?eng.createSphere(1,`Sphere_${Date.now()}`):eng.createBox(2,2,2,`${type}_${Date.now()}`);
    showOutline(selRef.current,false); addOutline(mesh); showOutline(mesh,true);
    meshesRef.current.push(mesh); selRef.current=mesh; refreshStats(mesh); setStatus(`Added ${type}`);
  },[]);

  const doDuplicate=useCallback(()=>{
    const sel=selRef.current,scene=sceneRef.current,eng=engRef.current; if(!sel||!scene||!eng)return;
    const clone=sel.clone(); clone.name=`${sel.name}_copy`; clone.position.x+=2.5;
    scene.add(clone);
    const he=eng.objects.get(sel);
    if(he)eng.objects.set(clone,he);
    showOutline(selRef.current,false); meshesRef.current.push(clone); selRef.current=clone; showOutline(clone,true);
    setStatus(`Duplicated → ${clone.name}`);
  },[]);

  const doDelete=useCallback(()=>{
    const sel=selRef.current,scene=sceneRef.current,eng=engRef.current; if(!sel||!scene)return;
    scene.remove(sel); meshesRef.current=meshesRef.current.filter(m=>m!==sel); eng?.objects.delete(sel);
    const next=meshesRef.current[0]||null; selRef.current=next; showOutline(next,true);
    setStats({vertices:0,edges:0,faces:0}); setStatus("Deleted");
  },[]);

  useEffect(()=>{
    const down=(e)=>{
      if(["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName))return;
      const sel=selRef.current;
      switch(e.key.toLowerCase()){
        case"e": geoOp("extrude",1); break;
        case"i": geoOp("inset",0.2); break;
        case"b": if(e.ctrlKey){e.preventDefault();geoOp("bevel",0.2,1);} break;
        case"x": case"delete": doDelete(); break;
        case"d": if(e.shiftKey){e.preventDefault();doDuplicate();} break;
        case"tab": e.preventDefault(); setEditMode(m=>{const nm=m==="OBJECT"?"EDIT":"OBJECT";setStatus(nm+" Mode");return nm;}); break;
        case"f": if(sel){orbitRef.current.target.copy(sel.position);setStatus(`Focus: ${sel.name}`);} break;
        case"arrowleft":  if(sel)sel.position.x-=0.1; break;
        case"arrowright": if(sel)sel.position.x+=0.1; break;
        case"arrowup":    if(sel){if(e.shiftKey)sel.position.z-=0.1;else sel.position.y+=0.1;} break;
        case"arrowdown":  if(sel){if(e.shiftKey)sel.position.z+=0.1;else sel.position.y-=0.1;} break;
        default: break;
      }
    };
    window.addEventListener("keydown",down);
    return()=>window.removeEventListener("keydown",down);
  },[geoOp,doDelete,doDuplicate]);

  const onMouseDown=useCallback((e)=>{mouseRef.current={...mouseRef.current,x:e.clientX,y:e.clientY,button:e.button,down:true};if(e.button===0&&!e.altKey)doPick(e);e.preventDefault();},[doPick]);
  const onMouseMove=useCallback((e)=>{
    if(!mouseRef.current.down)return;
    const dx=e.clientX-mouseRef.current.x,dy=e.clientY-mouseRef.current.y;
    mouseRef.current.x=e.clientX;mouseRef.current.y=e.clientY;
    const o=orbitRef.current;
    if(mouseRef.current.button===1||(mouseRef.current.button===0&&e.altKey)){o.theta-=dx*0.006;o.phi=Math.max(0.1,Math.min(Math.PI-0.1,o.phi+dy*0.006));}
    else if(mouseRef.current.button===2){const c=camRef.current;if(!c)return;const r=new THREE.Vector3().crossVectors(c.getWorldDirection(new THREE.Vector3()),c.up).normalize();const u=c.up.clone();const s=o.radius*0.001;o.target.addScaledVector(r,-dx*s);o.target.addScaledVector(u,dy*s);}
  },[]);
  const onMouseUp=useCallback(()=>{mouseRef.current.down=false;},[]);
  const onWheel=useCallback((e)=>{orbitRef.current.radius=Math.max(0.5,Math.min(500,orbitRef.current.radius*(1+e.deltaY*0.001)));e.preventDefault();},[]);
  const onCtxMenu=useCallback((e)=>e.preventDefault(),[]);

  const setView=useCallback((p)=>{const o=orbitRef.current;const v={front:{theta:0,phi:Math.PI/2},back:{theta:Math.PI,phi:Math.PI/2},right:{theta:Math.PI/2,phi:Math.PI/2},left:{theta:-Math.PI/2,phi:Math.PI/2},top:{theta:0,phi:0.01},persp:{theta:0.7,phi:1.1}};if(v[p]){o.theta=v[p].theta;o.phi=v[p].phi;}},[]);
  const handleViewMode=(m)=>{setViewMode(m);sceneRef.current?.traverse(o=>{if(o.isMesh&&o.name!=="SelectionOutline"&&o.material)o.material.wireframe=m==="wireframe";});};

  return (
    <div className="spx-viewport">
      <div className="spx-viewport-canvas" ref={mountRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onWheel={onWheel} onContextMenu={onCtxMenu}/>

      <div className="spx-vp-header">
        <div className="spx-vp-header-left">
          <button className={`spx-vp-btn${editMode==="OBJECT"?" spx-vp-btn--active":""}`} onClick={()=>{setEditMode("OBJECT");setStatus("Object Mode");}}>Object</button>
          <button className={`spx-vp-btn${editMode==="EDIT"?" spx-vp-btn--active":""}`} onClick={()=>{setEditMode("EDIT");setStatus("Edit Mode");}}>Edit</button>
          <div className="spx-vp-sep"/>
          {["solid","wireframe","xray","rendered"].map(m=>(
            <button key={m} className={`spx-vp-btn${viewMode===m?" spx-vp-btn--active":""}`} onClick={()=>handleViewMode(m)}>{m[0].toUpperCase()+m.slice(1)}</button>
          ))}
        </div>
        <div className="spx-vp-header-right">
          <span className="spx-vp-stat">{fps}fps</span>
          <span className="spx-vp-stat">{stats.vertices}v·{stats.edges}e·{stats.faces}f</span>
        </div>
      </div>

      <div className="spx-vp-quicktools">
        {[
          ["Extrude","E",()=>geoOp("extrude",1)],
          ["Inset","I",()=>geoOp("inset",0.2)],
          ["Bevel","Ctrl+B",()=>geoOp("bevel",0.2,1)],
          ["Loop Cut","Ctrl+R",()=>geoOp("loopCut",0.5)],
          ["Subdivide","",()=>geoOp("subdivide",1)],
          ["Smooth","",()=>geoOp("smooth",2,0.5)],
          ["Fix Normals","",()=>geoOp("fixNormals")],
          ["Fill Holes","",()=>geoOp("fillHoles")],
          ["Merge Verts","",()=>geoOp("mergeByDistance",0.001)],
          ["Duplicate","Shift+D",doDuplicate],
          ["+Cube","",()=>doAddPrim("cube")],
          ["+Sphere","",()=>doAddPrim("sphere")],
        ].map(([l,k,fn])=>(
          <button key={l} className="spx-vp-qt-btn" onClick={fn} title={k}>{l}</button>
        ))}
        <button className="spx-vp-qt-btn spx-vp-qt-btn--danger" onClick={doDelete} title="X">Delete</button>
      </div>

      <div className="spx-vp-presets">
        {["front","right","top","persp"].map(v=>(
          <button key={v} className="spx-vp-preset-btn" onClick={()=>setView(v)}>{v[0].toUpperCase()+v.slice(1)}</button>
        ))}
      </div>

      <div className="spx-vp-status">{status}</div>

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

      <div className="spx-vp-hints">E=Extrude · I=Inset · Ctrl+B=Bevel · Ctrl+R=Loop Cut · X=Delete · Shift+D=Dup · Tab=Edit · F=Focus</div>
    </div>
  );
}
