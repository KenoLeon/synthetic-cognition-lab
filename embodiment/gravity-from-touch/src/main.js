import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { createSim, SPHERE_RADIUS, DT, FLOOR_RIMS } from './sim.js';
import { createSkin } from './skin.js';
import { buildFrame, skinMetadata } from './sensors.js';
import { runEquivalenceTest, TOL } from './experiments.js';
import { captureStep, buildObservation, MASKS } from './observe.js';
import { seededOrientations } from './orient.js';
import { renderReadings, patchesFromObservation, innerSense, SENSE_SETS } from './llm.js';
import { createSkinMap, RAMP, pressureRGB, ZERO_COLOR } from './ui/skinmap.js';
import {
  RUNS, TRIAL_SCENES, ORIENTATION_SEED, MASK_TEXT, SCENE_TEXT, ALL_IDS, QUESTIONS,
  trialId, runIds, loadTrial, readingsOf, scoreTrial, fmtAnswer,
} from './ui/replay.js';

await RAPIER.init();

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const params = { mode: 'floor', gravity: 9.81, tiltDeg: 0, tiltRate: 20, mass: 1, restitution: 0, lockRotation: true };
const skin = createSkin({ radius: SPHERE_RADIUS });       // Play mode skin (thickness adjustable)
const evalSkin = createSkin({ radius: SPHERE_RADIUS });   // Eval replay skin: always the default, as in the logged runs
let sim = null;
let shearOn = false;
let scaleMax = 3;
let paused = false;
let stepIndex = 0;
let latest = null;
let shown = new Float64Array(skin.count); // what the skin map, 3D taxels and tooltips display
let recording = null;
let appMode = 'play';
let playMask = 'PS';
const playSteps = []; // last 60 captured steps in Play, for the "what the model would be told" view
let episode = null;   // Eval replay state

const MODE_NOTES = {
  floor: 'Gravity pulls the sphere onto a tiltable floor.',
  wallA: 'World gravity 0. A free wall is driven so wall + sphere accelerate at g: the wall presses with m·g. Einstein\'s elevator: expect skin AND inner sense to match the floor.',
  wallB: 'World gravity 0. Squeeze: a fixed wall at body −y and a pusher plate pressing body +y with m·g. Expect two patches, net skin force ≈ 0, inner sense ≈ 0.',
};

// --- rendering -------------------------------------------------------------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151a20);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200);
const controls = new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(3, 5, 2);
scene.add(sun);

// Floor is translucent so the contact patch on the sphere's underside stays visible from below.
const floorMesh = new THREE.Mesh(
  new THREE.BoxGeometry(12, 0.2, 12).translate(0, -0.1, 0),
  new THREE.MeshStandardMaterial({ color: 0x3a4250, transparent: true, opacity: 0.35, depthWrite: false }),
);
const floorGrid = new THREE.GridHelper(12, 24, 0x5a6577, 0x4a5363);
floorGrid.position.y = 0.001;
floorMesh.add(floorGrid);
const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x5a6577, transparent: true, opacity: 0.6 });
for (const r of FLOOR_RIMS) {
  const rim = new THREE.Mesh(new THREE.BoxGeometry(2 * r.half.x, 2 * r.half.y, 2 * r.half.z), rimMaterial);
  rim.position.set(r.center.x, r.center.y, r.center.z);
  floorMesh.add(rim);
}
scene.add(floorMesh);

const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x4a5363, transparent: true, opacity: 0.35, depthWrite: false }));
scene.add(wallMesh);
const pusherMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x6b5a4a, transparent: true, opacity: 0.45, depthWrite: false }));
scene.add(pusherMesh);

const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_RADIUS, 48, 32),
  new THREE.MeshStandardMaterial({ color: 0x5d636b, roughness: 0.8 }));
sphereMesh.add(new THREE.AxesHelper(SPHERE_RADIUS * 1.4)); // body frame: x red, y green, z blue
scene.add(sphereMesh);

// Taxels: one small disc per taxel, tangent to the sphere, coloured from the displayed pressure.
const taxelMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.024, 14), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), skin.count);
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < skin.count; i++) {
    const u = new THREE.Vector3(skin.unit[3 * i], skin.unit[3 * i + 1], skin.unit[3 * i + 2]);
    q.setFromUnitVectors(zAxis, u);
    m.compose(u.clone().multiplyScalar(SPHERE_RADIUS * 1.004), q, new THREE.Vector3(1, 1, 1));
    taxelMesh.setMatrixAt(i, m);
    taxelMesh.setColorAt(i, new THREE.Color(ZERO_COLOR));
  }
}
sphereMesh.add(taxelMesh);

