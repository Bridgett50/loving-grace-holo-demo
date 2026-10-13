// Loving Grace Presence · concert-style 2D hologram (Pepper's Ghost look)
// Camera -> MediaPipe Image Segmenter (GPU) -> temporal smoothing -> WebGL2 matting/refinement + stage grade -> black stage
const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODELS = {
  multiclass: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
  selfie: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
};
// MediaPipe prints routine INFO/WARNING logs through console.error; route them to info.
const _err = console.error.bind(console);
console.error = (...a) => (typeof a[0] === 'string' && /^(INFO|WARNING|W\d{4}|I\d{4})[: ]/.test(a[0])) ? console.info(...a) : _err(...a);

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);
const view = $('view');
const vid = $('vid'), ui = $('ui'), msg = $('msg'), tapBtn = $('tap'), brand = $('brand');
const S = { stage: q.has('stage'), mirror: true, glow: q.has('glow'), scan: false, model: q.get('model') || 'multiclass',
            segMs: 0, fps: 0, frames: 0, delegate: '', ready: false, viewer: q.has('watch') };
window.__holo = S;
S.maskStats = () => { if (!smooth) return null; let mn = 1, mx = 0, sum = 0; for (const v of smooth) { mn = Math.min(mn, v); mx = Math.max(mx, v); sum += v; } return { w: mw, h: mh, mn, mx, mean: sum / smooth.length }; };

const say = (t, ms) => { msg.textContent = t; msg.style.opacity = 1; clearTimeout(say.t); if (ms) say.t = setTimeout(() => msg.style.opacity = 0, ms); };
const fadeBrand = () => setTimeout(() => brand.classList.add('out'), 3500);

// ---------- overlay ----------
let uiTimer;
function showUI() { if (!S.ready) return; syncButtons(); ui.classList.remove('hide'); clearTimeout(uiTimer); uiTimer = setTimeout(() => ui.classList.add('hide'), 3000); }
view.addEventListener('pointerdown', showUI);
ui.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; showUI();
  const a = b.dataset.act;
  if (a === 'share') return share();
  if (a === 'rescan') return rescan();
  if (a === 'glow') { S.glow = !S.glow; b.textContent = S.glow ? 'Glow' : 'Clear'; b.classList.toggle('on', S.glow); return; }
  S[a] = !S[a]; b.classList.toggle('on', S[a]);
});
function syncButtons() { for (const b of ui.querySelectorAll('button[data-act]')) if (b.dataset.act in S && b.dataset.act !== 'share') { if (b.dataset.act === 'glow') b.textContent = S.glow ? 'Glow' : 'Clear'; }
  for (const b of ui.querySelectorAll('button[data-act]')) if (b.dataset.act in S && b.dataset.act !== 'share') b.classList.toggle('on', !!S[b.dataset.act]); }

function goFull() {
  const d = document.documentElement;
  (d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject()).catch(() => {});
  navigator.wakeLock?.request('screen').catch(() => {});
}

// ---------- full-DPR canvas ----------
let vctx = null, gl = null;           // host: WebGL2 straight onto the visible canvas; viewer: 2D
function resize() { const r = devicePixelRatio || 1; view.width = Math.round(innerWidth * r); view.height = Math.round(innerHeight * r); }
addEventListener('resize', resize); resize();

// Layout: list of quads {cx,cy (px, y down), hx,hy (half size px; hx<0 = mirror), rot, uv:[u0,v0,us,vs]}
function layout(sw, sh, mirror) {
  const W = view.width, H = view.height, m = mirror ? -1 : 1;
  if (!S.stage) { const k = Math.min(W / sw, H / sh); return [{ cx: W / 2, cy: H / 2, hx: m * sw * k / 2, hy: sh * k / 2, rot: 0, uv: [0, 0, 1, 1] }]; }
  // 4-way Pepper's Ghost on a 3x3 grid (centre empty): feet toward centre, head outward
  const s = Math.min(W, H), cell = s / 3, d = cell * 0.97, sq = Math.min(sw, sh);
  const uv = [(sw - sq) / 2 / sw, (sh - sq) / 2 / sh, sq / sw, sq / sh], out = [];
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, ly = -(cell / 2 + d / 2);
    out.push({ cx: W / 2 - Math.sin(a) * ly, cy: H / 2 + Math.cos(a) * ly, hx: m * d / 2, hy: d / 2, rot: a, uv }); }
  return out;
}
function present2D(src, sw, sh, mirror) {   // viewer only
  const W = view.width, H = view.height; vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.fillStyle = '#000'; vctx.fillRect(0, 0, W, H);
  if (!sw || !sh) return;
  for (const q of layout(sw, sh, mirror)) { vctx.save(); vctx.translate(q.cx, q.cy); vctx.rotate(q.rot); vctx.scale(Math.sign(q.hx), 1);
    const [u0, v0, us, vs] = q.uv; vctx.drawImage(src, u0 * sw, v0 * sh, us * sw, vs * sh, -Math.abs(q.hx), -q.hy, 2 * Math.abs(q.hx), 2 * q.hy); vctx.restore(); }
}

