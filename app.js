import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { VRButton } from 'three/addons/VRButton.js';

const TF_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';
const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const DEPTH_MODEL = 'onnx-community/depth-anything-v2-small';
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// MediaPipe prints routine 'INFO:' logs via console.error; route them to console.info
const _err = console.error.bind(console);
console.error = (...a) => (typeof a[0] === 'string' && a[0].startsWith('INFO:')) ? console.info(...a) : _err(...a);
const $ = id => document.getElementById(id);
const status = m => { $('status').textContent = m; };
const GW = 160, GH = 120, N = GW * GH;

// ---------- three.js scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.xr.enabled = true;
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
camera.position.set(0, 0, 2.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.addEventListener('start', () => controls.__moved = true);

const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
for (let y = 0, i = 0; y < GH; y++) for (let x = 0; x < GW; x++, i++) {
  pos[i*3] = (x / GW - .5) * 1.6; pos[i*3+1] = -(y / GH - .5) * 1.2; pos[i*3+2] = 0;
  col[i*3] = .85; col[i*3+1] = .7; col[i*3+2] = .35;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
const mat = new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, sizeAttenuation: true });
const cloud = new THREE.Points(geo, mat);
const holo = new THREE.Group(); holo.add(cloud); holo.position.y = 0; scene.add(holo);
// subtle base ring
const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .58, 64), new THREE.MeshBasicMaterial({ color: 0xd9b45a, side: THREE.DoubleSide, transparent: true, opacity: .5 }));
ring.rotation.x = -Math.PI/2; ring.position.y = -.65; scene.add(ring);

let ghost = false;
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (!controls.__moved) camera.position.setLength(camera.aspect < 1 ? 1.9 / camera.aspect : 2.6); }
addEventListener('resize', resize); resize();
$('xrSlot').appendChild(VRButton.createButton(renderer));

// ---------- capture & inference ----------
const vid = $('vid');
const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
const ctx = cv.getContext('2d', { willReadFrequently: true });
let depth = null, mask = null, depthModel = null, segmenter = null, busy = false, localStream = null, remoteStream = null;

let depthP = null, depthFailed = false;
function loadDepth() {
  if (depthP) return depthP;
  status('Loading free depth model (Depth Anything V2 small, Apache-2.0)…');
  depthP = (async () => {
    const tf = await import(TF_URL);
    if (navigator.gpu) {
      try { const a = await navigator.gpu.requestAdapter(); if (a) return depthModel = await tf.pipeline('depth-estimation', DEPTH_MODEL, { device: 'webgpu', dtype: 'fp32' }); }
      catch (e) { console.info('WebGPU unavailable, using WASM:', String(e && e.message || e)); }
    }
    return depthModel = await tf.pipeline('depth-estimation', DEPTH_MODEL, { device: 'wasm', dtype: 'q8' });
  })();
  depthP.catch(e => { depthFailed = true; console.warn('Depth model failed:', String(e && e.message || e)); });
  return depthP;
}
let segP = null;
function loadSeg() {
  if (segP) return segP;
  return segP = (async () => {
  status('Loading MediaPipe selfie segmentation (Apache-2.0)…');
  const mp = await import(MP_URL + '/vision_bundle.mjs');
  const fs = await mp.FilesetResolver.forVisionTasks(MP_URL + '/wasm');
  segmenter = await mp.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: SEG_MODEL }, runningMode: 'IMAGE', outputConfidenceMasks: true });
  return segmenter; })();
}

async function inferLoop() {
  if (busy || vid.readyState < 2) return; busy = true;
  try {
    if ($('chkSeg').checked) {
      await loadSeg();
      const r = segmenter.segment(cv);
      const m = r.confidenceMasks && r.confidenceMasks[0];
      if (m) { mask = m.getAsFloat32Array().slice(); }
      r.close && r.close();
    } else mask = null;
    if ($('chkDepth').checked && !depthFailed) {
      const dm = await loadDepth();
      const out = await dm(cv.toDataURL('image/jpeg', .85));
      const d = out.depth; // RawImage, width/height, 1 channel, 0-255 (near = bright)
      const res = new Float32Array(N);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const sx = Math.floor(x * d.width / GW), sy = Math.floor(y * d.height / GH);
        res[y*GW+x] = d.data[sy * d.width + sx] / 255;
      }
      depth = res;
    } else depth = null;
    status(`Live. ${depthModel ? 'Depth ✓ ' : ''}${segmenter ? 'Segmentation ✓ ' : ''}Drag to rotate.`);
  } catch (e) { console.warn(String(e && e.message || e)); status('Model load issue: ' + e.message + ' (2.5D fallback in use)'); }
  busy = false;
}

