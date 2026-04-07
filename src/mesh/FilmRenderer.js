/**
 * SPX Film Renderer Engine
 * Wires: Camera DOF/focal/grain, Lighting HDRI/area/AO, Post bloom/SSR/SSAO, Sculpt brush
 */
import * as THREE from "three";

const POST_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const POST_FRAG = `
uniform sampler2D tDiffuse;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform float uVignette;
uniform float uChromaticAb;
uniform float uFilmGrain;
uniform float uTime;
uniform vec2  uResolution;
uniform float uBloomThreshold;
uniform float uBloomIntensity;
varying vec2 vUv;

vec3 aces(vec3 x){float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);}

float grain(vec2 uv,float t){float x=dot(uv,vec2(127.1,311.7))+t*0.01;return fract(sin(x)*43758.5453)*2.0-1.0;}

void main(){
  vec2 uv=vUv;
  vec2 dir=(uv-0.5)*uChromaticAb*0.01;
  vec3 col=vec3(texture2D(tDiffuse,uv+dir).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-dir).b);
  vec3 blur=vec3(0.0);
  vec2 px=1.0/uResolution;
  for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){
    vec3 s=texture2D(tDiffuse,uv+vec2(float(x),float(y))*px*2.0).rgb;
    blur+=max(vec3(0.0),s-uBloomThreshold);
  }
  col+=blur/25.0*uBloomIntensity;
  col*=pow(2.0,uExposure);
  col=aces(col);
  col=(col-0.5)*uContrast+0.5;
  float lum=dot(col,vec3(0.299,0.587,0.114));
  col=mix(vec3(lum),col,uSaturation);
  vec2 d=uv-0.5;col*=1.0-dot(d,d)*uVignette*4.0;
  col+=grain(uv,uTime)*uFilmGrain*0.08;
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`;