// Answer arrows (Eval replay), body frame, from the centre.
const mkArrow = (color, len = 1.1) => { const a = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), len, color, 0.16, 0.08); a.visible = false; sphereMesh.add(a); return a; };
const arrows = { truth: mkArrow(0xe9eef4, 1.4), push: mkArrow(0xe8833a), pull: mkArrow(0xb48cf0) }; // truth longer, so it shows when the model agrees
function setArrow(a, v) {
  a.visible = !!v;
  if (v) a.setDirection(new THREE.Vector3(v.x, v.y, v.z).normalize());
}
function hideArrows() { Object.values(arrows).forEach((a) => { a.visible = false; }); $('arrowLegend').style.display = 'none'; }

// Shear arrows (optional): per taxel, from the taxel along its shear vector, body frame.
const SHEAR_SCALE = 0.06; // m per N
const SHEAR_COLOR = 0xe8833a;
const shearLines = new THREE.LineSegments(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(skin.count * 6), 3)),
  new THREE.LineBasicMaterial({ color: SHEAR_COLOR }));
const shearHeads = new THREE.InstancedMesh(new THREE.ConeGeometry(0.012, 0.03, 8), new THREE.MeshBasicMaterial({ color: SHEAR_COLOR }), skin.count);
shearLines.visible = shearHeads.visible = false;
sphereMesh.add(shearLines, shearHeads);
function updateShearArrows(shear) {
  const pos = shearLines.geometry.attributes.position.array;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < skin.count; i++) {
    const sx = shear[3 * i], sy = shear[3 * i + 1], sz = shear[3 * i + 2];
    const len = Math.hypot(sx, sy, sz);
    const base = new THREE.Vector3(skin.unit[3 * i], skin.unit[3 * i + 1], skin.unit[3 * i + 2]).multiplyScalar(SPHERE_RADIUS * 1.01);
    const dir = len > 1e-4 ? new THREE.Vector3(sx / len, sy / len, sz / len) : new THREE.Vector3();
    const tip = base.clone().addScaledVector(dir, Math.min(len * SHEAR_SCALE, 0.3));
    pos.set([base.x, base.y, base.z, tip.x, tip.y, tip.z], 6 * i);
    if (len > 1e-4) { q.setFromUnitVectors(up, dir); shearHeads.setMatrixAt(i, m.compose(tip, q, one)); }
    else shearHeads.setMatrixAt(i, zero);
  }
  shearLines.geometry.attributes.position.needsUpdate = true;
  shearHeads.instanceMatrix.needsUpdate = true;
}

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(view);
resize();

$('legendBar').style.background = `linear-gradient(to right, ${RAMP.join(', ')})`;
const tmpColor = new THREE.Color();
function taxelColor(p) {
  const c = pressureRGB(p, scaleMax);
  return c ? tmpColor.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace) : tmpColor.set(ZERO_COLOR);
}

// --- skin map + senses panel ---------------------------------------------------
const skinMap = createSkinMap($('skinMap'), skin.unit, skin.count);
const r3 = (x) => x.toFixed(3);
const vecText = (v) => (v ? `[${r3(v.x)}, ${r3(v.y)}, ${r3(v.z)}]` : '—');
function renderSenses(obs, { note = '' } = {}) {
  const set = SENSE_SETS[obs.mask];
  $('senseChips').innerHTML = [['touch', set.touch], ['slide', set.slide], ['inner sense', set.inner]]
    .map(([n, on]) => `<span class="chip ${on ? 'on' : ''}">${n}${on ? '' : ' off'}</span>`).join('');
  const patches = set.touch ? patchesFromObservation(obs) : null;
  $('patches').innerHTML = !set.touch
    ? '<div class="silent">Touch is switched off for the model in this trial (the map still shows the skin).</div>'
    : patches.length === 0 ? '<div class="silent">No patches: nothing is touching the body.</div>'
      : patches.map((p, k) => `<div class="patch"><span class="n">${k + 1}</span>
          <span>press <b>${p.press.toFixed(2)} N</b> · covers <b>${(p.size * 100).toFixed(1)}%</b> of the skin</span>
          <span class="v">where ${vecText(p.where)}</span>
          <span class="v">${set.slide ? `slide ${vecText(p.slide)} N  (|${Math.hypot(p.slide.x, p.slide.y, p.slide.z).toFixed(2)}| N)` : 'slide: switched off'}</span></div>`).join('');
  $('innerBox').innerHTML = set.inner
    ? `<div class="inner"><span class="muted">inner sense (own units)</span> ${vecText(innerSense(obs).mean)}</div>` : '';
  if (note) $('patches').insertAdjacentHTML('afterbegin', `<div class="meta">${note}</div>`);
  return patches ?? [];
}