function updateCloud() {
  if (vid.readyState < 2) return;
  // mirror for selfie view
  ctx.save(); ctx.scale(-1, 1); ctx.drawImage(vid, -GW, 0, GW, GH); ctx.restore();
  const px = ctx.getImageData(0, 0, GW, GH).data;
  const dScale = +$('rngDepth').value;
  const segM = mask && mask.length === N ? mask : null;
  for (let i = 0; i < N; i++) {
    const r = px[i*4]/255, g = px[i*4+1]/255, b = px[i*4+2]/255;
    let z = depth ? depth[i] : (0.3*r + 0.59*g + 0.11*b) * 0.4; // luminance fallback
    let a = 1;
    if (segM) { if (segM[i] < 0.5) a = 0; }
    pos[i*3+2] = a ? (z - .5) * dScale : -50; // push background away (culled)
    col[i*3] = r; col[i*3+1] = g; col[i*3+2] = b;
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
}

function setSource() {
  const s = $('chkRemote').checked && remoteStream ? remoteStream : localStream;
  if (s && vid.srcObject !== s) { vid.srcObject = s; vid.play().catch(()=>{}); }
}

$('btnCam').onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
    setSource(); $('btnCam').classList.add('on'); status('Camera on. Loading models…');
    setInterval(inferLoop, 120);
  } catch (e) { status('Camera blocked or unavailable: ' + e.message); }
};
$('btnGhost').onclick = () => { ghost = !ghost; document.body.classList.toggle('ghost', ghost); $('btnGhost').classList.toggle('on', ghost); };
$('rngPt').oninput = e => { mat.size = 0.004 * e.target.value; };
$('chkRemote').onchange = setSource;

// ---------- Pepper's Ghost 4-way render ----------
const gCam = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
function renderGhost() {
  const w = innerWidth, h = innerHeight, s = Math.floor(Math.min(w, h) / 3);
  const cx = w/2, cy = h/2;
  scene.background.set(0x000000); ring.visible = false;
  renderer.setScissorTest(true);
  renderer.setViewport(0,0,w,h); renderer.setScissor(0,0,w,h); renderer.setClearColor(0x000000); renderer.clear();
  // views: bottom(front), right, top, left — each rotated so its "up" points away from center
  const views = [
    { x: cx - s/2, y: cy - 1.5*s, yaw: 0,           roll: Math.PI },
    { x: cx + s/2, y: cy - s/2,   yaw: Math.PI/2,   roll: Math.PI/2 },
    { x: cx - s/2, y: cy + s/2,   yaw: Math.PI,     roll: 0 },
    { x: cx - 1.5*s, y: cy - s/2, yaw: -Math.PI/2,  roll: -Math.PI/2 },
  ];
  for (const v of views) {
    const r = 2.6;
    gCam.position.set(Math.sin(v.yaw)*r, 0, Math.cos(v.yaw)*r);
    gCam.up.set(0,1,0); gCam.lookAt(0,0,0); gCam.rotateZ(v.roll);
    gCam.aspect = 1; gCam.updateProjectionMatrix();
    renderer.setViewport(v.x, v.y, s, s); renderer.setScissor(v.x, v.y, s, s);
    renderer.render(scene, gCam);
  }
  renderer.setScissorTest(false);
  scene.background.set(0x05060a); ring.visible = true;
}

renderer.setAnimationLoop(() => {
  updateCloud(); controls.update();
  if (ghost && !renderer.xr.isPresenting) renderGhost();
  else { renderer.setViewport(0,0,innerWidth,innerHeight); renderer.render(scene, camera); }
});

// ---------- serverless WebRTC (manual signaling) ----------
let pc = null;
function newPC() {
  pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  pc.ontrack = e => { remoteStream = e.streams[0]; $('chkRemote').checked = true; setSource(); status('Connected peer-to-peer. Showing remote person.'); };
  pc.onconnectionstatechange = () => status('Link: ' + pc.connectionState);
  return pc;
}
const iceDone = p => new Promise(r => { if (p.iceGatheringState === 'complete') return r(); p.onicegatheringstatechange = () => p.iceGatheringState === 'complete' && r(); setTimeout(r, 4000); });
const enc = d => btoa(JSON.stringify(d)), dec = s => JSON.parse(atob(s.trim()));
$('btnOffer').onclick = async () => {
  if (!localStream) return status('Start your camera first.');
  newPC(); await pc.setLocalDescription(await pc.createOffer()); await iceDone(pc);
  $('sdpOut').value = enc(pc.localDescription); status('Offer ready: send the code above to the other person.');
};
$('btnAnswer').onclick = async () => {
  try { if (!localStream) return status('Start your camera first.');
    newPC(); await pc.setRemoteDescription(dec($('sdpIn').value));
    await pc.setLocalDescription(await pc.createAnswer()); await iceDone(pc);
    $('sdpOut').value = enc(pc.localDescription); status('Answer ready: send the code above back.');
  } catch (e) { status('Bad offer code: ' + e.message); }
};
$('btnAccept').onclick = async () => {
  try { await pc.setRemoteDescription(dec($('sdpIn').value)); status('Connecting…'); }
  catch (e) { status('Bad answer code: ' + e.message); }
};
window.__holo = { ready: true, camera, controls, toggleGhost: () => $('btnGhost').click() };
