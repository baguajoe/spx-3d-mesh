import React, { useState } from 'react';

const REPAIR_OPS = [
  { id: 'holes',       label: 'Fill Holes',           desc: 'Close open boundary loops', icon: '⭕', category: 'Topology' },
  { id: 'normals',     label: 'Fix Normals',           desc: 'Recalculate and unify face normals', icon: '↗', category: 'Topology' },
  { id: 'degenerate',  label: 'Remove Degenerate',    desc: 'Delete zero-area faces and edges', icon: '✂', category: 'Topology' },
  { id: 'doubles',     label: 'Merge Doubles',         desc: 'Weld overlapping vertices', icon: '⊕', category: 'Topology' },
  { id: 'manifold',    label: 'Make Manifold',         desc: 'Remove non-manifold edges and vertices', icon: '📐', category: 'Topology' },
  { id: 'isolated',    label: 'Remove Isolated Verts', desc: 'Delete vertices not part of any face', icon: '·', category: 'Cleanup' },
  { id: 'small_parts', label: 'Remove Small Parts',   desc: 'Delete disconnected mesh islands below threshold', icon: '🗑', category: 'Cleanup' },
  { id: 'self_inter',  label: 'Fix Self-Intersections', desc: 'Resolve self-intersecting geometry', icon: '✖', category: 'Cleanup' },
  { id: 'smooth',      label: 'Smooth Normals',        desc: 'Average vertex normals for smooth shading', icon: '〜', category: 'Surface' },
  { id: 'unweld',      label: 'Harden Edges',          desc: 'Split normals at sharp edges', icon: '⌇', category: 'Surface' },
  { id: 'decimate',    label: 'Decimate',              desc: 'Reduce polygon count while preserving shape', icon: '△', category: 'Optimize' },
  { id: 'remesh',      label: 'Remesh (Quad)',         desc: 'Re-topologize to clean quad grid', icon: '⊞', category: 'Optimize' },
  { id: 'triangulate', label: 'Triangulate',           desc: 'Convert all faces to triangles', icon: '▲', category: 'Optimize' },
  { id: 'weld_border', label: 'Weld Border Edges',     desc: 'Stitch adjacent open borders', icon: '🔗', category: 'Topology' },
];

const CATEGORIES = ['All', 'Topology', 'Cleanup', 'Surface', 'Optimize'];

export default function MeshRepairPanel() {
  const [selected, setSelected] = useState(new Set(['holes', 'normals', 'degenerate', 'doubles']));
  const [filter, setFilter] = useState('All');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [params, setParams] = useState({
    mergeThreshold: 0.001,
    decimateRatio: 0.5,
    minIslandVerts: 10,
    smoothIterations: 3,
    remeshVoxelSize: 0.05,
  });

  const toggleOp = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runRepair = () => {
    setRunning(true);
    setResults(null);
    setTimeout(() => {
      const ops = REPAIR_OPS.filter(op => selected.has(op.id));
      const mockResults = ops.map(op => ({
        op: op.label,
        status: 'fixed',
        detail: getMockResult(op.id),
      }));
      setResults(mockResults);
      setRunning(false);
    }, 1200);
  };

  const getMockResult = (id) => {
    const map = {
      holes: 'Filled 3 holes',
      normals: 'Fixed 142 flipped normals',
      degenerate: 'Removed 8 degenerate faces',
      doubles: 'Merged 24 duplicate vertices',
      manifold: 'Resolved 6 non-manifold edges',
      isolated: 'Removed 12 isolated vertices',
      small_parts: 'Removed 2 small islands',
      self_inter: 'Fixed 4 self-intersections',
      smooth: 'Smoothed normals on 1,842 vertices',
      unweld: 'Hardened 34 sharp edges',
      decimate: `Reduced to ${Math.round(params.decimateRatio * 100)}% of original`,
      remesh: 'Remeshed to 4,096 quads',
      triangulate: 'Triangulated 2,048 faces',
      weld_border: 'Welded 6 border edge pairs',
    };
    return map[id] || 'Done';
  };

  const filtered = REPAIR_OPS.filter(op =>
    filter === 'All' || op.category === filter
  );

  return (
    <div className="panel-section">
      <div className="panel-header">Mesh Repair</div>

      {/* Analysis */}
      <div className="panel-group">
        <div className="panel-label">Analysis</div>
        <button className="panel-btn full-width" onClick={() => setResults([
          { op: 'Scan', status: 'info', detail: 'Found 3 holes, 142 flipped normals, 8 degenerate faces, 24 double verts' }
        ])}>
          🔍 Scan Mesh
        </button>
      </div>

      {/* Filter */}
      <div className="panel-group">
        <div className="repair-cats">
          {CATEGORIES.map(c => (
            <button key={c} className={`plugin-cat-btn ${filter === c ? 'active' : ''}`}
              onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* Operations */}
      <div className="panel-group">
        <div className="panel-label">
          Operations
          <button className="panel-btn small" style={{ marginLeft: 'auto' }}
            onClick={() => setSelected(new Set(REPAIR_OPS.map(o => o.id)))}>All</button>
          <button className="panel-btn small"
            onClick={() => setSelected(new Set())}>None</button>
        </div>
        {filtered.map(op => (
          <div key={op.id} className={`repair-op ${selected.has(op.id) ? 'selected' : ''}`}
            onClick={() => toggleOp(op.id)}>
            <input type="checkbox" checked={selected.has(op.id)} onChange={() => {}} />
            <span className="repair-op-icon">{op.icon}</span>
            <div className="repair-op-info">
              <span className="repair-op-label">{op.label}</span>
              <span className="repair-op-desc">{op.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Params */}
      <div className="panel-group">
        <div className="panel-label">Parameters</div>
        <div className="panel-row">
          <label>Merge dist</label>
          <input type="range" min="0.0001" max="0.1" step="0.0001" value={params.mergeThreshold}
            onChange={e => setParams({ ...params, mergeThreshold: +e.target.value })} />
          <span>{params.mergeThreshold.toFixed(4)}</span>
        </div>
        <div className="panel-row">
          <label>Decimate</label>
          <input type="range" min="0.1" max="1" step="0.01" value={params.decimateRatio}
            onChange={e => setParams({ ...params, decimateRatio: +e.target.value })} />
          <span>{(params.decimateRatio * 100).toFixed(0)}%</span>
        </div>
        <div className="panel-row">
          <label>Smooth iter</label>
          <input type="range" min="1" max="10" step="1" value={params.smoothIterations}
            onChange={e => setParams({ ...params, smoothIterations: +e.target.value })} />
          <span>{params.smoothIterations}</span>
        </div>
        <div className="panel-row">
          <label>Min island</label>
          <input type="number" min="1" value={params.minIslandVerts}
            onChange={e => setParams({ ...params, minIslandVerts: +e.target.value })} />
          <span>verts</span>
        </div>
      </div>

      {/* Run */}
      <div className="panel-group">
        <button className="panel-btn primary full-width"
          onClick={runRepair} disabled={running || selected.size === 0}>
          {running ? '⚙ Repairing...' : `⚡ Run ${selected.size} Operation${selected.size !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="panel-group">
          <div className="panel-label">Results</div>
          {results.map((r, i) => (
            <div key={i} className={`repair-result ${r.status}`}>
              <span className="repair-result-icon">
                {r.status === 'fixed' ? '✓' : r.status === 'info' ? 'ℹ' : '✗'}
              </span>
              <div>
                <div className="repair-result-op">{r.op}</div>
                <div className="repair-result-detail">{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