// ---------- WebGL2 compositor: mask is ONLY alpha over the original sharp camera frame ----------
const VS = `#version 300 es
in vec2 p; out vec2 uv;
uniform vec2 uC, uHalf, uScr; uniform float uRot; uniform vec4 uUV;
void main(){
  uv = uUV.xy + (p*.5+.5) * uUV.zw;
  vec2 q = p * uHalf; float c = cos(uRot), s = sin(uRot);
  vec2 px = uC + vec2(c*q.x - s*q.y, s*q.x + c*q.y);
  gl_Position = vec4(px.x / uScr.x * 2. - 1., 1. - px.y / uScr.y * 2., 0, 1);
}`;
const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D uVid, uMask; uniform vec2 uMT, uVT; uniform float uGlow, uScan, uTime, uH;
vec3 vid(vec2 t){ return texture(uVid,t).rgb; }
void main(){
  vec3 c = vid(uv);
  // mask refinement (mask only; colour is never blurred): joint-bilateral snap to real edges
  float m = 0., ws = 0.;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){
    vec2 t = uv + vec2(float(i),float(j))*uMT;
    vec3 d = c - vid(t); float w = exp(-dot(d,d)*40.) * (i==0&&j==0 ? 2. : 1.);
    m += texture(uMask,t).r*w; ws += w;
  }
  m /= ws;
  float fw = max(fwidth(m), 1e-4);
  float a = clamp((m - .5) / (fw * 1.5) + .5, 0., 1.);   // ~1-2 screen-px feather at the edge only
  // light unsharp mask on the original frame
  vec3 bl = (vid(uv+vec2(uVT.x,0.)) + vid(uv-vec2(uVT.x,0.)) + vid(uv+vec2(0.,uVT.y)) + vid(uv-vec2(0.,uVT.y))) * .25;
  c = clamp(c + .45*(c - bl), 0., 1.);
  // neutral grade: tiny contrast + saturation, no lift (true blacks)
  c = clamp((c - .5) * 1.04 + .5, 0., 1.);
  float l = dot(c, vec3(.299,.587,.114)); c = clamp(mix(vec3(l), c, 1.05), 0., 1.);
  vec3 col = c * a;
  if (uGlow > .5) {                       // optional 'Glow' look
    float wide = 0.;
    for (int k=0;k<8;k++){ float an = float(k)*.785398; wide += texture(uMask, uv + vec2(cos(an),sin(an))*uMT*3.).r; }
    wide /= 8.;
    vec3 rc = vec3(.62,.82,1.);
    col = mix(col, col*vec3(.92,.98,1.08), .5*a) + rc * a * smoothstep(.95,.5,wide) * .15 + rc * (1.-a) * smoothstep(.2,.6,wide) * .06;
  }
  if (uScan > .5) col *= (.93 + .07*sin(uv.y*uH*1.4 - uTime*4.)) * (.985 + .015*sin(uTime*23.));
  o = vec4(col, 1.);
}`;
let prog, vtex, mtex, U = {};
function initGL() {
  if (gl) return;
  gl = view.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const mk = unit => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  vtex = mk(0); mtex = mk(1);
  for (const n of ['uVid', 'uMask', 'uMT', 'uVT', 'uGlow', 'uScan', 'uTime', 'uH', 'uC', 'uHalf', 'uScr', 'uRot', 'uUV']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.uVid, 0); gl.uniform1i(U.uMask, 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
}

// ---------- segmentation ----------
const full = document.createElement('canvas'), fctx = full.getContext('2d');
const scan = document.createElement('canvas'), sctx = scan.getContext('2d', { willReadFrequently: false });
let seg, vision, mp, smooth, m8, mw = 0, mh = 0, segBusy = false;
async function loadSeg(name) {
  mp = mp || await import(`${MP_URL}/vision_bundle.mjs`);
  vision = vision || await mp.FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
  const opts = d => ({ baseOptions: { modelAssetPath: MODELS[name], delegate: q.get('delegate') === 'cpu' ? 'CPU' : d }, runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true });
  let s;
  try { s = await mp.ImageSegmenter.createFromOptions(vision, opts('GPU')); S.delegate = q.get('delegate') === 'cpu' ? 'CPU' : 'GPU'; }
  catch (e) { console.warn('GPU delegate unavailable, using CPU', e?.message); s = await mp.ImageSegmenter.createFromOptions(vision, opts('CPU')); S.delegate = 'CPU'; }
  const old = seg; seg = s; S.model = name; old?.close();
}

function segment(ts) {
  const vw = vid.videoWidth, vh = vid.videoHeight, long = 512;
  const k = long / Math.max(vw, vh), w = Math.round(vw * k), h = Math.round(vh * k);
  if (scan.width !== w || scan.height !== h) { scan.width = w; scan.height = h; }
  if (full.width !== vw || full.height !== vh) { full.width = vw; full.height = vh; }
  fctx.drawImage(vid, 0, 0);            // freeze this exact frame so colour and mask stay in sync
  sctx.drawImage(full, 0, 0, w, h);
  const t0 = performance.now();
  seg.segmentForVideo(scan, ts, r => {
    const ms = r.confidenceMasks; if (!ms || !ms.length) return;
    const mk = ms[0], W = mk.width, H = mk.height, raw = mk.getAsFloat32Array();
    const inv = ms.length > 1; // multiclass: channel 0 = background
    if (!smooth || mw !== W || mh !== H) { mw = W; mh = H; smooth = new Float32Array(W * H); m8 = new Uint8Array(W * H); for (let i = 0; i < smooth.length; i++) smooth[i] = inv ? 1 - raw[i] : raw[i]; }
    for (let i = 0, n = smooth.length; i < n; i++) {
      const v = inv ? 1 - raw[i] : raw[i], p = smooth[i], d = v - p;
      // adaptive EMA: damp small flicker, follow real motion quickly
      const kk = Math.min(1, .28 + Math.abs(d) * 2.2);
      const s = p + d * kk; smooth[i] = s; m8[i] = s * 255;
    }
  });
  const dt = performance.now() - t0; S.segMs = S.segMs ? S.segMs * .9 + dt * .1 : dt;
}

// ---------- main loop ----------
let lastVT = -1, fpsT = performance.now(), fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (vid.readyState < 2 || !seg) return;
  const vw = vid.videoWidth, vh = vid.videoHeight;
  if (vid.currentTime !== lastVT) { lastVT = vid.currentTime; segment(now); fpsN++; }
  if (now - fpsT > 1000) { S.fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; S.frames++;
    if (S.model === 'multiclass' && !q.get('model') && S.frames === 4 && S.segMs > 40) { console.info('slow device, switching to the lighter selfie model'); loadSeg('selfie'); } }
  if (!smooth || !m8) return;
  gl.viewport(0, 0, view.width, view.height); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vtex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, full);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mtex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, mw, mh, 0, gl.RED, gl.UNSIGNED_BYTE, m8);
  gl.uniform2f(U.uMT, 1 / mw, 1 / mh); gl.uniform2f(U.uVT, 1 / vw, 1 / vh); gl.uniform1f(U.uGlow, S.glow ? 1 : 0); gl.uniform1f(U.uScan, S.scan ? 1 : 0);
  gl.uniform1f(U.uTime, now / 1000); gl.uniform1f(U.uH, vh); gl.uniform2f(U.uScr, view.width, view.height);
  for (const L of layout(vw, vh, S.mirror)) {
    gl.uniform2f(U.uC, L.cx, L.cy); gl.uniform2f(U.uHalf, L.hx, L.hy); gl.uniform1f(U.uRot, L.rot); gl.uniform4f(U.uUV, ...L.uv);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

let stream;
async function openCamera() {
  const v = (w, h) => ({ audio: false, video: { facingMode: 'user', width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 30, max: 30 } } });
  try { return await navigator.mediaDevices.getUserMedia(v(1920, 1080)); }
  catch (e) { if (e?.name === 'NotAllowedError') throw e; return await navigator.mediaDevices.getUserMedia(v(1280, 720)); }
}
async function start() {
  tapBtn.hidden = true; goFull(); say('Starting camera…');
  try {
    stream = await openCamera();
    vid.srcObject = stream; await vid.play();
    S.cam = vid.videoWidth + 'x' + vid.videoHeight;
    say('Preparing hologram…'); initGL(); await loadSeg(S.model);
    S.ready = true; fadeBrand(); syncButtons();
    if (!S.tipped) { S.tipped = true; say('Tip: Face a light, plain wall behind you.', 6000); } else say('', 1);
    if (!S.looping) { S.looping = true; requestAnimationFrame(frame); }
  } catch (e) {
    console.warn(e); tapBtn.hidden = false; tapBtn.textContent = 'Tap to try again';
    say(e?.name === 'NotAllowedError' ? 'Camera permission is needed to appear.' : 'Could not start: ' + (e?.message || e));
  }
}
async function rescan() {
  say('Rescanning…'); S.ready = false;
  stream?.getTracks().forEach(t => t.stop()); seg?.close(); seg = null; smooth = null; lastVT = -1; S.frames = 0; S.segMs = 0;
  if (!q.get('model')) S.model = 'multiclass';
  try { stream = await openCamera(); vid.srcObject = stream; await vid.play(); S.cam = vid.videoWidth + 'x' + vid.videoHeight;
    await loadSeg(S.model); S.ready = true; say('Ready', 1500);
    if (outStream) say('Rescanned. Viewers may need to reopen the link.', 4000);
  } catch (e) { say('Rescan failed: ' + (e?.message || e)); }
}

// ---------- Share (beta): PeerJS public broker, the matted hologram is streamed ----------
let peer, outStream;
function share() {
  if (!window.Peer) return say('Share is unavailable (could not load PeerJS).', 4000);
  if (peer?.id) return offerLink(peer.id);
  say('Creating share link…');
  peer = new Peer({ debug: q.has('debug') ? 3 : 0 });
  peer.on('open', id => offerLink(id));
  peer.on('error', e => say('Share error: ' + e.type, 5000));
  peer.on('connection', conn => conn.on('open', () => {
    outStream = outStream || view.captureStream(30);
    peer.call(conn.peer, outStream); say('A viewer joined', 3000);
  }));
}
async function offerLink(id) {
  const url = location.origin + location.pathname + '?watch=' + encodeURIComponent(id);
  S.shareUrl = url;
  try { if (navigator.share) { await navigator.share({ title: 'Loving Grace hologram', url }); return say('Link shared. Keep this screen open.', 5000); } } catch (e) {}
  try { await navigator.clipboard.writeText(url); say('Link copied: ' + url, 8000); } catch (e) { say(url, 15000); }
}

function viewer(hostId) {
  tapBtn.hidden = true; for (const b of ui.querySelectorAll('[data-act=share],[data-act=glow],[data-act=scan],[data-act=rescan]')) b.remove();
  vctx = view.getContext('2d'); S.mirror = false; S.ready = true; syncButtons(); fadeBrand();
  say('Connecting to hologram…');
  const rv = document.createElement('video'); rv.playsInline = true; rv.muted = true; rv.autoplay = true;
  const go = () => {
    if (!window.Peer) return say('Could not load the viewer library.');
    peer = new Peer({ debug: q.has('debug') ? 3 : 0 });
    peer.on('open', () => { const c = peer.connect(hostId); c.on('error', e => say('Connection error: ' + e)); });
    peer.on('call', call => { call.answer(); call.on('stream', s => { rv.srcObject = s; rv.play().catch(() => {}); say('', 1); }); });
    peer.on('error', e => say(e.type === 'peer-unavailable' ? 'The hologram has ended or the link expired.' : 'Share error: ' + e.type));
  };
  window.Peer ? go() : addEventListener('load', go);
  const loop = () => { requestAnimationFrame(loop); if (rv.readyState >= 2) present2D(rv, rv.videoWidth, rv.videoHeight, S.mirror); };
  loop();
}

if (S.viewer) viewer(q.get('watch'));
else tapBtn.addEventListener('click', start, { once: false });