// --- tooltips --------------------------------------------------------------
const tooltip = $('tooltip');
const taxelText = (i) => `taxel #${i}\n${shown[i].toFixed(5)} N\nbody pos [${skin.local[3 * i].toFixed(3)}, ${skin.local[3 * i + 1].toFixed(3)}, ${skin.local[3 * i + 2].toFixed(3)}]`;
function showTip(text, x, y) { tooltip.textContent = text; tooltip.style.left = `${x + 14}px`; tooltip.style.top = `${y + 10}px`; tooltip.style.display = 'block'; }
const hideTip = () => { tooltip.style.display = 'none'; };
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([sphereMesh, taxelMesh], false)[0];
  if (hit && hit.object === taxelMesh) showTip(taxelText(hit.instanceId), e.clientX, e.clientY); else hideTip();
});
renderer.domElement.addEventListener('pointerleave', hideTip);
$('skinMap').addEventListener('pointermove', (e) => { const i = skinMap.hit(e.clientX, e.clientY); if (i >= 0) showTip(taxelText(i), e.clientX, e.clientY); else hideTip(); });
$('skinMap').addEventListener('pointerleave', hideTip);

// --- sim lifecycle ---------------------------------------------------------
const follow = new THREE.Vector3();
function placeCamera(mode, tiltDeg = 0) {
  const p = sim.sphereBody.translation();
  follow.set(p.x, p.y, p.z);
  controls.target.copy(follow);
  // Look at the contact side: from slightly above the floor (turned with its tilt), or from behind the (translucent) wall.
  const off = mode === 'floor' ? new THREE.Vector3(2.2, 0.7, 3.0).applyAxisAngle(new THREE.Vector3(0, 0, 1), (tiltDeg * Math.PI) / 180)
    : new THREE.Vector3(-2.4, 0.5, 2.4);
  camera.position.copy(follow).add(off);
}
function showWorld(mode) {
  floorMesh.visible = mode === 'floor';
  wallMesh.visible = mode === 'wallA' || mode === 'wallB';
  pusherMesh.visible = mode === 'wallB';
}
function rebuild() {
  sim?.free();
  sim = createSim(RAPIER, params);
  stepIndex = 0; latest = null; playSteps.length = 0;
  showWorld(params.mode);
  $('tiltMain').disabled = $('tiltRate').disabled = params.mode !== 'floor';
  $('gLabel').textContent = params.mode === 'floor' ? 'Gravity' : 'Equivalent g (world gravity = 0)';
  $('modeNote').textContent = MODE_NOTES[params.mode];
  placeCamera(params.mode);
  updateBadge();
}

// --- Play controls -----------------------------------------------------------
function bindRange(id, fmt, onChange) {
  const el = $(id);
  const apply = () => { $(`${id}Val`).textContent = fmt(+el.value); onChange(+el.value); };
  el.addEventListener('input', apply);
  return (v) => { el.value = v; apply(); };
}
const setG = bindRange('g', (v) => v.toFixed(2), (v) => { params.gravity = v; sim.setGravity(v); updateBadge(); });
bindRange('tiltRate', (v) => v.toFixed(0), (v) => { params.tiltRate = v; sim.setTiltRate(v); });
bindRange('mass', (v) => v.toFixed(2), (v) => { params.mass = v; sim.setMass(v); });
bindRange('rest', (v) => v.toFixed(2), (v) => { params.restitution = v; sim.setRestitution(v); });
bindRange('h', (v) => v.toFixed(3), (v) => { skin.thickness = v; });
bindRange('scale', (v) => v.toFixed(1), (v) => { scaleMax = v; $('legendMax').textContent = `${v.toFixed(1)} N per taxel`; });

function setTilt(v) {
  $('tiltMain').value = v;
  params.tiltDeg = v;
  sim.setTilt(v);
  $('tiltBig').textContent = `${v > 0 ? '+' : ''}${v}°`;
}
$('tiltMain').addEventListener('input', (e) => setTilt(+e.target.value));
// Tick marks: where a locked (sliding) sphere starts to slip, μ = 1 → 45°.
$('tiltTicks').innerHTML = [-60, -45, 0, 45, 60].map((d) => {
  const pct = ((d + 60) / 120) * 100;
  return `<span class="${Math.abs(d) === 45 ? 'slip' : ''}" style="left:${pct}%">${Math.abs(d) === 45 ? `${d > 0 ? '+' : '−'}45° slips` : `${d}°`}</span>`;
}).join('');

