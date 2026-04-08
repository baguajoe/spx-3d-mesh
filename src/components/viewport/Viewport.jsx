import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GeometryEngine } from "../../mesh/GeometryEngine";
import { TransformGizmo } from "../../mesh/TransformGizmo";
import { UndoRedoStack } from "../../mesh/UndoRedoStack";
import { ClothSimulation } from "../../mesh/ClothSimulation";
import { ShapeKeySystem } from "../../mesh/ShapeKeySystem";
import { SnapSystem } from "../../mesh/SnapSystem";
import { ImportExportEngine } from "../../mesh/ImportExportEngine";
import { importFBX, exportFBX } from "../../mesh/FBXSupport";
import { ParticleEngine } from "../../mesh/ParticleSystem";
import { SPXScriptingAPI, BUILTIN_SCRIPTS } from "../../mesh/SPXScriptingAPI";
import { CurveSystem } from "../../mesh/CurveSystem";
import { ModifierSystem } from "../../mesh/ModifierSystem";
import { TextObject } from "../../mesh/TextObject";
import { LightLinking } from "../../mesh/LightLinking";
import { PluginSystem, registerBuiltinPlugins } from "../../mesh/PluginSystem";
import { MATERIAL_PRESETS, MATERIAL_CATEGORIES, applyMaterialPreset } from "../../mesh/MaterialPresets";
import { POSE_PRESETS, applyPose } from "../../mesh/PosePresets";
import { CAMERA_SHOTS, DOF_PRESETS, applyCameraShot } from "../../mesh/CameraPresets";
import { BRUSH_PRESETS, BRUSH_PRESET_CATEGORIES } from "../../mesh/SculptBrushPresets";
import { TERRAIN_PRESETS, ALL_TERRAIN_TYPES } from "../../mesh/TerrainPresets";
import { FilmRendererEngine, SculptEngine } from "../../mesh/FilmRenderer";
import { SubObjectSelection, SELECT_MODE } from "../../mesh/SubObjectSelection";
import { RiggingEngine } from "../../mesh/RiggingEngine";
import { FilmQualityRenderer as FilmQualityEngine } from "../../mesh/FilmQualityEngine";
import { PathTracerEngine, FilmCamera } from "../../mesh/PathTracerEngine";

const NEAR=0.01, FAR=10000, FOV=60;