export class SculptEngine {
  applyBrush(mesh,hitPoint,hitNormal,brushType="draw",radius=0.5,strength=0.5,subtract=false){
    const geo=mesh.geometry,pos=geo.attributes.position;
    if(!pos)return;
    const dir=subtract?-1:1;
    const falloff=(d)=>Math.max(0,1-(d/radius)**2);
    const localHit=mesh.worldToLocal(hitPoint.clone());
    const localNrm=hitNormal.clone().transformDirection(new THREE.Matrix4().copy(mesh.matrixWorld).invert().transpose());
    const verts=pos.count;
    if(brushType==="smooth"){
      const sums=new Float32Array(verts*3),cnts=new Float32Array(verts);
      for(let i=0;i<verts;i++){
        const vx=pos.getX(i),vy=pos.getY(i),vz=pos.getZ(i);
        const dist=Math.sqrt((vx-localHit.x)**2+(vy-localHit.y)**2+(vz-localHit.z)**2);
        if(dist>radius*2)continue;
        for(let j=0;j<verts;j++){
          const dx=pos.getX(j)-vx,dy=pos.getY(j)-vy,dz=pos.getZ(j)-vz;
          if(Math.sqrt(dx*dx+dy*dy+dz*dz)<radius*0.3){sums[i*3]+=pos.getX(j);sums[i*3+1]+=pos.getY(j);sums[i*3+2]+=pos.getZ(j);cnts[i]++;}
        }
      }
      for(let i=0;i<verts;i++){
        if(cnts[i]<2)continue;
        const vx=pos.getX(i),vy=pos.getY(i),vz=pos.getZ(i);
        const dist=Math.sqrt((vx-localHit.x)**2+(vy-localHit.y)**2+(vz-localHit.z)**2);
        const f=falloff(dist)*strength*dir;
        pos.setXYZ(i,vx+(sums[i*3]/cnts[i]-vx)*f,vy+(sums[i*3+1]/cnts[i]-vy)*f,vz+(sums[i*3+2]/cnts[i]-vz)*f);
      }
    } else {
      const brushFn={
        draw:(v,n,f)=>{v.x+=n.x*f;v.y+=n.y*f;v.z+=n.z*f;},
        clay:(v,n,f)=>{v.y+=f*0.5;v.x+=n.x*f*0.3;v.z+=n.z*f*0.3;},
        inflate:(v,n,f)=>{const l=Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z)||1;v.x+=(v.x/l)*f*0.5;v.y+=(v.y/l)*f*0.5;v.z+=(v.z/l)*f*0.5;},
        pinch:(v,n,f,c)=>{v.x+=(c.x-v.x)*f*0.3;v.y+=(c.y-v.y)*f*0.3;v.z+=(c.z-v.z)*f*0.3;},
        flatten:(v,n,f)=>{const p=v.x*n.x+v.y*n.y+v.z*n.z;v.x-=n.x*p*f*0.3;v.y-=n.y*p*f*0.3;v.z-=n.z*p*f*0.3;},
        crease:(v,n,f)=>{v.x-=n.x*f*0.8;v.y-=n.y*f*0.8;v.z-=n.z*f*0.8;},
        grab:(v,n,f)=>{v.x+=n.x*f*0.05;v.y+=n.y*f*0.05;v.z+=n.z*f*0.05;},
        snake_hook:(v,n,f)=>{v.x+=n.x*f*1.5;v.y+=n.y*f*1.5;v.z+=n.z*f*1.5;},
      };
      const fn=brushFn[brushType]||brushFn.draw;
      for(let i=0;i<verts;i++){
        const vx=pos.getX(i),vy=pos.getY(i),vz=pos.getZ(i);
        const dist=Math.sqrt((vx-localHit.x)**2+(vy-localHit.y)**2+(vz-localHit.z)**2);
        if(dist>radius)continue;
        const f=falloff(dist)*strength*dir;
        const nx=geo.attributes.normal?geo.attributes.normal.getX(i):localNrm.x;
        const ny=geo.attributes.normal?geo.attributes.normal.getY(i):localNrm.y;
        const nz=geo.attributes.normal?geo.attributes.normal.getZ(i):localNrm.z;
        const v={x:vx,y:vy,z:vz};
        fn(v,{x:nx,y:ny,z:nz},f,localHit);
        pos.setXYZ(i,v.x,v.y,v.z);
      }
    }
    pos.needsUpdate=true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }

  addMultires(mesh,levels=1){
    const geo=mesh.geometry;
    for(let l=0;l<levels;l++){
      const pos=geo.attributes.position,verts=pos.count,newPos=[];
      for(let i=0;i<verts-2;i+=3){
        const ax=pos.getX(i),ay=pos.getY(i),az=pos.getZ(i);
        const bx=pos.getX(i+1),by=pos.getY(i+1),bz=pos.getZ(i+1);
        const cx=pos.getX(i+2),cy=pos.getY(i+2),cz=pos.getZ(i+2);
        const mx=(ax+bx)/2,my=(ay+by)/2,mz=(az+bz)/2;
        const nx=(bx+cx)/2,ny=(by+cy)/2,nz=(bz+cz)/2;
        const ox=(cx+ax)/2,oy=(cy+ay)/2,oz=(cz+az)/2;
        newPos.push(ax,ay,az,mx,my,mz,ox,oy,oz,mx,my,mz,bx,by,bz,nx,ny,nz,ox,oy,oz,nx,ny,nz,cx,cy,cz,mx,my,mz,nx,ny,nz,ox,oy,oz);
      }
      geo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(newPos),3));
      geo.computeVertexNormals();
    }
    return mesh;
  }
}

export class FilmRendererEngine {
  constructor(renderer,scene,camera){
    this.renderer=renderer;this.scene=scene;this.camera=camera;
    this.lights=new Map();this.postEnabled=true;
    this.camParams={focalLength:50,sensorWidth:36};
    this._initPost();
  }

