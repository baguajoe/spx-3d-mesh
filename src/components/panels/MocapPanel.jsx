import React, { useState, useRef, useCallback } from "react";

const MP = {
  POSE:  "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js",
  FACE:  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js",
  HANDS: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js",
  CAM:   "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js",
  DRAW:  "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js",
};

function loadScript(url) {
  return new Promise((res,rej)=>{
    if(document.querySelector(`script[src="${url}"]`))return res();
    const s=document.createElement("script");s.src=url;s.onload=res;s.onerror=rej;document.head.appendChild(s);
  });
}

// ── Body Tab ──────────────────────────────────────────────────────────────────
function BodyTab({ onPose, onStatus }) {
  const vidRef = useRef(null);
  const canRef = useRef(null);
  const camRef = useRef(null);
  const [active, setActive] = useState(false);
  const [fps,    setFps]    = useState(0);
  const [lmCount,setLmCount]= useState(0);
  const fpsRef = useRef({f:0,t:performance.now()});

  const start = async () => {
    onStatus("Loading MediaPipe Pose…");
    try {
      await Promise.all([loadScript(MP.POSE),loadScript(MP.CAM),loadScript(MP.DRAW)]);
      const pose = new window.Pose({ locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${f}` });
      pose.setOptions({ modelComplexity:2, smoothLandmarks:true, minDetectionConfidence:0.7, minTrackingConfidence:0.7 });
      pose.onResults(r=>{
        const c=canRef.current,ctx=c?.getContext("2d");if(!ctx)return;
        c.width=r.image.width;c.height=r.image.height;
        ctx.drawImage(r.image,0,0);
        if(r.poseLandmarks){
          window.drawConnectors?.(ctx,r.poseLandmarks,window.POSE_CONNECTIONS,{color:"#00ffc8",lineWidth:2});
          window.drawLandmarks?.(ctx,r.poseLandmarks,{color:"#ff6600",lineWidth:1,radius:3});
          setLmCount(r.poseLandmarks.length);
          onPose?.("body",r.poseLandmarks);
        }
        fpsRef.current.f++;
        const now=performance.now();
        if(now-fpsRef.current.t>500){setFps(Math.round(fpsRef.current.f*2));fpsRef.current.f=0;fpsRef.current.t=now;}
      });
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
      vidRef.current.srcObject=stream;vidRef.current.play();
      const cam=new window.Camera(vidRef.current,{onFrame:async()=>{await pose.send({image:vidRef.current});},width:640,height:480});
      cam.start();camRef.current=cam;setActive(true);onStatus("Body capture — 33 landmarks");
    }catch(e){onStatus(`Error: ${e.message}`);}
  };

  const stop=()=>{
    camRef.current?.stop();
    vidRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    setActive(false);setLmCount(0);onStatus("Stopped");
  };

  return (
    <div className="spx-mc-content">
      <div className="spx-mc-section-hdr">Body Capture · 33 Landmarks</div>
      <div className="spx-mc-video-row">
        <video className="spx-mc-video" ref={vidRef} autoPlay playsInline muted/>
        <canvas className="spx-mc-canvas" ref={canRef}/>
      </div>
      <div className="spx-mc-stats-row">
        {active&&<span className="spx-mc-stat spx-mc-stat--live">● LIVE</span>}
        {lmCount>0&&<span className="spx-mc-stat">{lmCount} pts · {fps}fps</span>}
      </div>
      <div className="spx-mc-actions">
        {!active
          ?<button className="spx-mc-btn spx-mc-btn--primary" onClick={start}>Start Body Capture</button>
          :<button className="spx-mc-btn spx-mc-btn--danger"  onClick={stop}>Stop</button>
        }
      </div>
    </div>
  );
}

// ── Face Tab ──────────────────────────────────────────────────────────────────
function FaceTab({ onPose, onStatus }) {
  const vidRef=useRef(null),canRef=useRef(null),camRef=useRef(null);
  const [active,setActive]=useState(false);
  const [bs,setBs]=useState(null);

  const computeBS=(lm)=>{
    if(!lm||lm.length<468)return null;
    return {
      jawOpen:   Math.max(0,Math.min(1,(lm[13].y-lm[14].y)*6)),
      blinkL:    Math.max(0,Math.min(1,1-(lm[159].y-lm[145].y)*20)),
      blinkR:    Math.max(0,Math.min(1,1-(lm[386].y-lm[374].y)*20)),
      browUpL:   Math.max(0,Math.min(1,(0.4-lm[70].y)*5)),
      browUpR:   Math.max(0,Math.min(1,(0.4-lm[300].y)*5)),
      smileL:    Math.max(0,Math.min(1,(lm[61].x-0.3)*3)),
      smileR:    Math.max(0,Math.min(1,(0.7-lm[291].x)*3)),
      mouthOpen: Math.max(0,Math.min(1,(lm[13].y-lm[14].y)*4)),
    };
  };

  const start=async()=>{
    onStatus("Loading FaceMesh…");
    try{
      await Promise.all([loadScript(MP.FACE),loadScript(MP.CAM),loadScript(MP.DRAW)]);
      const face=new window.FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${f}`});
      face.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:0.7,minTrackingConfidence:0.7});
      face.onResults(r=>{
        const c=canRef.current,ctx=c?.getContext("2d");if(!ctx)return;
        c.width=r.image.width;c.height=r.image.height;ctx.drawImage(r.image,0,0);
        if(r.multiFaceLandmarks?.[0]){
          const lm=r.multiFaceLandmarks[0];
          window.drawConnectors?.(ctx,lm,window.FACEMESH_TESSELATION,{color:"rgba(0,255,200,0.1)",lineWidth:0.5});
          window.drawConnectors?.(ctx,lm,window.FACEMESH_FACE_OVAL,{color:"#00ffc8",lineWidth:1.5});
          window.drawConnectors?.(ctx,lm,window.FACEMESH_LEFT_EYE,{color:"#ff6600",lineWidth:1.5});
          window.drawConnectors?.(ctx,lm,window.FACEMESH_RIGHT_EYE,{color:"#ff6600",lineWidth:1.5});
          const blendShapes=computeBS(lm);
          setBs(blendShapes);
          onPose?.("face",{landmarks:lm,blendShapes});
        }
      });
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:"user"}});
      vidRef.current.srcObject=stream;vidRef.current.play();
      const cam=new window.Camera(vidRef.current,{onFrame:async()=>{await face.send({image:vidRef.current});},width:640,height:480});
      cam.start();camRef.current=cam;setActive(true);onStatus("Face capture — 468 landmarks");
    }catch(e){onStatus(`Error: ${e.message}`);}
  };

  const stop=()=>{
    camRef.current?.stop();
    vidRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    setActive(false);setBs(null);onStatus("Stopped");
  };

  return (
    <div className="spx-mc-content">
      <div className="spx-mc-section-hdr">Face Capture · 468 Landmarks</div>
      <div className="spx-mc-video-row">
        <video className="spx-mc-video" ref={vidRef} autoPlay playsInline muted/>
        <canvas className="spx-mc-canvas" ref={canRef}/>
      </div>
      {bs&&(
        <div className="spx-mc-blendshapes">
          {Object.entries(bs).map(([k,v])=>(
            <div key={k} className="spx-mc-bs-row">
              <span className="spx-mc-bs-label">{k}</span>
              <div className="spx-mc-bs-track">
                <div className="spx-mc-bs-fill" ref={el=>{if(el)el.style.width=(v*100)+'%';}}/>
              </div>
              <span className="spx-mc-bs-val">{v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="spx-mc-actions">
        {!active
          ?<button className="spx-mc-btn spx-mc-btn--primary" onClick={start}>Start Face Capture</button>
          :<button className="spx-mc-btn spx-mc-btn--danger"  onClick={stop}>Stop</button>
        }
      </div>
    </div>
  );
}

// ── Hands Tab ─────────────────────────────────────────────────────────────────
function HandsTab({ onPose, onStatus }) {
  const vidRef=useRef(null),canRef=useRef(null),camRef=useRef(null);
  const [active,setActive]=useState(false);
  const [handInfo,setHandInfo]=useState(null);

  const start=async()=>{
    onStatus("Loading MediaPipe Hands…");
    try{
      await Promise.all([loadScript(MP.HANDS),loadScript(MP.CAM),loadScript(MP.DRAW)]);
      const hands=new window.Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`});
      hands.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:0.7,minTrackingConfidence:0.7});
      hands.onResults(r=>{
        const c=canRef.current,ctx=c?.getContext("2d");if(!ctx)return;
        c.width=r.image.width;c.height=r.image.height;ctx.drawImage(r.image,0,0);
        if(r.multiHandLandmarks){
          r.multiHandLandmarks.forEach((lm,i)=>{
            const left=r.multiHandedness[i]?.label==="Left";
            window.drawConnectors?.(ctx,lm,window.HAND_CONNECTIONS,{color:left?"#00ffc8":"#ff6600",lineWidth:2});
            window.drawLandmarks?.(ctx,lm,{color:left?"#00aa88":"#cc4400",lineWidth:1,radius:3});
          });
          setHandInfo(r.multiHandedness.map(h=>h.label));
          onPose?.("hands",r.multiHandLandmarks);
        }
      });
      const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
      vidRef.current.srcObject=stream;vidRef.current.play();
      const cam=new window.Camera(vidRef.current,{onFrame:async()=>{await hands.send({image:vidRef.current});},width:640,height:480});
      cam.start();camRef.current=cam;setActive(true);onStatus("Hand capture — 21 landmarks per hand");
    }catch(e){onStatus(`Error: ${e.message}`);}
  };

  const stop=()=>{
    camRef.current?.stop();
    vidRef.current?.srcObject?.getTracks().forEach(t=>t.stop());
    setActive(false);setHandInfo(null);onStatus("Stopped");
  };

  return (
    <div className="spx-mc-content">
      <div className="spx-mc-section-hdr">Hand Capture · 21 Landmarks × 2</div>
      <div className="spx-mc-video-row">
        <video className="spx-mc-video" ref={vidRef} autoPlay playsInline muted/>
        <canvas className="spx-mc-canvas" ref={canRef}/>
      </div>
      {handInfo&&<div className="spx-mc-stats-row">{handInfo.map((h,i)=><span key={i} className="spx-mc-stat">{h} hand</span>)}</div>}
      <div className="spx-mc-actions">
        {!active
          ?<button className="spx-mc-btn spx-mc-btn--primary" onClick={start}>Start Hand Capture</button>
          :<button className="spx-mc-btn spx-mc-btn--danger"  onClick={stop}>Stop</button>
        }
      </div>
    </div>
  );
}

// ── Video MoCap Tab ───────────────────────────────────────────────────────────
function VideoTab({ onPose, onStatus }) {
  const vidRef=useRef(null),canRef=useRef(null);
  const [processing,setProcessing]=useState(false);
  const [progress,setProgress]=useState(0);
  const [frames,setFrames]=useState([]);

  const processVideo=async(file)=>{
    setProcessing(true);setProgress(0);setFrames([]);
    onStatus("Processing video…");
    try{
      await Promise.all([loadScript(MP.POSE),loadScript(MP.DRAW)]);
      const pose=new window.Pose({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${f}`});
      pose.setOptions({modelComplexity:1,smoothLandmarks:true,minDetectionConfidence:0.5,minTrackingConfidence:0.5});
      const allFrames=[];
      pose.onResults(r=>{ if(r.poseLandmarks)allFrames.push({time:vidRef.current?.currentTime||0,landmarks:r.poseLandmarks}); });
      const url=URL.createObjectURL(file);
      vidRef.current.src=url;
      await new Promise(res=>{vidRef.current.onloadedmetadata=res;});
      const duration=vidRef.current.duration;
      for(let t=0;t<duration;t+=1/24){
        vidRef.current.currentTime=t;
        await new Promise(res=>{vidRef.current.onseeked=res;});
        await pose.send({image:vidRef.current});
        setProgress(Math.round((t/duration)*100));
      }
      setFrames(allFrames);
      onPose?.("video_frames",allFrames);
      onStatus(`${allFrames.length} frames extracted`);
    }catch(e){onStatus(`Error: ${e.message}`);}
    finally{setProcessing(false);}
  };

  const exportBVH=()=>{
    if(!frames.length)return;
    let bvh=`HIERARCHY\nROOT Hips\n{\n  OFFSET 0 0 0\n  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation\n  End Site\n  {\n    OFFSET 0 1 0\n  }\n}\nMOTION\nFrames: ${frames.length}\nFrame Time: 0.041667\n`;
    frames.forEach(f=>{
      const h=f.landmarks[23]||{x:0,y:0,z:0};
      bvh+=`${(h.x*100).toFixed(4)} ${((1-h.y)*100).toFixed(4)} ${(h.z*100).toFixed(4)} 0 0 0\n`;
    });
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([bvh],{type:"text/plain"}));a.download=`mocap_${Date.now()}.bvh`;a.click();
  };

  return (
    <div className="spx-mc-content">
      <div className="spx-mc-section-hdr">Video Motion Capture</div>
      <label className="spx-mc-upload-label">
        📁 Load Video File
        <input className="spx-mc-file-input" type="file" accept="video/*" onChange={e=>{const f=e.target.files?.[0];if(f)processVideo(f);}}/>
      </label>
      <video className="spx-mc-video-preview" ref={vidRef} controls/>
      <canvas className="spx-mc-canvas-hidden" ref={canRef}/>
      {processing&&(
        <div className="spx-mc-progress-wrap">
          <div className="spx-mc-progress-bar" ref={el=>{if(el)el.style.width=progress+'%';}}/>
          <span className="spx-mc-progress-label">Processing {progress}%</span>
        </div>
      )}
      {frames.length>0&&(
        <div className="spx-mc-stats-row">
          <span className="spx-mc-stat">{frames.length} frames</span>
          <span className="spx-mc-stat">{(frames.length/24).toFixed(1)}s</span>
        </div>
      )}
      <div className="spx-mc-actions">
        {frames.length>0&&<button className="spx-mc-btn" onClick={exportBVH}>Export BVH</button>}
      </div>
    </div>
  );
}

// ── Library Tab ───────────────────────────────────────────────────────────────
const CLIPS=[
  {name:"Idle",dur:"2.0s",cat:"Locomotion"},{name:"Walk Cycle",dur:"1.2s",cat:"Locomotion"},
  {name:"Run Cycle",dur:"0.8s",cat:"Locomotion"},{name:"Jump",dur:"1.5s",cat:"Locomotion"},
  {name:"Wave Hello",dur:"2.0s",cat:"Gesture"},{name:"Thumbs Up",dur:"1.0s",cat:"Gesture"},
  {name:"Clap",dur:"1.5s",cat:"Gesture"},{name:"Point",dur:"1.0s",cat:"Gesture"},
  {name:"Sit Down",dur:"2.5s",cat:"Action"},{name:"Stand Up",dur:"2.5s",cat:"Action"},
  {name:"Pick Up",dur:"2.0s",cat:"Action"},{name:"Throw",dur:"1.2s",cat:"Action"},
  {name:"Punch",dur:"0.8s",cat:"Combat"},{name:"Kick",dur:"0.8s",cat:"Combat"},
  {name:"Block",dur:"0.6s",cat:"Combat"},{name:"Dance Basic",dur:"4.0s",cat:"Dance"},
  {name:"Hip Hop",dur:"4.0s",cat:"Dance"},{name:"Bow",dur:"1.5s",cat:"Social"},
  {name:"Shrug",dur:"1.2s",cat:"Social"},{name:"Nod",dur:"1.0s",cat:"Social"},
];

function LibraryTab({ onAction }) {
  const [filter,setFilter]=useState("All");
  const cats=["All",...new Set(CLIPS.map(c=>c.cat))];
  const filtered=filter==="All"?CLIPS:CLIPS.filter(c=>c.cat===filter);
  return (
    <div className="spx-mc-content">
      <div className="spx-mc-section-hdr">Motion Library · {CLIPS.length} clips</div>
      <div className="spx-mc-lib-filters">
        {cats.map(c=><button key={c} className={`spx-mc-lib-filter${filter===c?" spx-mc-lib-filter--active":""}`} onClick={()=>setFilter(c)}>{c}</button>)}
      </div>
      <div className="spx-mc-lib-list">
        {filtered.map(clip=>(
          <div key={clip.name} className="spx-mc-lib-item">
            <span className="spx-mc-lib-name">{clip.name}</span>
            <span className="spx-mc-lib-dur">{clip.dur}</span>
            <span className="spx-mc-lib-cat">{clip.cat}</span>
            <button className="spx-mc-lib-btn" onClick={()=>onAction?.("mocap_apply_clip",clip)}>▶ Apply</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS=[
  {id:"body",  label:"Body",   icon:"🦾"},
  {id:"face",  label:"Face",   icon:"😐"},
  {id:"hands", label:"Hands",  icon:"🖐"},
  {id:"video", label:"Video",  icon:"🎬"},
  {id:"library",label:"Library",icon:"📚"},
];

export default function MocapPanel({ onAction }) {
  const [tab,    setTab]    = useState("body");
  const [status, setStatus] = useState("Ready — select a capture mode");
  const [recording,setRecording]=useState(false);
  const recorded=useRef([]);

  const handlePose=useCallback((type,data)=>{
    onAction?.("mocap_pose",{type,data});
    if(recording)recorded.current.push({type,data,time:Date.now()});
  },[onAction,recording]);

  const exportSession=()=>{
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(recorded.current,null,2)],{type:"application/json"}));
    a.download=`mocap_session_${Date.now()}.json`;a.click();
  };

  return (
    <div className="spx-mc-panel">
      <div className="spx-panel-header">
        <span className="spx-panel-title">MoCap Studio</span>
        <div className="spx-mc-header-btns">
          <button className={`spx-mc-rec-btn${recording?" spx-mc-rec-btn--active":""}`} onClick={()=>setRecording(v=>!v)}>
            {recording?"⏹ Stop":"⏺ Record"}
          </button>
          {recorded.current.length>0&&<button className="spx-mc-btn" onClick={exportSession}>Export</button>}
        </div>
      </div>
      <div className="spx-mc-status">{status}</div>
      <div className="spx-mc-tabs">
        {TABS.map(t=>(
          <button key={t.id} className={`spx-mc-tab${tab===t.id?" spx-mc-tab--active":""}`} onClick={()=>setTab(t.id)}>
            <span className="spx-mc-tab-icon">{t.icon}</span>
            <span className="spx-mc-tab-label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="spx-mc-body">
        {tab==="body"    &&<BodyTab    onPose={handlePose} onStatus={setStatus}/>}
        {tab==="face"    &&<FaceTab    onPose={handlePose} onStatus={setStatus}/>}
        {tab==="hands"   &&<HandsTab   onPose={handlePose} onStatus={setStatus}/>}
        {tab==="video"   &&<VideoTab   onPose={handlePose} onStatus={setStatus}/>}
        {tab==="library" &&<LibraryTab onAction={onAction}/>}
      </div>
    </div>
  );
}
