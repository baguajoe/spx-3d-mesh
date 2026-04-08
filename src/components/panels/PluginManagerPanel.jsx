import React, { useState, useEffect } from 'react';

const BUILTIN_PLUGINS = [
  {
    id: 'spx-core-sculpt',
    name: 'Core Sculpt Engine',
    version: '2.1.0',
    author: 'SPX Team',
    description: 'Advanced sculpting brushes, layers, and dynamic topology',
    category: 'Sculpting',
    enabled: true,
    builtin: true,
    deps: [],
  },
  {
    id: 'spx-cloth-sim',
    name: 'Cloth Simulation',
    version: '1.8.0',
    author: 'SPX Team',
    description: 'PBD cloth solver with wind, collision, and pinning',
    category: 'Simulation',
    enabled: true,
    builtin: true,
    deps: [],
  },
  {
    id: 'spx-hair-grooming',
    name: 'Hair & Grooming',
    version: '1.5.0',
    author: 'SPX Team',
    description: 'Particle hair, grooming tools, physics, and cards',
    category: 'Hair',
    enabled: true,
    builtin: true,
    deps: [],
  },
  {
    id: 'spx-mocap',
    name: 'Motion Capture',
    version: '2.0.0',
    author: 'SPX Team',
    description: 'Webcam/video mocap, face/hand tracking, retargeting',
    category: 'Animation',
    enabled: true,
    builtin: true,
    deps: [],
  },
  {
    id: 'spx-film-renderer',
    name: 'Film Renderer',
    version: '1.2.0',
    author: 'SPX Team',
    description: 'ACES tonemapping, path tracing, film grain, LUTs',
    category: 'Rendering',
    enabled: true,
    builtin: true,
    deps: [],
  },
  {
    id: 'spx-3d-to-2d',
    name: '3D → 2D Pipeline',
    version: '1.0.0',
    author: 'SPX Team',
    description: 'Convert 3D scenes to stylized 2D animation and puppet export',
    category: 'Pipeline',
    enabled: true,
    builtin: true,
    deps: [],
  },
  {
    id: 'spx-geometry-nodes',
    name: 'Geometry Nodes',
    version: '0.9.0',
    author: 'SPX Team',
    description: 'Node-based procedural geometry system',
    category: 'Modeling',
    enabled: true,
    builtin: true,
    deps: [],
  },
  {
    id: 'spx-collaboration',
    name: 'Real-Time Collaboration',
    version: '0.8.0',
    author: 'SPX Team',
    description: 'Multi-user real-time scene editing via WebSocket',
    category: 'Pipeline',
    enabled: false,
    builtin: true,
    deps: [],
  },
];

const CATEGORIES = ['All', 'Modeling', 'Sculpting', 'Animation', 'Simulation', 'Hair', 'Rendering', 'Pipeline'];

