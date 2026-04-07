import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID_SIZE   = 20;
const GRID_DIV    = 20;
const NEAR        = 0.01;
const FAR         = 10000;
const FOV         = 60;

// ── Viewport ──────────────────────────────────────────────────────────────────
export default function Viewport({ activeTool, onSelectObject }) {
  const mountRef    = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const rafRef      = useRef(null);
  const mouseRef    = useRef({ x: 0, y: 0, button: -1, down: false });
  const orbitRef    = useRef({ theta: 0.7, phi: 1.1, radius: 8, target: new THREE.Vector3() });

  const [fps,       setFps]       = useState(0);
  const [polyCount, setPolyCount] = useState(0);
  const [viewMode,  setViewMode]  = useState("solid"); // solid | wireframe | xray | rendered
  const [shadingMode, setShadingMode] = useState("matcap"); // matcap | flat | normal | texture

  // ── Init Three.js ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06060f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(FOV, el.clientWidth / el.clientHeight, NEAR, FAR);
    camera.position.set(5, 4, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Grid
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIV, 0x1a1a2e, 0x111120);
    scene.add(grid);

    // Axes
    const axes = new THREE.AxesHelper(1);
    scene.add(axes);

    // Default cube
    const geo  = new THREE.BoxGeometry(2, 2, 2);
    const mat  = new THREE.MeshStandardMaterial({ color: 0x888aaa, metalness: 0.1, roughness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "DefaultCube";
    scene.add(mesh);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8899ff, 0.3);
    fill.position.set(-5, 3, -5);
    scene.add(fill);

    // Render loop
    let last = performance.now();
    let frames = 0;
    let fpsTimer = 0;
    let polys = 0;
    scene.traverse(o => { if (o.isMesh) polys += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
    setPolyCount(polys);

    function animate() {
      rafRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt  = (now - last) / 1000;
      last = now;
      frames++;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        setFps(Math.round(frames / fpsTimer));
        frames = 0; fpsTimer = 0;
      }
      updateCamera();
      renderer.render(scene, camera);
    }
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      if (!el) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  // ── Camera orbit ─────────────────────────────────────────────────────────
  const updateCamera = useCallback(() => {
    const cam = cameraRef.current;
    const o   = orbitRef.current;
    if (!cam) return;
    const x = o.radius * Math.sin(o.phi) * Math.sin(o.theta);
    const y = o.radius * Math.cos(o.phi);
    const z = o.radius * Math.sin(o.phi) * Math.cos(o.theta);
    cam.position.set(x + o.target.x, y + o.target.y, z + o.target.z);
    cam.lookAt(o.target);
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    mouseRef.current = { ...mouseRef.current, x: e.clientX, y: e.clientY, button: e.button, down: true };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!mouseRef.current.down) return;
    const dx = e.clientX - mouseRef.current.x;
    const dy = e.clientY - mouseRef.current.y;
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
    const o = orbitRef.current;
    if (mouseRef.current.button === 1 || (mouseRef.current.button === 0 && e.altKey)) {
      // Middle or Alt+Left = Orbit
      o.theta -= dx * 0.006;
      o.phi    = Math.max(0.1, Math.min(Math.PI - 0.1, o.phi + dy * 0.006));
    } else if (mouseRef.current.button === 2) {
      // Right = Pan
      const cam = cameraRef.current;
      if (!cam) return;
      const right = new THREE.Vector3().crossVectors(
        cam.getWorldDirection(new THREE.Vector3()),
        cam.up
      ).normalize();
      const up = cam.up.clone().normalize();
      const panSpeed = o.radius * 0.001;
      o.target.addScaledVector(right, -dx * panSpeed);
      o.target.addScaledVector(up,     dy * panSpeed);
    }
  }, []);

  const onMouseUp = useCallback(() => {
    mouseRef.current.down = false;
  }, []);

  const onWheel = useCallback((e) => {
    const o = orbitRef.current;
    o.radius = Math.max(0.5, Math.min(500, o.radius * (1 + e.deltaY * 0.001)));
    e.preventDefault();
  }, []);

  const onContextMenu = useCallback((e) => { e.preventDefault(); }, []);

  // ── View mode buttons ─────────────────────────────────────────────────────
  const setWireframe = (val) => {
    sceneRef.current?.traverse(o => {
      if (o.isMesh && o.material) o.material.wireframe = val;
    });
  };

  const handleViewMode = (mode) => {
    setViewMode(mode);
    if (mode === "wireframe") setWireframe(true);
    else setWireframe(false);
  };

  // ── Numpad views ──────────────────────────────────────────────────────────
  const setView = useCallback((preset) => {
    const o = orbitRef.current;
    const presets = {
      front:  { theta: 0,           phi: Math.PI / 2 },
      back:   { theta: Math.PI,     phi: Math.PI / 2 },
      right:  { theta: Math.PI / 2, phi: Math.PI / 2 },
      left:   { theta: -Math.PI / 2,phi: Math.PI / 2 },
      top:    { theta: 0,           phi: 0.01 },
      bottom: { theta: 0,           phi: Math.PI - 0.01 },
      persp:  { theta: 0.7,         phi: 1.1 },
    };
    if (presets[preset]) {
      o.theta = presets[preset].theta;
      o.phi   = presets[preset].phi;
    }
  }, []);

  return (
    <div className="spx-viewport">
      <div
        className="spx-viewport-canvas"
        ref={mountRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
      />

      {/* Viewport Header */}
      <div className="spx-vp-header">
        <div className="spx-vp-header-left">
          <button className="spx-vp-btn spx-vp-btn--active">Persp</button>
          <div className="spx-vp-sep" />
          {["solid","wireframe","xray","rendered"].map(m => (
            <button
              key={m}
              className={`spx-vp-btn${viewMode === m ? " spx-vp-btn--active" : ""}`}
              onClick={() => handleViewMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className="spx-vp-header-right">
          <span className="spx-vp-stat">{fps} fps</span>
          <span className="spx-vp-stat">{polyCount.toLocaleString()} tris</span>
        </div>
      </div>

      {/* View Presets */}
      <div className="spx-vp-presets">
        {["front","right","top","persp"].map(v => (
          <button key={v} className="spx-vp-preset-btn" onClick={() => setView(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Orientation Gizmo */}
      <div className="spx-vp-gizmo">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <line x1="32" y1="32" x2="54" y2="44" stroke="#e44" strokeWidth="2"/>
          <line x1="32" y1="32" x2="32" y2="8"  stroke="#4e4" strokeWidth="2"/>
          <line x1="32" y1="32" x2="12" y2="44" stroke="#44e" strokeWidth="2"/>
          <text x="56" y="48" fontSize="8" fill="#e44">X</text>
          <text x="30" y="6"  fontSize="8" fill="#4e4">Z</text>
          <text x="4"  y="48" fontSize="8" fill="#44e">Y</text>
        </svg>
      </div>
    </div>
  );
}
