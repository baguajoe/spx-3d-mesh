import React, { useState, useRef, useCallback } from 'react';

const DEFAULT_TRACKS = [
  {
    id: 1, name: 'Body', muted: false, solo: false,
    strips: [
      { id: 1, name: 'Idle', start: 0, end: 60, blend: 1.0, blendIn: 5, blendOut: 5, color: '#2a6a4a', active: true },
      { id: 2, name: 'Walk', start: 55, end: 120, blend: 0.8, blendIn: 8, blendOut: 5, color: '#2a4a8a', active: false },
    ]
  },
  {
    id: 2, name: 'Face', muted: false, solo: false,
    strips: [
      { id: 3, name: 'Blink', start: 10, end: 30, blend: 1.0, blendIn: 2, blendOut: 2, color: '#6a2a6a', active: true },
      { id: 4, name: 'Smile', start: 40, end: 80, blend: 0.6, blendIn: 5, blendOut: 5, color: '#6a4a2a', active: false },
    ]
  },
  {
    id: 3, name: 'Hands', muted: true, solo: false,
    strips: [
      { id: 5, name: 'Wave', start: 30, end: 70, blend: 1.0, blendIn: 3, blendOut: 3, color: '#2a6a6a', active: false },
    ]
  },
];

const TOTAL_FRAMES = 180;
const TRACK_H = 44;
const RULER_H = 20;