export default function PluginManagerPanel() {
  const [plugins, setPlugins] = useState(BUILTIN_PLUGINS);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loadUrl, setLoadUrl] = useState('');
  const [status, setStatus] = useState(null);
  const [tab, setTab] = useState('installed');

  const filtered = plugins.filter(p => {
    const matchCat = filter === 'All' || p.category === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectedPlugin = plugins.find(p => p.id === selected);

  const toggle = (id) => {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
    const p = plugins.find(pp => pp.id === id);
    setStatus(`${p.enabled ? 'Disabled' : 'Enabled'}: ${p.name}`);
    setTimeout(() => setStatus(null), 2000);
  };

  const handleLoadUrl = () => {
    if (!loadUrl.trim()) return;
    setStatus('Loading plugin...');
    setTimeout(() => {
      const name = loadUrl.split('/').pop().replace('.js', '');
      setPlugins(prev => [...prev, {
        id: `custom-${Date.now()}`,
        name: name || 'Custom Plugin',
        version: '1.0.0',
        author: 'External',
        description: `Loaded from ${loadUrl}`,
        category: 'Custom',
        enabled: true,
        builtin: false,
        deps: [],
        url: loadUrl,
      }]);
      setLoadUrl('');
      setStatus(`✓ Plugin loaded: ${name}`);
      setTimeout(() => setStatus(null), 2000);
    }, 800);
  };

  const removePlugin = (id) => {
    const p = plugins.find(pp => pp.id === id);
    if (p?.builtin) return;
    setPlugins(prev => prev.filter(pp => pp.id !== id));
    if (selected === id) setSelected(null);
    setStatus(`Removed: ${p?.name}`);
    setTimeout(() => setStatus(null), 2000);
  };

  const enabledCount = plugins.filter(p => p.enabled).length;

  return (
    <div className="panel-section">
      <div className="panel-header">Plugin Manager</div>

      {/* Tab bar */}
      <div className="plugin-tabs">
        {['installed', 'marketplace', 'settings'].map(t => (
          <button key={t} className={`plugin-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'installed' && (
        <>
          {/* Stats */}
          <div className="plugin-stats">
            <span>{plugins.length} plugins</span>
            <span>{enabledCount} active</span>
            <span>{plugins.filter(p => !p.builtin).length} custom</span>
          </div>

          {/* Search + filter */}
          <div className="panel-group">
            <input
              className="plugin-search"
              placeholder="Search plugins..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="plugin-cats">
              {CATEGORIES.map(c => (
                <button key={c} className={`plugin-cat-btn ${filter === c ? 'active' : ''}`}
                  onClick={() => setFilter(c)}>{c}</button>
              ))}
            </div>
          </div>

          {/* Plugin list */}
          <div className="plugin-list">
            {filtered.map(p => (
              <div key={p.id}
                className={`plugin-item ${selected === p.id ? 'active' : ''} ${!p.enabled ? 'disabled' : ''}`}
                onClick={() => setSelected(p.id === selected ? null : p.id)}>
                <div className="plugin-item-header">
                  <div className={`plugin-dot ${p.enabled ? 'on' : 'off'}`} />
                  <span className="plugin-name">{p.name}</span>
                  <span className="plugin-version">v{p.version}</span>
                  {p.builtin && <span className="plugin-badge">built-in</span>}
                </div>
                <div className="plugin-desc">{p.description}</div>
                <div className="plugin-item-footer">
                  <span className="plugin-cat-tag">{p.category}</span>
                  <div className="plugin-actions">
                    <button
                      className={`plugin-toggle-btn ${p.enabled ? 'on' : 'off'}`}
                      onClick={e => { e.stopPropagation(); toggle(p.id); }}>
                      {p.enabled ? 'Disable' : 'Enable'}
                    </button>
                    {!p.builtin && (
                      <button className="plugin-remove-btn"
                        onClick={e => { e.stopPropagation(); removePlugin(p.id); }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="panel-empty">No plugins match filter</div>
            )}
          </div>

          {/* Load from URL */}
          <div className="panel-group">
            <div className="panel-label">Load Plugin</div>
            <div className="panel-row">
              <input
                className="plugin-url-input"
                placeholder="https://example.com/plugin.js"
                value={loadUrl}
                onChange={e => setLoadUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLoadUrl()}
              />
            </div>
            <div className="panel-row">
              <button className="panel-btn primary full-width" onClick={handleLoadUrl}>
                Load from URL
              </button>
              <button className="panel-btn full-width">
                Load from File
              </button>
            </div>
          </div>

          {status && <div className="plugin-status">{status}</div>}
        </>
      )}

      {tab === 'marketplace' && (
        <div className="plugin-marketplace">
          <div className="plugin-market-item">
            <span className="plugin-name">Auto-UV Pro</span>
            <span className="plugin-version">v2.0</span>
            <button className="panel-btn primary small">Install</button>
          </div>
          <div className="plugin-market-item">
            <span className="plugin-name">Crowd AI Advanced</span>
            <span className="plugin-version">v1.3</span>
            <button className="panel-btn primary small">Install</button>
          </div>
          <div className="plugin-market-item">
            <span className="plugin-name">PBR Material Pack</span>
            <span className="plugin-version">v3.1</span>
            <button className="panel-btn primary small">Install</button>
          </div>
          <div className="plugin-market-item">
            <span className="plugin-name">Terrain Biomes</span>
            <span className="plugin-version">v1.0</span>
            <button className="panel-btn primary small">Install</button>
          </div>
          <div className="panel-empty" style={{marginTop: 8}}>More plugins coming soon</div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="panel-group">
          <div className="panel-label">Plugin Settings</div>
          <div className="panel-row">
            <input type="checkbox" defaultChecked id="auto-load" />
            <label htmlFor="auto-load">Auto-load plugins on startup</label>
          </div>
          <div className="panel-row">
            <input type="checkbox" defaultChecked id="safe-mode" />
            <label htmlFor="safe-mode">Safe mode (sandbox external plugins)</label>
          </div>
          <div className="panel-row">
            <input type="checkbox" id="dev-mode" />
            <label htmlFor="dev-mode">Developer mode (show plugin console)</label>
          </div>
          <div className="panel-row">
            <label>Plugin directory</label>
            <input type="text" defaultValue="./plugins" style={{flex:1, fontSize:10}} />
          </div>
          <div className="panel-row">
            <button className="panel-btn full-width">Reload All Plugins</button>
          </div>
          <div className="panel-row">
            <button className="panel-btn full-width danger">Disable All External</button>
          </div>
        </div>
      )}
    </div>
  );
}
