/**
 * SPX Camera Presets
 * Film-standard shot types + focal lengths
 */
import * as THREE from "three";

export const CAMERA_SHOTS = {
  // ── Shot types ──────────────────────────────────────────────────────────────
  "Extreme Close-Up": {
    focalLength: 100, description:"Face detail — eyes, mouth",
    fov: 12, distance: 0.3,
  },
  "Close-Up": {
    focalLength: 85, description:"Face from chin to top of head",
    fov: 18, distance: 0.6,
  },
  "Medium Close-Up": {
    focalLength: 70, description:"Chest and above",
    fov: 22, distance: 1.0,
  },
  "Medium Shot": {
    focalLength: 50, description:"Waist and above — the standard",
    fov: 30, distance: 1.8,
  },
  "Cowboy Shot": {
    focalLength: 50, description:"Mid-thigh and above",
    fov: 30, distance: 2.0,
  },
  "Medium Long Shot": {
    focalLength: 40, description:"Knees and above",
    fov: 36, distance: 2.5,
  },
  "Long Shot": {
    focalLength: 35, description:"Full body with headroom",
    fov: 42, distance: 4.0,
  },
  "Wide Shot": {
    focalLength: 24, description:"Character + significant environment",
    fov: 60, distance: 8.0,
  },
  "Extreme Wide Shot": {
    focalLength: 16, description:"Landscape / establishing",
    fov: 85, distance: 20.0,
  },
  // ── Angle shots ─────────────────────────────────────────────────────────────
  "Over the Shoulder": {
    focalLength: 50, description:"Looking over character's shoulder",
    fov: 30, distance: 1.5, offsetX: 0.3, offsetY: 0.2,
  },
  "Bird's Eye": {
    focalLength: 35, description:"Looking straight down",
    fov: 42, distance: 5.0, elevation: 90,
  },
  "Worm's Eye": {
    focalLength: 24, description:"Looking straight up",
    fov: 60, distance: 3.0, elevation: -60,
  },
  "Dutch Angle": {
    focalLength: 35, description:"Tilted for tension/unease",
    fov: 42, distance: 3.0, roll: 20,
  },
  "High Angle": {
    focalLength: 50, description:"Looking down at subject",
    fov: 30, distance: 3.0, elevation: 30,
  },
  "Low Angle": {
    focalLength: 35, description:"Looking up at subject — power",
    fov: 42, distance: 3.0, elevation: -20,
  },
  "Eye Level": {
    focalLength: 50, description:"Natural eye-level perspective",
    fov: 30, distance: 3.0, elevation: 0,
  },
  // ── Lens presets ─────────────────────────────────────────────────────────────
  "Fisheye (8mm)":     { focalLength:8,   fov:180, description:"Extreme distortion" },
  "Ultra Wide (14mm)": { focalLength:14,  fov:104, description:"Architecture/landscape" },
  "Wide (24mm)":       { focalLength:24,  fov:74,  description:"Street/documentary" },
  "Normal (35mm)":     { focalLength:35,  fov:55,  description:"Human eye equivalent" },
  "Standard (50mm)":   { focalLength:50,  fov:40,  description:"The classic standard" },
  "Portrait (85mm)":   { focalLength:85,  fov:24,  description:"Flattering portraits" },
  "Telephoto (135mm)": { focalLength:135, fov:15,  description:"Compressed background" },
  "Super Tele (200mm)":{ focalLength:200, fov:10,  description:"Sports/wildlife" },
  "Macro (100mm)":     { focalLength:100, fov:16,  description:"Extreme close detail" },
  // ── Film aspect ratios ───────────────────────────────────────────────────────
};

export const ASPECT_RATIOS = {
  "16:9 (HD/4K)":     16/9,
  "2.39:1 (Scope)":   2.39,
  "2.35:1 (Scope)":   2.35,
  "1.85:1 (Flat)":    1.85,
  "1.78:1 (IMAX HD)": 1.78,
  "4:3 (Classic)":    4/3,
  "1:1 (Square)":     1,
  "9:16 (Vertical)":  9/16,
  "2:1 (Univisium)":  2,
};

export const DOF_PRESETS = {
  "Shallow (f/1.4)":  { aperture:1.4,  description:"Very shallow DOF — dreamy bokeh" },
  "Portrait (f/2.8)": { aperture:2.8,  description:"Soft background, sharp subject" },
  "Standard (f/5.6)": { aperture:5.6,  description:"Balanced sharpness" },
  "Deep (f/11)":      { aperture:11,   description:"Most of scene in focus" },
  "Pinhole (f/22)":   { aperture:22,   description:"Everything sharp" },
};

// Apply camera shot to THREE.PerspectiveCamera
export function applyCameraShot(camera, shotName, target = new THREE.Vector3(0,0,0)) {
  const shot = CAMERA_SHOTS[shotName];
  if (!shot || !camera) return;

  const fov      = shot.fov || 40;
  const distance = shot.distance || 3;
  const elevation= shot.elevation || 10; // degrees
  const roll     = shot.roll || 0;
  const offsetX  = shot.offsetX || 0;
  const offsetY  = shot.offsetY || 0;

  camera.fov = fov;
  camera.updateProjectionMatrix();

  const elevRad = THREE.MathUtils.degToRad(elevation);
  const y = target.y + Math.sin(elevRad) * distance + offsetY;
  const h = Math.cos(elevRad) * distance;
  camera.position.set(target.x + offsetX, y, target.z + h);
  camera.lookAt(target);

  if (roll !== 0) camera.rotation.z += THREE.MathUtils.degToRad(roll);
}
