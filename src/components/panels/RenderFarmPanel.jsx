import React, { useState, useEffect } from 'react';

const MOCK_NODES = [
  { id: 1, name: 'Local Machine', status: 'idle', cores: 8, gpu: 'RTX 4080', jobs: 0 },
  { id: 2, name: 'Render Node 01', status: 'idle', cores: 16, gpu: 'A100', jobs: 0 },
  { id: 3, name: 'Render Node 02', status: 'offline', cores: 16, gpu: 'A100', jobs: 0 },
];

const PRIORITY = ['Low', 'Normal', 'High', 'Critical'];
const OUTPUT_FORMATS = ['PNG', 'EXR', 'JPG', 'TIFF', 'MP4', 'WebM'];

export default function RenderFarmPanel() {
  const [nodes, setNodes] = useState(MOCK_NODES);
  const [jobs, setJobs] = useState([]);
  const [settings, setSettings] = useState({
    startFrame: 1, endFrame: 120, step: 1,
    width: 1920, height: 1080,
    samples: 128, priority: 'Normal',
    outputFormat: 'PNG', outputPath: '/renders/output_',
    distributeFrames: true, useGPU: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Simulate job progress
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prev => prev.map(job => {
        if (job.status !== 'rendering') return job;
        const newProgress = Math.min(100, job.progress + Math.random() * 3);
        const done = newProgress >= 100;
        return {
          ...job,
          progress: newProgress,
          status: done ? 'complete' : 'rendering',
          completedFrames: done ? job.totalFrames : Math.round((newProgress / 100) * job.totalFrames),
        };
      }));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const submitJob = () => {
    setSubmitting(true);
    setTimeout(() => {
      const totalFrames = Math.ceil((settings.endFrame - settings.startFrame + 1) / settings.step);
      const id = Date.now();
      const newJob = {
        id,
        name: `Render_${id.toString().slice(-4)}`,
        status: 'rendering',
        progress: 0,
        totalFrames,
        completedFrames: 0,
        startFrame: settings.startFrame,
        endFrame: settings.endFrame,
        width: settings.width,
        height: settings.height,
        samples: settings.samples,
        priority: settings.priority,
        format: settings.outputFormat,
        node: nodes.find(n => n.status === 'idle')?.name || 'Local Machine',
        submittedAt: new Date().toLocaleTimeString(),
      };
      setJobs(prev => [newJob, ...prev]);
      setNodes(prev => prev.map(n =>
        n.name === newJob.node ? { ...n, status: 'rendering', jobs: n.jobs + 1 } : n
      ));
      setSubmitting(false);
    }, 600);
  };

  const cancelJob = (id) => {
    const job = jobs.find(j => j.id === id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled', progress: j.progress } : j));
    if (job) {
      setNodes(prev => prev.map(n =>
        n.name === job.node ? { ...n, status: 'idle', jobs: Math.max(0, n.jobs - 1) } : n
      ));
    }
  };

  const clearCompleted = () => {
    setJobs(prev => prev.filter(j => j.status !== 'complete' && j.status !== 'cancelled'));
  };

  const activeJobs = jobs.filter(j => j.status === 'rendering').length;
  const totalNodes = nodes.filter(n => n.status !== 'offline').length;

  return (
    <div className="panel-section">
      <div className="panel-header">Render Farm</div>

      {/* Farm status */}
      <div className="farm-stats">
        <div className="farm-stat">
          <span className="farm-stat-val">{totalNodes}</span>
          <span className="farm-stat-label">Nodes Online</span>
        </div>
        <div className="farm-stat">
          <span className="farm-stat-val">{activeJobs}</span>
          <span className="farm-stat-label">Active Jobs</span>
        </div>
        <div className="farm-stat">
          <span className="farm-stat-val">{jobs.filter(j => j.status === 'complete').length}</span>
          <span className="farm-stat-label">Completed</span>
        </div>
      </div>

      {/* Render nodes */}
      <div className="panel-group">
        <div className="panel-label">Render Nodes</div>
        {nodes.map(node => (
          <div key={node.id} className={`farm-node ${node.status}`}>
            <div className={`farm-node-dot ${node.status}`} />
            <div className="farm-node-info">
              <span className="farm-node-name">{node.name}</span>
              <span className="farm-node-specs">{node.cores}c · {node.gpu}</span>
            </div>
            <span className={`farm-node-status ${node.status}`}>{node.status}</span>
          </div>
        ))}
        <button className="panel-btn" onClick={() => {
          const id = nodes.length + 1;
          setNodes(prev => [...prev, { id, name: `Render Node 0${id}`, status: 'idle', cores: 8, gpu: 'RTX 3090', jobs: 0 }]);
        }}>+ Add Node</button>
      </div>

      {/* Job settings */}
      <div className="panel-group">
        <div className="panel-label">Job Settings</div>
        <div className="panel-row">
          <label>Frames</label>
          <input type="number" value={settings.startFrame}
            onChange={e => setSettings({ ...settings, startFrame: +e.target.value })} style={{ width: 50 }} />
          <span>→</span>
          <input type="number" value={settings.endFrame}
            onChange={e => setSettings({ ...settings, endFrame: +e.target.value })} style={{ width: 50 }} />
          <label>Step</label>
          <input type="number" value={settings.step} min="1"
            onChange={e => setSettings({ ...settings, step: +e.target.value })} style={{ width: 40 }} />
        </div>
        <div className="panel-row">
          <label>Resolution</label>
          <input type="number" value={settings.width}
            onChange={e => setSettings({ ...settings, width: +e.target.value })} style={{ width: 55 }} />
          <span>×</span>
          <input type="number" value={settings.height}
            onChange={e => setSettings({ ...settings, height: +e.target.value })} style={{ width: 55 }} />
        </div>
        <div className="panel-row">
          <label>Samples</label>
          <input type="range" min="16" max="2048" step="16" value={settings.samples}
            onChange={e => setSettings({ ...settings, samples: +e.target.value })} />
          <span>{settings.samples}</span>
        </div>
        <div className="panel-row">
          <label>Priority</label>
          <select value={settings.priority}
            onChange={e => setSettings({ ...settings, priority: e.target.value })}>
            {PRIORITY.map(p => <option key={p}>{p}</option>)}
          </select>
          <label>Format</label>
          <select value={settings.outputFormat}
            onChange={e => setSettings({ ...settings, outputFormat: e.target.value })}>
            {OUTPUT_FORMATS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="panel-row">
          <input type="checkbox" checked={settings.distributeFrames}
            onChange={e => setSettings({ ...settings, distributeFrames: e.target.checked })} />
          <label>Distribute across nodes</label>
        </div>
        <div className="panel-row">
          <input type="checkbox" checked={settings.useGPU}
            onChange={e => setSettings({ ...settings, useGPU: e.target.checked })} />
          <label>Use GPU rendering</label>
        </div>
        <div className="panel-row">
          <label>Output</label>
          <input type="text" value={settings.outputPath}
            onChange={e => setSettings({ ...settings, outputPath: e.target.value })}
            style={{ flex: 1, fontSize: 10 }} />
        </div>
        <button className="panel-btn primary full-width"
          onClick={submitJob} disabled={submitting}>
          {submitting ? 'Submitting...' : '▶ Submit Job'}
        </button>
      </div>

      {/* Job queue */}
      {jobs.length > 0 && (
        <div className="panel-group">
          <div className="panel-label">
            Job Queue
            <button className="panel-btn small" style={{ marginLeft: 'auto' }} onClick={clearCompleted}>
              Clear Done
            </button>
          </div>
          {jobs.map(job => (
            <div key={job.id} className={`farm-job ${job.status}`}>
              <div className="farm-job-header">
                <span className="farm-job-name">{job.name}</span>
                <span className={`farm-job-status ${job.status}`}>{job.status}</span>
                {job.status === 'rendering' && (
                  <button className="panel-btn small danger" onClick={() => cancelJob(job.id)}>✕</button>
                )}
              </div>
              <div className="farm-job-info">
                {job.width}×{job.height} · {job.totalFrames}f · {job.samples}spp · {job.node}
              </div>
              {job.status === 'rendering' && (
                <div className="farm-progress-bar">
                  <div className="farm-progress-fill" style={{ width: `${job.progress}%` }} />
                  <span className="farm-progress-label">
                    {job.completedFrames}/{job.totalFrames} frames ({Math.round(job.progress)}%)
                  </span>
                </div>
              )}
              {job.status === 'complete' && (
                <div className="farm-job-done">✓ Complete · {job.submittedAt}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
