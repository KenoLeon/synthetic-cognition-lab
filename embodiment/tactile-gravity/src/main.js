import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { createSim, SPHERE_RADIUS, DT, FLOOR_RIMS } from './sim.js';
import { createSkin } from './skin.js';
import { buildFrame, skinMetadata } from './sensors.js';
import { runEquivalenceTest, TOL } from './experiments.js';

await RAPIER.init();

const $ = (id) => document.getElementById(id);
const params = { mode: 'floor', gravity: 9.81, tiltDeg: 0, tiltRate: 20, mass: 1, restitution: 0, lockRotation: true };
const skin = createSkin({ radius: SPHERE_RADIUS });
let sim = null;
let accelOn = false;
let shearOn = false;
let scaleMax = 3;
let paused = false;
let stepIndex = 0;
let latest = null;
// What the heatmap, skin map and tooltips display: the exact (rounded) taxel array that gets logged.
let shown = new Float64Array(skin.count);
let recording = null; // { meta, frames } while recording

const MODE_NOTES = {
  floor: 'Gravity pulls the sphere onto a tiltable floor.',
  wallA: 'World gravity 0. A free wall is driven so wall + sphere accelerate at g: the wall presses with m·g. Einstein\'s elevator: expect skin AND accelerometer to match the floor.',
  wallB: 'World gravity 0. Squeeze: a fixed wall at body −y and a pusher plate pressing body +y with m·g. Expect two patches, net skin force ≈ 0, accelerometer ≈ 0.',
};

// --- rendering -------------------------------------------------------------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111418);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200);
camera.position.set(2.2, 0.9, 3.0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);

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

const wallMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x4a5363, transparent: true, opacity: 0.35, depthWrite: false }),
);
scene.add(wallMesh);
const pusherMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x6b5a4a, transparent: true, opacity: 0.45, depthWrite: false }),
);
scene.add(pusherMesh);

const sphereMesh = new THREE.Mesh(
  new THREE.SphereGeometry(SPHERE_RADIUS, 48, 32),
  new THREE.MeshStandardMaterial({ color: 0x5d636b, roughness: 0.8 }),
);
sphereMesh.add(new THREE.AxesHelper(SPHERE_RADIUS * 1.4)); // body frame: x red, y green, z blue
scene.add(sphereMesh);

// Taxels: one small disc per taxel, tangent to the sphere, coloured from the logged pressure array.
const taxelMesh = new THREE.InstancedMesh(
  new THREE.CircleGeometry(0.024, 14),
  new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  skin.count,
);
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < skin.count; i++) {
    const u = new THREE.Vector3(skin.unit[3 * i], skin.unit[3 * i + 1], skin.unit[3 * i + 2]);
    q.setFromUnitVectors(zAxis, u);
    m.compose(u.clone().multiplyScalar(SPHERE_RADIUS * 1.004), q, new THREE.Vector3(1, 1, 1));
    taxelMesh.setMatrixAt(i, m);
    taxelMesh.setColorAt(i, new THREE.Color(0x3a3d42));
  }
}
sphereMesh.add(taxelMesh);

