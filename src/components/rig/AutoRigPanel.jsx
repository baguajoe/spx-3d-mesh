import React, { useState, useRef, useEffect } from 'react';

const BONE_GROUPS = {
  biped: [
    { id: 'root',    label: 'Root',        x: 50, y: 85, color: '#00ffc8', required: true },
    { id: 'hips',    label: 'Hips',        x: 50, y: 75, color: '#4488ff', required: true },
    { id: 'spine1',  label: 'Spine 1',     x: 50, y: 65, color: '#4488ff', required: true },
    { id: 'spine2',  label: 'Spine 2',     x: 50, y: 57, color: '#4488ff', required: true },
    { id: 'chest',   label: 'Chest',       x: 50, y: 50, color: '#4488ff', required: true },
    { id: 'neck',    label: 'Neck',        x: 50, y: 35, color: '#44aaff', required: true },
    { id: 'head',    label: 'Head',        x: 50, y: 22, color: '#44aaff', required: true },
    { id: 'l_shldr', label: 'L Shoulder',  x: 35, y: 48, color: '#ff9944', required: true },
    { id: 'l_arm',   label: 'L Upper Arm', x: 28, y: 55, color: '#ff9944', required: true },
    { id: 'l_fore',  label: 'L Forearm',   x: 22, y: 65, color: '#ff9944', required: true },
    { id: 'l_hand',  label: 'L Hand',      x: 18, y: 74, color: '#ff9944', required: true },
    { id: 'r_shldr', label: 'R Shoulder',  x: 65, y: 48, color: '#ff9944', required: true },
    { id: 'r_arm',   label: 'R Upper Arm', x: 72, y: 55, color: '#ff9944', required: true },
    { id: 'r_fore',  label: 'R Forearm',   x: 78, y: 65, color: '#ff9944', required: true },
    { id: 'r_hand',  label: 'R Hand',      x: 82, y: 74, color: '#ff9944', required: true },
    { id: 'l_thigh', label: 'L Thigh',     x: 44, y: 78, color: '#ff44aa', required: true },
    { id: 'l_knee',  label: 'L Knee',      x: 42, y: 88, color: '#ff44aa', required: true },
    { id: 'l_foot',  label: 'L Foot',      x: 40, y: 96, color: '#ff44aa', required: true },
    { id: 'r_thigh', label: 'R Thigh',     x: 56, y: 78, color: '#ff44aa', required: true },
    { id: 'r_knee',  label: 'R Knee',      x: 58, y: 88, color: '#ff44aa', required: true },
    { id: 'r_foot',  label: 'R Foot',      x: 60, y: 96, color: '#ff44aa', required: true },
  ],
};

const SKELETON_EDGES = [
  ['root','hips'],['hips','spine1'],['spine1','spine2'],['spine2','chest'],
  ['chest','neck'],['neck','head'],
  ['chest','l_shldr'],['l_shldr','l_arm'],['l_arm','l_fore'],['l_fore','l_hand'],
  ['chest','r_shldr'],['r_shldr','r_arm'],['r_arm','r_fore'],['r_fore','r_hand'],
  ['hips','l_thigh'],['l_thigh','l_knee'],['l_knee','l_foot'],
  ['hips','r_thigh'],['r_thigh','r_knee'],['r_knee','r_foot'],
];