const MOTION_HINT = {
  slide: 'Rotation locked, as in every eval. Friction (μ = 1) holds the ball until the tilt passes 45°, then it slides.',
  roll: 'Free to roll: it moves at any tilt. Not an eval condition; touch then also changes as the body turns.',
};
function setMotion(m) {
  params.lockRotation = m === 'slide';
  sim.setLockRotation(params.lockRotation);
  document.querySelectorAll('#motionSeg button').forEach((b) => b.classList.toggle('on', b.dataset.motion === m));
  $('motionHint').textContent = MOTION_HINT[m];
  updateBadge();
}
document.querySelectorAll('#motionSeg button').forEach((b) => b.addEventListener('click', () => setMotion(b.dataset.motion)));
$('motionHint').textContent = MOTION_HINT.slide;

$('shearOn').addEventListener('change', (e) => { shearOn = e.target.checked; shearLines.visible = shearHeads.visible = shearOn; });
$('mode').addEventListener('change', (e) => { params.mode = e.target.value; rebuild(); });
$('reset').addEventListener('click', () => { sim.resetSphere(); playSteps.length = 0; });
$('drop').addEventListener('click', () => { sim.resetSphere(1.0); playSteps.length = 0; });
$('pause').addEventListener('click', () => { paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause'; });
$('playMask').innerHTML = MASKS.map((m) => `<option value="${m}" ${m === playMask ? 'selected' : ''}>${MASK_TEXT[m]}</option>`).join('');
$('playMask').addEventListener('change', (e) => { playMask = e.target.value; });

const PRESETS = { c0: { g: 9.81, tilt: 0 }, c1: { g: 9.81, tilt: 30 }, c2: { g: 19.62, tilt: 0 }, c3: { g: 0, tilt: 0 } };
document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
  const p = PRESETS[b.dataset.preset];
  if (appMode !== 'play') setAppMode('play');
  if (params.mode !== 'floor') { params.mode = 'floor'; $('mode').value = 'floor'; rebuild(); }
  setG(p.g); setTilt(p.tilt);
}));

$('drawerBtn').addEventListener('click', () => $('drawer').classList.toggle('open'));
$('drawerClose').addEventListener('click', () => $('drawer').classList.remove('open'));

function updateBadge() {
  if (appMode === 'play') {
    $('stageBadge').innerHTML = `<b>Play</b> <span class="muted">· ${params.mode === 'floor' ? `floor, g ${params.gravity.toFixed(2)}` : params.mode === 'wallA' ? 'zero g, wall A' : 'zero g, squeeze'} · ${params.lockRotation ? 'slides' : 'rolls'}</span>`;
  } else if (episode) {
    $('stageBadge').innerHTML = `<b>${esc(episode.id)}</b> <span class="muted">· ${esc(SCENE_TEXT[episode.scene.id] ?? episode.scene.id)} · ${esc(episode.run.label)}</span>`;
  } else $('stageBadge').innerHTML = '<b>Eval replay</b>';
}

// --- conversation panes --------------------------------------------------------
const questionList = () => `<ul class="qlist">${QUESTIONS.map(([q, t]) => `<li><span class="q">${q}</span><span>${esc(t)}</span></li>`).join('')}</ul>`;
function renderOutgoing({ readings, mask, fullPrompt = null, check = '' }) {
  $('outBody').innerHTML = `<div class="bubble out">
      <div class="meta">Senses on: ${esc(SENSE_SETS[mask].text)}</div>
      <pre class="readings">${esc(readings)}</pre>
    </div>
    ${check}
    <details><summary>The questions (7)</summary>${questionList()}</details>
    ${fullPrompt ? `<details><summary>Full prompt, exactly as sent</summary><pre>${esc(fullPrompt)}</pre></details>` : ''}`;
}
const PLAY_REPLY = `<div class="empty">Play mode has no model attached.<br>Recorded answers are in <b>Eval replay</b>.<br>
  <span class="faint">Asking live would need a small local proxy so the API key stays off the page (not built).</span></div>`;

