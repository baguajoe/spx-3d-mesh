import React, { useState, useRef, useCallback } from 'react';

// Node type definitions
const NODE_TYPES = {
  // Input
  value:        { label: 'Value',         category: 'Input',    color: '#2a4a6a', outputs: ['value'], inputs: [] },
  vector:       { label: 'Vector',        category: 'Input',    color: '#2a4a6a', outputs: ['vector'], inputs: [] },
  integer:      { label: 'Integer',       category: 'Input',    color: '#2a4a6a', outputs: ['value'], inputs: [] },
  // Geometry
  mesh_prim:    { label: 'Mesh Primitive', category: 'Geometry', color: '#2a6a4a', outputs: ['geometry'], inputs: [] },
  transform:    { label: 'Transform',     category: 'Geometry', color: '#2a6a4a', outputs: ['geometry'], inputs: ['geometry', 'translation', 'rotation', 'scale'] },
  merge:        { label: 'Merge Geometry', category: 'Geometry', color: '#2a6a4a', outputs: ['geometry'], inputs: ['geometry', 'geometry'] },
  subdivide:    { label: 'Subdivide',     category: 'Geometry', color: '#2a6a4a', outputs: ['geometry'], inputs: ['geometry', 'level'] },
  // Mesh ops
  extrude:      { label: 'Extrude Faces', category: 'Mesh',     color: '#6a4a2a', outputs: ['geometry'], inputs: ['geometry', 'offset', 'scale'] },
  bevel:        { label: 'Bevel',         category: 'Mesh',     color: '#6a4a2a', outputs: ['geometry'], inputs: ['geometry', 'amount', 'segments'] },
  boolean:      { label: 'Boolean',       category: 'Mesh',     color: '#6a4a2a', outputs: ['geometry'], inputs: ['geometry', 'geometry', 'operation'] },
  // Instances
  instance:     { label: 'Instance on Points', category: 'Instances', color: '#6a2a6a', outputs: ['instances'], inputs: ['geometry', 'instance', 'scale'] },
  // Output
  output:       { label: 'Geometry Output', category: 'Output', color: '#1a1a1a', outputs: [], inputs: ['geometry'] },
};

const DEFAULT_NODES = [
  { id: 1, type: 'mesh_prim',  x: 20,  y: 30,  params: { primitive: 'box', size: 1 } },
  { id: 2, type: 'subdivide',  x: 160, y: 30,  params: { level: 2 } },
  { id: 3, type: 'output',     x: 300, y: 30,  params: {} },
];

const DEFAULT_EDGES = [
  { id: 1, from: 1, fromPort: 'geometry', to: 2, toPort: 'geometry' },
  { id: 2, from: 2, fromPort: 'geometry', to: 3, toPort: 'geometry' },
];

// Simple node executor
function executeGraph(nodes, edges) {
  const results = {};
  const sorted = [...nodes]; // topological order assumed for now

  for (const node of sorted) {
    const def = NODE_TYPES[node.type];
    if (!def) continue;

    // Gather inputs from connected edges
    const inputs = {};
    for (const edge of edges) {
      if (edge.to === node.id) {
        inputs[edge.toPort] = results[`${edge.from}:${edge.fromPort}`];
      }
    }

    // Execute node
    let output = null;
    switch (node.type) {
      case 'mesh_prim':
        output = { type: 'geometry', primitive: node.params.primitive || 'box', size: node.params.size || 1 };
        break;
      case 'subdivide':
        output = { ...inputs.geometry, subdivided: true, level: node.params.level || 1 };
        break;
      case 'transform':
        output = { ...inputs.geometry, transformed: true, translation: node.params.translation };
        break;
      case 'extrude':
        output = { ...inputs.geometry, extruded: true, offset: node.params.offset || 0.2 };
        break;
      case 'bevel':
        output = { ...inputs.geometry, beveled: true, amount: node.params.amount || 0.1 };
        break;
      case 'merge':
        output = { type: 'geometry', merged: true, sources: Object.values(inputs) };
        break;
      case 'boolean':
        output = { type: 'geometry', boolean: node.params.operation || 'union', sources: Object.values(inputs) };
        break;
      case 'instance':
        output = { type: 'instances', source: inputs.geometry, instance: inputs.instance };
        break;
      case 'value':
        output = node.params.value ?? 1.0;
        break;
      case 'vector':
        output = [node.params.x ?? 0, node.params.y ?? 0, node.params.z ?? 0];
        break;
      case 'output':
        results['__output__'] = inputs.geometry;
        break;
      default:
        output = inputs.geometry;
    }

    if (node.type !== 'output' && def.outputs[0]) {
      results[`${node.id}:${def.outputs[0]}`] = output;
    }
  }

  return results['__output__'] || null;
}