// Shear arrows (optional): per taxel, from the taxel along its shear vector, body frame.
const SHEAR_SCALE = 0.06; // m per N
const SHEAR_COLOR = 0xe8833a;
const shearLines = new THREE.LineSegments(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(skin.count * 6), 3)),
  new THREE.LineBasicMaterial({ color: SHEAR_COLOR }),
);
const shearHeads = new THREE.InstancedMesh(new THREE.ConeGeometry(0.012, 0.03, 8), new THREE.MeshBasicMaterial({ color: SHEAR_COLOR }), skin.count);
shearLines.visible = shearHeads.visible = false;
sphereMesh.add(shearLines, shearHeads);
function updateShearArrows(frame) {
  const pos = shearLines.geometry.attributes.position.array;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < skin.count; i++) {
    const [sx, sy, sz] = frame.shear[i];
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
  renderer.setSize(view.clientWidth, view.clientHeight);
  camera.aspect = view.clientWidth / view.clientHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// --- colour scale: one hue (blue), sequential, fixed in newtons ------------
// Dark scene: low pressure recedes toward the background, high pressure is bright.
const RAMP = ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'];
const ZERO_COLOR = '#3a3d42';
const rampRGB = RAMP.map((h) => new THREE.Color(h));
const tmpColor = new THREE.Color();
function pressureColor(p, out = tmpColor) {
  if (!(p > 0)) return out.set(ZERO_COLOR);
  const t = Math.min(p / scaleMax, 1) * (rampRGB.length - 1);
  const i = Math.min(Math.floor(t), rampRGB.length - 2);
  return out.copy(rampRGB[i]).lerp(rampRGB[i + 1], t - i);
}
$('legendBar').style.background = `linear-gradient(to right, ${RAMP.join(', ')})`;

// --- skin map: two equal-area hemisphere discs (Lambert azimuthal), body frame -----------------
// Left disc centred on body −y (the "feet", where the floor touches), right disc on body +y.
// Same orientation in both: +x to the right, +z downward. Rim = equator.
const mapCanvas = $('skinMap');
const mapCtx = mapCanvas.getContext('2d');
const DISC = { r: 124, cy: 172, cx: [162, 470] };
const mapPts = Array.from({ length: skin.count }, (_, i) => {
  const x = skin.unit[3 * i], y = skin.unit[3 * i + 1], z = skin.unit[3 * i + 2];
  const lower = y < 0;
  const theta = Math.acos(Math.min(1, Math.abs(y))); // angle from the disc's pole
  const rho = (2 * Math.sin(theta / 2)) / Math.SQRT2;  // 0 at pole, 1 at equator
  const az = Math.atan2(z, x);
  const cx = DISC.cx[lower ? 0 : 1];
  return { x: cx + DISC.r * rho * Math.cos(az), y: DISC.cy + DISC.r * rho * Math.sin(az) };
});
function drawSkinMap() {
  const ctx = mapCtx, w = mapCanvas.width, h = mapCanvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2a323c'; ctx.lineWidth = 1.5;
  ctx.fillStyle = '#8b95a3'; ctx.font = '24px system-ui'; ctx.textAlign = 'center';
  DISC.cx.forEach((cx, k) => {
    ctx.beginPath(); ctx.arc(cx, DISC.cy, DISC.r + 10, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - DISC.r - 10, DISC.cy); ctx.lineTo(cx + DISC.r + 10, DISC.cy);
    ctx.moveTo(cx, DISC.cy - DISC.r - 10); ctx.lineTo(cx, DISC.cy + DISC.r + 10); ctx.stroke();
    ctx.fillText(k === 0 ? 'body −y (feet)' : 'body +y (head)', cx, 22);
    ctx.fillText('+x', cx + DISC.r + 2, DISC.cy - 6);
    ctx.fillText('+z', cx + 14, DISC.cy + DISC.r + 6);
  });
  for (let i = 0; i < skin.count; i++) {
    ctx.fillStyle = '#' + pressureColor(shown[i]).getHexString();
    ctx.beginPath(); ctx.arc(mapPts[i].x, mapPts[i].y, 7, 0, 2 * Math.PI); ctx.fill();
  }
}

// --- tooltips (3D taxels and skin map) -------------------------------------
const tooltip = $('tooltip');
function taxelText(i) {
  const p = shown[i];
  return `taxel #${i}\n${p.toFixed(5)} N\nbody pos [${skin.local[3 * i].toFixed(3)}, ${skin.local[3 * i + 1].toFixed(3)}, ${skin.local[3 * i + 2].toFixed(3)}]`;
}
function showTip(text, x, y) { tooltip.textContent = text; tooltip.style.left = `${x + 14}px`; tooltip.style.top = `${y + 10}px`; tooltip.style.display = 'block'; }
function hideTip() { tooltip.style.display = 'none'; }

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / view.clientWidth) * 2 - 1, -(e.clientY / view.clientHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([sphereMesh, taxelMesh], false)[0];
  if (hit && hit.object === taxelMesh) showTip(taxelText(hit.instanceId), e.clientX, e.clientY);
  else hideTip();
});
renderer.domElement.addEventListener('pointerleave', hideTip);
mapCanvas.addEventListener('pointermove', (e) => {
  const r = mapCanvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * mapCanvas.width, y = ((e.clientY - r.top) / r.height) * mapCanvas.height;
  let best = -1, bestD = 14 * 14;
  for (let i = 0; i < skin.count; i++) {
    const d = (mapPts[i].x - x) ** 2 + (mapPts[i].y - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best >= 0) showTip(taxelText(best), e.clientX, e.clientY); else hideTip();
});
mapCanvas.addEventListener('pointerleave', hideTip);

// --- sim lifecycle ---------------------------------------------------------
let follow = new THREE.Vector3();
function rebuild() {
  sim?.free();
  sim = createSim(RAPIER, params);
  stepIndex = 0;
  latest = null;
  const isFloor = params.mode === 'floor';
  floorMesh.visible = isFloor;
  wallMesh.visible = !isFloor;
  pusherMesh.visible = params.mode === 'wallB';
  $('tilt').disabled = $('tiltRate').disabled = !isFloor;
  $('gLabel').textContent = isFloor ? 'Gravity' : 'Equivalent g (world gravity = 0)';
  $('modeNote').textContent = MODE_NOTES[params.mode];
  const p = sim.sphereBody.translation();
  follow.set(p.x, p.y, p.z);
  controls.target.copy(follow);
  // Look at the contact side: from slightly above the floor, or from behind the (translucent) wall.
  camera.position.copy(follow).add(isFloor ? new THREE.Vector3(2.2, 0.4, 3.0) : new THREE.Vector3(-2.4, 0.5, 2.4));
}

// --- UI --------------------------------------------------------------------
function bindRange(id, fmt, onChange) {
  const el = $(id);
  const apply = () => { $(`${id}Val`).textContent = fmt(+el.value); onChange(+el.value); };
  el.addEventListener('input', apply);
  return (v) => { el.value = v; apply(); };
}
const setG = bindRange('g', (v) => v.toFixed(2), (v) => { params.gravity = v; sim.setGravity(v); });
const setTilt = bindRange('tilt', (v) => v.toFixed(0), (v) => { params.tiltDeg = v; sim.setTilt(v); });
bindRange('tiltRate', (v) => v.toFixed(0), (v) => { params.tiltRate = v; sim.setTiltRate(v); });
bindRange('mass', (v) => v.toFixed(2), (v) => { params.mass = v; sim.setMass(v); });
bindRange('rest', (v) => v.toFixed(2), (v) => { params.restitution = v; sim.setRestitution(v); });
bindRange('h', (v) => v.toFixed(3), (v) => { skin.thickness = v; });
bindRange('scale', (v) => v.toFixed(1), (v) => { scaleMax = v; $('legendMax').textContent = `${v.toFixed(1)} N`; });
$('lockRot').addEventListener('change', (e) => { params.lockRotation = e.target.checked; sim.setLockRotation(e.target.checked); });
$('accelOn').addEventListener('change', (e) => { accelOn = e.target.checked; });
$('shearOn').addEventListener('change', (e) => { shearOn = e.target.checked; shearLines.visible = shearHeads.visible = shearOn; });
$('mode').addEventListener('change', (e) => { params.mode = e.target.value; rebuild(); });
$('reset').addEventListener('click', () => sim.resetSphere());
$('drop').addEventListener('click', () => sim.resetSphere(1.0));
$('pause').addEventListener('click', () => { paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause'; });

const PRESETS = {
  c0: { g: 9.81, tilt: 0 },
  c1: { g: 9.81, tilt: 30 },
  c2: { g: 19.62, tilt: 0 },
  c3: { g: 0, tilt: 0 },
};
document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
  const p = PRESETS[b.dataset.preset];
  if (params.mode !== 'floor') { params.mode = 'floor'; $('mode').value = 'floor'; rebuild(); }
  setG(p.g);
  setTilt(p.tilt);
}));