function renderIncoming(t) {
  if (!t.log) { $('inBody').innerHTML = '<div class="empty">No answer logged for this trial in this run (not run yet).</div>'; $('inMeta').textContent = ''; return null; }
  if (t.log.httpStatus !== 200) { $('inBody').innerHTML = `<div class="empty">The request failed (HTTP ${t.log.httpStatus}).</div>`; return null; }
  const u = t.log.response.usageMetadata ?? {};
  $('inMeta').textContent = `${t.log.model} · ${(t.log.latencyMs / 1000).toFixed(1)} s · thought ${u.thoughtsTokenCount ?? 0} tokens`;
  if (!t.raw) { $('inBody').innerHTML = `<div class="bubble in"><div class="meta">Reply was not valid JSON (scored as invalid):</div><pre class="readings">${esc(t.unparsed ?? '')}</pre></div>`; return null; }
  const rows = scoreTrial(t.raw, t.truth);
  const tones = { ok: '✓', bad: '✗', mid: '–', info: '·' };
  $('inBody').innerHTML = `<div class="bubble in"><div class="answers">${rows.map((r) => `<div class="ans" title="expected: ${esc(r.expected)}">
      <span class="q">${r.q}</span><span class="a">${esc(r.answer)}</span><span class="badge ${r.tone}">${tones[r.tone]} ${esc(r.verdict)}</span></div>`).join('')}</div></div>
    ${t.raw.Q5 ? `<div class="down">“${esc(t.raw.Q5)}” <span class="meta">Q5, what down means</span></div>` : ''}
    ${t.raw.reasoning ? `<div class="reason">${esc(t.raw.reasoning)}</div>` : ''}
    <div class="meta">Hover an answer for the expected one. ✓ correct, ✗ over-claim or wrong, – abstained where an answer existed, · reported only.</div>`;
  return rows;
}

// --- Eval replay -------------------------------------------------------------
const orients = seededOrientations(3, ORIENTATION_SEED);
$('runSel').innerHTML = RUNS.map((r) => `<option value="${r.key}">${esc(r.label)}</option>`).join('');
$('sceneSel').innerHTML = TRIAL_SCENES.map((s) => `<option value="${s.id}">${esc(SCENE_TEXT[s.id] ?? s.id)}</option>`).join('');
$('maskSel').innerHTML = MASKS.map((m) => `<option value="${m}">${MASK_TEXT[m]}</option>`).join('');
$('sceneSel').value = 'tilt+40'; $('maskSel').value = 'PS';
const currentRun = () => RUNS.find((r) => r.key === $('runSel').value);
const currentId = () => trialId($('sceneSel').value, +$('orientSel').value, $('maskSel').value);
async function refreshPick() {
  const ids = await runIds(currentRun());
  const ok = ids.has(currentId());
  $('runTrial').disabled = !ok;
  if (!episode || episode.phase === 'done') $('phase').textContent = ok ? `Ready: ${currentId()}. Press ▶.` : `${currentId()} is not part of this run (${ids.size} trials in it).`;
}
['runSel', 'sceneSel', 'orientSel', 'maskSel'].forEach((id) => $(id).addEventListener('change', refreshPick));

async function nextTrial() {
  const ids = await runIds(currentRun());
  const list = ALL_IDS.filter((id) => ids.has(id));
  if (!list.length) return;
  const next = list[(list.indexOf(currentId()) + 1) % list.length];
  const m = next.match(/^(.*)_o(\d)_(\w+)$/);
  $('sceneSel').value = m[1]; $('orientSel').value = m[2]; $('maskSel').value = m[3];
  await refreshPick();
}
$('nextTrial').addEventListener('click', async () => { await nextTrial(); startTrial(); });
$('runTrial').addEventListener('click', () => startTrial());

let autoTimer = null;
function startTrial() {
  clearTimeout(autoTimer);
  const run = currentRun(), id = currentId();
  const sc = TRIAL_SCENES.find((s) => s.id === $('sceneSel').value);
  const oi = +$('orientSel').value, mask = $('maskSel').value;
  sim?.free();
  // Exactly the logged run's scene: scene parameters + seeded orientation, everything else default.
  sim = createSim(RAPIER, { ...sc.sim, bodyRotation: orients[oi] });
  showWorld(sc.sim.mode ?? 'floor');
  placeCamera(sc.sim.mode ?? 'floor', sc.sim.tiltDeg ?? 0);
  hideArrows();
  const settle = sc.settleSteps ?? 300, record = 60;
  episode = { id, run, scene: sc, oi, mask, settle, record, n: 0, steps: [], phase: 'settle', data: null, token: Symbol(id) };
  const token = episode.token;
  loadTrial(run, id).then((d) => { if (episode?.token === token) episode.data = d; });
  renderOutgoing({ readings: 'Waiting: the body is settling…', mask });
  $('inBody').innerHTML = '<div class="empty">The model is asked once the 1 s reading is taken.</div>';
  $('inMeta').textContent = ''; $('outMeta').textContent = '';
  updateBadge();
}

