/**
 * SPX Transform Gizmo System
 * Visual move/rotate/scale handles in viewport — competing with Maya/Blender
 */
import * as THREE from "three";

const AXIS_COLORS = { x: 0xe44444, y: 0x44e444, z: 0x4444e4, xyz: 0xffffff, screen: 0xffff44 };
const AXIS_HOVER  = { x: 0xff8888, y: 0x88ff88, z: 0x8888ff, xyz: 0xffffaa, screen: 0xffff88 };

export class TransformGizmo {
  constructor(scene, camera, renderer) {
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;
    this.target   = null;
    this.mode     = "translate"; // translate | rotate | scale
    this.space    = "world";     // world | local
    this.size     = 1;
    this.visible  = false;
    this.hovered  = null;
    this.dragging = false;
    this.dragAxis = null;
    this.dragStart= new THREE.Vector3();
    this.dragPlane= new THREE.Plane();
    this.group    = new THREE.Group();
    this.group.name = "_gizmo";
    this.group.renderOrder = 999;
    scene.add(this.group);
    this._build();
  }

  _build() {
    this._buildTranslate();
    this._buildRotate();
    this._buildScale();
    this._showMode();
  }

  _mat(color, depthTest=false) {
    return new THREE.MeshBasicMaterial({ color, depthTest, transparent:true, opacity:0.9 });
  }
  _lineMat(color) {
    return new THREE.LineBasicMaterial({ color, depthTest:false, linewidth:2 });
  }