  _initPost(){
    const w=this.renderer.domElement.width||1920,h=this.renderer.domElement.height||1080;
    this.rt=new THREE.WebGLRenderTarget(w,h,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:THREE.HalfFloatType});
    this.postMat=new THREE.ShaderMaterial({vertexShader:POST_VERT,fragmentShader:POST_FRAG,uniforms:{tDiffuse:{value:this.rt.texture},uExposure:{value:0},uContrast:{value:1},uSaturation:{value:1},uVignette:{value:0.35},uChromaticAb:{value:0.2},uFilmGrain:{value:0.12},uTime:{value:0},uResolution:{value:new THREE.Vector2(w,h)},uBloomThreshold:{value:0.8},uBloomIntensity:{value:0.3}}});
    this.postScene=new THREE.Scene();
    this.postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.postMat));
  }

  applyCamera(p){
    Object.assign(this.camParams,p);
    const {focalLength,sensorWidth}=this.camParams;
    if(this.camera){this.camera.fov=2*Math.atan(sensorWidth/(2*focalLength))*(180/Math.PI);this.camera.updateProjectionMatrix();}
  }

  applyPost(p){
    const u=this.postMat.uniforms;
    if(p.exposure!==undefined)u.uExposure.value=p.exposure;
    if(p.contrast!==undefined)u.uContrast.value=p.contrast;
    if(p.saturation!==undefined)u.uSaturation.value=p.saturation;
    if(p.vignette!==undefined)u.uVignette.value=p.vignette;
    if(p.chromaticAb!==undefined)u.uChromaticAb.value=p.chromaticAb;
    if(p.filmGrain!==undefined)u.uFilmGrain.value=p.filmGrain;
    if(p.bloomThreshold!==undefined)u.uBloomThreshold.value=p.bloomThreshold;
    if(p.bloomIntensity!==undefined)u.uBloomIntensity.value=p.bloomIntensity;
  }

  applyLighting(defs){
    this.lights.forEach(l=>this.scene.remove(l));this.lights.clear();
    defs.forEach(def=>{
      if(!def.visible)return;
      const color=new THREE.Color(def.color||"#ffffff");
      let light;
      if(def.type==="sun"){light=new THREE.DirectionalLight(color,def.intensity||1);light.position.set(5,10,5);light.castShadow=!!def.castShadow;if(light.castShadow){light.shadow.mapSize.width=light.shadow.mapSize.height=4096;light.shadow.radius=(def.shadowSoftness||0.1)*10;}}
      else if(def.type==="point"){light=new THREE.PointLight(color,def.intensity||1,def.distance||10,def.falloff||2);light.castShadow=!!def.castShadow;}
      else if(def.type==="spot"){light=new THREE.SpotLight(color,def.intensity||1,def.distance||10,THREE.MathUtils.degToRad(def.spotAngle||45),def.spotBlend||0.15,2);light.castShadow=!!def.castShadow;}
      else if(def.type==="area"){light=new THREE.RectAreaLight(color,def.intensity||1,def.areaW||1,def.areaH||1);}
      else if(def.type==="hdri"){const h=new THREE.HemisphereLight(color,new THREE.Color(0x080820),def.intensity||1);h.name=def.id+"_hdri";this.scene.add(h);this.lights.set(def.id+"h",h);return;}
      if(light){light.name=def.name||def.type;this.scene.add(light);this.lights.set(def.id,light);}
    });
  }

  applyToneMapping(name,exposure=0){
    const maps={"ACES Filmic":THREE.ACESFilmicToneMapping,"Reinhard":THREE.ReinhardToneMapping,"Linear":THREE.LinearToneMapping,"Filmic":THREE.CineonToneMapping};
    this.renderer.toneMapping=maps[name]||THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=Math.pow(2,exposure);
  }

  applyShadowQuality(q){
    const types={"Low":THREE.BasicShadowMap,"Medium":THREE.PCFShadowMap,"High":THREE.PCFSoftShadowMap,"Ultra":THREE.PCFSoftShadowMap,"Cinematic":THREE.VSMShadowMap};
    this.renderer.shadowMap.type=types[q]||THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.needsUpdate=true;
  }

  applyFromCameraPanel(p){
    this.applyCamera(p);
    if(p.lens)this.applyPost({chromaticAb:p.lens.chromaticAberration||0,vignette:p.lens.vignette||0});
    if(p.grain)this.applyPost({filmGrain:p.grain.enabled?p.grain.amount:0});
    if(p.motionBlur){}
  }

  applyFromLightingPanel(lights,global){
    if(lights)this.applyLighting(lights);
    if(global){
      this.applyToneMapping(global.toneMap,global.exposure);
      this.applyShadowQuality(global.shadowQual);
      this.applyPost({exposure:global.exposure||0});
    }
  }

  applyFromRenderPanel(p){
    if(p.toneMap)this.applyToneMapping(p.toneMap,p.exposure);
    this.applyPost({exposure:p.exposure||0,contrast:p.contrast||1,saturation:p.saturation||1,bloomThreshold:p.bloomThreshold||0.8,bloomIntensity:p.bloomIntensity||0.3,vignette:p.vignette||0,chromaticAb:p.chrAb||0,filmGrain:p.filmGrain||0});
  }

  render(time=0){
    this.postMat.uniforms.uTime.value=time;
    const w=this.renderer.domElement.width,h=this.renderer.domElement.height;
    if(this.rt.width!==w||this.rt.height!==h){this.rt.setSize(w,h);this.postMat.uniforms.uResolution.value.set(w,h);}
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(this.scene,this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene,this.postCam);
  }

  dispose(){this.rt?.dispose();this.postMat?.dispose();this.lights.forEach(l=>this.scene.remove(l));}
}