function finishRecording() {
  const ep = episode;
  ep.phase = 'asking';
  ep.obs = buildObservation(ep.steps, { mask: ep.mask });
  const live = renderReadings(ep.obs);
  $('phase').textContent = 'Reading taken (1 s average). Sending it to the model…';
  const show = () => {
    if (episode !== ep) return;
    if (!ep.data) { setTimeout(show, 100); return; }
    const logged = ep.data.snap ? readingsOf(ep.data.snap.prompt) : null;
    const check = logged === null ? '<div class="meta warn">Prompt snapshot not found.</div>'
      : logged === live ? '<div class="meta pass">✓ The live simulation reproduces these readings exactly as logged.</div>'
        : '<div class="meta fail">✗ The live simulation differs from the logged readings (shown: logged).</div>';
    renderOutgoing({ readings: logged ?? live, mask: ep.mask, fullPrompt: ep.data.snap?.prompt, check });
    $('outMeta').textContent = ep.id;
    $('inBody').innerHTML = '<div class="bubble in"><span class="typing">thinking</span></div>';
    const thinkMs = Math.min(2500, 300 + (ep.data.log?.latencyMs ?? 1000) / +$('speedSel').value / 2);
    setTimeout(() => {
      if (episode !== ep) return;
      const rows = renderIncoming(ep.data);
      ep.phase = 'done';
      $('phase').textContent = `Done: ${ep.id}.${$('autoplay').checked ? ' Next trial in 6 s…' : ''}`;
      if (rows && ep.data.truth?.truth.apparentDown) {
        const d = ep.data.truth.truth.apparentDown;
        setArrow(arrows.truth, { x: -d.x, y: -d.y, z: -d.z });
      }
      setArrow(arrows.push, rows?.find((r) => r.q === 'Q1a').vector);
      setArrow(arrows.pull, rows?.find((r) => r.q === 'Q1b').vector);
      $('arrowLegend').style.display = rows ? 'block' : 'none';
      if ($('autoplay').checked) autoTimer = setTimeout(async () => { if (episode === ep && appMode === 'replay') { await nextTrial(); startTrial(); } }, 6000);
    }, thinkMs);
  };
  show();
}

// --- mode switching ------------------------------------------------------------
function setAppMode(m) {
  appMode = m;
  clearTimeout(autoTimer);
  $('tabPlay').classList.toggle('on', m === 'play');
  $('tabReplay').classList.toggle('on', m === 'replay');
  $('playStrip').hidden = m !== 'play';
  $('replayStrip').hidden = m !== 'replay';
  $('modeLine').textContent = m === 'play' ? 'Tilt the floor and watch what the skin feels.'
    : 'Replay a logged eval trial: the scene runs live, then the prompt and the model\'s answer.';
  hideArrows();
  episode = null;
  $('outMeta').textContent = ''; $('inMeta').textContent = '';
  if (m === 'play') { rebuild(); $('inBody').innerHTML = PLAY_REPLY; }
  else {
    sim?.free(); sim = createSim(RAPIER, { tiltDeg: 0 }); showWorld('floor'); placeCamera('floor');
    $('outBody').innerHTML = '<div class="empty">The prompt appears here when a trial reaches its reading.</div>';
    $('inBody').innerHTML = '<div class="empty">The model\'s logged answer appears here, scored.</div>';
    $('progressBar').style.width = '0';
    refreshPick();
  }
  updateBadge();
}
$('tabPlay').addEventListener('click', () => setAppMode('play'));
$('tabReplay').addEventListener('click', () => setAppMode('replay'));