// --- logging ---------------------------------------------------------------
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

$('record').addEventListener('click', () => {
  if (!recording) {
    recording = {
      meta: {
        experiment: 'tactile-gravity-v0.1',
        createdAt: new Date().toISOString(),
        rapierVersion: RAPIER.version?.() ?? null,
        dt: DT,
        sphereRadius: SPHERE_RADIUS,
        skin: skinMetadata(skin),
        channels: {
          taxels: 'per-taxel normal pressure (N), index matches skin.positionsBodyLocal',
          shear: 'per-taxel tangential force [x, y, z] (N, body frame), same weights as taxels (v0.1)',
          summary: 'computed from the skin: totalForce (N, normal), centerOfPressure (body frame, m), centerOfPressureDir (unit), contactArea, peak; v0.1 adds patchCount, patches (force, direction, shear, forceVector), skinForce (normal + shear, body frame), skinForceMagnitude, skinForceDir',
          accelerometer: 'body-frame proper acceleration (m/s²), null when the channel is off',
          truth: 'NOT sensory: engine force, contact normals + tangential forces, net contact force, solver penetration, pose, gravity in body frame, accelerometer always',
          params: 'world/sim parameters at this step (mode, gravity, mass, tilt, ...) and skin thickness',
        },
      },
      frames: [],
    };
    $('record').textContent = '■ Stop & download';
    $('record').classList.add('rec');
  } else {
    const r = recording;
    recording = null;
    $('record').textContent = '● Record';
    $('record').classList.remove('rec');
    $('recInfo').textContent = `saved ${r.frames.length} frames`;
    download(`tactile-run-${stamp()}.json`, r);
  }
});

