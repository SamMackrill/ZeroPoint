// Disposable renderer investigation. Never import into the simulation application.
const query = new URLSearchParams(location.search);
const backend = ['webgl', 'webgpu', 'fallback'].includes(query.get('backend')) ? query.get('backend') : 'webgl';
const mode = query.get('mode') === 'points' ? 'points' : 'mesh';
const count = [1000, 10000, 50000].includes(Number(query.get('count'))) ? Number(query.get('count')) : 10000;
const form = document.querySelector('form');
for (const [key, value] of Object.entries({backend, mode, count})) form.elements[key].value = value;
const status = document.querySelector('#status');
const measure = document.querySelector('#measure');
const download = document.querySelector('#download');
window.spikeDiagnostics = {frames:0, errors:[]};
window.addEventListener('error', event => window.spikeDiagnostics.errors.push(event.message));
window.addEventListener('unhandledrejection', event => window.spikeDiagnostics.errors.push(String(event.reason)));
let sampling = false, samples = [], started = 0, prior = 0, invalid = false, watchdog;
document.addEventListener('visibilitychange', () => { if (sampling) invalid = true; });
try {
  const THREE = await import(backend === 'webgl' ? 'three' : 'three/webgpu');
  const {OrbitControls} = await import('three/addons/controls/OrbitControls.js');
  const renderer = backend === 'webgl' ? new THREE.WebGLRenderer({antialias:true}) : new THREE.WebGPURenderer({antialias:true, forceWebGL:backend === 'fallback'});
  if (renderer.init) await renderer.init();
  renderer.setPixelRatio(1);
  const actualBackend = backend === 'webgl' ? 'WebGL 2' : renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2 fallback';
  const viewport = document.querySelector('#viewport');
  viewport.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#0d1620');
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 100); camera.position.set(11, 8, 15);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  new ResizeObserver(() => { const w=viewport.clientWidth,h=viewport.clientHeight; renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix(); if(sampling) invalid=true; }).observe(viewport);
  let seed = 2026;
  /** Return the next deterministic pseudo-random sample for the benchmark. */
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const base = new Float32Array(count*4);
  for(let i=0;i<count;i++){base[i*4]=(random()-.5)*12;base[i*4+1]=(random()-.5)*8;base[i*4+2]=(random()-.5)*12;base[i*4+3]=random()*Math.PI*2;}
  const dummy = new THREE.Object3D();
  let red, blue, points;
  if(mode==='mesh'){
    const geometry=new THREE.SphereGeometry(.045,8,6);
    red=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:'#ff986d'}),count);
    blue=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:'#71b9ff'}),count);
    for(const mesh of [red,blue]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);}
  }else{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));
    points=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#76d6cb',size:.065,sizeAttenuation:true}));points.frustumCulled=false;scene.add(points);
  }
  let adapterInfo = null;
  try{const adapter=await navigator.gpu?.requestAdapter();if(adapter)adapterInfo={vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description};}catch{/* Capability probe only. */}
  let glRenderer = null;
  if(backend==='webgl'){const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');glRenderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}
  const metadata={date:new Date().toISOString(),three:THREE.REVISION,requestedBackend:backend,actualBackend,mode,count,seed:2026,pixelRatio:1,userAgent:navigator.userAgent,adapterInfo,glRenderer,method:'CPU animated opaque geometry; 1 second warmup then 5 seconds RAF intervals; no solver or GPU timing'};
  window.spikeReady=true;
  status.textContent=`Ready · ${actualBackend} · ${count.toLocaleString()} dipoles · ${mode}`;
  measure.disabled=false;
  measure.onclick=()=>{samples=[];started=performance.now();prior=0;invalid=document.hidden;sampling=true;measure.disabled=true;download.disabled=true;delete window.spikeResult;status.textContent='Measuring: 1 second warmup + 5 seconds sample…';watchdog=setTimeout(()=>{if(sampling){sampling=false;measure.disabled=false;status.textContent='Measurement invalid: animation callbacks stalled. Keep the page visible and repeat.';window.spikeResult={...metadata,valid:false,reason:'Animation callbacks stalled',frames:samples.length};}},12000);};
  /** Finalize benchmark statistics and expose the downloadable report. */
  function finish(){
    sampling=false;measure.disabled=false;clearTimeout(watchdog);
    const sorted=[...samples].sort((a,b)=>a-b),mean=samples.reduce((a,b)=>a+b,0)/samples.length;
    window.spikeResult={...metadata,viewport:{width:viewport.clientWidth,height:viewport.clientHeight},valid:!invalid,frames:samples.length,meanFrameMs:mean,p50FrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],meanFps:1000/mean,drawCalls:renderer.info.render.drawCalls??renderer.info.render.calls,triangles:renderer.info.render.triangles,points:renderer.info.render.points};
    document.querySelector('#report').textContent=JSON.stringify(window.spikeResult,null,2);download.disabled=false;
    status.textContent=invalid?'Measurement invalid: visibility or viewport changed. Repeat.':'Measurement complete. Compare only on this device and viewport.';
  }
  /** Draw one benchmark frame and collect timing samples when active. */
  function draw(now=performance.now()){
    window.spikeDiagnostics.frames++;
    window.spikeDiagnostics.lastTime=now;
    const t=now*.00035;
    for(let i=0;i<count;i++){
      const b=i*4,phase=base[b+3]+t,x=base[b]+Math.sin(phase)*.06,y=base[b+1],z=base[b+2];
      if(points){const a=points.geometry.attributes.position.array;a[i*3]=x;a[i*3+1]=y;a[i*3+2]=z;}
      else{dummy.rotation.set(0,0,phase);dummy.scale.setScalar(.65+.35*Math.sin(phase)**2);const dx=Math.cos(phase)*.05,dy=Math.sin(phase)*.05;dummy.position.set(x+dx,y+dy,z);dummy.updateMatrix();red.setMatrixAt(i,dummy.matrix);dummy.position.set(x-dx,y-dy,z);dummy.updateMatrix();blue.setMatrixAt(i,dummy.matrix);}
    }
    if(points)points.geometry.attributes.position.needsUpdate=true;else{red.instanceMatrix.needsUpdate=true;blue.instanceMatrix.needsUpdate=true;}
    controls.update();renderer.render(scene,camera);
    if(sampling&&now-started>=1000){if(prior)samples.push(now-prior);prior=now;if(now-started>=6000&&samples.length)finish();}
  }
  window.spikeSmoke=()=>{draw(performance.now());return {requestedBackend:backend,actualBackend,mode,count,drawCalls:renderer.info.render.drawCalls??renderer.info.render.calls,triangles:renderer.info.render.triangles,points:renderer.info.render.points,errors:window.spikeDiagnostics.errors};};
  await renderer.setAnimationLoop(draw);
  download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(window.spikeResult,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`rendering-${backend}-${mode}-${count}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}catch(error){status.textContent=`Could not initialize: ${error.message}. Check network access to jsDelivr, or select WebGL 2.`;console.error(error);window.spikeError=String(error);}