  _buildTranslate() {
    this.translateGroup = new THREE.Group();
    this.translateGroup.name = "_gizmo_translate";
    const axes = [
      { axis:"x", dir:new THREE.Vector3(1,0,0), color:AXIS_COLORS.x },
      { axis:"y", dir:new THREE.Vector3(0,1,0), color:AXIS_COLORS.y },
      { axis:"z", dir:new THREE.Vector3(0,0,1), color:AXIS_COLORS.z },
    ];
    axes.forEach(({ axis, dir, color }) => {
      // Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1,8), this._mat(color));
      shaft.position.copy(dir.clone().multiplyScalar(0.5));
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
      shaft.name = `_gizmo_t_${axis}`;
      shaft.userData.axis = axis;
      // Cone tip
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07,0.2,8), this._mat(color));
      tip.position.copy(dir.clone().multiplyScalar(1.1));
      tip.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
      tip.name = `_gizmo_t_${axis}`;
      tip.userData.axis = axis;
      // Plane handle (small square for 2-axis move)
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.2,0.2), this._mat(color));
      plane.material.opacity = 0.4;
      this.translateGroup.add(shaft, tip);
    });
    // XYZ center sphere
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.08,8,8), this._mat(AXIS_COLORS.xyz));
    center.name = "_gizmo_t_xyz";
    center.userData.axis = "xyz";
    this.translateGroup.add(center);
    this.group.add(this.translateGroup);
  }

  _buildRotate() {
    this.rotateGroup = new THREE.Group();
    this.rotateGroup.name = "_gizmo_rotate";
    const rings = [
      { axis:"x", color:AXIS_COLORS.x, rot:new THREE.Euler(0,Math.PI/2,0) },
      { axis:"y", color:AXIS_COLORS.y, rot:new THREE.Euler(Math.PI/2,0,0) },
      { axis:"z", color:AXIS_COLORS.z, rot:new THREE.Euler(0,0,0) },
    ];
    rings.forEach(({ axis, color, rot }) => {
      const geo  = new THREE.TorusGeometry(1.0, 0.025, 8, 64);
      const mesh = new THREE.Mesh(geo, this._mat(color));
      mesh.rotation.copy(rot);
      mesh.name = `_gizmo_r_${axis}`;
      mesh.userData.axis = axis;
      this.rotateGroup.add(mesh);
    });
    // Screen-space ring
    const screen = new THREE.Mesh(new THREE.TorusGeometry(1.15,0.02,8,64), this._mat(AXIS_COLORS.screen));
    screen.name = "_gizmo_r_screen";
    screen.userData.axis = "screen";
    this.rotateGroup.add(screen);
    this.group.add(this.rotateGroup);
  }

  _buildScale() {
    this.scaleGroup = new THREE.Group();
    this.scaleGroup.name = "_gizmo_scale";
    const axes = [
      { axis:"x", dir:new THREE.Vector3(1,0,0), color:AXIS_COLORS.x },
      { axis:"y", dir:new THREE.Vector3(0,1,0), color:AXIS_COLORS.y },
      { axis:"z", dir:new THREE.Vector3(0,0,1), color:AXIS_COLORS.z },
    ];
    axes.forEach(({ axis, dir, color }) => {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1,8), this._mat(color));
      shaft.position.copy(dir.clone().multiplyScalar(0.5));
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
      shaft.name = `_gizmo_s_${axis}`;
      shaft.userData.axis = axis;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12), this._mat(color));
      box.position.copy(dir.clone().multiplyScalar(1.1));
      box.name = `_gizmo_s_${axis}`;
      box.userData.axis = axis;
      this.scaleGroup.add(shaft, box);
    });
    const center = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12), this._mat(AXIS_COLORS.xyz));
    center.name = "_gizmo_s_xyz";
    center.userData.axis = "xyz";
    this.scaleGroup.add(center);
    this.group.add(this.scaleGroup);
  }

  _showMode() {
    this.translateGroup.visible = this.mode === "translate" && this.visible;
    this.rotateGroup.visible    = this.mode === "rotate"    && this.visible;
    this.scaleGroup.visible     = this.mode === "scale"     && this.visible;
  }

  attach(object) {
    this.target  = object;
    this.visible = !!object;
    this._showMode();
    if (object) this.group.position.copy(object.position);
  }

  detach() { this.target = null; this.visible = false; this._showMode(); }

  setMode(mode) { this.mode = mode; this._showMode(); }
  setSpace(space){ this.space = space; }

  // Scale gizmo to constant screen size
  update() {
    if (!this.target || !this.visible) return;
    this.group.position.copy(this.target.position);
    if (this.space === "local") this.group.quaternion.copy(this.target.quaternion);
    else this.group.quaternion.identity();
    // Constant screen size
    const dist = this.camera.position.distanceTo(this.group.position);
    const scale = dist * 0.15;
    this.group.scale.setScalar(scale);
    // Face rotate ring toward camera
    const r = this.rotateGroup.getObjectByName("_gizmo_r_screen");
    if (r) r.quaternion.copy(this.camera.quaternion);
  }

  // Hover highlight
  hover(raycaster) {
    const hits = raycaster.intersectObjects(this.group.children, true).filter(h => h.object.userData.axis);
    const prev = this.hovered;
    this.hovered = hits.length > 0 ? hits[0].object : null;
    if (this.hovered !== prev) {
      if (prev) prev.material.color.setHex(AXIS_COLORS[prev.userData.axis] || AXIS_COLORS.xyz);
      if (this.hovered) this.hovered.material.color.setHex(AXIS_HOVER[this.hovered.userData.axis] || AXIS_HOVER.xyz);
    }
    return this.hovered;
  }

  // Start drag
  startDrag(raycaster) {
    if (!this.hovered || !this.target) return false;
    this.dragging = true;
    this.dragAxis = this.hovered.userData.axis;
    this.startPos = this.target.position.clone();
    this.startRot = this.target.rotation.clone();
    this.startScale = this.target.scale.clone();
    // Set drag plane normal toward camera
    const camDir = this.camera.position.clone().sub(this.target.position).normalize();
    this.dragPlane.setFromNormalAndCoplanarPoint(camDir, this.target.position);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.dragPlane, hit);
    this.dragStartWorld = hit.clone();
    return true;
  }

  // Drag
  drag(raycaster) {
    if (!this.dragging || !this.target) return;
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(this.dragPlane, hit)) return;
    const delta = hit.clone().sub(this.dragStartWorld);
    if (this.mode === "translate") {
      if (this.dragAxis === "x")   this.target.position.x = this.startPos.x + delta.x;
      else if (this.dragAxis === "y") this.target.position.y = this.startPos.y + delta.y;
      else if (this.dragAxis === "z") this.target.position.z = this.startPos.z + delta.z;
      else this.target.position.copy(this.startPos.clone().add(delta));
    } else if (this.mode === "rotate") {
      const angle = delta.length() * 3;
      if (this.dragAxis === "x")      this.target.rotation.x = this.startRot.x + angle;
      else if (this.dragAxis === "y") this.target.rotation.y = this.startRot.y + angle;
      else if (this.dragAxis === "z") this.target.rotation.z = this.startRot.z + angle;
    } else if (this.mode === "scale") {
      const factor = 1 + delta.length() * 2;
      if (this.dragAxis === "x")      this.target.scale.x = this.startScale.x * factor;
      else if (this.dragAxis === "y") this.target.scale.y = this.startScale.y * factor;
      else if (this.dragAxis === "z") this.target.scale.z = this.startScale.z * factor;
      else this.target.scale.setScalar(this.startScale.x * factor);
    }
    this.group.position.copy(this.target.position);
  }

  endDrag() { this.dragging = false; this.dragAxis = null; }

  isHit(raycaster) {
    return raycaster.intersectObjects(this.group.children, true).filter(h=>h.object.userData.axis).length > 0;
  }

  dispose() { this.scene.remove(this.group); }
}