export default function GeometryNodesPanel() {
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [edges, setEdges] = useState(DEFAULT_EDGES);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const canvasRef = useRef(null);

  const selectedNode = nodes.find(n => n.id === selected);

  const execute = () => {
    const output = executeGraph(nodes, edges);
    setResult(output);
  };

  const addNode = (type) => {
    const id = Date.now();
    setNodes(prev => [...prev, { id, type, x: 80 + Math.random() * 100, y: 80 + Math.random() * 80, params: {} }]);
    setShowAddMenu(false);
  };

  const deleteNode = (id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    if (selected === id) setSelected(null);
  };

  const updateParam = (nodeId, key, val) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, params: { ...n.params, [key]: val } } : n));
  };

  const categories = [...new Set(Object.values(NODE_TYPES).map(n => n.category))];

  return (
    <div className="panel-section">
      <div className="panel-header">Geometry Nodes</div>

      {/* Toolbar */}
      <div className="gn-toolbar">
        <button className="panel-btn primary" onClick={execute}>▶ Execute</button>
        <button className="panel-btn" onClick={() => setShowAddMenu(v => !v)}>+ Add Node</button>
        <button className="panel-btn" onClick={() => { setNodes(DEFAULT_NODES); setEdges(DEFAULT_EDGES); setResult(null); }}>Reset</button>
      </div>

      {/* Add node menu */}
      {showAddMenu && (
        <div className="gn-add-menu">
          {categories.map(cat => (
            <div key={cat} className="gn-add-category">
              <div className="gn-add-cat-label">{cat}</div>
              {Object.entries(NODE_TYPES)
                .filter(([, def]) => def.category === cat)
                .map(([type, def]) => (
                  <button key={type} className="gn-add-node-btn" onClick={() => addNode(type)}>
                    {def.label}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Node canvas */}
      <div className="gn-canvas" ref={canvasRef}>
        {/* Edges */}
        <svg className="gn-edges">
          {edges.map(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            const x1 = fromNode.x + 110;
            const y1 = fromNode.y + 20;
            const x2 = toNode.x;
            const y2 = toNode.y + 20;
            const cx = (x1 + x2) / 2;
            return (
              <path key={edge.id}
                d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                stroke="#00ffc8" strokeWidth="1.5" fill="none" opacity="0.6" />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const def = NODE_TYPES[node.type];
          if (!def) return null;
          return (
            <div key={node.id}
              className={`gn-node ${selected === node.id ? 'selected' : ''}`}
              style={{ left: node.x, top: node.y, borderTopColor: def.color }}
              onClick={() => setSelected(node.id === selected ? null : node.id)}>
              <div className="gn-node-header" style={{ background: def.color }}>
                <span>{def.label}</span>
                <button className="gn-node-del" onClick={e => { e.stopPropagation(); deleteNode(node.id); }}>✕</button>
              </div>
              <div className="gn-node-body">
                {def.inputs.map((inp, i) => (
                  <div key={i} className="gn-port gn-port-in">
                    <div className="gn-port-dot" />
                    <span>{inp}</span>
                  </div>
                ))}
                {def.outputs.map((out, i) => (
                  <div key={i} className="gn-port gn-port-out">
                    <span>{out}</span>
                    <div className="gn-port-dot" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Node properties */}
      {selectedNode && (
        <div className="panel-group">
          <div className="panel-label">Node — {NODE_TYPES[selectedNode.type]?.label}</div>
          {selectedNode.type === 'mesh_prim' && (
            <>
              <div className="panel-row">
                <label>Primitive</label>
                <select value={selectedNode.params.primitive || 'box'}
                  onChange={e => updateParam(selectedNode.id, 'primitive', e.target.value)}>
                  {['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'circle', 'icosphere'].map(p =>
                    <option key={p}>{p}</option>
                  )}
                </select>
              </div>
              <div className="panel-row">
                <label>Size</label>
                <input type="range" min="0.1" max="5" step="0.1"
                  value={selectedNode.params.size || 1}
                  onChange={e => updateParam(selectedNode.id, 'size', +e.target.value)} />
                <span>{(selectedNode.params.size || 1).toFixed(1)}</span>
              </div>
            </>
          )}
          {selectedNode.type === 'subdivide' && (
            <div className="panel-row">
              <label>Level</label>
              <input type="range" min="1" max="6" step="1"
                value={selectedNode.params.level || 1}
                onChange={e => updateParam(selectedNode.id, 'level', +e.target.value)} />
              <span>{selectedNode.params.level || 1}</span>
            </div>
          )}
          {selectedNode.type === 'bevel' && (
            <>
              <div className="panel-row">
                <label>Amount</label>
                <input type="range" min="0" max="1" step="0.01"
                  value={selectedNode.params.amount || 0.1}
                  onChange={e => updateParam(selectedNode.id, 'amount', +e.target.value)} />
                <span>{(selectedNode.params.amount || 0.1).toFixed(2)}</span>
              </div>
              <div className="panel-row">
                <label>Segments</label>
                <input type="range" min="1" max="8" step="1"
                  value={selectedNode.params.segments || 2}
                  onChange={e => updateParam(selectedNode.id, 'segments', +e.target.value)} />
                <span>{selectedNode.params.segments || 2}</span>
              </div>
            </>
          )}
          {selectedNode.type === 'boolean' && (
            <div className="panel-row">
              <label>Operation</label>
              <select value={selectedNode.params.operation || 'union'}
                onChange={e => updateParam(selectedNode.id, 'operation', e.target.value)}>
                <option value="union">Union</option>
                <option value="intersect">Intersect</option>
                <option value="difference">Difference</option>
              </select>
            </div>
          )}
          {selectedNode.type === 'value' && (
            <div className="panel-row">
              <label>Value</label>
              <input type="number" step="0.1"
                value={selectedNode.params.value ?? 1}
                onChange={e => updateParam(selectedNode.id, 'value', +e.target.value)} />
            </div>
          )}
        </div>
      )}

      {/* Execution result */}
      {result && (
        <div className="panel-group">
          <div className="panel-label">Output</div>
          <div className="gn-result">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
          <button className="panel-btn primary full-width">Apply to Scene</button>
        </div>
      )}
    </div>
  );
}