export default function NLAEditor() {
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(null); // { trackId, stripId }
  const [zoom, setZoom] = useState(1);
  const rafRef = useRef(null);
  const lastRef = useRef(null);

  // Playback
  const play = useCallback(() => {
    setPlaying(true);
    const tick = (now) => {
      if (!lastRef.current) lastRef.current = now;
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setCurrentFrame(f => {
        const next = f + dt * 30;
        if (next >= TOTAL_FRAMES) { setPlaying(false); return 0; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const pause = useCallback(() => {
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    lastRef.current = null;
  }, []);

  const togglePlay = () => playing ? pause() : play();

  // Get selected strip
  const selectedStrip = selected
    ? tracks.find(t => t.id === selected.trackId)?.strips.find(s => s.id === selected.stripId)
    : null;

  const updateStrip = (trackId, stripId, updates) => {
    setTracks(prev => prev.map(t => t.id === trackId
      ? { ...t, strips: t.strips.map(s => s.id === stripId ? { ...s, ...updates } : s) }
      : t
    ));
  };

  const addTrack = () => {
    const id = Date.now();
    setTracks(prev => [...prev, { id, name: `Track ${prev.length + 1}`, muted: false, solo: false, strips: [] }]);
  };

  const addStrip = (trackId) => {
    const id = Date.now();
    const colors = ['#2a6a4a', '#2a4a8a', '#6a2a6a', '#6a4a2a', '#2a6a6a', '#6a2a2a'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    setTracks(prev => prev.map(t => t.id === trackId
      ? { ...t, strips: [...t.strips, { id, name: 'New Clip', start: currentFrame, end: currentFrame + 40, blend: 1.0, blendIn: 5, blendOut: 5, color, active: false }] }
      : t
    ));
  };

  const frameToX = (f) => (f / TOTAL_FRAMES) * 100 * zoom;

  return (
    <div className="panel-section">
      <div className="panel-header">NLA Editor</div>

      {/* Transport */}
      <div className="nla-transport">
        <button className="transport-btn" onClick={() => setCurrentFrame(0)}>⏮</button>
        <button className="transport-btn" onClick={() => setCurrentFrame(f => Math.max(0, f - 1))}>◀</button>
        <button className="transport-btn primary" onClick={togglePlay}>{playing ? '⏸' : '▶'}</button>
        <button className="transport-btn" onClick={() => setCurrentFrame(f => Math.min(TOTAL_FRAMES, f + 1))}>▶</button>
        <button className="transport-btn" onClick={() => setCurrentFrame(TOTAL_FRAMES)}>⏭</button>
        <span className="frame-display">{Math.round(currentFrame)} / {TOTAL_FRAMES}</span>
        <label className="nla-zoom-label">
          Zoom
          <input type="range" min="0.5" max="3" step="0.1" value={zoom}
            onChange={e => setZoom(+e.target.value)} className="nla-zoom" />
        </label>
      </div>

      {/* Timeline */}
      <div className="nla-timeline">
        {/* Ruler */}
        <div className="nla-ruler" style={{ height: RULER_H }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="nla-ruler-tick"
              style={{ left: `${(i / 9) * 100 * zoom}%` }}>
              {Math.round((i / 9) * TOTAL_FRAMES)}
            </div>
          ))}
          {/* Playhead */}
          <div className="nla-playhead" style={{ left: `${frameToX(currentFrame)}%` }} />
        </div>

        {/* Tracks */}
        <div className="nla-tracks">
          {tracks.map(track => (
            <div key={track.id} className={`nla-track ${track.muted ? 'muted' : ''}`}
              style={{ height: TRACK_H }}>
              {/* Track label */}
              <div className="nla-track-label">
                <span className="nla-track-name">{track.name}</span>
                <div className="nla-track-btns">
                  <button
                    className={`nla-mute-btn ${track.muted ? 'active' : ''}`}
                    onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t))}>
                    M
                  </button>
                  <button
                    className={`nla-solo-btn ${track.solo ? 'active' : ''}`}
                    onClick={() => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, solo: !t.solo } : t))}>
                    S
                  </button>
                  <button className="nla-add-strip-btn" onClick={() => addStrip(track.id)}>+</button>
                </div>
              </div>

              {/* Strip lane */}
              <div className="nla-strip-lane">
                {track.strips.map(strip => {
                  const left = frameToX(strip.start);
                  const width = frameToX(strip.end - strip.start);
                  const isSelected = selected?.stripId === strip.id;
                  return (
                    <div key={strip.id}
                      className={`nla-strip ${isSelected ? 'selected' : ''}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: strip.color,
                        opacity: track.muted ? 0.3 : 1,
                      }}
                      onClick={() => setSelected({ trackId: track.id, stripId: strip.id })}>
                      <div className="nla-strip-blend-in"
                        style={{ width: `${(strip.blendIn / (strip.end - strip.start)) * 100}%` }} />
                      <span className="nla-strip-label">{strip.name}</span>
                      <div className="nla-strip-blend-out"
                        style={{ width: `${(strip.blendOut / (strip.end - strip.start)) * 100}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strip properties */}
      {selectedStrip && selected && (
        <div className="panel-group">
          <div className="panel-label">Strip — {selectedStrip.name}</div>
          <div className="panel-row">
            <label>Name</label>
            <input type="text" value={selectedStrip.name}
              onChange={e => updateStrip(selected.trackId, selected.stripId, { name: e.target.value })} />
          </div>
          <div className="panel-row">
            <label>Start</label>
            <input type="number" value={Math.round(selectedStrip.start)}
              onChange={e => updateStrip(selected.trackId, selected.stripId, { start: +e.target.value })} />
            <label>End</label>
            <input type="number" value={Math.round(selectedStrip.end)}
              onChange={e => updateStrip(selected.trackId, selected.stripId, { end: +e.target.value })} />
          </div>
          <div className="panel-row">
            <label>Blend</label>
            <input type="range" min="0" max="1" step="0.01" value={selectedStrip.blend}
              onChange={e => updateStrip(selected.trackId, selected.stripId, { blend: +e.target.value })} />
            <span>{selectedStrip.blend.toFixed(2)}</span>
          </div>
          <div className="panel-row">
            <label>Blend In</label>
            <input type="number" min="0" max="30" value={selectedStrip.blendIn}
              onChange={e => updateStrip(selected.trackId, selected.stripId, { blendIn: +e.target.value })} />
            <label>Blend Out</label>
            <input type="number" min="0" max="30" value={selectedStrip.blendOut}
              onChange={e => updateStrip(selected.trackId, selected.stripId, { blendOut: +e.target.value })} />
          </div>
          <div className="panel-row">
            <label>Color</label>
            <input type="color" value={selectedStrip.color}
              onChange={e => updateStrip(selected.trackId, selected.stripId, { color: e.target.value })} />
          </div>
        </div>
      )}

      <div className="panel-group">
        <button className="panel-btn full-width" onClick={addTrack}>+ Add Track</button>
        <div className="panel-row">
          <button className="panel-btn">Bake to Keyframes</button>
          <button className="panel-btn">Export NLA</button>
        </div>
      </div>
    </div>
  );
}