// --- equivalence test ------------------------------------------------------
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
  const g = res.gravity;
  const A = res.rows.wallA;
  $('eqResult').innerHTML = `
    <table>
      <tr><th>condition</th><th>patches</th><th>F normal</th><th>|skin F|</th><th>|accel|</th></tr>
      ${cond(res.floor)}${cond(res.wallA)}${cond(res.wallB)}
    </table>
    <pre>${verdict(res.verdicts.cond4, `C4 wall A skin = floor (relL2 ${A.tactile.relL2.toExponential(1)})`)}
${verdict(res.verdicts.cond5, `C5 wall A accel = floor (|Δ| ${A.accel.diffNorm.toFixed(3)})`)}
${verdict(res.verdicts.cond6, `C6 squeeze: ${res.rows.wallB.patches.join(' vs ')} patches, accel ≈ 0`)}
<span class="muted">g=${g}, m=${res.mass}, h=${skin.thickness}; tolerances: relL2 &lt; ${TOL.tactileRelL2}, |Δa| &lt; ${TOL.accelFracOfG}·g. ${ms.toFixed(0)} ms</span>${g === 0 ? '\n<span class="fail">g = 0: every condition is silent, so the test is trivial.</span>' : ''}</pre>`;
});
$('eqDownload').addEventListener('click', () => eqLast && download(`equivalence-test-${stamp()}.json`, eqLast));

