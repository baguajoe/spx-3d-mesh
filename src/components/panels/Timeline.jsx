import React, { useState, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const FPS = 24;
const DEFAULT_END = 250;

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconPlay     = () => <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><polygon points="4,2 14,8 4,14"/></svg>;
const IconPause    = () => <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>;
const IconStop     = () => <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><rect x="2" y="2" width="12" height="12"/></svg>;
const IconFirst    = () => <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><polygon points="12,2 6,8 12,14"/><rect x="2" y="2" width="3" height="12"/></svg>;
const IconLast     = () => <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><polygon points="4,2 10,8 4,14"/><rect x="11" y="2" width="3" height="12"/></svg>;
const IconPrevKey  = () => <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><polygon points="10,2 4,8 10,14"/><line x1="12" y1="2" x2="12" y2="14" stroke="currentColor" strokeWidth="2"/></svg>;
const IconNextKey  = () => <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><polygon points="6,2 12,8 6,14"/><line x1="4" y1="2" x2="4" y2="14" stroke="currentColor" strokeWidth="2"/></svg>;
const IconKey      = () => <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><rect x="6" y="6" width="4" height="4" transform="rotate(45 8 8)"/></svg>;

// ── Default tracks ────────────────────────────────────────────────────────────
const DEFAULT_TRACKS = [
  {
    id: "t1", label: "DefaultCube", type: "object", open: true,
    channels: [
      { id: "c1", label: "Location X", keys: [0, 24, 60, 120] },
      { id: "c2", label: "Location Y", keys: [0, 48, 120] },
      { id: "c3", label: "Rotation Z", keys: [0, 60, 250] },
    ]
  },
  {
    id: "t2", label: "MainCamera", type: "camera", open: false,
    channels: [
      { id: "c4", label: "Location",   keys: [0, 120] },
      { id: "c5", label: "FOV",        keys: [30, 90] },
    ]
  },
  {
    id: "t3", label: "Sun",        type: "light", open: false,
    channels: [
      { id: "c6", label: "Intensity", keys: [0, 60, 120, 180] },
    ]
  },
];

// ── Scrubber ──────────────────────────────────────────────────────────────────
function Scrubber({ frame, start, end, onChange }) {
  const ref = useRef(null);

  const seek = useCallback((e) => {
    const rect = ref.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange(Math.round(start + pct * (end - start)));
  }, [start, end, onChange]);

  const onMouseDown = (e) => {
    seek(e);
    const move = (ev) => seek(ev);
    const up   = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const pct = ((frame - start) / (end - start)) * 100;

  // Ruler ticks
  const ticks = [];
  const step  = end <= 100 ? 10 : end <= 500 ? 25 : 50;
  for (let f = start; f <= end; f += step) {
    const x = ((f - start) / (end - start)) * 100;
    ticks.push({ f, x });
  }

  return (
    <div className="spx-tl-scrubber" ref={ref} onMouseDown={onMouseDown}>
      {ticks.map(t => (
        <div key={t.f} className="spx-tl-tick" ref={el => { if(el) el.style.left = t.x + "%" }}>
          <div className="spx-tl-tick-line" />
          <span className="spx-tl-tick-label">{t.f}</span>
        </div>
      ))}
      <div className="spx-tl-playhead" ref={el => { if(el) el.style.left = pct + "%" }} />
    </div>
  );
}

// ── KeyDiamond ────────────────────────────────────────────────────────────────
function KeyDiamond({ frame, start, end, selected, onClick }) {
  const pct = ((frame - start) / (end - start)) * 100;
  return (
    <div
      className={`spx-tl-key${selected ? " spx-tl-key--selected" : ""}`}
      ref={el => { if(el) el.style.left = pct + "%" }}
      onClick={e => { e.stopPropagation(); onClick?.(frame); }}
      title={`Frame ${frame}`}
    />
  );
}

// ── TrackRow ──────────────────────────────────────────────────────────────────
function TrackRow({ track, frame, start, end, onToggleOpen }) {
  return (
    <>
      <div className="spx-tl-track-hdr">
        <button
          className="spx-tl-track-toggle"
          onClick={() => onToggleOpen?.(track.id)}
        >
          <svg className={`spx-tl-chevron${track.open ? " spx-tl-chevron--open" : ""}`} viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
        <span className="spx-tl-track-label">{track.label}</span>
        <div className="spx-tl-track-area">
          {track.channels.flatMap(ch => ch.keys).map((f, i) => (
            <KeyDiamond key={i} frame={f} start={start} end={end} />
          ))}
          <div className="spx-tl-playline" ref={el => { if(el) el.style.left = ((frame-start)/(end-start)*100) + "%" }} />
        </div>
      </div>
      {track.open && track.channels.map(ch => (
        <div key={ch.id} className="spx-tl-channel-row">
          <span className="spx-tl-channel-label">{ch.label}</span>
          <div className="spx-tl-track-area">
            {ch.keys.map((f, i) => (
              <KeyDiamond key={i} frame={f} start={start} end={end} />
            ))}
            <div className="spx-tl-playline" ref={el => { if(el) el.style.left = ((frame-start)/(end-start)*100) + "%" }} />
          </div>
        </div>
      ))}
    </>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
export default function Timeline() {
  const [frame,    setFrame]    = useState(1);
  const [playing,  setPlaying]  = useState(false);
  const [start,    setStart]    = useState(1);
  const [end,      setEnd]      = useState(DEFAULT_END);
  const [fps,      setFps]      = useState(FPS);
  const [autoKey,  setAutoKey]  = useState(false);
  const [mode,     setMode]     = useState("dope"); // dope | graph | nla
  const [tracks,   setTracks]   = useState(DEFAULT_TRACKS);
  const rafRef = useRef(null);
  const lastRef = useRef(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const play = () => {
    setPlaying(true);
    lastRef.current = performance.now();
    const tick = (now) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setFrame(f => {
        const next = f + dt * fps;
        return next > end ? start : next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
  };

  const stop = () => {
    pause();
    setFrame(start);
  };

  const toggleOpen = (id) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, open: !t.open } : t));
  };

  return (
    <div className="spx-timeline">

      {/* Header */}
      <div className="spx-tl-header">
        <div className="spx-tl-mode-tabs">
          {["dope","graph","nla"].map(m => (
            <button
              key={m}
              className={`spx-tl-mode-tab${mode === m ? " spx-tl-mode-tab--active" : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "dope" ? "Dope Sheet" : m === "graph" ? "Graph Editor" : "NLA"}
            </button>
          ))}
        </div>

        {/* Playback Controls */}
        <div className="spx-tl-controls">
          <button className="spx-tl-btn" onClick={() => setFrame(start)} title="First Frame"><IconFirst /></button>
          <button className="spx-tl-btn" title="Prev Keyframe"><IconPrevKey /></button>
          {playing
            ? <button className="spx-tl-btn spx-tl-btn--play" onClick={pause} title="Pause"><IconPause /></button>
            : <button className="spx-tl-btn spx-tl-btn--play" onClick={play}  title="Play"><IconPlay /></button>
          }
          <button className="spx-tl-btn" onClick={stop} title="Stop"><IconStop /></button>
          <button className="spx-tl-btn" title="Next Keyframe"><IconNextKey /></button>
          <button className="spx-tl-btn" onClick={() => setFrame(end)} title="Last Frame"><IconLast /></button>
        </div>

        {/* Frame / Range / FPS */}
        <div className="spx-tl-fields">
          <div className="spx-tl-field">
            <span className="spx-tl-field-label">Start</span>
            <input className="spx-tl-field-input" type="number" value={start} onChange={e => setStart(+e.target.value)} />
          </div>
          <div className="spx-tl-field">
            <span className="spx-tl-field-label">Frame</span>
            <input className="spx-tl-field-input spx-tl-field-input--frame" type="number" value={Math.round(frame)} onChange={e => setFrame(+e.target.value)} />
          </div>
          <div className="spx-tl-field">
            <span className="spx-tl-field-label">End</span>
            <input className="spx-tl-field-input" type="number" value={end} onChange={e => setEnd(+e.target.value)} />
          </div>
          <div className="spx-tl-field">
            <span className="spx-tl-field-label">FPS</span>
            <select className="spx-tl-field-select" value={fps} onChange={e => setFps(+e.target.value)}>
              {[12,24,25,30,48,60].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <button
            className={`spx-tl-autokey${autoKey ? " spx-tl-autokey--on" : ""}`}
            onClick={() => setAutoKey(v => !v)}
            title="Auto Keyframe"
          >
            <IconKey /> AUTO
          </button>
        </div>
      </div>

      {/* Scrubber */}
      <Scrubber frame={Math.round(frame)} start={start} end={end} onChange={setFrame} />

      {/* Track List */}
      <div className="spx-tl-tracks">
        {tracks.map(track => (
          <TrackRow
            key={track.id}
            track={track}
            frame={Math.round(frame)}
            start={start}
            end={end}
            onToggleOpen={toggleOpen}
          />
        ))}
      </div>

    </div>
  );
}
