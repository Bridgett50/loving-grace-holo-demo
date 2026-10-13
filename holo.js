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
const view = $('view'), vctx = view.getContext('2d');
const vid = $('vid'), ui = $('ui'), msg = $('msg'), tapBtn = $('tap'), brand = $('brand');
const S = { stage: q.has('stage'), mirror: true, tint: true, scan: false, model: q.get('model') || 'multiclass',
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
  S[a] = !S[a]; b.classList.toggle('on', S[a]);
});
function syncButtons() { for (const b of ui.querySelectorAll('button[data-act]')) if (b.dataset.act in S && b.dataset.act !== 'share') b.classList.toggle('on', !!S[b.dataset.act]); }

function goFull() {
  const d = document.documentElement;
  (d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject()).catch(() => {});
  navigator.wakeLock?.request('screen').catch(() => {});
}

// ---------- view canvas sizing & layout ----------
function resize() { const r = Math.min(devicePixelRatio || 1, 2); view.width = Math.round(innerWidth * r); view.height = Math.round(innerHeight * r); }
addEventListener('resize', resize); resize();

function present(src, sw, sh, mirror) {
  const W = view.width, H = view.height;
  vctx.setTransform(1, 0, 0, 1, 0, 0); vctx.fillStyle = '#000'; vctx.fillRect(0, 0, W, H);
  if (!sw || !sh) return;
  if (!S.stage) {
    const k = Math.min(W / sw, H / sh), w = sw * k, h = sh * k;
    vctx.save(); vctx.translate(W / 2, H / 2); if (mirror) vctx.scale(-1, 1);
    vctx.drawImage(src, -w / 2, -h / 2, w, h); vctx.restore(); return;
  }
  // 4-way Pepper's Ghost pyramid on a 3x3 grid (centre empty): feet toward the centre, head outward.
  const s = Math.min(W, H), cell = s / 3, d = cell * 0.97;
  const sq = Math.min(sw, sh), sx = (sw - sq) / 2, sy = (sh - sq) / 2;
  for (let i = 0; i < 4; i++) {
    vctx.save(); vctx.translate(W / 2, H / 2); vctx.rotate(i * Math.PI / 2);
    if (mirror) vctx.scale(-1, 1);
    vctx.drawImage(src, sx, sy, sq, sq, -d / 2, -cell / 2 - d, d, d);
    vctx.restore();
  }
}

// ---------- WebGL2 compositor ----------
const gcan = document.createElement('canvas');
const gl = gcan.getContext('webgl2', { premultipliedAlpha: false, antialias: false });
const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0,1); }`;
const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D uVid, uMask; uniform vec2 uMT; uniform float uTint, uScan, uTime, uH;
vec3 vid(vec2 t){ return texture(uVid,t).rgb; }
void main(){
  vec3 c = vid(uv);
  // joint-bilateral refinement: snap the low-res mask to real colour edges of the full-res frame
  float a = 0., ws = 0., mb = 0.;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){
    vec2 t = uv + vec2(float(i),float(j))*uMT*1.25;
    float m = texture(uMask,t).r; vec3 d = c - vid(t);
    float w = exp(-dot(d,d)*30.) * (i==0&&j==0 ? 1.5 : 1.);
    a += m*w; ws += w; mb += m;
  }
  a /= ws; mb /= 9.;
  a = smoothstep(.34, .80, a);                // tighten -> no halo, soft feathered edge
  // wide mask for rim light / outer glow
  float wide = 0.;
  for (int k=0;k<8;k++){ float ang = float(k)*.785398; wide += texture(uMask, uv + vec2(cos(ang),sin(ang))*uMT*4.).r; }
  wide /= 8.;
  // stage grade: gentle lift, contrast, saturation, warm skin
  c = pow(c, vec3(.93));
  c = (c-.5)*1.08+.5+.02;
  float l = dot(c, vec3(.299,.587,.114));
  c = mix(vec3(l), c, 1.08);
  float cr = .5 + .5*c.r - .419*c.g - .081*c.b, cb = .5 - .169*c.r - .331*c.g + .5*c.b;
  float skin = smoothstep(.06,.0,abs(cr-.6)-.05) * smoothstep(.06,.0,abs(cb-.43)-.06);
  c += skin*vec3(.025,.012,0.);
  // hologram tint (subtle blue-white)
  c = mix(c, c*vec3(.90,.98,1.10)+vec3(0.,.01,.03), .55*uTint);
  float rim = a * smoothstep(.95,.45,wide);    // inside, near silhouette
  float glow = (1.-a) * smoothstep(.15,.6,wide) * .07;
  vec3 rc = mix(vec3(1.,.97,.93), vec3(.62,.82,1.), uTint);
  c += rc * rim * (.12 + .12*uTint);
  if (uScan > .5) {
    float s = .93 + .07*sin(uv.y*uH*1.4 - uTime*4.);
    s *= .985 + .015*sin(uTime*23.);
    c *= s;
  }
  o = vec4(clamp(c*a + rc*glow*(.5+.5*uTint), 0., 1.), 1.);
}`;
let prog, vtex, mtex, U = {};
function initGL() {
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
  for (const n of ['uVid', 'uMask', 'uMT', 'uTint', 'uScan', 'uTime', 'uH']) U[n] = gl.getUniformLocation(prog, n);
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
  if (vid.readyState < 2) return;
  const vw = vid.videoWidth, vh = vid.videoHeight;
  if (vid.currentTime !== lastVT) { lastVT = vid.currentTime; segment(now); fpsN++; }
  if (now - fpsT > 1000) { S.fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; S.frames++;
    if (S.model === 'multiclass' && !q.get('model') && S.frames === 4 && S.segMs > 40) { console.info('slow device, switching to the lighter selfie model'); loadSeg('selfie'); } }
  if (!smooth) return;
  if (gcan.width !== vw || gcan.height !== vh) { gcan.width = vw; gcan.height = vh; gl.viewport(0, 0, vw, vh); }
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vtex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, full);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mtex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, mw, mh, 0, gl.RED, gl.UNSIGNED_BYTE, m8);
  gl.uniform2f(U.uMT, 1 / mw, 1 / mh); gl.uniform1f(U.uTint, S.tint ? 1 : 0); gl.uniform1f(U.uScan, S.scan ? 1 : 0);
  gl.uniform1f(U.uTime, now / 1000); gl.uniform1f(U.uH, vh);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  present(gcan, vw, vh, S.mirror);
}

async function start() {
  tapBtn.hidden = true; goFull(); say('Starting camera…');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } } });
    vid.srcObject = stream; await vid.play();
    say('Preparing hologram…'); initGL(); await loadSeg(S.model);
    S.ready = true; say('', 1); fadeBrand(); syncButtons();
    requestAnimationFrame(frame);
  } catch (e) {
    console.warn(e); tapBtn.hidden = false; tapBtn.textContent = 'Tap to try again';
    say(e?.name === 'NotAllowedError' ? 'Camera permission is needed to appear.' : 'Could not start: ' + (e?.message || e));
  }
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
    outStream = outStream || gcan.captureStream(30);
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
  tapBtn.hidden = true; for (const b of ui.querySelectorAll('[data-act=share],[data-act=tint],[data-act=scan]')) b.remove();
  S.mirror = false; S.ready = true; syncButtons(); fadeBrand();
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
  const loop = () => { requestAnimationFrame(loop); if (rv.readyState >= 2) present(rv, rv.videoWidth, rv.videoHeight, S.mirror); };
  loop();
}

if (S.viewer) viewer(q.get('watch'));
else tapBtn.addEventListener('click', start, { once: false });