// --- live readout ----------------------------------------------------------
const deg = (r) => (r * 180) / Math.PI;
function renderSummary(frame) {
  const s = frame.summary;
  const d = s.centerOfPressureDir;
  const fromDown = d ? deg(Math.acos(Math.max(-1, Math.min(1, -d.y)))) : null;
  const a = frame.accelerometer;
  $('summary').textContent =
    `t                ${frame.t.toFixed(2)} s   step ${frame.step}\n` +
    `total force      ${s.totalForce.toFixed(4)} N\n` +
    `CoP dir (body)   ${fmtV(d)}\n` +
    `CoP from body −y ${fromDown === null ? '—' : fromDown.toFixed(2) + '°'}\n` +
    `contact area     ${s.contactArea.taxels} taxels (${(s.contactArea.m2 * 1e4).toFixed(1)} cm²)\n` +
    `peak taxel       ${s.peak.index >= 0 ? `#${s.peak.index}  ${s.peak.value.toFixed(4)} N` : '—'}\n` +
    `accelerometer    ${a ? `${fmtV(a)}  |a| ${Math.hypot(a.x, a.y, a.z).toFixed(3)}` : 'off'}\n` +
    `patches          ${s.patchCount}${s.patches.map((p, k) => `\n  #${k + 1}  ${p.force.toFixed(3)} N at ${fmtV(p.direction, 2)}`).join('')}\n` +
    `skin force       ${fmtV(s.skinForce)}  |F| ${s.skinForceMagnitude.toFixed(4)} N`;
  const tr = frame.truth;
  const pen = tr.contacts[0]?.penetration;
  const gb = tr.gravityBody, gm = gb ? Math.hypot(gb.x, gb.y, gb.z) : 0;
  const angTo = (v, w) => (v && w ? deg(Math.acos(Math.max(-1, Math.min(1, (v.x * w.x + v.y * w.y + v.z * w.z) / (Math.hypot(v.x, v.y, v.z) * Math.hypot(w.x, w.y, w.z)))))) : null);
  const sd = s.skinForceDir ? { x: -s.skinForceDir.x, y: -s.skinForceDir.y, z: -s.skinForceDir.z } : null;
  const downErr = gm > 0 ? `\ntrue down ${fmtV({ x: gb.x / gm, y: gb.y / gm, z: gb.z / gm })}: CoP err ${angTo(d, gb)?.toFixed(2) ?? '—'}°, ` +
    `skin-vector err ${sd ? angTo(sd, gb).toFixed(2) + '°' : '—'}` : '';
  $('truth').textContent =
    `truth (not sensed): engine force ${tr.engineForce.toFixed(4)} N` +
    `${pen !== undefined ? `, penetration ${(pen * 1000).toFixed(3)} mm` : ''}\n` +
    (params.mode === 'floor' ? `floor tilt ${sim.tiltDeg.toFixed(1)}° (target ${sim.tiltTarget}°)` : `world gravity 0, equivalent g ${params.gravity}`) + downErr;
}

// --- loop (fixed physics step, decoupled from frame rate) -------------------
rebuild();
let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min((now - last) / 1000, 0.25);
  last = now;
  while (!paused && acc >= DT) {
    const raw = sim.step();
    latest = buildFrame(sim, skin, raw, { accelerometer: accelOn, stepIndex: stepIndex++ });
    if (recording) recording.frames.push({ ...latest, params: { ...sim.params(), skinThickness: skin.thickness } });
    acc -= DT;
  }
  if (paused) acc = 0;
  if (recording) $('recInfo').textContent = `recording… ${recording.frames.length} frames`;

  const p = sim.sphereBody.translation();
  const q = sim.sphereBody.rotation();
  sphereMesh.position.set(p.x, p.y, p.z);
  sphereMesh.quaternion.set(q.x, q.y, q.z, q.w);
  const fp = sim.floorBody.translation(), fq = sim.floorBody.rotation();
  floorMesh.position.set(fp.x, fp.y, fp.z);
  floorMesh.quaternion.set(fq.x, fq.y, fq.z, fq.w);
  if (sim.wallBody) {
    const wp = sim.wallBody.translation();
    wallMesh.position.set(wp.x, wp.y, wp.z);
  }
  if (sim.pusherBody) {
    const pp = sim.pusherBody.translation();
    pusherMesh.position.set(pp.x, pp.y, pp.z);
  }
  // Camera follows the sphere (wall A accelerates away indefinitely).
  const delta = new THREE.Vector3(p.x, p.y, p.z).sub(follow);
  follow.add(delta);
  camera.position.add(delta);
  controls.target.add(delta);

  if (latest) {
    shown = latest.taxels;
    for (let i = 0; i < skin.count; i++) taxelMesh.setColorAt(i, pressureColor(shown[i]));
    taxelMesh.instanceColor.needsUpdate = true;
    if (shearOn) updateShearArrows(latest);
    drawSkinMap();
    renderSummary(latest);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