export default function AutoRigPanel() {
  const canvasRef = useRef(null);
  const [rigType, setRigType] = useState('biped');
  const [markers, setMarkers] = useState(() =>
    Object.fromEntries(BONE_GROUPS.biped.map(b => [b.id, { x: b.x, y: b.y }]))
  );
  const [dragging, setDragging] = useState(null);
  const [status, setStatus] = useState('idle');
  const [options, setOptions] = useState({
    ik_arms: true, ik_legs: true, fingers: false,
    toes: false, twist_bones: true, stretch: false,
    spine_count: 3, finger_count: 5,
  });

  // Draw guide skeleton
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#050a0e';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#0e1a20';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const toCanvas = (pct_x, pct_y) => [pct_x / 100 * W, pct_y / 100 * H];

    // Draw edges
    for (const [a, b] of SKELETON_EDGES) {
      const pa = markers[a], pb = markers[b];
      if (!pa || !pb) continue;
      const [x1, y1] = toCanvas(pa.x, pa.y);
      const [x2, y2] = toCanvas(pb.x, pb.y);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#1e4a3a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw joints
    for (const bone of BONE_GROUPS[rigType] || []) {
      const m = markers[bone.id];
      if (!m) continue;
      const [cx, cy] = toCanvas(m.x, m.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = bone.color;
      ctx.fill();
      ctx.strokeStyle = '#0a1216';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#7abcaa';
      ctx.font = '8px monospace';
      ctx.fillText(bone.label, cx + 7, cy + 3);
    }
  }, [markers, rigType]);

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width * 100;
    const my = (e.clientY - rect.top) / rect.height * 100;

    // Find closest marker
    let closest = null, minDist = 4;
    for (const [id, m] of Object.entries(markers)) {
      const d = Math.hypot(mx - m.x, my - m.y);
      if (d < minDist) { closest = id; minDist = d; }
    }
    if (closest) setDragging(closest);
  };

  const handleCanvasMouseMove = (e) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
    const my = Math.max(0, Math.min(100, (e.clientY - rect.top) / rect.height * 100));
    setMarkers(prev => ({ ...prev, [dragging]: { x: mx, y: my } }));
  };

  const buildRig = () => {
    setStatus('building');
    setTimeout(() => setStatus('done'), 1500);
  };

  const resetMarkers = () => {
    setMarkers(Object.fromEntries(BONE_GROUPS.biped.map(b => [b.id, { x: b.x, y: b.y }])));
    setStatus('idle');
  };

  return (
    <div className="panel-section">
      <div className="panel-header">Auto-Rig</div>

      {/* Rig type */}
      <div className="panel-group">
        <div className="panel-label">Rig Type</div>
        <div className="panel-row">
          {['biped', 'quadruped', 'bird', 'fish', 'custom'].map(t => (
            <button key={t} className={`panel-btn small ${rigType === t ? 'active' : ''}`}
              onClick={() => setRigType(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Visual guide */}
      <div className="panel-group">
        <div className="panel-label">Marker Placement — drag to adjust</div>
        <canvas
          ref={canvasRef} width={240} height={300}
          className="autorig-canvas"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
        />
        <button className="panel-btn small" onClick={resetMarkers}>Reset Markers</button>
      </div>

      {/* Options */}
      <div className="panel-group">
        <div className="panel-label">Options</div>
        {[
          ['ik_arms', 'IK Arms'],
          ['ik_legs', 'IK Legs'],
          ['fingers', 'Fingers'],
          ['toes', 'Toes'],
          ['twist_bones', 'Twist Bones'],
          ['stretch', 'Stretch/Squash'],
        ].map(([k, label]) => (
          <div className="panel-row" key={k}>
            <input type="checkbox" checked={options[k]}
              onChange={e => setOptions({ ...options, [k]: e.target.checked })} />
            <label>{label}</label>
          </div>
        ))}
        <div className="panel-row">
          <label>Spine segments</label>
          <input type="range" min="2" max="6" step="1" value={options.spine_count}
            onChange={e => setOptions({ ...options, spine_count: +e.target.value })} />
          <span>{options.spine_count}</span>
        </div>
      </div>

      {/* Build */}
      <div className="panel-group">
        <button className="panel-btn primary full-width" onClick={buildRig}>
          {status === 'idle' ? '⚡ Build Rig' : status === 'building' ? '⚙ Building...' : '✓ Rig Built'}
        </button>
        {status === 'done' && (
          <div className="panel-row" style={{ marginTop: 6 }}>
            <button className="panel-btn">Bind Mesh</button>
            <button className="panel-btn">Weight Paint</button>
            <button className="panel-btn">Reset Pose</button>
          </div>
        )}
      </div>
    </div>
  );
}