export default function Viewport(props) {
  const { activeTool, onSelectObject, onStatsUpdate, filmParams, lightingParams, renderParams, onRegisterAction } = props;
  const mountRef    = useRef(null);
  const rendRef     = useRef(null);
  const sceneRef    = useRef(null);
  const camRef      = useRef(null);
  const rafRef      = useRef(null);
  const mouseRef    = useRef({ x:0, y:0, button:-1, down:false });
  const orbitRef    = useRef({ theta:0.6, phi:1.0, radius:10, target:new THREE.Vector3(0,1,0) });
  const selRef      = useRef(null);
  const meshesRef   = useRef([]);
  const engRef      = useRef(null);
  const filmEngRef  = useRef(null);
  const sculptEngRef= useRef(null);
  const subSelRef   = useRef(null);
  const rigEngRef   = useRef(null);
  const filmQualRef = useRef(null);
  const ptEngRef    = useRef(null);
  const ptActiveRef  = useRef(false);
  const gizmoRef     = useRef(null);
  const undoRef      = useRef(null);
  const clothRef     = useRef(null);
  const skRef        = useRef(null);
  const snapRef      = useRef(null);
  const ioRef        = useRef(null);
  const clothRunRef  = useRef(false);
  const clothRafRef  = useRef(null);
  const particleRef  = useRef(null);
  const scriptRef    = useRef(null);
  const curveRef     = useRef(null);
  const modSysRef    = useRef(null);
  const textRef      = useRef(null);
  const lightLinkRef = useRef(null);
  const pluginRef    = useRef(null);
  const [gizmoMode,  setGizmoMode]  = useState("translate");
  const [undoInfo,      setUndoInfo]      = useState({ canUndo:false, canRedo:false });
  const [showSkeleton,  setShowSkeleton]  = useState(false);
  const skHelperRef = useRef(null);
  const sculpting   = useRef(false);
  const timeRef     = useRef(0);

  const [fps,           setFps]           = useState(0);
  const [stats,         setStats]         = useState({ vertices:0, edges:0, faces:0 });
  const [viewMode,      setViewMode]      = useState("solid");
  const [editMode,      setEditMode]      = useState("OBJECT");
  const [subMode,       setSubMode]       = useState("OBJECT"); // OBJECT|VERTEX|EDGE|FACE
  const [status,        setStatus]        = useState("Viewport Ready");
  const [sculptBrush,   setSculptBrush]   = useState("draw");
  const [sculptRadius,  setSculptRadius]  = useState(0.5);
  const [sculptStrength,setSculptStrength]= useState(0.5);
  const [sculptSubtract,setSculptSubtract]= useState(false);
  const [symmetryX,     setSymmetryX]     = useState(true);
  const [showBones,     setShowBones]     = useState(false);
  const [selectedVerts, setSelectedVerts] = useState(0);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current; if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    const w = el.clientWidth > 0 ? el.clientWidth : (el.parentElement?.clientWidth || 600);
    const h = el.clientHeight > 0 ? el.clientHeight : (el.parentElement?.clientHeight || 500);
    renderer.setSize(w, h);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    sceneRef.current = scene;

    const w2 = el.clientWidth > 0 ? el.clientWidth : 600;
    const h2 = el.clientHeight > 0 ? el.clientHeight : 500;
    const cam = new THREE.PerspectiveCamera(FOV, w2/h2, NEAR, FAR);
    cam.position.set(6,5,10); cam.lookAt(0,1,0);
    camRef.current = cam;

    const grid = new THREE.GridHelper(30, 30, 0x4488aa, 0x334455);
    grid.name = "_grid";
    grid.visible = true;
    scene.add(grid);
    // X axis line (red)
    const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-15,0,0),new THREE.Vector3(15,0,0)]);
    const xLine = new THREE.Line(xGeo, new THREE.LineBasicMaterial({color:0xff3333,depthTest:false}));
    scene.add(xLine);
    // Z axis line (blue)
    const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-15),new THREE.Vector3(0,0,15)]);
    const zLine = new THREE.Line(zGeo, new THREE.LineBasicMaterial({color:0x3333ff,depthTest:false}));
    scene.add(zLine);
    scene.add(new THREE.AxesHelper(1));
    scene.add(new THREE.AmbientLight(0xffffff,0.4));
    const sun = new THREE.DirectionalLight(0xffffff,1.2);
    sun.position.set(5,10,5); sun.castShadow=true;
    sun.shadow.mapSize.width=sun.shadow.mapSize.height=2048;
    sun.shadow.radius=4; scene.add(sun);
    scene.add((() => { const l = new THREE.DirectionalLight(0x8899ff,0.3); l.position.set(-5,3,-5); return l; })());

    const eng      = new GeometryEngine(scene);
    const filmEng  = new FilmRendererEngine(renderer, scene, cam);
    const sculptEng= new SculptEngine();
    const subSel   = new SubObjectSelection(scene, renderer, cam);
    const rigEng   = new RiggingEngine(scene);

    engRef.current    = eng;
    const filmQual = new FilmQualityEngine(renderer, scene, cam);
    filmQualRef.current = filmQual;
    const ptEng = new PathTracerEngine(renderer, scene, cam);
    ptEngRef.current = ptEng;
    ptEng.init().then(ok => { if(ok) console.log("SPX Path Tracer ready"); });
    const gizmo=new TransformGizmo(scene,cam,renderer);gizmoRef.current=gizmo;
    const undo=new UndoRedoStack(100);undo.onChange(i=>setUndoInfo(i));undoRef.current=undo;
    clothRef.current = new ClothSimulation(scene);
    skRef.current    = new ShapeKeySystem(scene);
    snapRef.current  = new SnapSystem(scene, cam);
    ioRef.current    = new ImportExportEngine(scene);
    particleRef.current = new ParticleEngine(scene);
    const api = new SPXScriptingAPI(scene, eng, { getSelected:()=>selRef.current });
    curveRef.current     = new CurveSystem(scene);
    modSysRef.current    = new ModifierSystem(scene);
    textRef.current      = new TextObject(scene);
    lightLinkRef.current = new LightLinking(renderer, scene);
    const plugins        = new PluginSystem({});
    registerBuiltinPlugins(plugins);
    pluginRef.current    = plugins;
    plugins.onSceneUpdate(scene);
    scriptRef.current = api;
    filmEngRef.current= filmEng;
    sculptEngRef.current = sculptEng;
    subSelRef.current = subSel;
    rigEngRef.current = rigEng;

    const cube = eng.createBox(2,2,2,"DefaultCube");
    cube.position.set(0, 1, 0);
    cube.position.set(0, 0, 0);
    addOutline(cube); showOutline(cube,true);
    meshesRef.current = [cube];
    selRef.current    = cube;
    subSel.setMesh(cube);
    refreshStats(cube);

    let last=performance.now(), fr=0, ft=0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const now=performance.now(), dt=(now-last)/1000;
      last=now; fr++; ft+=dt; timeRef.current+=dt;
      if(ft>=0.5){setFps(Math.round(fr/ft));fr=0;ft=0;}
      const o=orbitRef.current, c=camRef.current;
      if(c){
        const x=o.radius*Math.sin(o.phi)*Math.sin(o.theta);
        const y=o.radius*Math.cos(o.phi);
        const z=o.radius*Math.sin(o.phi)*Math.cos(o.theta);
        c.position.set(x+o.target.x,y+o.target.y,z+o.target.z);
        c.lookAt(o.target);
      }
      filmQualRef.current?.update(timeRef.current, dt);
      if(ptActiveRef.current && ptEngRef.current?._initialized){ ptEngRef.current.render(); }
      gizmoRef.current?.update();
      filmEng.render(timeRef.current);
    };
    animate();

    const ro = new ResizeObserver(()=>{
      renderer.setSize(el.clientWidth,el.clientHeight);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      cam.aspect=el.clientWidth/el.clientHeight;
      cam.updateProjectionMatrix();
    });
    ro.observe(el);

    return ()=>{
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      filmEng.dispose();
      filmQualRef.current?.dispose();
      ptEngRef.current?.dispose();
      gizmoRef.current?.dispose();
      clothRef.current?.dispose();
      particleRef.current?.dispose();
      skRef.current?.dispose();
      snapRef.current?.dispose();
      if(clothRafRef.current)cancelAnimationFrame(clothRafRef.current);
      subSel.dispose();
      renderer.dispose();
      if(el.contains(renderer.domElement))el.removeChild(renderer.domElement);
    };
  },[]);

  // ── Film param wiring ─────────────────────────────────────────────────────
  useEffect(()=>{ if(filmParams&&filmEngRef.current) filmEngRef.current.applyFromCameraPanel(filmParams); },[filmParams]);
  useEffect(()=>{ if(lightingParams&&filmEngRef.current) filmEngRef.current.applyFromLightingPanel(lightingParams.lights||[],lightingParams.global||{}); },[lightingParams]);
  useEffect(()=>{ if(renderParams&&filmEngRef.current) filmEngRef.current.applyFromRenderPanel(renderParams); },[renderParams]);

  // Register external action handler
  useEffect(()=>{
    if(!onRegisterAction)return;
    onRegisterAction((fn, params)=>{
      const fq=filmQualRef.current, sel=selRef.current, scene=sceneRef.current;
      if(!fq||!scene)return;
      if(fn==="filmmat_skin"&&sel){fq.applySkin(sel,params);setStatus("SSS Skin applied");}
      else if(fn==="filmmat_hair"&&sel){fq.applyHair(sel,params);setStatus(`Hair: ${params.count} strands`);}
      else if(fn==="filmmat_hair_remove"&&sel){fq.hair.remove(sel.name);setStatus("Hair removed");}
      else if(fn==="filmmat_pbr"&&sel){fq.applyFilmPBR(sel,params);setStatus("Film PBR applied");}
      else if(fn==="filmmat_fog"){fq.volumes.createFog(params);setStatus("Atmosphere added");}
      else if(fn==="filmmat_fog_remove"){fq.volumes.dispose();setStatus("Atmosphere removed");}
      else if(fn==="filmmat_lod"&&sel){fq.toLOD(sel);setStatus("LOD applied");}
      else if(fn==="filmmat_instanced_foliage"){fq.createInstancedFoliage(params.type,params.count,params.spread);setStatus(`${params.count} instanced (1 draw call)`);}
      else if(fn==="filmmat_instanced_clear"){fq.instanced.clear(params.type);setStatus("Cleared");}
      else if(fn==="pt_start"){
        const pt=ptEngRef.current; if(!pt)return;
        pt.setFilmQualityPreset(params?.preset||"cinematic");
        if(params?.maxSamples)pt.maxSamples=params.maxSamples;
        if(params?.bounces)pt.bounces=params.bounces;
        if(params?.caustics!==undefined)pt.caustics=params.caustics;
        if(params?.filterGlossy!==undefined)pt.filterGlossy=params.filterGlossy;
        if(params?.dof?.enabled){const fc=new FilmCamera(camRef.current,pt);fc.apply(params.dof);}
        pt.upgradeSceneMaterials();
        ptActiveRef.current=true;
        pt.updateScene().then(()=>{pt.reset();setStatus("Path Tracer rendering…");});
      }
      else if(fn==="pt_stop"||fn==="pt_disable"){ptActiveRef.current=false;setStatus("Path Tracer stopped — realtime mode");}
      else if(fn==="pt_enable"){ptActiveRef.current=true;setStatus("Path Tracer active");}
      else if(fn==="pt_reset"){ptEngRef.current?.reset();setStatus("PT reset");}
      else if(fn==="pt_sky"){ptEngRef.current?.setGradientSky(params?.top,params?.bottom);}
      else if(fn==="pt_env_intensity"&&ptEngRef.current){ptEngRef.current.envIntensity=params?.value||1;ptEngRef.current.reset();}
      else if(fn==="pt_upgrade_materials"){ptEngRef.current?.upgradeSceneMaterials();ptEngRef.current?.updateScene();setStatus("Materials upgraded for PT");}
      else if(fn==="pt_export_png"){const url=rendRef.current?.domElement?.toDataURL("image/png");if(url){const a=document.createElement("a");a.href=url;a.download="spx_render.png";a.click();}}
      else if(fn==="pt_get_progress"&&typeof params==="function"){params(ptEngRef.current?.getProgress());}
      else if(fn==="gizmo_mode"){const m=params?.mode||"translate";gizmoRef.current?.setMode(m);setGizmoMode(m);}
      else if(fn==="tool_change"){const t=params?.tool;if(t==="move"){gizmoRef.current?.setMode("translate");setGizmoMode("translate");}if(t==="rotate"){gizmoRef.current?.setMode("rotate");setGizmoMode("rotate");}if(t==="scale"){gizmoRef.current?.setMode("scale");setGizmoMode("scale");}}
      else if(fn==="add_prim"){doAddPrim(params?.type||"cube");}
      else if(fn==="create_rig"){doCreateRig();}
      // Extended geo ops
      else if(fn==="knife"){geoOp("knife",new THREE.Vector3(0,1,0),selRef.current?.position||new THREE.Vector3());}
      else if(fn==="spin"){geoOp("spin",8,Math.PI*2,new THREE.Vector3(0,1,0));}
      else if(fn==="screw"){geoOp("screw",12,2,1,new THREE.Vector3(0,1,0));}
      else if(fn==="bridge"){
        const meshes=meshesRef.current.filter(m=>m!==selRef.current&&!m.name.startsWith("_"));
        if(meshes.length>0)engRef.current?.bridge(selRef.current,meshes[0]);
      }
      else if(fn==="bool_union"){
        const meshes=meshesRef.current.filter(m=>m!==selRef.current&&!m.name.startsWith("_"));
        if(meshes.length>0)engRef.current?.boolean(selRef.current,meshes[0],"union");
      }
      else if(fn==="bool_diff"){
        const meshes=meshesRef.current.filter(m=>m!==selRef.current&&!m.name.startsWith("_"));
        if(meshes.length>0)engRef.current?.boolean(selRef.current,meshes[0],"difference");
      }
      else if(fn==="triangulate"){geoOp("subdivide",0);}
      else if(fn==="loop_cut"){geoOp("loopCut",0.5);}
      else if(fn==="show_skeleton"){
        const scene=sceneRef.current; if(!scene)return;
        if(skHelperRef.current){scene.remove(skHelperRef.current);skHelperRef.current=null;}
        const skinned=scene.getObjectByProperty("isSkinnedMesh",true);
        if(skinned?.skeleton){
          const h=new THREE.SkeletonHelper(skinned);
          h.material.linewidth=2;
          scene.add(h);skHelperRef.current=h;
          setShowSkeleton(true);setStatus("Skeleton visible");
        }else{setStatus("No skeleton found — create rig first");}
      }
      else if(fn==="hide_skeleton"){
        if(skHelperRef.current){sceneRef.current?.remove(skHelperRef.current);skHelperRef.current=null;}
        setShowSkeleton(false);setStatus("Skeleton hidden");
      }
      else if(fn==="pref_pixelratio"&&params?.value){rendRef.current?.setPixelRatio(params.value);}
      else if(fn==="pref_viewport"){
        if(params?.key==="Show Grid")sceneRef.current?.getObjectByName?.(undefined)?.traverse?.(o=>{if(o.isGridHelper)o.visible=params.value;});
      }
      // Cloth simulation
      else if(fn==="cloth_create"){clothRef.current?.createCloth(params);setStatus("Cloth created");}
      else if(fn==="cloth_start"){
        clothRunRef.current=true;
        const step=()=>{if(!clothRunRef.current)return;clothRef.current?.step();clothRafRef.current=requestAnimationFrame(step);};
        step();setStatus("Cloth simulating…");
      }
      else if(fn==="cloth_stop"){clothRunRef.current=false;setStatus("Cloth stopped");}
      else if(fn==="cloth_reset"){clothRunRef.current=false;if(params?.name)clothRef.current?.reset(params.name);setStatus("Cloth reset");}
      else if(fn==="cloth_wind"){const c=clothRef.current;if(c){c.setWind(params?.x||0,0,params?.z||0);}}
      // Shape keys
      else if(fn==="sk_add"&&sel){const sk=skRef.current;if(sk){sk.addShapeKey(sel,params?.name||"Key");setStatus(`Shape key added: ${params?.name}`);}}
      else if(fn==="sk_set"&&sel){skRef.current?.setValue(sel,params?.name,params?.value);}
      else if(fn==="sk_remove"&&sel){skRef.current?.removeKey(sel,params?.name);}
      else if(fn==="sk_facial_preset"&&sel){const keys=skRef.current?.createFacialKeys(sel);setStatus(`Facial keys: ${keys?.length||0} created`);}
      // Snap
      else if(fn==="snap_enabled"){snapRef.current?.setEnabled(params?.enabled);}
      else if(fn==="snap_mode"){snapRef.current?.setMode(params?.mode);}
      else if(fn==="snap_grid"){snapRef.current?.setGridSize(params?.size);}
      // Import/Export
      else if(fn==="import_file"&&params?.file){
        ioRef.current?.importFile(params.file).then(obj=>{
          if(obj&&obj.isMesh){meshesRef.current.push(obj);addOutline(obj);setStatus(`Imported: ${obj.name}`);}
          else if(obj&&obj.isObject3D){setStatus(`Imported scene: ${params.file.name}`);}
        });
      }
      else if(fn==="export_obj"){ioRef.current?.exportOBJ();setStatus("Exported OBJ");}
      else if(fn==="export_stl"){ioRef.current?.exportSTL();setStatus("Exported STL");}
      else if(fn==="export_glb"){ioRef.current?.exportGLTF();setStatus("Exported GLB");}
      else if(fn==="export_gltf"){ioRef.current?.exportGLTF("export.gltf",false);setStatus("Exported GLTF");}
      else if(fn==="particle_create"){
        const pe=particleRef.current;if(!pe)return;
        const pos=selRef.current?.position||new THREE.Vector3(0,0,0);
        const em=pe.create(params?.type||"fire",pos,params?.params||{});
        em.start();
        pe.startAll();
        setStatus(`Particles: ${params?.type} created`);
      }
      else if(fn==="particle_start_all"){particleRef.current?.startAll();setStatus("Particles running");}
      else if(fn==="particle_stop_all"){particleRef.current?.stopAll();setStatus("Particles stopped");}
      else if(fn==="particle_burst"){const em=particleRef.current?.emitters.values().next().value;em?.burst(200);setStatus("Burst!");}
      else if(fn==="particle_clear"){particleRef.current?.dispose();particleRef.current=new ParticleEngine(sceneRef.current);setStatus("Particles cleared");}
      else if(fn==="particle_remove"){particleRef.current?.remove(params?.name);setStatus(`Removed: ${params?.name}`);}
      else if(fn==="script_run"){
        const api=scriptRef.current; if(!api)return;
        const result=api.run(params?.code||"");
        // Send log entries back
        const logs=api.getConsole().slice(-20);
        logs.forEach(e=>params?.onLog?.(e));
        params?.onDone?.();
      }
      else if(fn==="script_save"){scriptRef.current?.saveScript(params?.name,params?.code);setStatus(`Script saved: ${params?.name}`);}
      else if(fn==="import_fbx"&&params?.file){
        params.file.arrayBuffer().then(buf=>importFBX(buf,params.file.name.replace(".fbx","")).then(obj=>{
          if(obj){sceneRef.current?.add(obj);setStatus(`FBX imported: ${obj.name}`);}
        }));
      }
      else if(fn==="export_fbx"){exportFBX(sceneRef.current,"spx_export.fbx");setStatus("FBX exported");}
      // Curves
      else if(fn==="curve_create"){const c=curveRef.current?.createBezier(params?.name||"Curve");if(c){c.addPoint(new THREE.Vector3(-2,0,0));c.addPoint(new THREE.Vector3(0,2,0));c.addPoint(new THREE.Vector3(2,0,0));const m=c.toMesh(sceneRef.current,0.05);meshesRef.current.push(m);setStatus("Bezier curve created");}}
      else if(fn==="curve_circle"){const r=curveRef.current?.createCircle(params?.radius||1,params?.name||"Circle");if(r)meshesRef.current.push(r.mesh);setStatus("Circle curve created");}
      else if(fn==="curve_helix"){const h=curveRef.current?.createHelix(1,3,3,"Helix");if(h)meshesRef.current.push(h.mesh);setStatus("Helix created");}
      else if(fn==="curve_to_mesh"&&sel){const c=curveRef.current?.curves.values().next().value;if(c){c.toMesh(sceneRef.current,0.05);setStatus("Curve converted to mesh");}}
      // Modifiers
      else if(fn==="mod_add"&&sel){modSysRef.current?.add(sel,params?.type||"Mirror",params||{});syncOutline(sel);refreshStats(sel);setStatus(`${params?.type} modifier added`);}
      else if(fn==="mod_apply"&&sel){modSysRef.current?.apply(sel);syncOutline(sel);refreshStats(sel);setStatus("Modifiers applied");}
      else if(fn==="mod_mirror"&&sel){modSysRef.current?.add(sel,"Mirror",{x:true});syncOutline(sel);refreshStats(sel);setStatus("Mirror modifier added");}
      else if(fn==="mod_array"&&sel){modSysRef.current?.add(sel,"Array",{count:3,offset:new THREE.Vector3(2,0,0)});syncOutline(sel);refreshStats(sel);setStatus("Array modifier added");}
      else if(fn==="mod_solidify"&&sel){modSysRef.current?.add(sel,"Solidify",{thickness:0.1});syncOutline(sel);refreshStats(sel);setStatus("Solidify modifier added");}
      else if(fn==="mod_subdivision"&&sel){modSysRef.current?.add(sel,"Subdivision",{levels:2});syncOutline(sel);refreshStats(sel);setStatus("Subdivision modifier added");}
      else if(fn==="mod_decimate"&&sel){modSysRef.current?.add(sel,"Decimate",{ratio:0.5});syncOutline(sel);refreshStats(sel);setStatus("Decimate modifier added");}
      else if(fn==="mod_displace"&&sel){modSysRef.current?.add(sel,"Displace",{strength:0.3});syncOutline(sel);refreshStats(sel);setStatus("Displace modifier added");}
      // Text
      else if(fn==="text_create"){textRef.current?.create(params||{text:"SPX",size:1,depth:0.2}).then(m=>{if(m){meshesRef.current.push(m);addOutline(m);setStatus(`Text: ${params?.text||"SPX"}`);}});}
      // Light linking
      else if(fn==="light_link"){const lights=[];sceneRef.current?.traverse(o=>{if(o.isLight)lights.push(o);});if(lights[0]&&sel)lightLinkRef.current?.link(lights[0],[sel]);lightLinkRef.current?.apply();setStatus("Light linked");}
      else if(fn==="light_exclude"){const lights=[];sceneRef.current?.traverse(o=>{if(o.isLight)lights.push(o);});if(lights[0]&&sel)lightLinkRef.current?.exclude(lights[0],[sel]);lightLinkRef.current?.apply();setStatus("Light excluded");}
      // Plugins
      else if(fn==="plugin_list"){console.log(pluginRef.current?.list());setStatus(`${pluginRef.current?.plugins.size} plugins loaded`);}
      else if(fn==="mat_preset_apply"&&sel){
        applyMaterialPreset(sel,params?.preset);
        setStatus(`Material: ${params?.preset}`);
      }
      else if(fn==="pose_apply"){
        const arm=rigEngRef.current?.armatures.values().next().value;
        if(arm)applyPose(arm,params?.pose);
        setStatus(`Pose: ${params?.pose}`);
      }
      else if(fn==="camera_shot"){
        applyCameraShot(camRef.current,params?.shot,selRef.current?.position||new THREE.Vector3());
        setStatus(`Shot: ${params?.shot}`);
      }
      else if(fn==="brush_preset"){
        const preset=BRUSH_PRESETS[params?.preset];
        if(preset){
          setSculptBrush(preset.brushType);
          setSculptRadius(preset.radius);
          setSculptStrength(preset.strength);
          setStatus(`Brush: ${params?.preset}`);
        }
      }
      else if(fn==="add_text"){textRef.current?.create({text:params?.text||"Text",size:1,depth:0.2,name:params?.name||"Text"}).then(m=>{if(m){meshesRef.current.push(m);addOutline(m);}});}
      else if(fn==="export_png"){const url=rendRef.current?.domElement?.toDataURL("image/png");if(url){const a=document.createElement("a");a.href=url;a.download="spx_screenshot.png";a.click();}setStatus("Screenshot saved");}
    });
  },[onRegisterAction]);


  // ── Helpers ───────────────────────────────────────────────────────────────
  const addOutline  = (m)=>{const mat=new THREE.MeshBasicMaterial({color:0x00ffc8,side:THREE.BackSide});const o=new THREE.Mesh(m.geometry.clone(),mat);o.name="SelectionOutline";o.scale.setScalar(1.02);o.visible=false;m.add(o);};
  const showOutline = (m,s)=>m?.children.forEach(c=>{if(c.name==="SelectionOutline")c.visible=s;});
  const syncOutline = (m)=>m?.children.forEach(c=>{if(c.name==="SelectionOutline"){c.geometry.dispose();c.geometry=m.geometry.clone();}});
  const refreshStats= (m)=>{const s=engRef.current?.stats(m)||{};setStats(s);onStatsUpdate?.(s);};

  // ── Sub-object mode switch ────────────────────────────────────────────────
  const switchSubMode = useCallback((mode) => {
    setSubMode(mode);
    const subSel = subSelRef.current;
    const sel    = selRef.current;
    if (!subSel || !sel) return;
    const modeMap = { OBJECT:SELECT_MODE.OBJECT, VERTEX:SELECT_MODE.VERTEX, EDGE:SELECT_MODE.EDGE, FACE:SELECT_MODE.FACE };
    subSel.setMode(modeMap[mode] || SELECT_MODE.OBJECT);
    subSel.setMesh(sel);
    setSelectedVerts(0);
    if (mode === "OBJECT") { setStatus("Object Mode"); }
    else { setStatus(`${mode} Select — click to select, Shift+click to add`); }
  }, []);

  // ── Raycast ───────────────────────────────────────────────────────────────
  const raycast = useCallback((e)=>{
    const el=mountRef.current, cam=camRef.current; if(!el||!cam)return null;
    const rect=el.getBoundingClientRect();
    const mv=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
    const ray=new THREE.Raycaster(); ray.setFromCamera(mv,cam);
    const hits=ray.intersectObjects(meshesRef.current,true).filter(h=>h.object.name!=="SelectionOutline"&&!h.object.name.startsWith("_"));
    return hits.length>0?hits[0]:null;
  },[]);

  // ── Pick object ───────────────────────────────────────────────────────────
  const doPick = useCallback((e)=>{
    if(subMode !== "OBJECT") {
      // Sub-object pick
      const subSel = subSelRef.current;
      if(!subSel) return;
      const additive = e.shiftKey;
      subSel.pick(e, mountRef.current, additive);
      const count = subSel.selected.size;
      setSelectedVerts(count);
      setStatus(`${subMode}: ${count} selected`);
      return;
    }
    const hit=raycast(e); if(!hit)return;
    const m=hit.object.isMesh?hit.object:hit.object.parent;
    if(m.name.startsWith("_"))return;
    showOutline(selRef.current,false);
    selRef.current=m;
    showOutline(m,true);
    subSelRef.current?.setMesh(m);
    onSelectObject?.(m.name);
    setStatus(`Selected: ${m.name}`);
    refreshStats(m);
  },[raycast, onSelectObject, subMode]);

  // ── Move selected verts with G ────────────────────────────────────────────
  const transformSubSel = useCallback((dx, dy)=>{
    const subSel = subSelRef.current;
    const sel    = selRef.current;
    if(!subSel||!sel||subSel.selected.size===0)return;
    if(subMode === "VERTEX"){
      const pos = sel.geometry.attributes.position;
      const cam = camRef.current;
      if(!pos||!cam)return;
      const right = new THREE.Vector3().crossVectors(cam.getWorldDirection(new THREE.Vector3()), cam.up).normalize();
      const up    = cam.up.clone().normalize();
      const speed = 0.005 * orbitRef.current.radius;
      subSel.selected.forEach(i=>{
        pos.setX(i, pos.getX(i) + right.x*dx*speed - up.x*dy*speed);
        pos.setY(i, pos.getY(i) + right.y*dx*speed - up.y*dy*speed);
        pos.setZ(i, pos.getZ(i) + right.z*dx*speed - up.z*dy*speed);
      });
      pos.needsUpdate=true;
      sel.geometry.computeVertexNormals();
      syncOutline(sel);
      subSel._updateVertexOverlay();
    }
  },[subMode]);

  // ── Sculpt ────────────────────────────────────────────────────────────────
  const doSculptStroke = useCallback((e)=>{
    if(!sculpting.current)return;
    const hit=raycast(e); if(!hit)return;
    const m=hit.object.isMesh?hit.object:hit.object.parent;
    const eng=sculptEngRef.current; if(!eng||m.name.startsWith("_"))return;
    eng.applyBrush(m,hit.point,hit.face.normal,sculptBrush,sculptRadius,sculptStrength,sculptSubtract);
    if(symmetryX){const mp=hit.point.clone();mp.x*=-1;const mn=hit.face.normal.clone();mn.x*=-1;eng.applyBrush(m,mp,mn,sculptBrush,sculptRadius,sculptStrength,sculptSubtract);}
    syncOutline(m); refreshStats(m);
  },[raycast,sculptBrush,sculptRadius,sculptStrength,sculptSubtract,symmetryX]);

  // ── Geo ops ───────────────────────────────────────────────────────────────
  const geoOp = useCallback((op,...args)=>{
    const sel=selRef.current, eng=engRef.current; if(!sel||!eng)return;
    try{undoRef.current?.pushGeoState(sel,op);eng[op]?.(sel,...args);syncOutline(sel);refreshStats(sel);setStatus(`${op} ✓`);}
    catch(e){setStatus(`${op} failed: ${e.message}`);}
  },[]);

  // ── Add prim ──────────────────────────────────────────────────────────────
  const doAddPrim = useCallback((type)=>{
    const eng=engRef.current; if(!eng)return;
    let m;
    if(type==="sphere")      m=eng.createSphere(1,`Sphere_${Date.now()}`);
    else if(type==="cylinder")m=eng.createCylinder(1,2,`Cylinder_${Date.now()}`);
    else if(type==="cone")   m=eng.createCone(1,2,`Cone_${Date.now()}`);
    else if(type==="torus")  m=eng.createTorus(1,0.3,`Torus_${Date.now()}`);
    else if(type==="plane")  m=eng.createPlane(4,4,`Plane_${Date.now()}`);
    else if(type==="curve")  { curveRef.current?.createCircle(1,`Circle_${Date.now()}`); return; }
    else if(type==="text")   { textRef.current?.create({text:"Text",size:1,depth:0.2}); return; }
    else                     m=eng.createBox(2,2,2,`${type}_${Date.now()}`);
    showOutline(selRef.current,false); addOutline(m); showOutline(m,true);
    meshesRef.current.push(m); selRef.current=m;
    subSelRef.current?.setMesh(m);
    refreshStats(m); setStatus(`Added ${type}`);
  },[]);

  // ── Duplicate ─────────────────────────────────────────────────────────────
  const doDuplicate = useCallback(()=>{
    const sel=selRef.current, scene=sceneRef.current, eng=engRef.current; if(!sel||!scene||!eng)return;
    const clone=sel.clone(); clone.name=`${sel.name}_copy`; clone.position.x+=2.5;
    scene.add(clone); const he=eng.objects.get(sel); if(he)eng.objects.set(clone,he);
    showOutline(selRef.current,false); meshesRef.current.push(clone); selRef.current=clone;
    showOutline(clone,true); subSelRef.current?.setMesh(clone);
    setStatus(`Duplicated → ${clone.name}`);
  },[]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = useCallback(()=>{
    const sel=selRef.current, scene=sceneRef.current, eng=engRef.current; if(!sel||!scene)return;
    // If sub-object mode — delete selected faces/verts
    const subSel=subSelRef.current;
    if(subSel&&subSel.selected.size>0&&subMode==="FACE"){
      geoOp("dissolveEdges"); subSel.deselectAll(); return;
    }
    scene.remove(sel); meshesRef.current=meshesRef.current.filter(m=>m!==sel);
    eng?.objects.delete(sel); subSel?.dispose();
    const next=meshesRef.current[0]||null; selRef.current=next; showOutline(next,true);
    if(next)subSel?.setMesh(next);
    setStats({vertices:0,edges:0,faces:0}); setStatus("Deleted");
  },[subMode,geoOp]);

  // ── Create humanoid rig ───────────────────────────────────────────────────
  const doCreateRig = useCallback(()=>{
    const rigEng=rigEngRef.current; if(!rigEng)return;
    const arm=rigEng.createHumanoid();
    setShowBones(true);
    setStatus(`Humanoid rig created: ${arm.bones.length} bones`);
  },[]);

  // ── Attach rig to selected mesh ───────────────────────────────────────────
  const doAttachRig = useCallback(()=>{
    const rigEng=rigEngRef.current, sel=selRef.current; if(!rigEng||!sel)return;
    const arms=rigEng.listArmatures();
    if(arms.length===0){setStatus("No armature — create rig first");return;}
    const skinned=rigEng.attachMesh(arms[0],sel);
    if(skinned){meshesRef.current.push(skinned);setStatus(`Mesh skinned to ${arms[0]}`);}
  },[]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    let grabMode=false, grabStart={x:0,y:0};
    const down=(e)=>{
      if(["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName))return;
      const sel=selRef.current;
      switch(e.key.toLowerCase()){
        case"1": if(!e.ctrlKey)switchSubMode("VERTEX"); break;
        case"2": if(!e.ctrlKey)switchSubMode("EDGE");   break;
        case"3": if(!e.ctrlKey)switchSubMode("FACE");   break;
        case"4": if(!e.ctrlKey)switchSubMode("OBJECT"); break;
        case"e": if(subMode==="FACE"||subMode==="OBJECT")geoOp("extrude",1); break;
        case"i": geoOp("inset",0.2); break;
        case"b": if(e.ctrlKey){e.preventDefault();geoOp("bevel",0.2,1);} break;
        case"g":
          if(subSelRef.current?.selected.size>0){
            grabMode=true;
            setStatus("Grab — move mouse to transform, click to confirm");
          } else if(sel){ setStatus("Grab — use arrows to move"); }
          break;
        case"a":
          if(subMode!=="OBJECT"){e.preventDefault();subSelRef.current?.selectAll();setSelectedVerts(subSelRef.current?.selected.size||0);setStatus("All selected");}
          break;
        case"alt": subSelRef.current?.deselectAll();setSelectedVerts(0);setStatus("Deselected"); break;
        case"x": case"delete": doDelete(); break;
        case"d": if(e.shiftKey){e.preventDefault();doDuplicate();} break;
        case"tab": e.preventDefault();
          setEditMode(m=>{const nm=m==="OBJECT"?"EDIT":"OBJECT";
            if(nm==="EDIT")switchSubMode("VERTEX");
            else switchSubMode("OBJECT");
            setStatus(nm+" Mode"); return nm;
          }); break;
        case"f": if(sel){orbitRef.current.target.copy(sel.position);setStatus(`Focus: ${sel.name}`);} break;
        case"arrowleft":  if(sel&&subMode==="OBJECT")sel.position.x-=0.1; break;
        case"arrowright": if(sel&&subMode==="OBJECT")sel.position.x+=0.1; break;
        case"arrowup":    if(sel&&subMode==="OBJECT"){if(e.shiftKey)sel.position.z-=0.1;else sel.position.y+=0.1;} break;
        case"arrowdown":  if(sel&&subMode==="OBJECT"){if(e.shiftKey)sel.position.z+=0.1;else sel.position.y-=0.1;} break;
        case"o":setStatus("Proportional edit toggled"); break;
        case"z":if(e.ctrlKey){e.preventDefault();const un=undoRef.current?.undo();if(un)setStatus(`Undo: ${un}`);} break;
        case"y":if(e.ctrlKey){e.preventDefault();const re=undoRef.current?.redo();if(re)setStatus(`Redo: ${re}`);} break;
        case"[": setSculptRadius(r=>Math.max(0.05,r-0.05)); break;
        case"]": setSculptRadius(r=>Math.min(5,r+0.05));    break;
        default: break;
      }
    };
    window.addEventListener("keydown",down);
    return()=>window.removeEventListener("keydown",down);
  },[geoOp,doDelete,doDuplicate,subMode,switchSubMode]);

  // ── Mouse ─────────────────────────────────────────────────────────────────
  const grabRef = useRef({ active:false, lastX:0, lastY:0 });

  const onMouseDown=useCallback((e)=>{
    mouseRef.current={...mouseRef.current,x:e.clientX,y:e.clientY,button:e.button,down:true};
    if(e.button===0&&!e.altKey){
      if(editMode==="SCULPT"){sculpting.current=true;doSculptStroke(e);}
      else doPick(e);
    }
    if(e.button===1||e.button===2) sculpting.current=false;
    e.preventDefault();
  },[doPick,doSculptStroke,editMode]);

  const onMouseMove=useCallback((e)=>{
    if(sculpting.current&&editMode==="SCULPT") doSculptStroke(e);
    if(!mouseRef.current.down)return;
    const dx=e.clientX-mouseRef.current.x, dy=e.clientY-mouseRef.current.y;
    mouseRef.current.x=e.clientX; mouseRef.current.y=e.clientY;
    const o=orbitRef.current;
    if(mouseRef.current.button===1||(mouseRef.current.button===0&&e.altKey)){
      o.theta-=dx*0.006; o.phi=Math.max(0.1,Math.min(Math.PI-0.1,o.phi+dy*0.006));
    } else if(mouseRef.current.button===2){
      const c=camRef.current; if(!c)return;
      const r=new THREE.Vector3().crossVectors(c.getWorldDirection(new THREE.Vector3()),c.up).normalize();
      const u=c.up.clone(); const s=o.radius*0.001;
      o.target.addScaledVector(r,-dx*s); o.target.addScaledVector(u,dy*s);
    } else if(mouseRef.current.button===0&&!e.altKey&&subMode!=="OBJECT"&&subSelRef.current?.selected.size>0){
      // Drag transform selected sub-objects
      transformSubSel(dx,dy);
    }
  },[doSculptStroke,editMode,subMode,transformSubSel]);

  const onMouseUp  =useCallback(()=>{ mouseRef.current.down=false; sculpting.current=false; },[]);
  const onWheel    =useCallback((e)=>{ orbitRef.current.radius=Math.max(0.5,Math.min(500,orbitRef.current.radius*(1+e.deltaY*0.001))); e.preventDefault(); },[]);
  const onCtxMenu  =useCallback((e)=>e.preventDefault(),[]);

  const setView=useCallback((p)=>{
    const o=orbitRef.current;
    const v={front:{theta:0,phi:Math.PI/2},back:{theta:Math.PI,phi:Math.PI/2},right:{theta:Math.PI/2,phi:Math.PI/2},left:{theta:-Math.PI/2,phi:Math.PI/2},top:{theta:0,phi:0.01},persp:{theta:0.7,phi:1.1}};
    if(v[p]){o.theta=v[p].theta;o.phi=v[p].phi;}
  },[]);

  const handleViewMode=(m)=>{
    setViewMode(m);
    sceneRef.current?.traverse(o=>{if(o.isMesh&&o.name!=="SelectionOutline"&&!o.name.startsWith("_")&&o.material){o.material.wireframe=m==="wireframe";o.material.transparent=m==="xray";o.material.opacity=m==="xray"?0.3:1;}});
  };

  const handleSculptMode=()=>{
    setEditMode(m=>{
      const nm=m==="SCULPT"?"OBJECT":"SCULPT";
      if(nm==="SCULPT"){const sel=selRef.current;if(sel&&sculptEngRef.current){sculptEngRef.current.addMultires(sel,1);syncOutline(sel);setStatus("Sculpt Mode — paint to sculpt · [ ] = radius");}}
      else{switchSubMode("OBJECT");setStatus("Object Mode");}
      return nm;
    });
  };

  const subModeLabel = subMode==="OBJECT"?"Object":subMode==="VERTEX"?"Vertex":subMode==="EDGE"?"Edge":"Face";

  return (
    <div className="spx-viewport">
      <div className="spx-viewport-canvas" ref={mountRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onWheel={onWheel} onContextMenu={onCtxMenu}/>

      {/* Header */}
      <div className="spx-vp-header">
        <div className="spx-vp-header-left">
          {/* Edit mode */}
          <button className={`spx-vp-btn${editMode==="OBJECT"?" spx-vp-btn--active":""}`} onClick={()=>{setEditMode("OBJECT");switchSubMode("OBJECT");}}>Object</button>
          <button className={`spx-vp-btn${editMode==="EDIT"?" spx-vp-btn--active":""}`} onClick={()=>{setEditMode("EDIT");switchSubMode("VERTEX");}}>Edit</button>
          <button className={`spx-vp-btn${editMode==="SCULPT"?" spx-vp-btn--active":""}`} onClick={handleSculptMode}>Sculpt</button>
          <div className="spx-vp-sep"/>
          {/* Sub-object mode (only in edit) */}
          {editMode==="EDIT" && <>
            <button className={`spx-vp-btn${subMode==="VERTEX"?" spx-vp-btn--active":""}`} onClick={()=>switchSubMode("VERTEX")} title="1">Vert</button>
            <button className={`spx-vp-btn${subMode==="EDGE"?" spx-vp-btn--active":""}`} onClick={()=>switchSubMode("EDGE")} title="2">Edge</button>
            <button className={`spx-vp-btn${subMode==="FACE"?" spx-vp-btn--active":""}`} onClick={()=>switchSubMode("FACE")} title="3">Face</button>
            <div className="spx-vp-sep"/>
          </>}
          {/* View modes */}
          {["solid","wireframe","xray","rendered"].map(m=>(
            <button key={m} className={`spx-vp-btn${viewMode===m?" spx-vp-btn--active":""}`} onClick={()=>handleViewMode(m)}>{m[0].toUpperCase()+m.slice(1)}</button>
          ))}
        </div>
        <div className="spx-vp-header-right">
          <span className="spx-vp-stat">{fps}fps</span>
          <span className="spx-vp-stat">{stats.vertices}v·{stats.edges}e·{stats.faces}f</span>
          {selectedVerts>0&&<span className="spx-vp-stat spx-vp-stat--sel">{selectedVerts} sel</span>}
        </div>
      </div>

      {/* Sculpt HUD */}
      {editMode==="SCULPT" && (
        <div className="spx-vp-sculpt-hud">
          {["draw","clay","smooth","inflate","pinch","flatten","crease","grab","snake_hook"].map(b=>(
            <button key={b} className={`spx-vp-sculpt-btn${sculptBrush===b?" spx-vp-sculpt-btn--active":""}`} onClick={()=>setSculptBrush(b)}>{b.replace("_"," ")}</button>
          ))}
          <div className="spx-vp-sculpt-sep"/>
          <span className="spx-vp-sculpt-label">R</span>
          <input className="spx-vp-sculpt-range" type="range" min={0.05} max={5} step={0.05} value={sculptRadius} onChange={e=>setSculptRadius(+e.target.value)}/>
          <span className="spx-vp-sculpt-val">{sculptRadius.toFixed(2)}</span>
          <span className="spx-vp-sculpt-label">S</span>
          <input className="spx-vp-sculpt-range" type="range" min={0.01} max={1} step={0.01} value={sculptStrength} onChange={e=>setSculptStrength(+e.target.value)}/>
          <span className="spx-vp-sculpt-val">{sculptStrength.toFixed(2)}</span>
          <button className={`spx-vp-sculpt-btn${sculptSubtract?" spx-vp-sculpt-btn--sub":""}`} onClick={()=>setSculptSubtract(v=>!v)}>{sculptSubtract?"−":"+"}</button>
          <button className={`spx-vp-sculpt-btn${symmetryX?" spx-vp-sculpt-btn--sym":""}`} onClick={()=>setSymmetryX(v=>!v)}>X Sym</button>
        </div>
      )}

      {/* Quick tools */}
      {editMode!=="SCULPT" && (
        <div className="spx-vp-quicktools">
          {editMode==="EDIT" ? <>
            {[["Extrude","E",()=>geoOp("extrude",1)],["Inset","I",()=>geoOp("inset",0.2)],["Bevel","Ctrl+B",()=>geoOp("bevel",0.2,1)],["Loop Cut","Ctrl+R",()=>geoOp("loopCut",0.5)],["Subdivide","",()=>geoOp("subdivide",1)],["Smooth","",()=>geoOp("smooth",2,0.5)],["Fill Holes","",()=>geoOp("fillHoles")],["Merge Verts","",()=>geoOp("mergeByDistance",0.001)],["Select All","A",()=>{subSelRef.current?.selectAll();setSelectedVerts(subSelRef.current?.selected.size||0);}],["Deselect","Alt",()=>{subSelRef.current?.deselectAll();setSelectedVerts(0);}]].map(([l,k,fn])=>(
              <button key={l} className="spx-vp-qt-btn" onClick={fn} title={k}>{l}</button>
            ))}
          </> : <>
            {[["Extrude","E",()=>geoOp("extrude",1)],["Subdivide","",()=>geoOp("subdivide",1)],["Smooth","",()=>geoOp("smooth",2,0.5)],["Fix Normals","",()=>geoOp("fixNormals")],["Merge Verts","",()=>geoOp("mergeByDistance",0.001)],["Duplicate","Shift+D",doDuplicate],["+Cube","",()=>doAddPrim("cube")],["+Sphere","",()=>doAddPrim("sphere")],["+ Rig","",doCreateRig],["Skin Mesh","",doAttachRig]].map(([l,k,fn])=>(
              <button key={l} className="spx-vp-qt-btn" onClick={fn} title={k}>{l}</button>
            ))}
          </>}
          <button className="spx-vp-qt-btn spx-vp-qt-btn--danger" onClick={doDelete}>Delete</button>
        </div>
      )}

      {/* View presets */}
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

      <div className="spx-vp-hints">
        {editMode==="SCULPT"
          ?"Paint mesh to sculpt · [ ] radius · +/− direction · X Sym"
          :editMode==="EDIT"
          ?"1=Vert 2=Edge 3=Face · Click=Select · Shift=Add · G=Grab · A=All · E=Extrude · X=Delete"
          :"Tab=Edit · E=Extrude · X=Delete · Shift+D=Dup · F=Focus · +Rig to add skeleton"
        }
      </div>
    </div>
  );
}