// --- logging (Play) ------------------------------------------------------------
function download(name, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
$('record').addEventListener('click', () => {
  if (!recording) {
    recording = {
      meta: {
        experiment: 'gravity-from-touch-workbench', createdAt: new Date().toISOString(), rapierVersion: RAPIER.version?.() ?? null,
        dt: DT, sphereRadius: SPHERE_RADIUS, skin: skinMetadata(skin),
        channels: {
          taxels: 'per-taxel normal pressure (N), index matches skin.positionsBodyLocal',
          shear: 'per-taxel tangential force [x, y, z] (N, body frame), same weights as taxels',
          summary: 'computed from the skin: totalForce, centerOfPressure, contactArea, peak, patches, skinForce',
          accelerometer: 'body-frame proper acceleration (m/s²), always on in recordings',
          truth: 'NOT sensory: engine force, contact normals + tangential forces, net contact force, solver penetration, pose, gravity in body frame',
          params: 'world/sim parameters at this step and skin thickness',
        },
      },
      frames: [],
    };
    $('record').textContent = '■ Stop & download'; $('record').classList.add('rec');
  } else {
    const r = recording; recording = null;
    $('record').textContent = '● Record'; $('record').classList.remove('rec');
    $('recInfo').textContent = `saved ${r.frames.length} frames`;
    download(`workbench-run-${stamp()}.json`, r);
  }
});

// --- equivalence test (Details) ---------------------------------------------------
let eqLast = null;
const fmtV = (v, d = 3) => (v ? `[${v.x.toFixed(d)}, ${v.y.toFixed(d)}, ${v.z.toFixed(d)}]` : '—');
$('eqRun').addEventListener('click', () => {
  const t0 = performance.now();
  const res = runEquivalenceTest(RAPIER, { gravity: params.gravity, mass: params.mass, skin: { thickness: skin.thickness } });
  const ms = performance.now() - t0;
  eqLast = { ...res, tolerances: TOL, skin: skinMetadata(createSkin({ radius: SPHERE_RADIUS, thickness: skin.thickness })), ranAt: new Date().toISOString() };
  $('eqDownload').disabled = false;
  const verdict = (ok, text) => `<span class="${ok ? 'pass' : 'fail'}">${ok ? '✓ PASS' : '✗ FAIL'}</span> ${text}`;
  const mag3 = (v) => Math.hypot(v.x, v.y, v.z);
  const cond = (r) => `<tr><td>${r.params.mode}</td><td>${r.summary.patchCount}</td><td>${r.summary.totalForce.toFixed(3)}</td><td>${r.summary.skinForceMagnitude.toFixed(3)}</td><td>${mag3(r.accel).toFixed(3)}</td></tr>`;
  const A = res.rows.wallA;
  $('eqResult').innerHTML = `<table><tr><th>condition</th><th>patches</th><th>F normal</th><th>|skin F|</th><th>|accel|</th></tr>
    ${cond(res.floor)}${cond(res.wallA)}${cond(res.wallB)}</table>
    <pre>${verdict(res.verdicts.cond4, `C4 wall A skin = floor (relL2 ${A.tactile.relL2.toExponential(1)})`)}
${verdict(res.verdicts.cond5, `C5 wall A accel = floor (|Δ| ${A.accel.diffNorm.toFixed(3)})`)}
${verdict(res.verdicts.cond6, `C6 squeeze: ${res.rows.wallB.patches.join(' vs ')} patches, accel ≈ 0`)}
<span class="muted">g=${res.gravity}, m=${res.mass}, h=${skin.thickness}; tolerances: relL2 &lt; ${TOL.tactileRelL2}, |Δa| &lt; ${TOL.accelFracOfG}·g. ${ms.toFixed(0)} ms</span>${res.gravity === 0 ? '\n<span class="fail">g = 0: every condition is silent, so the test is trivial.</span>' : ''}</pre>`;
});
$('eqDownload').addEventListener('click', () => eqLast && download(`equivalence-test-${stamp()}.json`, eqLast));

// --- live numbers (Details) --------------------------------------------------------
function renderSummary(frame) {
  const s = frame.summary, a = frame.truth.accelerometer, tr = frame.truth;
  $('summary').textContent =
    `t                ${frame.t.toFixed(2)} s   step ${frame.step}\n` +
    `total force      ${s.totalForce.toFixed(4)} N\n` +
    `CoP dir (body)   ${fmtV(s.centerOfPressureDir)}\n` +
    `contact area     ${s.contactArea.taxels} taxels (${(s.contactArea.m2 * 1e4).toFixed(1)} cm²)\n` +
    `inner sense      ${fmtV(a)} m/s²\n` +
    `patches          ${s.patchCount}\n` +
    `skin force       ${fmtV(s.skinForce)}  |F| ${s.skinForceMagnitude.toFixed(4)} N`;
  const pen = tr.contacts[0]?.penetration;
  $('truth').textContent = `truth (not sensed): engine force ${tr.engineForce.toFixed(4)} N` +
    `${pen !== undefined ? `, penetration ${(pen * 1000).toFixed(3)} mm` : ''}\n` +
    `gravity in body frame ${fmtV(tr.gravityBody)}` + (appMode === 'play' && params.mode === 'floor' ? `\nfloor tilt ${sim.tiltDeg.toFixed(1)}° (target ${sim.tiltTarget}°)` : '');
}

// --- loop (fixed physics step, decoupled from frame rate) --------------------------
setAppMode('play');
setTilt(0);
// Link to a replay: ?trial=<id>&run=<key>&speed=<1|3|20>&autoplay=1 (starts it right away).
{
  const q = new URLSearchParams(location.search);
  const m = q.get('trial')?.match(/^(.*)_o(\d)_(\w+)$/);
  if (m) {
    setAppMode('replay');
    if (q.get('run')) $('runSel').value = q.get('run');
    if (q.get('speed')) $('speedSel').value = q.get('speed');
    $('autoplay').checked = q.get('autoplay') === '1';
    $('sceneSel').value = m[1]; $('orientSel').value = m[2]; $('maskSel').value = m[3];
    refreshPick().then(() => { if (!$('runTrial').disabled) startTrial(); });
  }
}
let last = performance.now(), acc = 0, lastPanel = 0;
function frame(now) {
  const dtReal = Math.min((now - last) / 1000, 0.25);
  last = now;
  let display = null; // { pressure, shear, obs, note }

  if (appMode === 'play') {
    acc += dtReal;
    while (!paused && acc >= DT) {
      const raw = sim.step();
      latest = buildFrame(sim, skin, raw, { accelerometer: true, stepIndex: stepIndex++ });
      playSteps.push(captureStep(skin, raw)); if (playSteps.length > 60) playSteps.shift();
      if (recording) recording.frames.push({ ...latest, params: { ...sim.params(), skinThickness: skin.thickness } });
      acc -= DT;
    }
    if (paused) acc = 0;
    if (recording) $('recInfo').textContent = `recording… ${recording.frames.length} frames`;
    if (latest) display = { pressure: skin.pressure, shear: skin.shear };
    if (playSteps.length && now - lastPanel > 200) {
      lastPanel = now;
      const obs = buildObservation(playSteps, { mask: playMask });
      display.obs = obs;
      renderOutgoing({ readings: renderReadings(obs), mask: playMask });
      $('outMeta').textContent = 'live · what the model would be told now';
    }
  } else if (episode && (episode.phase === 'settle' || episode.phase === 'record')) {
    const ep = episode, total = ep.settle + ep.record;
    acc += dtReal * +$('speedSel').value;
    while (acc >= DT && ep.n < total) {
      const raw = sim.step();
      const s = captureStep(evalSkin, raw);
      if (ep.n >= ep.settle) ep.steps.push(s);
      latest = buildFrame(sim, evalSkin, raw, { accelerometer: true, stepIndex: ep.n });
      ep.n++; acc -= DT;
    }
    ep.phase = ep.n < ep.settle ? 'settle' : 'record';
    $('progressBar').style.width = `${(100 * ep.n) / total}%`;
    $('phase').textContent = ep.phase === 'settle' ? `Settling the body… ${((ep.settle - ep.n) * DT).toFixed(1)} s of sim time left`
      : 'Taking the reading: 1 s average of the senses';
    display = { pressure: evalSkin.pressure, shear: evalSkin.shear };
    if (ep.n >= total) { acc = 0; finishRecording(); }
  } else if (episode?.obs) {
    // Frozen at the moment of asking: show the 1 s average the model got.
    const P = episode.obs.mean1s.pressure;
    display = { pressure: P ?? evalSkin.pressure, shear: evalSkin.shear, obs: episode.obs, note: '1 s average · what the model was given' };
    acc = 0;
  }

  if (sim) {
    const p = sim.sphereBody.translation(), q = sim.sphereBody.rotation();
    sphereMesh.position.set(p.x, p.y, p.z);
    sphereMesh.quaternion.set(q.x, q.y, q.z, q.w);
    const fp = sim.floorBody.translation(), fq = sim.floorBody.rotation();
    floorMesh.position.set(fp.x, fp.y, fp.z);
    floorMesh.quaternion.set(fq.x, fq.y, fq.z, fq.w);
    if (sim.wallBody) { const wp = sim.wallBody.translation(); wallMesh.position.set(wp.x, wp.y, wp.z); }
    if (sim.pusherBody) { const pp = sim.pusherBody.translation(); pusherMesh.position.set(pp.x, pp.y, pp.z); }
    // Camera follows the sphere (wall A accelerates away indefinitely).
    const delta = new THREE.Vector3(p.x, p.y, p.z).sub(follow);
    follow.add(delta); camera.position.add(delta); controls.target.add(delta);
  }

  if (display) {
    shown = display.pressure;
    for (let i = 0; i < skin.count; i++) taxelMesh.setColorAt(i, taxelColor(shown[i]));
    taxelMesh.instanceColor.needsUpdate = true;
    if (shearOn) updateShearArrows(display.shear);
    if (display.obs && display.obs !== renderedObs) { renderedObs = display.obs; lastPatches = renderSenses(display.obs, { note: display.note }); }
    skinMap.draw(shown, { scaleMax, patches: lastPatches, dim: appMode === 'replay' && episode?.obs && !SENSE_SETS[episode.mask].touch });
  }
  if (latest && $('drawer').classList.contains('open')) renderSummary(latest);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
let lastPatches = [], renderedObs = null;
requestAnimationFrame(frame);
